
import { TwitterApi } from 'twitter-api-v2';

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface TweetData {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ expanded_url: string }>;
  };
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
}

interface UserData {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics: {
    followers_count: number;
  };
  profile_image_url?: string;
}

class TwitterService {
  private client: TwitterApi;
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });
  }

  async getUserByUsername(username: string): Promise<UserData | null> {
    try {
      await this.checkRateLimit('users');
      
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['description', 'public_metrics', 'profile_image_url']
      });

      if (!user.data) {
        return null;
      }

      return {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        description: user.data.description,
        public_metrics: {
          followers_count: user.data.public_metrics?.followers_count || 0
        },
        profile_image_url: user.data.profile_image_url
      };
    } catch (error) {
      console.error(`Error fetching user ${username}:`, error);
      throw error;
    }
  }

  async getUserTweets(
    userId: string, 
    maxResults: number = 100,
    sinceId?: string
  ): Promise<TweetData[]> {
    try {
      await this.checkRateLimit('tweets');

      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: Math.min(maxResults, 100),
        since_id: sinceId,
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'entities',
          'referenced_tweets',
          'author_id'
        ],
        exclude: ['replies'] // Exclude replies to focus on original content
      });

      return tweets.data?.data?.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id || userId,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: {
          like_count: tweet.public_metrics?.like_count || 0,
          retweet_count: tweet.public_metrics?.retweet_count || 0,
          reply_count: tweet.public_metrics?.reply_count || 0,
          quote_count: tweet.public_metrics?.quote_count || 0,
        },
        entities: tweet.entities,
        referenced_tweets: tweet.referenced_tweets
      })) || [];
    } catch (error) {
      console.error(`Error fetching tweets for user ${userId}:`, error);
      throw error;
    }
  }

  async searchTweets(
    query: string,
    maxResults: number = 100,
    sinceId?: string
  ): Promise<TweetData[]> {
    try {
      await this.checkRateLimit('search');

      const tweets = await this.client.v2.search(query, {
        max_results: Math.min(maxResults, 100),
        since_id: sinceId,
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'entities',
          'referenced_tweets',
          'author_id'
        ]
      });

      return tweets.data?.data?.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id || '',
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: {
          like_count: tweet.public_metrics?.like_count || 0,
          retweet_count: tweet.public_metrics?.retweet_count || 0,
          reply_count: tweet.public_metrics?.reply_count || 0,
          quote_count: tweet.public_metrics?.quote_count || 0,
        },
        entities: tweet.entities,
        referenced_tweets: tweet.referenced_tweets
      })) || [];
    } catch (error) {
      console.error(`Error searching tweets with query "${query}":`, error);
      throw error;
    }
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(endpoint);

    if (tracker && now < tracker.resetTime) {
      if (tracker.count >= this.getRateLimit(endpoint)) {
        const waitTime = tracker.resetTime - now;
        console.log(`Rate limit reached for ${endpoint}. Waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    } else {
      // Reset tracker for new window
      this.rateLimitTracker.set(endpoint, {
        count: 0,
        resetTime: now + (15 * 60 * 1000) // 15 minutes
      });
    }

    // Increment count
    const currentTracker = this.rateLimitTracker.get(endpoint)!;
    currentTracker.count++;
  }

  private getRateLimit(endpoint: string): number {
    const limits: Record<string, number> = {
      'users': 300,      // 300 requests per 15 minutes
      'tweets': 300,     // 300 requests per 15 minutes
      'search': 300,     // 300 requests per 15 minutes
    };
    return limits[endpoint] || 100;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for tweet analysis
  extractHashtags(tweet: TweetData): string[] {
    return tweet.entities?.hashtags?.map(h => h.tag) || [];
  }

  extractMentions(tweet: TweetData): string[] {
    return tweet.entities?.mentions?.map(m => m.username) || [];
  }

  extractUrls(tweet: TweetData): string[] {
    return tweet.entities?.urls?.map(u => u.expanded_url) || [];
  }

  isRetweet(tweet: TweetData): boolean {
    return tweet.referenced_tweets?.some(ref => ref.type === 'retweeted') || false;
  }

  isReply(tweet: TweetData): boolean {
    return tweet.referenced_tweets?.some(ref => ref.type === 'replied_to') || false;
  }

  isQuote(tweet: TweetData): boolean {
    return tweet.referenced_tweets?.some(ref => ref.type === 'quoted') || false;
  }

  calculateEngagementScore(tweet: TweetData): number {
    const { like_count, retweet_count, reply_count, quote_count } = tweet.public_metrics;
    
    // Weighted engagement score (retweets and quotes have higher weight)
    return (like_count * 1) + (retweet_count * 3) + (reply_count * 2) + (quote_count * 4);
  }
}

export default TwitterService;
export type { TwitterConfig, TweetData, UserData };
