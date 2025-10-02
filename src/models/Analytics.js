// src/models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
  },
  platform: {
    type: String,
    required: [true, 'Platform is required'],
    enum: ['youtube', 'instagram', 'twitter', 'linkedin', 'facebook']
  },
  post_id: {
    type: String,
    required: [true, 'Post ID is required']
  },
  post_type: {
    type: String,
    enum: ['post', 'story', 'reel', 'video', 'live', 'carousel', 'poll'],
    required: true
  },
  content: {
    caption: String,
    hashtags: [String],
    mentions: [String],
    media_type: {
      type: String,
      enum: ['image', 'video', 'carousel', 'text']
    },
    media_count: {
      type: Number,
      default: 1
    }
  },
  metrics: {
    followers: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    saves: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    reach: {
      type: Number,
      default: 0,
      min: 0
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    engagement_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    click_through_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  demographics: {
    age_groups: {
      '13-17': Number,
      '18-24': Number,
      '25-34': Number,
      '35-44': Number,
      '45-54': Number,
      '55-64': Number,
      '65+': Number
    },
    gender: {
      male: Number,
      female: Number,
      other: Number
    },
    locations: [{
      country: String,
      city: String,
      percentage: Number
    }],
    languages: [{
      language: String,
      percentage: Number
    }]
  },
  timing: {
    posted_at: {
      type: Date,
      required: true
    },
    best_performing_hour: Number,
    best_performing_day: String,
    peak_engagement_time: Date
  },
  hashtag_performance: [{
    hashtag: String,
    reach: Number,
    engagement: Number,
    posts_count: Number
  }],
  competitor_analysis: {
    similar_posts: [{
      post_id: String,
      platform: String,
      engagement_rate: Number,
      reach: Number
    }],
    industry_average: {
      engagement_rate: Number,
      reach: Number,
      likes: Number
    }
  },
  ai_insights: {
    content_score: {
      type: Number,
      min: 0,
      max: 100
    },
    engagement_prediction: {
      type: Number,
      min: 0,
      max: 100
    },
    optimal_posting_time: Date,
    suggested_hashtags: [String],
    content_suggestions: [String],
    improvement_areas: [String]
  },
  trends: {
    viral_potential: {
      type: Number,
      min: 0,
      max: 100
    },
    trending_topics: [String],
    seasonal_factors: [String],
    event_correlation: [String]
  },
  performance_indicators: {
    is_viral: {
      type: Boolean,
      default: false
    },
    is_trending: {
      type: Boolean,
      default: false
    },
    growth_rate: {
      type: Number,
      default: 0
    },
    quality_score: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  captured_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  },
  data_source: {
    type: String,
    enum: ['api', 'manual', 'scraped', 'imported'],
    default: 'api'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
analyticsSchema.index({ user_id: 1, platform: 1 });
analyticsSchema.index({ campaign_id: 1 });
analyticsSchema.index({ platform: 1, 'timing.posted_at': -1 });
analyticsSchema.index({ 'metrics.engagement_rate': -1 });
analyticsSchema.index({ 'performance_indicators.is_viral': 1 });
analyticsSchema.index({ captured_at: -1 });

// Virtual for total engagement
analyticsSchema.virtual('totalEngagement').get(function() {
  return this.metrics.likes + this.metrics.comments + this.metrics.shares + this.metrics.saves;
});

// Virtual for engagement rate calculation
analyticsSchema.virtual('calculatedEngagementRate').get(function() {
  if (this.metrics.followers === 0) return 0;
  return ((this.totalEngagement / this.metrics.followers) * 100).toFixed(2);
});

// Virtual for days since posted
analyticsSchema.virtual('daysSincePosted').get(function() {
  const now = new Date();
  const posted = new Date(this.timing.posted_at);
  const diffTime = now - posted;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate engagement rate
analyticsSchema.pre('save', function(next) {
  if (this.metrics.followers > 0) {
    this.metrics.engagement_rate = parseFloat(this.calculatedEngagementRate);
  }
  this.last_updated = new Date();
  next();
});

// Static method to find analytics by user
analyticsSchema.statics.findByUser = function(userId, platform = null) {
  const query = { user_id: userId };
  if (platform) query.platform = platform;
  return this.find(query).sort({ 'timing.posted_at': -1 });
};

// Static method to find analytics by campaign
analyticsSchema.statics.findByCampaign = function(campaignId) {
  return this.find({ campaign_id: campaignId }).sort({ 'timing.posted_at': -1 });
};

// Static method to find top performing posts
analyticsSchema.statics.findTopPerforming = function(limit = 10) {
  return this.find({})
    .sort({ 'metrics.engagement_rate': -1 })
    .limit(limit);
};

// Static method to find viral posts
analyticsSchema.statics.findViral = function() {
  return this.find({ 'performance_indicators.is_viral': true });
};

// Static method to get platform statistics
analyticsSchema.statics.getPlatformStats = function(platform) {
  return this.aggregate([
    { $match: { platform: platform } },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        avgEngagement: { $avg: '$metrics.engagement_rate' },
        avgReach: { $avg: '$metrics.reach' },
        avgLikes: { $avg: '$metrics.likes' },
        totalViews: { $sum: '$metrics.views' }
      }
    }
  ]);
};

// Instance method to update metrics
analyticsSchema.methods.updateMetrics = function(newMetrics) {
  Object.assign(this.metrics, newMetrics);
  this.last_updated = new Date();
  return this.save();
};

// Instance method to mark as viral
analyticsSchema.methods.markAsViral = function() {
  this.performance_indicators.is_viral = true;
  this.performance_indicators.quality_score = Math.min(100, this.performance_indicators.quality_score + 20);
  return this.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);
