# Use Node.js 18 LTS
FROM node:18-slim

# Install Google Chrome Stable for Puppeteer
# This is a more reliable method than installing individual dependencies.
RUN apt-get update && apt-get install -y wget gnupg ca-certificates procps libxss1 \
    # Add Google's signing key
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    # Add Google's repository
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    # Update and install Chrome
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs whatsapp-session

# Create non-root user
RUN groupadd -r whatsapp && useradd -r -g whatsapp -s /bin/false whatsapp
RUN chown -R whatsapp:whatsapp /app

# Switch to non-root user
USER whatsapp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]