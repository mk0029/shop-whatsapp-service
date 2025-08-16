import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
let qrCodeDataUrl = null;
import qrcodeTerminal from "qrcode-terminal";
import qrcode from "qrcode";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import winston from "winston";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "whatsapp-backend" },
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || "./logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || "./logs/app.log",
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
if (process.env.HELMET_ENABLED !== "false") {
  app.use(helmet());
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use(limiter);
app.use(
  express.json({
    limit: process.env.API_REQUEST_SIZE_LIMIT || "10mb",
  })
);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.method === "POST" ? req.body : undefined,
  });
  next();
});

// WhatsApp client initialization
let whatsappClient = null;
let isClientReady = false;
let clientInitializing = false;

const initializeWhatsApp = () => {
  if (clientInitializing) {
    logger.warn("WhatsApp client initialization already in progress");
    return;
  }

  clientInitializing = true;
  logger.info("🚀 Initializing WhatsApp client...");

  const sessionPath = process.env.WHATSAPP_SESSION_PATH || "./whatsapp-session";
  const clientId = process.env.WHATSAPP_CLIENT_ID || "whatsapp-backend";

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: clientId,
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true, // Force headless mode for server environments
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    },
  });

  // QR Code generation
  whatsappClient.on("qr", (qr) => {
    logger.info("📱 QR Code generated for WhatsApp login");
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        logger.error("Failed to generate QR code data URL", { error: err });
        return;
      }
      qrCodeDataUrl = url;
      logger.info("QR Code available at /qr endpoint");
      console.log(`\n📱 Scan QR code by visiting the /qr endpoint on your service URL.`);
    });
    qrcodeTerminal.generate(qr, { small: true }); // Keep for local console
  });

  // Authentication events
  whatsappClient.on("authenticated", () => {
    logger.info("✅ WhatsApp authenticated successfully");
    console.log("✅ WhatsApp authenticated successfully!");
  });

  whatsappClient.on("auth_failure", (msg) => {
    logger.error("❌ WhatsApp authentication failed", { error: msg });
    console.error("❌ Authentication failed:", msg);
    isClientReady = false;
    clientInitializing = false;
  });

  // Ready event
  whatsappClient.on("ready", () => {
    logger.info("🎉 WhatsApp client is ready");
    console.log("🎉 WhatsApp client is ready!");
    isClientReady = true;
    clientInitializing = false;
  });

  // Disconnection handling
  whatsappClient.on("disconnected", (reason) => {
    logger.warn("📴 WhatsApp client disconnected", { reason });
    console.log("📴 WhatsApp client disconnected:", reason);
    isClientReady = false;
    clientInitializing = false;

    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      logger.info("🔄 Attempting to reconnect WhatsApp client");
      console.log("🔄 Attempting to reconnect...");
      initializeWhatsApp();
    }, 5000);
  });

  // Error handling
  whatsappClient.on("error", (error) => {
    logger.error("💥 WhatsApp client error", {
      error: error.message,
      stack: error.stack,
    });
    console.error("💥 WhatsApp client error:", error);
    clientInitializing = false;
  });

  // Message events for logging
  whatsappClient.on("message_create", (message) => {
    if (message.fromMe) {
      logger.info("📤 Message sent", {
        to: message.to,
        messageId: message.id._serialized,
        type: message.type,
      });
    }
  });

  // Initialize the client
  whatsappClient.initialize().catch((error) => {
    logger.error("Failed to initialize WhatsApp client", {
      error: error.message,
    });
    clientInitializing = false;
  });
};

// Input validation middleware
const validateMessageInput = (req, res, next) => {
  const { number, message } = req.body;

  if (!number || !message) {
    const error = 'Both "number" and "message" fields are required';
    logger.warn("Validation failed: Missing required fields", {
      hasNumber: !!number,
      hasMessage: !!message,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: error,
      example: {
        number: "919876543210",
        message: "Hello from backend 🚀",
      },
    });
  }

  if (typeof number !== "string" || typeof message !== "string") {
    const error = 'Both "number" and "message" must be strings';
    logger.warn("Validation failed: Invalid data types", {
      numberType: typeof number,
      messageType: typeof message,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: error,
    });
  }

  if (message.trim().length === 0) {
    const error = "Message cannot be empty";
    logger.warn("Validation failed: Empty message", { ip: req.ip });

    return res.status(400).json({
      success: false,
      error: error,
    });
  }

  if (message.length > 4096) {
    const error = "Message too long (max 4096 characters)";
    logger.warn("Validation failed: Message too long", {
      messageLength: message.length,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: error,
    });
  }

  next();
};

// Utility function to format phone number
const formatPhoneNumber = (number) => {
  // Remove all non-digit characters
  const cleanNumber = number.replace(/\D/g, "");

  // Add country code if not present (assuming India +91 if starts with single digit)
  let formattedNumber = cleanNumber;
  if (cleanNumber.length === 10) {
    formattedNumber = "91" + cleanNumber;
  }

  return `${formattedNumber}@c.us`;
};

// Routes
app.get("/", (req, res) => {
  const response = {
    service: "WhatsApp Backend Service",
    version: "1.0.0",
    status: isClientReady
      ? "Connected"
      : clientInitializing
      ? "Connecting"
      : "Disconnected",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      send: "POST /send-whatsapp",
      status: "GET /status",
      health: "GET /health",
    },
  };

  logger.info("Service info requested", { ip: req.ip });
  res.json(response);
});

app.get("/status", (req, res) => {
  const response = {
    success: true,
    whatsappConnected: isClientReady,
    clientInitializing: clientInitializing,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  logger.info("Status check requested", {
    ip: req.ip,
    whatsappConnected: isClientReady,
  });

  res.json(response);
});

app.get("/qr", (req, res) => {
  if (qrCodeDataUrl) {
    res.send(`<img src="${qrCodeDataUrl}" alt="Scan this QR code with WhatsApp">`);
  } else {
    res.status(404).json({ success: false, error: "QR code not available at the moment. It may have been scanned already or is not yet generated." });
  }
});

app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    checks: {
      server: "ok",
      whatsapp: isClientReady ? "ok" : "disconnected",
      memory:
        process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? "ok" : "warning", // 500MB threshold
    },
    timestamp: new Date().toISOString(),
  };

  // The container should only be unhealthy if the server itself is down.
  // WhatsApp connection issues are reported but don't trigger a restart.
  const statusCode = health.checks.server === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

app.post("/send-whatsapp", validateMessageInput, async (req, res) => {
  const startTime = Date.now();

  try {
    if (!isClientReady) {
      const error =
        "WhatsApp client is not ready. Please wait for connection or scan QR code.";
      logger.warn("Message send failed: Client not ready", {
        ip: req.ip,
        clientInitializing: clientInitializing,
      });

      return res.status(503).json({
        success: false,
        error: error,
        whatsappConnected: false,
        clientInitializing: clientInitializing,
      });
    }

    const { number, message } = req.body;
    const chatId = formatPhoneNumber(number);

    logger.info("📤 Attempting to send message", {
      to: number,
      chatId: chatId,
      messageLength: message.length,
      ip: req.ip,
    });

    // Check if number exists on WhatsApp
    const numberId = await whatsappClient.getNumberId(chatId);
    if (!numberId) {
      const error = "Phone number is not registered on WhatsApp";
      logger.warn("Message send failed: Number not registered", {
        number: number,
        chatId: chatId,
        ip: req.ip,
      });

      return res.status(404).json({
        success: false,
        error: error,
        number: number,
      });
    }

    // Send the message
    const sentMessage = await whatsappClient.sendMessage(chatId, message);
    const responseTime = Date.now() - startTime;

    logger.info("✅ Message sent successfully", {
      to: number,
      chatId: chatId,
      messageId: sentMessage.id._serialized,
      responseTime: responseTime,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Message sent successfully",
      data: {
        to: number,
        chatId: chatId,
        messageId: sentMessage.id._serialized,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error("❌ Error sending message", {
      error: error.message,
      stack: error.stack,
      to: req.body.number,
      responseTime: responseTime,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: "Failed to send message",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("💥 Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  logger.warn("404 - Endpoint not found", {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /",
      "GET /status",
      "GET /health",
      "POST /send-whatsapp",
    ],
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 ${signal} received, shutting down gracefully...`);
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);

  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      logger.info("WhatsApp client destroyed successfully");
    } catch (error) {
      logger.error("Error destroying WhatsApp client", {
        error: error.message,
      });
    }
  }

  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", {
    promise: promise,
    reason: reason,
  });
});

// Uncaught exception
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Backend Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  });

  console.log(`🚀 WhatsApp Backend Server running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/send-whatsapp`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status check: http://localhost:${PORT}/status`);
  console.log("🔄 Initializing WhatsApp connection...");

  // Initialize WhatsApp client
  initializeWhatsApp();
});

// Handle server errors
server.on("error", (error) => {
  logger.error("Server error", { error: error.message });
  console.error("💥 Server error:", error);
});

export default app;
