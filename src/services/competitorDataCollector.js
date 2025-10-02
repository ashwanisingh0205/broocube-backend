// src/services/competitorDataCollector.js
const twitterService = require('./social/twitter');
const youtubeService = require('./social/youtube');
const instagramService = require('./social/instagram');
const linkedinService = require('./social/linkedin');
const facebookService = require('./social/facebook');
const logger = require('../utils/logger');

class CompetitorDataCollector {
  constructor() {
    this.services = {
      twitter: twitterService,
      youtube: youtubeService,
      instagram: instagramService,
      linkedin: linkedinService,
      facebook: facebookService
    };
  }

  /**
   * Extract platform and username from social media URL
   * @param {string} profileUrl - Social media profile URL
   * @returns {Object} - {platform, username}
   */
  parseProfileUrl(profileUrl) {
    try {
      const url = new URL(profileUrl);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname;

      // Twitter/X
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        const username = pathname.split('/')[1];
        return { platform: 'twitter', username: username?.replace('@', '') };
      }

      // Instagram
      if (hostname.includes('instagram.com')) {
        const username = pathname.split('/')[1];
        return { platform: 'instagram', username: username?.replace('@', '') };
      }

      // YouTube
      if (hostname.includes('youtube.com')) {
        if (pathname.includes('/channel/')) {
          const channelId = pathname.split('/channel/')[1];
          return { platform: 'youtube', username: channelId, type: 'channel' };
        } else if (pathname.includes('/c/') || pathname.includes('/user/')) {
          const username = pathname.split('/').pop();
          return { platform: 'youtube', username, type: 'custom' };
        } else if (pathname.includes('/@')) {
          const username = pathname.replace('/@', '');
          return { platform: 'youtube', username, type: 'handle' };
        }
      }

      // LinkedIn
      if (hostname.includes('linkedin.com')) {
        if (pathname.includes('/in/')) {
          const username = pathname.split('/in/')[1]?.split('/')[0];
          return { platform: 'linkedin', username, type: 'personal' };
        } else if (pathname.includes('/company/')) {
          const username = pathname.split('/company/')[1]?.split('/')[0];
          return { platform: 'linkedin', username, type: 'company' };
        }
      }

      // Facebook
      if (hostname.includes('facebook.com')) {
        const username = pathname.split('/')[1];
        return { platform: 'facebook', username };
      }

      throw new Error('Unsupported platform or invalid URL format');
    } catch (error) {
      logger.error('Error parsing profile URL:', { profileUrl, error: error.message });
      throw new Error(`Invalid profile URL: ${error.message}`);
    }
  }

  /**
   * Collect comprehensive competitor profile data
   * @param {string} profileUrl - Social media profile URL
   * @param {Object} options - Collection options
   * @returns {Object} - Structured competitor data
   */
  async collectCompetitorData(profileUrl, options = {}) {
    try {
      const { platform, username, type } = this.parseProfileUrl(profileUrl);
      const service = this.services[platform];

      if (!service) {
        throw new Error(`Service not available for platform: ${platform}`);
      }

      logger.info('Collecting competitor data', { platform, username, profileUrl });

      // Get platform-specific data
      const profileData = await this.collectProfileData(service, platform, username, type, options);
      const contentData = await this.collectContentData(service, platform, username, options);
      const engagementData = await this.calculateEngagementMetrics(contentData);

      // Structure the collected data
      const competitorData = {
        profile: {
          platform,
          username,
          profileUrl,
          ...profileData
        },
        content: {
          posts: contentData.posts || [],
          totalPosts: contentData.totalPosts || 0,
          averagePostsPerWeek: contentData.averagePostsPerWeek || 0,
          contentTypes: contentData.contentTypes || {},
          topHashtags: contentData.topHashtags || [],
          postingSchedule: contentData.postingSchedule || {}
        },
        engagement: {
          ...engagementData,
          engagementRate: this.calculateEngagementRate(profileData, engagementData),
          growthRate: await this.estimateGrowthRate(service, platform, username)
        },
        audience: await this.analyzeAudience(service, platform, username, options),
        collectedAt: new Date(),
        dataQuality: this.assessDataQuality(profileData, contentData, engagementData)
      };

      logger.info('Competitor data collected successfully', {
        platform,
        username,
        postsCollected: contentData.posts?.length || 0,
        dataQuality: competitorData.dataQuality
      });

      return competitorData;

    } catch (error) {
      logger.error('Error collecting competitor data:', {
        profileUrl,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Collect profile data from specific platform
   */
  async collectProfileData(service, platform, username, type, options) {
    try {
      switch (platform) {
        case 'twitter':
          return await this.collectTwitterProfile(service, username);
        case 'instagram':
          return await this.collectInstagramProfile(service, username);
        case 'youtube':
          return await this.collectYouTubeProfile(service, username, type);
        case 'linkedin':
          return await this.collectLinkedInProfile(service, username, type);
        case 'facebook':
          return await this.collectFacebookProfile(service, username);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      logger.error(`Error collecting ${platform} profile:`, { username, error: error.message });
      return { error: error.message, platform, username };
    }
  }

  /**
   * Collect Twitter profile data
   */
  async collectTwitterProfile(service, username) {
    try {
      // Use Twitter API v2 to get user profile
      const profile = await service.getUserByUsername(username);
      
      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        description: profile.description,
        followers: profile.public_metrics?.followers_count || 0,
        following: profile.public_metrics?.following_count || 0,
        tweets: profile.public_metrics?.tweet_count || 0,
        listed: profile.public_metrics?.listed_count || 0,
        verified: profile.verified || false,
        profileImage: profile.profile_image_url,
        bannerImage: profile.header_image_url,
        location: profile.location,
        website: profile.url,
        createdAt: profile.created_at,
        isProtected: profile.protected || false
      };
    } catch (error) {
      logger.error('Twitter profile collection error:', { username, error: error.message });
      throw error;
    }
  }

  /**
   * Collect Instagram profile data
   */
  async collectInstagramProfile(service, username) {
    try {
      // Use Instagram Basic Display API or Graph API
      const profile = await service.getUserProfile(username);
      
      return {
        id: profile.id,
        username: profile.username,
        name: profile.full_name,
        biography: profile.biography,
        followers: profile.followers_count || 0,
        following: profile.follows_count || 0,
        posts: profile.media_count || 0,
        profileImage: profile.profile_picture_url,
        website: profile.external_url,
        isVerified: profile.is_verified || false,
        isPrivate: profile.is_private || false,
        businessCategory: profile.category_name,
        contactInfo: {
          email: profile.business_email,
          phone: profile.business_phone_number,
          address: profile.business_address
        }
      };
    } catch (error) {
      logger.error('Instagram profile collection error:', { username, error: error.message });
      throw error;
    }
  }

  /**
   * Collect YouTube profile data
   */
  async collectYouTubeProfile(service, username, type) {
    try {
      let channelData;
      
      if (type === 'channel') {
        channelData = await service.getChannelById(username);
      } else {
        channelData = await service.getChannelByUsername(username);
      }
      
      return {
        id: channelData.id,
        title: channelData.snippet?.title,
        description: channelData.snippet?.description,
        customUrl: channelData.snippet?.customUrl,
        publishedAt: channelData.snippet?.publishedAt,
        thumbnails: channelData.snippet?.thumbnails,
        subscribers: channelData.statistics?.subscriberCount || 0,
        videos: channelData.statistics?.videoCount || 0,
        views: channelData.statistics?.viewCount || 0,
        country: channelData.snippet?.country,
        keywords: channelData.brandingSettings?.channel?.keywords,
        uploads: channelData.contentDetails?.relatedPlaylists?.uploads
      };
    } catch (error) {
      logger.error('YouTube profile collection error:', { username, type, error: error.message });
      throw error;
    }
  }

  /**
   * Collect content data from platform
   */
  async collectContentData(service, platform, username, options = {}) {
    const maxPosts = options.maxPosts || 50;
    const timePeriod = options.timePeriodDays || 30;
    
    try {
      let posts = [];
      
      switch (platform) {
        case 'twitter':
          posts = await service.getUserTweets(username, { max_results: maxPosts });
          break;
        case 'instagram':
          posts = await service.getUserMedia(username, { limit: maxPosts });
          break;
        case 'youtube':
          posts = await service.getChannelVideos(username, { maxResults: maxPosts });
          break;
        case 'linkedin':
          posts = await service.getUserPosts(username, { count: maxPosts });
          break;
        case 'facebook':
          posts = await service.getPagePosts(username, { limit: maxPosts });
          break;
      }

      // Filter posts by time period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timePeriod);
      
      const recentPosts = posts.filter(post => {
        const postDate = new Date(post.created_time || post.created_at || post.publishedAt);
        return postDate >= cutoffDate;
      });

      // Analyze content patterns
      const contentAnalysis = this.analyzeContentPatterns(recentPosts, platform);

      return {
        posts: recentPosts,
        totalPosts: recentPosts.length,
        averagePostsPerWeek: (recentPosts.length / timePeriod) * 7,
        ...contentAnalysis
      };

    } catch (error) {
      logger.error(`Error collecting ${platform} content:`, { username, error: error.message });
      return { posts: [], totalPosts: 0, error: error.message };
    }
  }

  /**
   * Analyze content patterns
   */
  analyzeContentPatterns(posts, platform) {
    const contentTypes = {};
    const hashtags = {};
    const postingTimes = {};
    const postingDays = {};

    posts.forEach(post => {
      // Content type analysis
      const type = this.determineContentType(post, platform);
      contentTypes[type] = (contentTypes[type] || 0) + 1;

      // Hashtag analysis
      const postHashtags = this.extractHashtags(post.text || post.caption || '');
      postHashtags.forEach(tag => {
        hashtags[tag] = (hashtags[tag] || 0) + 1;
      });

      // Posting time analysis
      const postDate = new Date(post.created_time || post.created_at || post.publishedAt);
      const hour = postDate.getHours();
      const day = postDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      postingTimes[hour] = (postingTimes[hour] || 0) + 1;
      postingDays[day] = (postingDays[day] || 0) + 1;
    });

    // Get top hashtags
    const topHashtags = Object.entries(hashtags)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return {
      contentTypes,
      topHashtags,
      postingSchedule: {
        bestHours: this.getTopEntries(postingTimes, 5),
        bestDays: this.getTopEntries(postingDays, 3)
      }
    };
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagementMetrics(contentData) {
    const posts = contentData.posts || [];
    
    if (posts.length === 0) {
      return {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalEngagement: 0,
        engagementTrend: 'stable'
      };
    }

    const metrics = posts.reduce((acc, post) => {
      acc.likes += post.like_count || post.favorite_count || 0;
      acc.comments += post.comment_count || post.reply_count || 0;
      acc.shares += post.retweet_count || post.share_count || 0;
      return acc;
    }, { likes: 0, comments: 0, shares: 0 });

    const totalEngagement = metrics.likes + metrics.comments + metrics.shares;

    return {
      averageLikes: Math.round(metrics.likes / posts.length),
      averageComments: Math.round(metrics.comments / posts.length),
      averageShares: Math.round(metrics.shares / posts.length),
      totalEngagement,
      averageEngagement: Math.round(totalEngagement / posts.length),
      engagementTrend: this.calculateEngagementTrend(posts)
    };
  }

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(profileData, engagementData) {
    const followers = profileData.followers || profileData.subscribers || 1;
    const avgEngagement = engagementData.averageEngagement || 0;
    
    return followers > 0 ? ((avgEngagement / followers) * 100).toFixed(2) : 0;
  }

  /**
   * Estimate growth rate
   */
  async estimateGrowthRate(service, platform, username) {
    try {
      // This would require historical data or multiple data points
      // For now, return a placeholder that could be enhanced with actual tracking
      return {
        followersGrowthRate: 0, // Would need historical data
        engagementGrowthRate: 0, // Would need historical data
        estimatedMonthlyGrowth: 0,
        note: 'Growth rate calculation requires historical data tracking'
      };
    } catch (error) {
      logger.error('Error estimating growth rate:', { platform, username, error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Analyze audience demographics (limited by API availability)
   */
  async analyzeAudience(service, platform, username, options) {
    try {
      // Most platforms don't provide audience demographics for public profiles
      // This would be enhanced based on available API data
      return {
        note: 'Audience demographics require platform-specific API access',
        estimatedDemographics: {
          ageGroups: {},
          genderDistribution: {},
          topLocations: [],
          interests: []
        }
      };
    } catch (error) {
      logger.error('Error analyzing audience:', { platform, username, error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Assess data quality
   */
  assessDataQuality(profileData, contentData, engagementData) {
    let score = 0;
    const factors = [];

    // Profile data quality
    if (profileData && !profileData.error) {
      score += 30;
      factors.push('profile_data_available');
    }

    // Content data quality
    if (contentData.posts && contentData.posts.length > 0) {
      score += 40;
      factors.push('content_data_available');
      
      if (contentData.posts.length >= 10) {
        score += 10;
        factors.push('sufficient_content_sample');
      }
    }

    // Engagement data quality
    if (engagementData.totalEngagement > 0) {
      score += 20;
      factors.push('engagement_data_available');
    }

    return {
      score: Math.min(score, 100),
      level: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
      factors
    };
  }

  /**
   * Helper methods
   */
  determineContentType(post, platform) {
    // Platform-specific content type determination
    switch (platform) {
      case 'twitter':
        if (post.attachments?.media_keys) return 'media';
        if (post.referenced_tweets) return 'retweet';
        return 'text';
      case 'instagram':
        return post.media_type || 'image';
      case 'youtube':
        return 'video';
      default:
        return 'post';
    }
  }

  extractHashtags(text) {
    const hashtagRegex = /#[\w]+/g;
    return (text.match(hashtagRegex) || []).map(tag => tag.toLowerCase());
  }

  getTopEntries(obj, limit) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }));
  }

  calculateEngagementTrend(posts) {
    if (posts.length < 5) return 'insufficient_data';
    
    const recent = posts.slice(0, Math.floor(posts.length / 2));
    const older = posts.slice(Math.floor(posts.length / 2));
    
    const recentAvg = recent.reduce((sum, post) => {
      return sum + (post.like_count || 0) + (post.comment_count || 0);
    }, 0) / recent.length;
    
    const olderAvg = older.reduce((sum, post) => {
      return sum + (post.like_count || 0) + (post.comment_count || 0);
    }, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Batch collect multiple competitors
   */
  async collectMultipleCompetitors(profileUrls, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3; // Limit concurrent requests
    
    for (let i = 0; i < profileUrls.length; i += concurrency) {
      const batch = profileUrls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => 
        this.collectCompetitorData(url, options).catch(error => ({
          profileUrl: url,
          error: error.message,
          collectedAt: new Date()
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting delay between batches
      if (i + concurrency < profileUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}

module.exports = new CompetitorDataCollector();
