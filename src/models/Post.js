// src/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    validate: {
      validator: async function(userId) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && user.role === 'creator';
      },
      message: 'User ID must reference a valid creator user'
    }
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
  },
  platform: {
    type: String,
    required: [true, 'Platform is required'],
    enum: ['instagram', 'youtube', 'twitter', 'linkedin', 'facebook']
  },
  post_type: {
    type: String,
    enum: ['post', 'story', 'reel', 'video', 'live', 'carousel', 'poll', 'short'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed', 'cancelled'],
    default: 'draft'
  },
  
  // Common content fields
  content: {
    caption: {
      type: String,
      maxlength: [10000, 'Caption cannot exceed 10000 characters']
    },
    hashtags: [String],
    mentions: [String]
  },

  // Platform-specific content
  instagram_content: {
    alt_text: String,
    location: {
      name: String,
      lat: Number,
      lng: Number
    },
    product_tags: [{
      product_id: String,
      x: Number,
      y: Number
    }],
    story_stickers: [{
      type: {
        type: String,
        enum: ['poll', 'question', 'quiz', 'countdown', 'slider']
      },
      text: String,
      options: [String]
    }],
    carousel_children: [{
      media_type: {
        type: String,
        enum: ['image', 'video']
      },
      media_url: String,
      alt_text: String
    }]
  },

  youtube_content: {
    title: {
      type: String,
      maxlength: [100, 'YouTube title cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [5000, 'YouTube description cannot exceed 5000 characters']
    },
    tags: [String],
    category_id: String,
    privacy_status: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public'
    },
    thumbnail_url: String,
    playlist_id: String,
    shorts_settings: {
      is_short: {
        type: Boolean,
        default: false
      },
      short_description: String
    }
  },

  twitter_content: {
    thread: [{
      text: {
        type: String,
        maxlength: [280, 'Tweet cannot exceed 280 characters']
      },
      order: Number
    }],
    reply_settings: {
      type: String,
      enum: ['everyone', 'following', 'mentioned'],
      default: 'everyone'
    },
    poll: {
      question: String,
      options: [{
        type: String,
        maxlength: [25, 'Poll option cannot exceed 25 characters']
      }],
      duration_minutes: {
        type: Number,
        min: 5,
        max: 10080,
        default: 1440
      }
    }
  },

  linkedin_content: {
    article: {
      title: String,
      body: String,
      summary: String
    },
    visibility: {
      type: String,
      enum: ['public', 'connections'],
      default: 'public'
    },
    target_audience: {
      geo_locations: [String],
      industries: [String],
      job_functions: [String]
    }
  },

  facebook_content: {
    link_preview: {
      url: String,
      title: String,
      description: String,
      image_url: String
    },
    event_details: {
      name: String,
      start_time: Date,
      end_time: Date,
      location: String,
      description: String
    },
    targeting: {
      age_min: Number,
      age_max: Number,
      genders: [String],
      interests: [String],
      locations: [String]
    }
  },


  // Media files
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    size: Number,
    duration: Number, // for video/audio
    dimensions: {
      width: Number,
      height: Number
    },
    thumbnail_url: String,
    alt_text: String,
    order: {
      type: Number,
      default: 0
    }
  }],

  // Scheduling
  scheduling: {
    scheduled_for: Date,
    timezone: {
      type: String,
      default: 'UTC'
    },
    auto_publish: {
      type: Boolean,
      default: false
    },
    optimal_time_suggestion: {
      suggested_time: Date,
      confidence_score: Number,
      reasoning: String
    }
  },

  // Publishing details
  publishing: {
    published_at: Date,
    platform_post_id: String,
    platform_url: String,
    error_message: String,
    retry_count: {
      type: Number,
      default: 0
    },
    last_retry_at: Date
  },

  // Analytics tracking
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    engagement_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    last_updated: Date
  },

  // AI suggestions
  ai_suggestions: {
    caption_suggestions: [String],
    hashtag_suggestions: [String],
    optimal_posting_time: Date,
    engagement_prediction: {
      score: Number,
      factors: [String]
    },
    content_score: {
      overall: Number,
      readability: Number,
      sentiment: Number,
      trending_relevance: Number
    }
  },

  // Metadata
  metadata: {
    draft_version: {
      type: Number,
      default: 1
    },
    is_template: {
      type: Boolean,
      default: false
    },
    template_name: String,
    tags: [String],
    notes: String,
    collaborators: [{
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['editor', 'reviewer', 'viewer']
      },
      permissions: [String]
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
postSchema.index({ user_id: 1, platform: 1 });
postSchema.index({ status: 1 });
postSchema.index({ 'scheduling.scheduled_for': 1 });
postSchema.index({ platform: 1, post_type: 1 });
postSchema.index({ createdAt: -1 });

// Virtual for engagement rate calculation
postSchema.virtual('calculated_engagement_rate').get(function() {
  const totalEngagement = this.analytics.likes + this.analytics.comments + this.analytics.shares;
  return this.analytics.reach > 0 ? (totalEngagement / this.analytics.reach) * 100 : 0;
});

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Auto-generate hashtags from content if not provided
  if (this.content.caption && (!this.content.hashtags || this.content.hashtags.length === 0)) {
    const hashtagRegex = /#[\w]+/g;
    const hashtags = this.content.caption.match(hashtagRegex);
    if (hashtags) {
      this.content.hashtags = hashtags.map(tag => tag.substring(1));
    }
  }

  // Auto-generate mentions from content if not provided
  if (this.content.caption && (!this.content.mentions || this.content.mentions.length === 0)) {
    const mentionRegex = /@[\w]+/g;
    const mentions = this.content.caption.match(mentionRegex);
    if (mentions) {
      this.content.mentions = mentions.map(mention => mention.substring(1));
    }
  }

  // Validate platform-specific content
  if (this.platform === 'youtube' && this.post_type === 'video') {
    if (!this.youtube_content.title) {
      return next(new Error('YouTube video title is required'));
    }
  }

  if (this.platform === 'twitter' && this.content.caption && this.content.caption.length > 280) {
    return next(new Error('Twitter post cannot exceed 280 characters'));
  }

  next();
});

// Static methods
postSchema.statics.findByUser = function(userId, filters = {}) {
  return this.find({ user_id: userId, ...filters })
    .populate('campaign_id', 'title')
    .sort({ createdAt: -1 });
};

postSchema.statics.findByPlatform = function(platform, filters = {}) {
  return this.find({ platform, ...filters })
    .populate('user_id', 'name email')
    .sort({ createdAt: -1 });
};

postSchema.statics.findScheduled = function() {
  return this.find({
    status: 'scheduled',
    'scheduling.scheduled_for': { $lte: new Date() }
  });
};

postSchema.statics.getAnalyticsSummary = function(userId, platform = null) {
  const match = { user_id: mongoose.Types.ObjectId(userId) };
  if (platform) match.platform = platform;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$platform',
        total_posts: { $sum: 1 },
        total_views: { $sum: '$analytics.views' },
        total_likes: { $sum: '$analytics.likes' },
        total_comments: { $sum: '$analytics.comments' },
        total_shares: { $sum: '$analytics.shares' },
        avg_engagement_rate: { $avg: '$analytics.engagement_rate' }
      }
    }
  ]);
};

// Instance methods
postSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishing.published_at = new Date();
  return this.save();
};

postSchema.methods.schedule = function(scheduledFor) {
  this.status = 'scheduled';
  this.scheduling.scheduled_for = scheduledFor;
  return this.save();
};

postSchema.methods.updateAnalytics = function(analyticsData) {
  Object.assign(this.analytics, analyticsData);
  this.analytics.last_updated = new Date();
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);
