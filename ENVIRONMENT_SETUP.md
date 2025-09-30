# Environment Setup Instructions

## Required Credentials for Twitter Integration

You need to create a `.env` file in the backend root directory with the following credentials:

### 1. Create `.env` file in `Bloocube-backend/` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb+srv://bloocube:bloocube123@bloocube.6mdgoxa.mongodb.net/bloocube?retryWrites=true&w=majority

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRE=30d

# Twitter API Credentials (Already provided by user)
TWITTER_CLIENT_ID=RWl4REJUU0tJVjdWdHlxZVhsb1M6MTpjaQ
TWITTER_CLIENT_SECRET=j8z5pOuRK4Zlb50z6FgQK6CuoFXfPR4vhsG7d57yVW7GKLBcfZ

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
```

### 2. Frontend Environment Variables

The frontend `.env.local` file should contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Steps to Fix the Current Issues:

1. **Create Backend .env file** with the credentials above
2. **Restart the backend server** to pick up the new environment variables
3. **Verify the frontend .env.local** has the correct API URL
4. **Test the Twitter integration**

## Current Status:
- ✅ Twitter credentials provided by user
- ✅ Frontend environment variables set
- ❌ Backend .env file missing (needs to be created manually)
- ❌ Backend needs restart to pick up credentials

## Next Steps:
1. Create the `.env` file in the backend directory
2. Restart the backend server
3. Test the Twitter integration
