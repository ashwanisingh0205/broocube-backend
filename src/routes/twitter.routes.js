// src/routes/twitter.routes.js
const express = require('express');
const router = express.Router();
const twitterController = require('../controllers/twitterController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes require authentication
router.use(authenticate);

// Generate Twitter OAuth URL
router.post('/auth-url', twitterController.generateAuthURL);

// Handle Twitter OAuth callback
router.get('/callback', twitterController.handleCallback);

// Disconnect Twitter account
router.delete('/disconnect', twitterController.disconnect);

// Get Twitter profile
router.get('/profile', twitterController.getProfile);

// Post tweet
router.post('/tweet', twitterController.postTweet);

// Upload media
router.post('/upload-media', upload.single('media'), twitterController.uploadMedia);

module.exports = router;
