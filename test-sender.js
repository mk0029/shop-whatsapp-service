import dotenv from "dotenv";
import fetch from "node-fetch";

// Load environment variables
dotenv.config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

class WhatsAppTester {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async checkServerStatus() {
    try {
      console.log("🔍 Checking server status...");
      const response = await fetch(`${this.baseUrl}/status`);
      const data = await response.json();

      if (data.success && data.whatsappConnected) {
        console.log("✅ Server is running and WhatsApp is connected");
        return true;
      } else {
        console.log("⚠️  Server is running but WhatsApp is not connected");
        console.log("📱 Please scan the QR code in the server terminal");
        return false;
      }
    } catch (error) {
      console.error("❌ Server is not running or not accessible");
      console.error("💡 Make sure to start the server first: npm start");
      return false;
    }
  }

  async sendTestMessage(phoneNumber, message) {
    try {
      console.log(`📤 Sending test message to ${phoneNumber}...`);

      const response = await fetch(`${this.baseUrl}/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: phoneNumber,
          message: message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Message sent successfully!");
        console.log("📋 Response:", JSON.stringify(data, null, 2));
        return true;
      } else {
        console.error("❌ Failed to send message");
        console.error("📋 Error:", JSON.stringify(data, null, 2));
        return false;
      }
    } catch (error) {
      console.error("💥 Error sending message:", error.message);
      return false;
    }
  }

  async runTests() {
    console.log("🚀 Starting WhatsApp Backend Tests\n");

    // Check if server is running
    const serverReady = await this.checkServerStatus();
    if (!serverReady) {
      console.log("\n❌ Tests failed: Server not ready");
      return;
    }

    console.log(""); // Empty line for better readability

    // Get test configuration from environment
    const testPhone = process.env.TEST_PHONE_NUMBER;
    const testMessage = process.env.TEST_MESSAGE;

    if (!testPhone) {
      console.error("❌ TEST_PHONE_NUMBER not configured in .env file");
      console.log("💡 Please update .env file with your phone number");
      return;
    }

    // Test 1: Send basic message
    console.log("📋 Test 1: Sending basic message");
    await this.sendTestMessage(testPhone, testMessage);

    console.log(""); // Empty line

    // Test 2: Send message with emojis
    console.log("📋 Test 2: Sending message with emojis");
    await this.sendTestMessage(
      testPhone,
      "🎉 Test message with emojis! 🚀✨🔥"
    );

    console.log(""); // Empty line

    // Test 3: Send longer message
    console.log("📋 Test 3: Sending longer message");
    const longMessage = `This is a longer test message to verify that the WhatsApp backend service can handle messages of various lengths. 

Features tested:
✅ Multi-line messages
✅ Special characters & symbols
✅ Numbers: 123456789
✅ Emojis: 🚀📱💻🔥

Timestamp: ${new Date().toISOString()}`;

    await this.sendTestMessage(testPhone, longMessage);

    console.log("\n🎉 All tests completed!");
  }

  async testErrorHandling() {
    console.log("\n🧪 Testing Error Handling\n");

    // Test invalid phone number
    console.log("📋 Test: Invalid phone number");
    await this.sendTestMessage("invalid", "Test message");

    console.log(""); // Empty line

    // Test empty message
    console.log("📋 Test: Empty message");
    try {
      const response = await fetch(`${this.baseUrl}/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: process.env.TEST_PHONE_NUMBER,
          message: "",
        }),
      });

      const data = await response.json();
      console.log("📋 Response:", JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("💥 Error:", error.message);
    }

    console.log(""); // Empty line

    // Test missing fields
    console.log("📋 Test: Missing required fields");
    try {
      const response = await fetch(`${this.baseUrl}/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: process.env.TEST_PHONE_NUMBER,
          // Missing message field
        }),
      });

      const data = await response.json();
      console.log("📋 Response:", JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("💥 Error:", error.message);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const tester = new WhatsAppTester();

  if (args.includes("--errors") || args.includes("-e")) {
    await tester.testErrorHandling();
  } else if (args.includes("--help") || args.includes("-h")) {
    console.log(`
WhatsApp Backend Tester

Usage:
  node test-sender.js              Run basic message tests
  node test-sender.js --errors     Test error handling
  node test-sender.js --help       Show this help

Configuration:
  Update .env file with your TEST_PHONE_NUMBER before running tests.
  Make sure the server is running (npm start) before testing.
    `);
  } else {
    await tester.runTests();
  }
}

main().catch(console.error);
