# WhatsApp Service Backend

A production-ready Node.js backend service for sending WhatsApp messages using Express and `whatsapp-web.js`.

## Quick Start

Get the service running in under 5 minutes.

1.  **Prerequisites:** Node.js >= 18, Docker (optional).
2.  **Clone:** `git clone <repository-url> && cd whatsapp-service`
3.  **Configure:** `cp .env.example .env` (and edit `TEST_PHONE_NUMBER`)
4.  **Install:** `npm install`
5.  **Run:** `npm start`
6.  **Authenticate:** Scan the QR code in your terminal with WhatsApp.
7.  **Test:** `npm test`

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Authentication (QR Code)](#1-authentication-qr-code)
  - [Send WhatsApp Message](#2-send-whatsapp-message)
  - [Check Service Status](#3-check-service-status)
  - [Health Check](#4-health-check)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  - [Docker (Recommended)](#using-docker-recommended)
  - [PM2](#using-pm2)
- [Testing](#testing)
- [Phone Number Format](#phone-number-format)
- [Error Handling](#error-handling)
- [Security](#security)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Features

- **Express.js REST API**: Robust API with rate limiting and security headers.
- **WhatsApp Integration**: Uses `whatsapp-web.js` for stable WhatsApp Web automation.
- **Persistent Sessions**: `LocalAuth` saves your session, so you only need to scan the QR code once.
- **Input Validation**: Ensures valid data for all incoming requests.
- **Comprehensive Error Handling**: Gracefully handles common issues.
- **Security Middleware**: Includes Helmet, CORS, and Rate Limiting for protection.
- **Health & Monitoring**: Endpoints for status checks and system health.
- **Structured Logging**: Winston logger with console and file outputs.
- **Containerized**: Full Docker support with health checks for easy deployment.
- **Process Management**: PM2 configuration for running in a production environment.

## Prerequisites

- **Node.js**: Version 18.0.0 or higher.
- **NPM**: Comes with Node.js.
- **Chrome/Chromium**: Required by `whatsapp-web.js` (Puppeteer). Installed automatically in the Docker container.
- **RAM**: Minimum 1GB recommended.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd whatsapp-service
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure your environment:**
    Create a `.env` file by copying the example and edit it as needed.
    ```bash
    cp .env.example .env
    ```
    > **Important**: Set `TEST_PHONE_NUMBER` in your `.env` file to run tests.

## Usage

### 1. Authentication (QR Code)

On the first run, a QR code will be displayed in your terminal. Scan it with your WhatsApp mobile app (Linked Devices -> Link a device).

```bash
# Start the server
npm start
```

Your session will be saved in the `./whatsapp-session` directory, so you won't need to scan the QR code on subsequent restarts.

### 2. Send WhatsApp Message

**Endpoint**: `POST /send-whatsapp`

**Request Body**:

```json
{
  "number": "919876543210",
  "message": "Hello from the backend! 🚀"
}
```

**Success Response**:

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "to": "919876543210",
    "chatId": "919876543210@c.us",
    "messageId": "message_id_here",
    "responseTime": 1250,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3. Check Service Status

**Endpoint**: `GET /status`

Provides detailed status including WhatsApp connection state, uptime, and memory usage.

### 4. Health Check

**Endpoint**: `GET /health`

A simple endpoint for monitoring tools to verify that the service is alive and healthy.

## API Endpoints

| Method | Endpoint         | Description                   |
| :----- | :--------------- | :---------------------------- |
| `GET`  | `/`              | Service information           |
| `GET`  | `/status`        | Detailed status and metrics   |
| `GET`  | `/health`        | Health check for monitoring   |
| `POST` | `/send-whatsapp` | Sends a new WhatsApp message  |

## Environment Variables

All configuration is managed via environment variables. See `.env.example` for the full list.

| Variable                      | Default              | Description                               |
| ----------------------------- | -------------------- | ----------------------------------------- |
| `PORT`                        | `3000`               | Server port                               |
| `WHATSAPP_SESSION_PATH`       | `./whatsapp-session` | Path to store session data                |
| `API_RATE_LIMIT_MAX_REQUESTS` | `100`                | Max requests per 15-minute window         |
| `LOG_LEVEL`                   | `info`               | Logging level (`error`, `warn`, `info`)   |
| `TEST_PHONE_NUMBER`           | `null`               | Your phone number for testing             |

## Deployment

### Using Docker (Recommended)

The most reliable way to run the service is with Docker.

```bash
# Build and run the container in the background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using PM2

For non-containerized environments, PM2 is recommended for process management.

```bash
# Install PM2 globally
npm install -g pm2

# Start the service with PM2
npm run pm2:start

# Monitor logs
npm run pm2:logs

# Stop the service
npm run pm2:stop
```

## Testing

Make sure you have set `TEST_PHONE_NUMBER` in your `.env` file.

```bash
# Run basic message tests
npm test

# Run error handling tests
npm run test:errors
```

The test script (`test-sender.js`) provides a simple way to verify functionality.

## Phone Number Format

The service correctly formats phone numbers by adding the `@c.us` suffix required by `whatsapp-web.js`. It accepts numbers with or without a country code.

## Error Handling

The API provides clear error messages for common issues:
- Invalid input (e.g., missing `number` or `message`).
- WhatsApp client not ready or disconnected.
- Phone number not registered on WhatsApp.
- Rate limit exceeded.

## Security

- **Helmet**: Sets various HTTP headers to secure the Express app.
- **CORS**: Configured to restrict cross-origin requests.
- **Rate Limiting**: Protects against brute-force attacks.
- **Non-root User**: The Docker container runs with a non-root user for better security.

## Monitoring & Logging

- **Logs**: All events are logged to `./logs/app.log` and the console.
- **Status Endpoint**: Use the `/status` endpoint for real-time metrics.
- **Health Endpoint**: Use the `/health` endpoint for uptime monitoring.

## Troubleshooting

- **QR Code not appearing?** Ensure your terminal can display QR codes and that Puppeteer's dependencies are met (handled automatically in Docker).
- **Connection issues?** Check logs for authentication errors and ensure the server has a stable internet connection.
- **Messages not sending?** Verify the recipient's phone number is correct and registered on WhatsApp.

## Development

```bash
# Run in development mode with auto-restarting on file changes
npm run dev

# Tail the log file
tail -f logs/app.log
```
