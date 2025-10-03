# LinkedIn Integration Troubleshooting Guide

## 🚨 Common LinkedIn Connection Issues & Solutions

### 1. **Invalid Client Credentials**
**Error**: `invalid_client` or `unauthorized_client`

**Causes**:
- Using placeholder/test credentials
- Client ID/Secret mismatch
- App not properly configured

**Solutions**:
1. Go to [LinkedIn Developer Console](https://www.linkedin.com/developers/)
2. Create a new app or verify existing app
3. Copy the **Client ID** and **Client Secret** from your app
4. Update `.env` file:
   ```bash
   LINKEDIN_CLIENT_ID=your_real_client_id_here
   LINKEDIN_CLIENT_SECRET=your_real_client_secret_here
   ```

### 2. **Redirect URI Mismatch**
**Error**: `redirect_uri_mismatch`

**Causes**:
- Redirect URI in code doesn't match LinkedIn app settings
- Missing redirect URI in LinkedIn app configuration

**Solutions**:
1. In LinkedIn Developer Console, go to your app
2. Add these redirect URIs in "Authorized redirect URLs":
   - `http://localhost:3000/auth/linkedin/callback` (development)
   - `https://yourdomain.com/auth/linkedin/callback` (production)
3. Ensure exact match in your `.env`:
   ```bash
   LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
   ```

### 3. **Scope Issues**
**Error**: `insufficient_scope` or missing email/profile data

**Causes**:
- Using deprecated `r_liteprofile` scope
- Missing required scopes for email access

**Solutions**:
1. Update your `.env` file with proper scopes:
   ```bash
   LINKEDIN_SCOPES=r_liteprofile,r_emailaddress,w_member_social
   ```
2. Request these scopes in LinkedIn Developer Console
3. Note: `r_liteprofile` is deprecated but still works for basic profile

### 4. **API Version Issues**
**Error**: API endpoint not found or deprecated

**Solutions**:
1. Ensure you're using LinkedIn API v2
2. Add proper headers:
   ```javascript
   headers: { 
     Authorization: `Bearer ${accessToken}`,
     'X-Restli-Protocol-Version': '2.0.0'
   }
   ```

### 5. **Network/CORS Issues**
**Error**: CORS errors or network timeouts

**Solutions**:
1. Ensure your backend is running on the correct port
2. Check CORS configuration in `src/app.js`
3. Verify frontend URL matches CORS_ORIGIN

## 🔧 **Step-by-Step Setup Guide**

### Step 1: LinkedIn App Configuration
1. Go to [LinkedIn Developer Console](https://www.linkedin.com/developers/)
2. Click "Create app"
3. Fill in app details:
   - App name: "Bloocube"
   - LinkedIn Page: Select your company page
   - Privacy policy URL: Your privacy policy
   - App logo: Upload your logo
4. Submit for review

### Step 2: Configure OAuth Settings
1. In your app, go to "Auth" tab
2. Add redirect URLs:
   - `http://localhost:3000/auth/linkedin/callback`
   - `https://yourdomain.com/auth/linkedin/callback`
3. Request these scopes:
   - `r_liteprofile` (basic profile info)
   - `r_emailaddress` (email address)
   - `w_member_social` (post content)

### Step 3: Update Environment Variables
```bash
# Replace with your actual credentials
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
LINKEDIN_SCOPES=r_liteprofile,r_emailaddress,w_member_social
```

### Step 4: Test the Integration
1. Start your backend server
2. Test the ping endpoint:
   ```bash
   curl http://localhost:50001/api/linkedin/ping
   ```
3. Test the auth URL generation (requires authentication)

## 🐛 **Debugging Steps**

### 1. Check Server Logs
Look for these log messages in your console:
- `🔄 Exchanging LinkedIn authorization code for token...`
- `✅ Token exchange successful`
- `🔍 Fetching LinkedIn profile...`
- `✅ Profile fetched:`

### 2. Test OAuth Flow Manually
1. Generate auth URL:
   ```bash
   curl -X POST http://localhost:50001/api/linkedin/auth-url \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"redirectUri": "http://localhost:3000/auth/linkedin/callback"}'
   ```

2. Visit the returned URL in browser
3. Complete LinkedIn authorization
4. Check callback handling

### 3. Verify Environment Variables
```bash
# Check if variables are loaded
node -e "require('dotenv').config(); console.log('Client ID:', process.env.LINKEDIN_CLIENT_ID);"
```

## 📋 **Common Error Messages & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_client` | Wrong credentials | Update Client ID/Secret |
| `redirect_uri_mismatch` | URI mismatch | Add exact URI to LinkedIn app |
| `insufficient_scope` | Missing scopes | Request required scopes |
| `invalid_grant` | Expired/invalid code | Regenerate auth URL |
| `access_denied` | User denied permission | User must approve app |

## 🔍 **Testing Checklist**

- [ ] LinkedIn app created and configured
- [ ] Client ID and Secret are real (not placeholder)
- [ ] Redirect URIs added to LinkedIn app
- [ ] Required scopes requested
- [ ] Environment variables updated
- [ ] Backend server running
- [ ] Frontend can reach backend
- [ ] CORS configured correctly

## 📞 **Getting Help**

If you're still having issues:
1. Check LinkedIn Developer Console for app status
2. Review server logs for detailed error messages
3. Test with LinkedIn's OAuth playground
4. Verify all URLs are accessible
5. Check LinkedIn API status page

## 🔄 **LinkedIn API Changes**

LinkedIn regularly updates their API. Stay informed:
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn Developer News](https://developer.linkedin.com/)
- [API Changelog](https://docs.microsoft.com/en-us/linkedin/shared/changelog/)

