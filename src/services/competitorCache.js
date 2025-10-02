// src/services/competitorCache.js
const redis = require('../config/redis');
const logger = require('../utils/logger');

class CompetitorCache {
  constructor() {
    this.redis = redis;
    this.defaultTTL = 24 * 60 * 60; // 24 hours in seconds
    this.keyPrefix = 'competitor:';
  }

  /**
   * Generate cache key for competitor data
   */
  generateKey(profileUrl, options = {}) {
    const { maxPosts = 50, timePeriodDays = 30 } = options;
    const baseKey = Buffer.from(profileUrl).toString('base64').slice(0, 20);
    return `${this.keyPrefix}${baseKey}:${maxPosts}:${timePeriodDays}`;
  }

  /**
   * Get competitor data from cache
   */
  async get(profileUrl, options = {}) {
    try {
      const key = this.generateKey(profileUrl, options);
      const cachedData = await this.redis.get(key);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        
        // Check if data is still fresh (not older than TTL)
        const now = new Date();
        const cachedAt = new Date(data.cachedAt);
        const ageInHours = (now - cachedAt) / (1000 * 60 * 60);
        
        if (ageInHours < 24) { // Data is fresh
          logger.info('Competitor data cache hit', {
            profileUrl,
            ageInHours: ageInHours.toFixed(2),
            key
          });
          return data.competitorData;
        } else {
          // Data is stale, remove it
          await this.redis.del(key);
          logger.info('Stale competitor data removed from cache', { profileUrl, key });
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting competitor data from cache:', {
        profileUrl,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set competitor data in cache
   */
  async set(profileUrl, competitorData, options = {}) {
    try {
      const key = this.generateKey(profileUrl, options);
      const cacheData = {
        competitorData,
        cachedAt: new Date().toISOString(),
        profileUrl,
        options
      };

      await this.redis.setex(key, this.defaultTTL, JSON.stringify(cacheData));
      
      logger.info('Competitor data cached', {
        profileUrl,
        key,
        dataSize: JSON.stringify(cacheData).length,
        ttl: this.defaultTTL
      });

      return true;
    } catch (error) {
      logger.error('Error setting competitor data in cache:', {
        profileUrl,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete competitor data from cache
   */
  async delete(profileUrl, options = {}) {
    try {
      const key = this.generateKey(profileUrl, options);
      const result = await this.redis.del(key);
      
      logger.info('Competitor data deleted from cache', {
        profileUrl,
        key,
        deleted: result > 0
      });

      return result > 0;
    } catch (error) {
      logger.error('Error deleting competitor data from cache:', {
        profileUrl,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get multiple competitor data from cache
   */
  async getMultiple(profileUrls, options = {}) {
    try {
      const keys = profileUrls.map(url => this.generateKey(url, options));
      const cachedData = await this.redis.mget(keys);
      
      const results = {};
      const hits = [];
      const misses = [];

      for (let i = 0; i < profileUrls.length; i++) {
        const url = profileUrls[i];
        const data = cachedData[i];
        
        if (data) {
          try {
            const parsedData = JSON.parse(data);
            const now = new Date();
            const cachedAt = new Date(parsedData.cachedAt);
            const ageInHours = (now - cachedAt) / (1000 * 60 * 60);
            
            if (ageInHours < 24) {
              results[url] = parsedData.competitorData;
              hits.push(url);
            } else {
              misses.push(url);
              // Clean up stale data
              await this.redis.del(keys[i]);
            }
          } catch (parseError) {
            logger.error('Error parsing cached competitor data:', {
              profileUrl: url,
              error: parseError.message
            });
            misses.push(url);
          }
        } else {
          misses.push(url);
        }
      }

      logger.info('Competitor data batch cache lookup', {
        total: profileUrls.length,
        hits: hits.length,
        misses: misses.length,
        hitRate: ((hits.length / profileUrls.length) * 100).toFixed(1) + '%'
      });

      return { results, hits, misses };
    } catch (error) {
      logger.error('Error getting multiple competitor data from cache:', {
        profileUrls,
        error: error.message
      });
      return { results: {}, hits: [], misses: profileUrls };
    }
  }

  /**
   * Set multiple competitor data in cache
   */
  async setMultiple(competitorDataMap, options = {}) {
    try {
      const pipeline = this.redis.pipeline();
      const operations = [];

      for (const [profileUrl, competitorData] of Object.entries(competitorDataMap)) {
        const key = this.generateKey(profileUrl, options);
        const cacheData = {
          competitorData,
          cachedAt: new Date().toISOString(),
          profileUrl,
          options
        };

        pipeline.setex(key, this.defaultTTL, JSON.stringify(cacheData));
        operations.push({ profileUrl, key });
      }

      await pipeline.exec();

      logger.info('Multiple competitor data cached', {
        count: operations.length,
        ttl: this.defaultTTL
      });

      return true;
    } catch (error) {
      logger.error('Error setting multiple competitor data in cache:', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if competitor data exists in cache
   */
  async exists(profileUrl, options = {}) {
    try {
      const key = this.generateKey(profileUrl, options);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Error checking competitor data existence in cache:', {
        profileUrl,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;
      const platformStats = {};
      
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsedData = JSON.parse(data);
            const now = new Date();
            const cachedAt = new Date(parsedData.cachedAt);
            const ageInHours = (now - cachedAt) / (1000 * 60 * 60);
            
            totalSize += data.length;
            
            if (ageInHours < 24) {
              validEntries++;
              const platform = parsedData.competitorData?.profile?.platform || 'unknown';
              platformStats[platform] = (platformStats[platform] || 0) + 1;
            } else {
              expiredEntries++;
            }
          }
        } catch (parseError) {
          expiredEntries++;
        }
      }

      return {
        totalKeys: keys.length,
        validEntries,
        expiredEntries,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        platformDistribution: platformStats,
        hitRateEstimate: validEntries > 0 ? ((validEntries / (validEntries + expiredEntries)) * 100).toFixed(1) + '%' : '0%'
      };
    } catch (error) {
      logger.error('Error getting cache statistics:', { error: error.message });
      return null;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup() {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsedData = JSON.parse(data);
            const now = new Date();
            const cachedAt = new Date(parsedData.cachedAt);
            const ageInHours = (now - cachedAt) / (1000 * 60 * 60);
            
            if (ageInHours >= 24) {
              await this.redis.del(key);
              cleanedCount++;
            }
          } else {
            // Key exists but no data, clean it up
            await this.redis.del(key);
            cleanedCount++;
          }
        } catch (parseError) {
          // Invalid data, clean it up
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      logger.info('Competitor cache cleanup completed', {
        totalKeys: keys.length,
        cleanedCount,
        remainingKeys: keys.length - cleanedCount
      });

      return cleanedCount;
    } catch (error) {
      logger.error('Error during cache cleanup:', { error: error.message });
      return 0;
    }
  }

  /**
   * Clear all competitor cache
   */
  async clear() {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info('Competitor cache cleared', { deletedKeys: keys.length });
      return keys.length;
    } catch (error) {
      logger.error('Error clearing competitor cache:', { error: error.message });
      return 0;
    }
  }

  /**
   * Warm up cache with popular competitors
   */
  async warmUp(popularCompetitors = []) {
    try {
      logger.info('Starting competitor cache warm-up', {
        competitorsCount: popularCompetitors.length
      });

      // This would be called with a list of popular competitor URLs
      // to pre-populate the cache during off-peak hours
      
      return true;
    } catch (error) {
      logger.error('Error during cache warm-up:', { error: error.message });
      return false;
    }
  }
}

module.exports = new CompetitorCache();
