// youtube.routes.js
const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public routes (require app auth to associate user)
router.post('/auth-url', authenticate, youtubeController.generateAuthURL);
router.get('/auth-url', authenticate, youtubeController.generateAuthURL);
router.get('/callback', youtubeController.handleCallback);

// Test route to verify callback is accessible
router.get('/callback-test', (req, res) => {
  res.json({ success: true, message: 'YouTube callback route is accessible', timestamp: new Date().toISOString() });
});

// Protected routes (require your app's JWT)
router.use(authenticate);
router.delete('/disconnect', youtubeController.disconnect);
router.get('/channel', youtubeController.getChannelInfo);
router.post('/upload-video', upload.single('video'), youtubeController.uploadVideo);
router.get('/video/:videoId/analytics', youtubeController.getVideoAnalytics);

module.exports = router;
