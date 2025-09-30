// twitter.routes.js
const express = require('express');
const router = express.Router();
const twitterController = require('../controllers/twitterController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public routes (require app auth to associate user)
router.post('/auth-url', authenticate, twitterController.generateAuthURL);
router.get('/auth-url', authenticate, twitterController.generateAuthURL);
router.get('/callback', twitterController.handleCallback);

// Test route to verify callback is accessible
router.get('/callback-test', (req, res) => {
  res.json({ success: true, message: 'Callback route is accessible', timestamp: new Date().toISOString() });
});

// Protected routes (require your app's JWT)
router.use(authenticate);
router.delete('/disconnect', twitterController.disconnect);
router.get('/profile', twitterController.getProfile);
router.post('/tweet', twitterController.postTweet);
router.post('/upload-media', upload.single('media'), twitterController.uploadMedia);

module.exports = router;
