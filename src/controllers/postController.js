const Post = require('../models/Post');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const path = require('path');

class PostController {
  
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
        status = 'draft',
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

      const post = new Post({
        title,
        content,
        author: req.user._id,
        status,
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