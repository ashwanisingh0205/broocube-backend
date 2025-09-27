# Twitter Integration Setup Guide

## Overview
This guide explains how to set up Twitter OAuth 2.0 integration with your Bloocube backend.

## Environment Variables
Add the following variables to your `.env` file:

```env
# Twitter OAuth 2.0 Credentials
TWITTER_CLIENT_ID=RWl4REJUU0tJVjdWdHlxZVhsb1M6MTpjaQ
TWITTER_CLIENT_SECRET=j8z5pOuRK4Zlb50z6FgQK6CuoFXfPR4vhsG7d57yVW7GKLBcfZ
```

## API Endpoints

### 1. Generate Twitter OAuth URL
**POST** `/api/twitter/auth-url`

Request body:
```json
{
  "redirectUri": "http://localhost:3000/auth/twitter/callback"
}
```

Response:
```json
{
  "success": true,
  "authURL": "https://twitter.com/i/oauth2/authorize?...",
  "state": "jwt_token_here"
}
```

### 2. Handle OAuth Callback
**GET** `/api/twitter/callback?code=...&state=...&redirectUri=...`

Response:
```json
{
  "success": true,
  "message": "Twitter account connected successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "socialAccounts": {
      "twitter": {
        "id": "twitter_user_id",
        "username": "twitter_username",
        "name": "Twitter Display Name",
        "connectedAt": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

### 3. Post Tweet
**POST** `/api/twitter/tweet`

Request body:
```json
{
  "content": "Hello from Bloocube! 🚀",
  "mediaIds": ["media_id_1", "media_id_2"]
}
```

Response:
```json
{
  "success": true,
  "message": "Tweet posted successfully",
  "tweet": {
    "tweet_id": "1234567890",
    "text": "Hello from Bloocube! 🚀",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Upload Media
**POST** `/api/twitter/upload-media`

Form data:
- `media`: File (image/video)

Response:
```json
{
  "success": true,
  "mediaId": "media_id_string"
}
```

### 5. Get Twitter Profile
**GET** `/api/twitter/profile`

Response:
```json
{
  "success": true,
  "profile": {
    "id": "twitter_user_id",
    "username": "twitter_username",
    "name": "Twitter Display Name",
    "connectedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Disconnect Twitter
**DELETE** `/api/twitter/disconnect`

Response:
```json
{
  "success": true,
  "message": "Twitter account disconnected successfully"
}
```

## Features Implemented

### ✅ OAuth 2.0 Flow
- Generate authorization URLs
- Handle OAuth callbacks
- Exchange codes for access tokens
- Refresh expired tokens

### ✅ Tweet Management
- Post text tweets
- Post tweets with media
- Upload media files
- Get tweet analytics

### ✅ User Management
- Connect Twitter accounts
- Disconnect Twitter accounts
- Store user credentials securely
- Profile information retrieval

### ✅ Security Features
- JWT state parameter validation
- Token expiration handling
- Secure credential storage
- Error handling and logging

## Usage Example

### Frontend Integration
```javascript
// 1. Generate auth URL
const response = await fetch('/api/twitter/auth-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    redirectUri: 'http://localhost:3000/auth/twitter/callback'
  })
});

const { authURL } = await response.json();

// 2. Redirect user to Twitter
window.location.href = authURL;

// 3. After callback, post a tweet
const tweetResponse = await fetch('/api/twitter/tweet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    content: 'Hello from Bloocube! 🚀'
  })
});
```

## Error Handling
All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error scenarios:
- Missing or invalid credentials
- Expired or invalid tokens
- Twitter API rate limits
- Network connectivity issues
- Invalid media files

## Security Notes
- All endpoints require authentication
- State parameters are JWT-signed for security
- Tokens are stored securely in the database
- Automatic token refresh prevents expiration issues
- All API calls are logged for monitoring

## Testing
Use the provided endpoints with tools like Postman or curl to test the integration:

```bash
# Test auth URL generation
curl -X POST http://localhost:5000/api/twitter/auth-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"redirectUri": "http://localhost:3000/auth/twitter/callback"}'
```
