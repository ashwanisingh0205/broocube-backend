const axios = require('axios');
const config = require('../../config/env');

class GoogleService {
  constructor() {
    this.clientId = config.GOOGLE_CLIENT_ID;
    this.clientSecret = config.GOOGLE_CLIENT_SECRET;
    this.authBase = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
  }

  generateAuthURL(redirectUri, state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: config.GOOGLE_SCOPES,
      access_type: 'offline',
      include_granted_scopes: 'true',
      state,
      prompt: 'consent'
    });
    return `${this.authBase}?${params.toString()}`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    try {
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('redirect_uri', redirectUri);
      params.append('grant_type', 'authorization_code');

      const { data } = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return { success: true, ...data };
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error('Google token exchange error:', detail);
      return { success: false, error: detail?.error_description || 'Token exchange failed', raw: detail };
    }
  }

  async getUserInfo(accessToken) {
    try {
      const { data } = await axios.get(this.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return { success: true, user: data };
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error('Google userinfo error:', detail);
      return { success: false, error: detail?.error_description || 'Failed to get user info', raw: detail };
    }
  }
}

module.exports = new GoogleService();


