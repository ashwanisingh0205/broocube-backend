const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // Basic post information
  platform: {
    type: String,
    required: true,
    enum: ['twitter', 'youtube', 'instagram', 'linkedin', 'facebook'],
    trim: true
  },
  post_type: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed'],
    default: 'draft'
  },
  
  // Author reference
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Main content (common across platforms)
  content: {
    caption: {
      type: String,
      maxlength: 10000
    },
    hashtags: [{
      type: String,
      trim: true
    }],
    mentions: [{
      type: String,
      trim: true
    }]
  },

  // Platform-specific content
  platform_content: {
    // Twitter specific
    twitter: {
      thread: [{
        type: String,
        maxlength: 280
      }],
      reply_settings: {
        type: String,
        enum: ['everyone', 'following', 'mentioned'],
        default: 'everyone'
      },
      poll: {
        options: [{
          type: String,
          maxlength: 25
        }],
        duration_minutes: {
          type: Number,
          min: 5,
          max: 10080 // 7 days
        }
      }
    },
    
    // YouTube specific
    youtube: {
      title: {
        type: String,
        maxlength: 100,
        trim: true
      },
      description: {
        type: String,
        maxlength: 5000
      },
      tags: [{
        type: String,
        trim: true
      }],
      category: {
        type: String,
        enum: ['Entertainment', 'Education', 'Gaming', 'Music', 'News', 'Sports', 'Technology']
      },
      privacy_status: {
        type: String,
        enum: ['public', 'unlisted', 'private'],
        default: 'public'
      }
    },
    
    // Instagram specific
    instagram: {
      alt_text: String,
      location: {
        name: String
      }
    },
    
    // LinkedIn specific
    linkedin: {
      visibility: {
        type: String,
        enum: ['public', 'connections'],
        default: 'public'
      },
      article: {
        title: String,
        body: String
      }
    },
    
    // Facebook specific
    facebook: {
      link_preview: {
        url: String
      }
    }
  },

  // Media files
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif', 'document'],
      required: true
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String,
    thumbnail_url: String
  }],

  // Scheduling and publishing
  scheduling: {
    scheduled_for: Date,
    timezone: String
  },
  publishing: {
    published_at: Date,
    platform_post_id: String, // ID from the social platform
    platform_url: String // URL to the published post
  },

  // Analytics (updated after publishing)
  analytics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    engagement_rate: { type: Number, default: 0 }
  },

  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  
  version: {
    type: Number,
    default: 1
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  },

  // Error handling
  error: {
    message: String,
    code: String,
    occurred_at: Date
  }

}, {
  timestamps: true
});

// Indexes for better query performance
PostSchema.index({ author: 1, status: 1 });
PostSchema.index({ platform: 1, status: 1 });
PostSchema.index({ 'scheduling.scheduled_for': 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'publishing.published_at': -1 });

// Pre-save middleware
PostSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastEditedAt = new Date();
  }
  
  // Auto-increment version when content changes
  if (this.isModified('content') || this.isModified('platform_content')) {
    this.version += 1;
  }
  
  next();
});

// Virtual for post age
PostSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Method to check if post is scheduled
PostSchema.methods.isScheduled = function() {
  return this.status === 'scheduled' && this.scheduling.scheduled_for > new Date();
};

// Method to check if post can be published
PostSchema.methods.canPublish = function() {
  return this.status === 'draft' || this.status === 'scheduled';
};

// Static method to get posts by platform
PostSchema.statics.findByPlatform = function(platform, status = null) {
  const query = { platform };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get scheduled posts
PostSchema.statics.getScheduledPosts = function() {
  return this.find({ 
    status: 'scheduled',
    'scheduling.scheduled_for': { $gte: new Date() }
  }).sort({ 'scheduling.scheduled_for': 1 });
};

module.exports = mongoose.model('Post', PostSchema);