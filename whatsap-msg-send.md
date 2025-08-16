# Sending WhatsApp Messages via API

This document outlines the process for sending a WhatsApp message using the backend server's API endpoint.

## Endpoint

- **URL:** `/send-whatsapp`
- **Method:** `POST`
- **Content-Type:** `application/json`

## Request Body

The request body must be a JSON object containing the following fields:

- `number` (string): The recipient's phone number, including the country code (e.g., `919876543210`).
- `message` (string): The text message you want to send.

### Example Request Body:

```json
{
  "number": "919876543210",
  "message": "Hello from the API! 🚀"
}
```

## How to Send a Message

You can use any HTTP client to send a message. Below are examples using `curl` and JavaScript's `fetch` API.

### Using `curl`

You can send a message from your terminal using the `curl` command:

```bash
curl -X POST http://localhost:3000/send-whatsapp \
-H "Content-Type: application/json" \
-d '{
  "number": "919876543210",
  "message": "Hello from cURL!"
}'
```

### Using JavaScript (`fetch`)

Here is an example of how to send a message from a JavaScript application using the `fetch` API:

```javascript
async function sendMessage(phoneNumber, message) {
  const API_URL = 'http://localhost:3000/send-whatsapp';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        message: message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('Message sent successfully!', data);
      return data;
    } else {
      console.error('Failed to send message:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Example usage:
const testPhoneNumber = '919876543210'; // Replace with a valid test number
const testMessage = 'Hello from a JavaScript app! ✨';

sendMessage(testPhoneNumber, testMessage);
```

## Server Response

### Success

If the message is sent successfully, the server will respond with a `200 OK` status and a JSON object similar to this:

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "to": "919876543210",
    "chatId": "919876543210@c.us",
    "messageId": "true_919876543210@c.us_3EB091448A4B262A7A4B",
    "responseTime": 150,
    "timestamp": "2023-10-27T10:00:00.000Z"
  }
}
```

### Error

If there is an error (e.g., the WhatsApp client is not ready, or the phone number is invalid), the server will respond with an appropriate HTTP status code (e.g., `400`, `404`, `503`) and a JSON object containing an error message:

```json
{
  "success": false,
  "error": "WhatsApp client is not ready. Please wait for connection or scan QR code."
}
```
