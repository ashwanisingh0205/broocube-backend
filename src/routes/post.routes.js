const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { body, query, param } = require('express-validator');

// Validation rules
const postValidation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('content')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'published'])
    .withMessage('Status must be draft, scheduled, or published')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid post ID')
];

// Middleware to handle file uploads
const uploadMiddleware = upload.array('media', 10);

// Routes

// Create a new post
router.post('/',
  authenticate,
  uploadMiddleware,
  postValidation,
  postController.createPost
);

// Get user's posts
router.get('/',
  authenticate,
  paginationValidation,
  postController.getUserPosts
);

// Get user's drafts
router.get('/drafts',
  authenticate,
  paginationValidation,
  postController.getDrafts
);

// Validate post content
router.post('/validate',
  authenticate,
  [
    body('content')
      .isLength({ min: 1 })
      .withMessage('Content is required')
      .trim(),
    body('platforms')
      .optional()
      .isArray()
      .withMessage('Platforms must be an array')
  ],
  postController.validateContent
);

// Get a specific post
router.get('/:id',
  authenticate,
  idValidation,
  postController.getPost
);

// Update a post
router.put('/:id',
  authenticate,
  idValidation,
  uploadMiddleware,
  postValidation,
  postController.updatePost
);

// Delete a post
router.delete('/:id',
  authenticate,
  idValidation,
  postController.deletePost
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Post routes error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 100MB per file.'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 10 files per post.'
    });
  }

  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

module.exports = router;