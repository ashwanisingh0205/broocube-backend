const Post = require('../models/Post');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const path = require('path');

// Import platform services
const twitterService = require('../services/social/twitter');
const youtubeService = require('../services/social/youtube');

class PostController {
  
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.postToPlatform = this.postToPlatform.bind(this);
    this.postToTwitter = this.postToTwitter.bind(this);
    this.postToYouTube = this.postToYouTube.bind(this);
    this.publishPostById = this.publishPostById.bind(this);
    this.publishPost = this.publishPost.bind(this);
    this.schedulePostById = this.schedulePostById.bind(this);
    this.schedulePost = this.schedulePost.bind(this);
  }
  
  // Helper method to post to platform
  async postToPlatform(post, user) {
    try {
      console.log(`🚀 Posting to ${post.platform}:`, {
        postId: post._id,
        platform: post.platform,
        postType: post.post_type,
        userId: user._id,
        userEmail: user.email
      });

      let platformResult = { success: false, error: 'Platform not supported' };

      switch (post.platform) {
        case 'twitter':
          console.log('🐦 Calling Twitter posting...');
          platformResult = await this.postToTwitter(post, user);
          break;
        case 'youtube':
          console.log('📺 Calling YouTube posting...');
          platformResult = await this.postToYouTube(post, user);
          break;
        case 'instagram':
          console.log('📸 Instagram posting not implemented yet');
          platformResult = { success: false, error: 'Instagram posting not implemented yet' };
          break;
        case 'linkedin':
          console.log('💼 LinkedIn posting not implemented yet');
          platformResult = { success: false, error: 'LinkedIn posting not implemented yet' };
          break;
        case 'facebook':
          console.log('👥 Facebook posting not implemented yet');
          platformResult = { success: false, error: 'Facebook posting not implemented yet' };
          break;
        default:
          console.log('❓ Unsupported platform:', post.platform);
          platformResult = { success: false, error: 'Unsupported platform' };
      }

      console.log(`📊 Platform posting result for ${post.platform}:`, platformResult);
      return platformResult;
    } catch (error) {
      console.error(`❌ Error posting to ${post.platform}:`, error);
      return {
        success: false,
        error: error.message || 'Platform posting failed'
      };
    }
  }

  // Post to Twitter
  async postToTwitter(post, user) {
    try {
      console.log('🐦 Starting Twitter posting process:', {
        postId: post._id,
        userId: user._id,
        hasTwitterAccount: !!user.socialAccounts?.twitter,
        hasAccessToken: !!user.socialAccounts?.twitter?.accessToken,
        tokenExpiresAt: user.socialAccounts?.twitter?.expiresAt
      });

      if (!user.socialAccounts?.twitter?.accessToken) {
        console.log('❌ Twitter account not connected for user:', user._id);
        return {
          success: false,
          error: 'Twitter account not connected'
        };
      }

      // Refresh token if expired
      let accessToken = user.socialAccounts.twitter.accessToken;
      const tokenExpiresAt = new Date(user.socialAccounts.twitter.expiresAt);
      const now = new Date();
      
      console.log('🔑 Token status:', {
        expiresAt: tokenExpiresAt,
        now: now,
        isExpired: tokenExpiresAt < now
      });

      if (tokenExpiresAt < now) {
        console.log('🔄 Twitter token expired, refreshing...');
        const refreshResult = await twitterService.refreshToken(user.socialAccounts.twitter.refreshToken);
        if (refreshResult.success) {
          accessToken = refreshResult.access_token;
          await User.findByIdAndUpdate(user._id, {
            $set: {
              'socialAccounts.twitter.accessToken': refreshResult.access_token,
              'socialAccounts.twitter.refreshToken': refreshResult.refresh_token,
              'socialAccounts.twitter.expiresAt': new Date(Date.now() + refreshResult.expires_in * 1000)
            }
          });
          console.log('✅ Twitter token refreshed successfully');
        } else {
          console.log('❌ Failed to refresh Twitter token:', refreshResult.error);
          return {
            success: false,
            error: 'Failed to refresh Twitter token: ' + refreshResult.error
          };
        }
      } else {
        console.log('✅ Twitter token is still valid');
      }

      // Prepare content based on post type
      let content = '';
      
      // Handle different content formats
      if (post.content) {
        if (typeof post.content === 'string') {
          content = post.content;
        } else if (post.content.caption && post.content.caption.trim()) {
          content = post.content.caption;
        } else if (post.content.text && post.content.text.trim()) {
          content = post.content.text;
        } else if (post.content.content && post.content.content.trim()) {
          content = post.content.content;
        } else if (post.content.body && post.content.body.trim()) {
          content = post.content.body;
        } else if (post.content.message && post.content.message.trim()) {
          content = post.content.message;
        }
      }
      
      // Fallback to title if no content
      if (!content && post.title) {
        content = post.title;
        console.log('📝 Using title as content fallback:', post.title);
      }
      
      // Additional fallback - if content object only has hashtags/mentions, use title
      if (!content && post.content && typeof post.content === 'object') {
        const contentKeys = Object.keys(post.content);
        // Check if content only has hashtags/mentions or empty caption
        const hasOnlyHashtagsMentions = contentKeys.length === 2 && 
          contentKeys.includes('hashtags') && contentKeys.includes('mentions');
        const hasEmptyCaption = contentKeys.includes('caption') && 
          (!post.content.caption || !post.content.caption.trim());
        
        if (hasOnlyHashtagsMentions || hasEmptyCaption) {
          if (post.title) {
            content = post.title;
            console.log('📝 Using title as fallback for hashtags-only or empty caption content:', post.title);
          }
        }
      }
      
      // If still no content, try to extract from the original request body
      if (!content) {
        console.log('❌ No content found for Twitter post:', {
          postContent: post.content,
          postTitle: post.title,
          contentType: typeof post.content,
          contentKeys: post.content ? Object.keys(post.content) : 'no content object'
        });
        
        // Try to get content from the request body if available
        // Note: req is not available in this context, so we'll use other fallbacks
      }
      
      // Final check - if still no content, return error
      if (!content) {
        return {
          success: false,
          error: 'No content provided for Twitter post. Please provide text content or a title.'
        };
      }
      
      const twitterContent = post.platform_content?.twitter || {};

      console.log('📝 Twitter content preparation:', {
        content: content,
        contentLength: content.length,
        twitterContent: twitterContent,
        postType: post.post_type,
        hasThread: !!twitterContent.thread?.length,
        hasPoll: !!twitterContent.poll?.options?.length,
        originalPostContent: post.content,
        originalPostTitle: post.title
      });

      let result;

      if (post.post_type === 'poll' && twitterContent.poll?.options?.length > 0) {
        // Post poll
        console.log('📊 Posting Twitter poll:', twitterContent.poll);
        result = await twitterService.postPoll(accessToken, content, twitterContent.poll);
      } else if (twitterContent.thread?.length > 0) {
        // Post thread
        console.log('🧵 Posting Twitter thread:', twitterContent.thread);
        result = await twitterService.postThread(accessToken, twitterContent.thread);
      } else {
        // Post single tweet
        console.log('🐦 Posting single Twitter tweet:', content);
        const mediaIds = []; // TODO: Handle media uploads
        result = await twitterService.postTweet(accessToken, content, mediaIds);
      }

      console.log('📤 Twitter API result:', result);
      return result;
    } catch (error) {
      console.error('❌ Twitter posting error:', error);
      return {
        success: false,
        error: error.message || 'Failed to post to Twitter'
      };
    }
  }

  // Post to YouTube
  async postToYouTube(post, user) {
    try {
      if (!user.socialAccounts?.youtube?.accessToken) {
        return {
          success: false,
          error: 'YouTube account not connected'
        };
      }

      // For now, return not implemented
      return {
        success: false,
        error: 'YouTube posting not fully implemented yet'
      };
    } catch (error) {
      console.error('❌ YouTube posting error:', error);
      return {
        success: false,
        error: error.message || 'Failed to post to YouTube'
      };
    }
  }

  // Create a new post
  async createPost(req, res) {
    try {
      console.log('📝 Creating new post:', {
        body: req.body,
        files: req.files?.length || 0,
        userId: req.user?._id
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        platform,
        post_type,
        status = 'draft',
        scheduledAt,
        platformContent,
        tags,
        categories
      } = req.body;

      // Force status to 'draft' for regular post creation
      // Posts should be published via the publish endpoint
      const postStatus = 'draft';

      // Parse JSON strings if they exist
      let parsedPlatformContent = {};
      let parsedTags = [];
      let parsedCategories = [];

      try {
        if (platformContent) {
          parsedPlatformContent = typeof platformContent === 'string' 
            ? JSON.parse(platformContent) 
            : platformContent;
        }
        if (tags) {
          parsedTags = typeof tags === 'string' 
            ? JSON.parse(tags) 
            : Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }
        if (categories) {
          parsedCategories = typeof categories === 'string' 
            ? JSON.parse(categories) 
            : Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim());
        }
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in request data'
        });
      }

      // Process uploaded media files
      const mediaFiles = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const mediaItem = {
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimeType: file.mimetype
          };
          mediaFiles.push(mediaItem);
        }
      }

      // Parse content properly
      let parsedContent = {};
      if (content) {
        if (typeof content === 'string') {
          // Check if it's the '[object Object]' string that frontend sometimes sends
          if (content === '[object Object]') {
            console.log('⚠️ Frontend sent [object Object] string - using title as fallback');
            // Use title as fallback since frontend has serialization issue
            parsedContent = { caption: title || 'No content provided' };
            console.log('📝 Using title as fallback for [object Object]:', title);
          } else {
            try {
              parsedContent = JSON.parse(content);
            } catch {
              // If not JSON, treat as plain text
              parsedContent = { caption: content };
            }
          }
        } else if (typeof content === 'object') {
          parsedContent = content;
        }
      }

      console.log('📝 Content parsing result:', {
        originalContent: content,
        parsedContent: parsedContent,
        contentType: typeof content
      });

      const post = new Post({
        title,
        content: parsedContent,
        platform,
        post_type,
        author: req.user._id,
        status: postStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        platformContent: parsedPlatformContent,
        tags: parsedTags,
        categories: parsedCategories,
        media: mediaFiles
      });

      await post.save();
      await post.populate('author', 'username email');

      console.log('✅ Post created successfully:', post._id);

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        post
      });

    } catch (error) {
      console.error('❌ Error creating post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create post'
      });
    }
  }

  // Get user's posts
  async getUserPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search
      } = req.query;

      const query = { author: req.user._id };

      if (status) query.status = status;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [posts, total] = await Promise.all([
        Post.find(query)
          .sort({ lastEditedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('author', 'username email'),
        Post.countDocuments(query)
      ]);

      res.json({
        success: true,
        posts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching posts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch posts'
      });
    }
  }

  // Get a specific post
  async getPost(req, res) {
    try {
      const { id } = req.params;
      
      const post = await Post.findOne({
        _id: id,
        author: req.user._id
      }).populate('author', 'username email');

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      res.json({
        success: true,
        post
      });

    } catch (error) {
      console.error('❌ Error fetching post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch post'
      });
    }
  }

  // Update a post
  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Parse JSON strings
      if (updateData.platformContent && typeof updateData.platformContent === 'string') {
        updateData.platformContent = JSON.parse(updateData.platformContent);
      }
      if (updateData.tags && typeof updateData.tags === 'string') {
        updateData.tags = JSON.parse(updateData.tags);
      }
      if (updateData.categories && typeof updateData.categories === 'string') {
        updateData.categories = JSON.parse(updateData.categories);
      }

      const post = await Post.findOneAndUpdate(
        { _id: id, author: req.user._id },
        { $set: updateData },
        { new: true }
      ).populate('author', 'username email');

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      res.json({
        success: true,
        message: 'Post updated successfully',
        post
      });

    } catch (error) {
      console.error('❌ Error updating post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update post'
      });
    }
  }

  // Delete a post
  async deletePost(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findOneAndDelete({
        _id: id,
        author: req.user._id
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete post'
      });
    }
  }

  // Get drafts
  async getDrafts(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [drafts, total] = await Promise.all([
        Post.find({ 
          author: req.user._id, 
          status: 'draft' 
        })
        .sort({ lastEditedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username email'),
        Post.countDocuments({
          author: req.user._id,
          status: 'draft'
        })
      ]);

      res.json({
        success: true,
        drafts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching drafts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch drafts'
      });
    }
  }

  // Publish a post immediately
  async publishPost(req, res) {
    try {
      console.log('🚀 Publishing post immediately:', {
        body: req.body,
        files: req.files?.length || 0,
        userId: req.user?._id
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        platform,
        post_type,
        platformContent,
        tags,
        categories
      } = req.body;

      // Parse JSON strings if they exist
      let parsedPlatformContent = {};
      let parsedTags = [];
      let parsedCategories = [];

      try {
        if (platformContent) {
          parsedPlatformContent = typeof platformContent === 'string' 
            ? JSON.parse(platformContent) 
            : platformContent;
        }
        if (tags) {
          parsedTags = typeof tags === 'string' 
            ? JSON.parse(tags) 
            : Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }
        if (categories) {
          parsedCategories = typeof categories === 'string' 
            ? JSON.parse(categories) 
            : Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim());
        }
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in request data'
        });
      }

      // Process uploaded media files
      const mediaFiles = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const mediaItem = {
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimeType: file.mimetype
          };
          mediaFiles.push(mediaItem);
        }
      }

      // Create post with published status
      const post = new Post({
        title,
        content,
        platform,
        post_type,
        author: req.user._id,
        status: 'published',
        platformContent: parsedPlatformContent,
        tags: parsedTags,
        categories: parsedCategories,
        media: mediaFiles,
        publishing: {
          published_at: new Date(),
          platform_post_id: null // Will be updated after successful platform posting
        }
      });

      await post.save();
      await post.populate('author', 'username email');

      // Post to platform
      console.log('🚀 Attempting to post to platform:', post.platform);
      const platformResult = await this.postToPlatform(post, req.user);

      if (!platformResult.success) {
        // Update post status to failed
        post.status = 'failed';
        post.publishing = {
          published_at: new Date(),
          platform_post_id: null,
          error: platformResult.error
        };
        await post.save();

        return res.status(400).json({
          success: false,
          message: `Failed to post to ${post.platform}: ${platformResult.error}`,
          platformError: platformResult.error,
          post
        });
      }

      // Update post with platform post ID
      post.publishing = {
        published_at: new Date(),
        platform_post_id: platformResult.tweet_id || platformResult.thread_id || platformResult.video_id || null,
        platform_data: platformResult
      };
      await post.save();

      console.log('✅ Post published successfully:', post._id, 'Platform ID:', post.publishing.platform_post_id);

      res.status(201).json({
        success: true,
        message: 'Post published successfully',
        post,
        platformResult
      });

    } catch (error) {
      console.error('❌ Error publishing post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to publish post'
      });
    }
  }

  // Schedule a post for later
  async schedulePost(req, res) {
    try {
      console.log('⏰ Scheduling post:', {
        body: req.body,
        files: req.files?.length || 0,
        userId: req.user?._id
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        platform,
        post_type,
        scheduledAt,
        platformContent,
        tags,
        categories
      } = req.body;

      // Parse JSON strings if they exist
      let parsedPlatformContent = {};
      let parsedTags = [];
      let parsedCategories = [];

      try {
        if (platformContent) {
          parsedPlatformContent = typeof platformContent === 'string' 
            ? JSON.parse(platformContent) 
            : platformContent;
        }
        if (tags) {
          parsedTags = typeof tags === 'string' 
            ? JSON.parse(tags) 
            : Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }
        if (categories) {
          parsedCategories = typeof categories === 'string' 
            ? JSON.parse(categories) 
            : Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim());
        }
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in request data'
        });
      }

      // Process uploaded media files
      const mediaFiles = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const mediaItem = {
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimeType: file.mimetype
          };
          mediaFiles.push(mediaItem);
        }
      }

      // Create post with scheduled status
      const post = new Post({
        title,
        content,
        platform,
        post_type,
        author: req.user._id,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
        platformContent: parsedPlatformContent,
        tags: parsedTags,
        categories: parsedCategories,
        media: mediaFiles,
        scheduling: {
          scheduled_for: new Date(scheduledAt),
          timezone: req.body.timezone || 'UTC'
        }
      });

      await post.save();
      await post.populate('author', 'username email');

      // TODO: Add job scheduling logic here (e.g., using node-cron or Bull queue)
      console.log('✅ Post scheduled successfully:', post._id, 'for:', scheduledAt);

      res.status(201).json({
        success: true,
        message: 'Post scheduled successfully',
        post
      });

    } catch (error) {
      console.error('❌ Error scheduling post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to schedule post'
      });
    }
  }

  // Publish an existing post by ID
  async publishPostById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      console.log('🚀 Publishing existing post:', { postId: id, userId });

      // Find the post and verify ownership
      const post = await Post.findOne({ _id: id, author: userId });
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or you do not have permission to publish it'
        });
      }

      // Check if post is already published
      if (post.status === 'published') {
        return res.status(200).json({
          success: true,
          message: 'Post is already published',
          post: post,
          alreadyPublished: true
        });
      }

      // Get user with social accounts
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Post to platform first
      console.log('🚀 Attempting to post to platform:', post.platform);
      const platformResult = await this.postToPlatform(post, user);

      if (!platformResult.success) {
        // Update post status to failed
        post.status = 'failed';
        post.publishing = {
          published_at: new Date(),
          platform_post_id: null,
          error: platformResult.error
        };
        await post.save();

        return res.status(400).json({
          success: false,
          message: `Failed to post to ${post.platform}: ${platformResult.error}`,
          platformError: platformResult.error
        });
      }

      // Update post status to published with platform post ID
      post.status = 'published';
      post.publishing = {
        published_at: new Date(),
        platform_post_id: platformResult.tweet_id || platformResult.thread_id || platformResult.video_id || null,
        platform_data: platformResult
      };

      await post.save();
      await post.populate('author', 'username email');

      console.log('✅ Post published successfully:', post._id, 'Platform ID:', post.publishing.platform_post_id);

      res.json({
        success: true,
        message: 'Post published successfully',
        post,
        platformResult
      });

    } catch (error) {
      console.error('❌ Error publishing post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to publish post'
      });
    }
  }

  // Schedule an existing post by ID
  async schedulePostById(req, res) {
    try {
      const { id } = req.params;
      const { scheduledAt, timezone } = req.body;
      const userId = req.user._id;

      console.log('⏰ Scheduling existing post:', { postId: id, userId, scheduledAt });

      // Find the post and verify ownership
      const post = await Post.findOne({ _id: id, author: userId });
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or you do not have permission to schedule it'
        });
      }

      // Check if post is already published
      if (post.status === 'published') {
        return res.status(200).json({
          success: true,
          message: 'Post is already published and cannot be scheduled',
          post: post,
          alreadyPublished: true
        });
      }

      // Check if post is already scheduled
      if (post.status === 'scheduled') {
        return res.status(200).json({
          success: true,
          message: 'Post is already scheduled',
          post: post,
          alreadyScheduled: true
        });
      }

      // Update post status to scheduled
      post.status = 'scheduled';
      post.scheduledAt = new Date(scheduledAt);
      post.scheduling = {
        scheduled_for: new Date(scheduledAt),
        timezone: timezone || 'UTC'
      };

      await post.save();
      await post.populate('author', 'username email');

      console.log('✅ Post scheduled successfully:', post._id, 'for:', scheduledAt);

      res.json({
        success: true,
        message: 'Post scheduled successfully',
        post
      });

    } catch (error) {
      console.error('❌ Error scheduling post:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to schedule post'
      });
    }
  }

  // Test Twitter connection
  async testTwitterConnection(req, res) {
    try {
      const userId = req.user._id;
      console.log('🔍 Testing Twitter connection for user:', userId);

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.socialAccounts?.twitter?.accessToken) {
        return res.json({
          success: false,
          error: 'Twitter account not connected',
          hasTwitterAccount: false,
          socialAccounts: user.socialAccounts
        });
      }

      console.log('🐦 Twitter account found, testing API...');
      
      // Test Twitter API call
      try {
        const result = await twitterService.getProfile(user.socialAccounts.twitter.accessToken);
        
        res.json({
          success: true,
          twitterConnected: true,
          profile: result.user,
          tokenExpiresAt: user.socialAccounts.twitter.expiresAt,
          tokenValid: new Date(user.socialAccounts.twitter.expiresAt) > new Date()
        });
      } catch (error) {
        console.log('❌ Twitter API test failed:', error.message);
        res.json({
          success: false,
          error: error.message,
          twitterConnected: false,
          tokenExpiresAt: user.socialAccounts.twitter.expiresAt,
          tokenValid: new Date(user.socialAccounts.twitter.expiresAt) > new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error testing Twitter connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Twitter connection'
      });
    }
  }

  // Validate content
  async validateContent(req, res) {
    try {
      const { content, platforms = [] } = req.body;

      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      if (!content || content.trim().length === 0) {
        validation.isValid = false;
        validation.errors.push('Content cannot be empty');
      }

      // Platform-specific validation
      for (const platform of platforms) {
        switch (platform) {
          case 'twitter':
            if (content.length > 280) {
              validation.errors.push('Twitter content exceeds 280 characters');
              validation.isValid = false;
            }
            break;
          case 'linkedin':
            if (content.length > 3000) {
              validation.warnings.push('LinkedIn posts over 3000 characters may be truncated');
            }
            break;
          case 'youtube':
            if (content.length > 5000) {
              validation.warnings.push('YouTube descriptions over 5000 characters may be truncated');
            }
            break;
        }
      }

      res.json({
        success: true,
        validation
      });

    } catch (error) {
      console.error('❌ Error validating content:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate content'
      });
    }
  }
}

module.exports = new PostController();