// src/controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User');
const logger = require('../utils/logger');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES, PAGINATION } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorHandler');
const { twitterService } = require('../services/twitterService');
const { youtubeService } = require('../services/youtubeService');

/**
 * Create a new post
 */
const createPost = asyncHandler(async (req, res) => {
  const postData = {
    ...req.body,
    user_id: req.userId
  };

  // Validate platform-specific requirements
  const { platform, post_type } = postData;
  
  if (platform === 'youtube' && post_type === 'video') {
    if (!postData.youtube_content?.title) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'YouTube video title is required'
      });
    }
  }

  if (platform === 'twitter' && postData.content?.caption?.length > 280) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Twitter post cannot exceed 280 characters'
    });
  }

  const post = new Post(postData);
  await post.save();

  logger.info('Post created', { postId: post._id, userId: req.userId, platform });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: SUCCESS_MESSAGES.POST_CREATED || 'Post created successfully',
    data: { post }
  });
});

/**
 * Get all posts with filtering and pagination
 */
const getPosts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    platform,
    status,
    post_type,
    sort = '-createdAt'
  } = req.query;

  // Build filter object
  const filter = { user_id: req.userId };
  
  if (platform) filter.platform = platform;
  if (status) filter.status = status;
  if (post_type) filter.post_type = post_type;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const posts = await Post.find(filter)
    .populate('campaign_id', 'title description')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Post.countDocuments(filter);

  logger.info('Posts retrieved', { count: posts.length, total, userId: req.userId });

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * Get post by ID
 */
const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate('campaign_id', 'title description')
    .populate('user_id', 'name email');

  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id._id.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  res.json({
    success: true,
    data: { post }
  });
});

/**
 * Update post
 */
const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  // Don't allow updating published posts
  if (post.status === 'published') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Cannot update published posts'
    });
  }

  Object.assign(post, req.body);
  post.metadata.draft_version += 1;
  await post.save();

  logger.info('Post updated', { postId: id, userId: req.userId });

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: { post }
  });
});

/**
 * Delete post
 */
const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  await Post.findByIdAndDelete(id);

  logger.info('Post deleted', { postId: id, userId: req.userId });

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

/**
 * Publish post immediately
 */
const publishPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id.toString() !== req.userId.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  if (post.status === 'published') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Post is already published'
    });
  }

  try {
    // Get user's social accounts
    const user = await User.findById(req.userId);
    
    let publishResult = null;

    // Platform-specific publishing logic
    switch (post.platform) {
      case 'twitter':
        if (!user.socialAccounts?.twitter?.accessToken) {
          throw new Error('Twitter account not connected');
        }
        
        const tweetContent = post.content.caption || '';
        publishResult = await twitterService.postTweet(
          user.socialAccounts.twitter.accessToken,
          tweetContent
        );
        
        if (publishResult.success) {
          post.publishing.platform_post_id = publishResult.data.id;
          post.publishing.platform_url = `https://twitter.com/${user.socialAccounts.twitter.username}/status/${publishResult.data.id}`;
        }
        break;

      case 'youtube':
        if (!user.socialAccounts?.youtube?.accessToken) {
          throw new Error('YouTube account not connected');
        }
        
        if (!post.media || post.media.length === 0) {
          throw new Error('Video file is required for YouTube posts');
        }

        // Note: This would need actual file handling in a real implementation
        publishResult = await youtubeService.uploadVideo(
          post.media[0].url, // This would be the actual file in practice
          post.youtube_content.title,
          post.youtube_content.description || post.content.caption,
          post.youtube_content.tags || []
        );
        
        if (publishResult.success) {
          post.publishing.platform_post_id = publishResult.data.id;
          post.publishing.platform_url = `https://www.youtube.com/watch?v=${publishResult.data.id}`;
        }
        break;

      case 'instagram':
        // Instagram publishing would be implemented here
        throw new Error('Instagram publishing not yet implemented');

      case 'linkedin':
        // LinkedIn publishing would be implemented here
        throw new Error('LinkedIn publishing not yet implemented');

      case 'facebook':
        // Facebook publishing would be implemented here
        throw new Error('Facebook publishing not yet implemented');

      default:
        throw new Error(`Publishing to ${post.platform} is not supported`);
    }

    if (publishResult && publishResult.success) {
      await post.publish();
      
      logger.info('Post published successfully', { 
        postId: id, 
        userId: req.userId, 
        platform: post.platform,
        platformPostId: post.publishing.platform_post_id
      });

      res.json({
        success: true,
        message: 'Post published successfully',
        data: { 
          post,
          platform_url: post.publishing.platform_url
        }
      });
    } else {
      throw new Error(publishResult?.error || 'Failed to publish post');
    }

  } catch (error) {
    post.status = 'failed';
    post.publishing.error_message = error.message;
    post.publishing.retry_count += 1;
    post.publishing.last_retry_at = new Date();
    await post.save();

    logger.error('Post publishing failed', { 
      postId: id, 
      userId: req.userId, 
      platform: post.platform,
      error: error.message 
    });

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: `Failed to publish post: ${error.message}`,
      data: { post }
    });
  }
});

/**
 * Schedule post for later publishing
 */
const schedulePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduled_for, timezone } = req.body;

  if (!scheduled_for) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Scheduled time is required'
    });
  }

  const scheduledDate = new Date(scheduled_for);
  if (scheduledDate <= new Date()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Scheduled time must be in the future'
    });
  }

  const post = await Post.findById(id);
  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id.toString() !== req.userId.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  post.scheduling.scheduled_for = scheduledDate;
  post.scheduling.timezone = timezone || 'UTC';
  await post.schedule(scheduledDate);

  logger.info('Post scheduled', { 
    postId: id, 
    userId: req.userId, 
    scheduledFor: scheduledDate 
  });

  res.json({
    success: true,
    message: 'Post scheduled successfully',
    data: { post }
  });
});

/**
 * Get post analytics
 */
const getPostAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.user_id.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.ACCESS_DENIED
    });
  }

  res.json({
    success: true,
    data: { 
      analytics: post.analytics,
      calculated_engagement_rate: post.calculated_engagement_rate
    }
  });
});

/**
 * Get user's posts analytics summary
 */
const getUserPostsAnalytics = asyncHandler(async (req, res) => {
  const { platform } = req.query;

  const summary = await Post.getAnalyticsSummary(req.userId, platform);

  res.json({
    success: true,
    data: { analytics_summary: summary }
  });
});

/**
 * Get platform-specific post templates
 */
const getPostTemplates = asyncHandler(async (req, res) => {
  const { platform } = req.params;

  const templates = await Post.find({
    'metadata.is_template': true,
    platform: platform,
    $or: [
      { user_id: req.userId },
      { 'metadata.template_visibility': 'public' }
    ]
  }).select('content platform post_type metadata.template_name');

  res.json({
    success: true,
    data: { templates }
  });
});

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  publishPost,
  schedulePost,
  getPostAnalytics,
  getUserPostsAnalytics,
  getPostTemplates
};
