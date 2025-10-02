// src/routes/post.routes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes require authentication
router.use(authenticate);

// Post CRUD operations
router.post('/', postController.createPost);
router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

// Publishing operations
router.post('/:id/publish', postController.publishPost);
router.post('/:id/schedule', postController.schedulePost);

// Analytics
router.get('/:id/analytics', postController.getPostAnalytics);
router.get('/analytics/summary', postController.getUserPostsAnalytics);

// Templates
router.get('/templates/:platform', postController.getPostTemplates);

// Media upload (for post attachments)
router.post('/:id/media', upload.array('media', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const Post = require('../models/Post');
    
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.user_id.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Process uploaded files
    const mediaFiles = req.files.map((file, index) => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 
            file.mimetype.startsWith('video/') ? 'video' : 
            file.mimetype.startsWith('audio/') ? 'audio' : 'document',
      url: file.path || file.location, // Depending on storage method
      filename: file.originalname,
      size: file.size,
      order: index
    }));

    post.media.push(...mediaFiles);
    await post.save();

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: { media: mediaFiles }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
});

module.exports = router;
