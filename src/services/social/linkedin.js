// src/services/social/linkedin.js
const axios = require('axios');
const config = require('../../config/env');

class LinkedInService {
  constructor() {
    this.clientId = config.LINKEDIN_CLIENT_ID;
    this.clientSecret = config.LINKEDIN_CLIENT_SECRET;
    this.authBase = 'https://www.linkedin.com/oauth/v2';
    this.apiBase = 'https://api.linkedin.com/v2';
  }

  generateAuthURL(redirectUri, state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: config.LINKEDIN_SCOPES,
      state
    });
    return `${this.authBase}/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await axios.post(`${this.authBase}/accessToken`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        success: true,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error('LinkedIn token exchange error:', detail);
      return { success: false, error: detail?.error_description || 'Token exchange failed', raw: detail };
    }
  }

  async getUserProfile(accessToken) {
    try {
      // Basic profile
      const me = await axios.get(`${this.apiBase}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // Email
      const emailRes = await axios.get(
        `${this.apiBase}/emailAddress?q=members&projection=(elements*(handle~))`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const profile = {
        id: me.data.id,
        firstName: me.data.localizedFirstName,
        lastName: me.data.localizedLastName,
        email: emailRes.data?.elements?.[0]?.['handle~']?.emailAddress
      };

      return { success: true, user: profile };
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error('LinkedIn profile error:', detail);
      return { success: false, error: detail?.message || 'Failed to get user profile', raw: detail };
    }
  }

  // Placeholder for posting content to LinkedIn in future
  async post(accessToken, payload) {
    return { success: true, platform: 'linkedin', payload };
  }
}

module.exports = new LinkedInService();


