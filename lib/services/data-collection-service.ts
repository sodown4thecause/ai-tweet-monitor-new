
import { PrismaClient } from '@prisma/client';
import TwitterService, { TweetData, UserData } from './twitter-service';
import { calculateEngagementScore, extractTopics } from '../utils/analytics';

interface CollectionResult {
  success: boolean;
  accountsProcessed: number;
  tweetsCollected: number;
  errors: string[];
  duration: number;
}

class DataCollectionService {
  private prisma: PrismaClient;
  private twitterService: TwitterService;

  constructor(prisma: PrismaClient, twitterService: TwitterService) {
    this.prisma = prisma;
    this.twitterService = twitterService;
  }

  async collectAllAccountsData(): Promise<CollectionResult> {
    const startTime = Date.now();
    const result: CollectionResult = {
      success: true,
      accountsProcessed: 0,
      tweetsCollected: 0,
      errors: [],
      duration: 0
    };

    try {
      // Get all active accounts
      const accounts = await this.prisma.account.findMany({
        where: { isActive: true }
      });

      console.log(`Starting data collection for ${accounts.length} accounts`);

      for (const account of accounts) {
        try {
          const collectionResult = await this.collectAccountData(account.username);
          result.tweetsCollected += collectionResult.tweetsCollected;
          result.accountsProcessed++;
        } catch (error) {
          const errorMessage = `Failed to collect data for @${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      // Log collection summary
      await this.logCollectionResult(result);

      return result;
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push(`Collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      await this.logCollectionResult(result);
      throw error;
    }
  }

  async collectAccountData(username: string): Promise<{ tweetsCollected: number }> {
    const startTime = Date.now();
    let tweetsCollected = 0;

    try {
      // Get or create account record
      let account = await this.prisma.account.findUnique({
        where: { username }
      });

      if (!account) {
        // Create new account record
        const userData = await this.twitterService.getUserByUsername(username);
        if (!userData) {
          throw new Error(`User @${username} not found`);
        }

        account = await this.prisma.account.create({
          data: {
            username: userData.username,
            displayName: userData.name,
            description: userData.description,
            followerCount: userData.public_metrics.followers_count,
            profileImageUrl: userData.profile_image_url
          }
        });
      }

      // Get the latest tweet ID to avoid duplicates
      const latestTweet = await this.prisma.tweet.findFirst({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        select: { tweetId: true }
      });

      // Fetch tweets from Twitter API
      const tweets = await this.twitterService.getUserTweets(
        account.username,
        parseInt(process.env.MAX_TWEETS_PER_ACCOUNT || '100'),
        latestTweet?.tweetId
      );

      // Process and store tweets
      for (const tweetData of tweets) {
        try {
          await this.processTweet(tweetData, account.id);
          tweetsCollected++;
        } catch (error) {
          console.error(`Error processing tweet ${tweetData.id}:`, error);
        }
      }

      // Update account metadata
      if (tweets.length > 0) {
        const userData = await this.twitterService.getUserByUsername(username);
        if (userData) {
          await this.prisma.account.update({
            where: { id: account.id },
            data: {
              displayName: userData.name,
              description: userData.description,
              followerCount: userData.public_metrics.followers_count,
              profileImageUrl: userData.profile_image_url,
              updatedAt: new Date()
            }
          });
        }
      }

      // Log individual account collection
      await this.prisma.collectionLog.create({
        data: {
          accountId: account.id,
          tweetsCollected,
          apiCalls: Math.ceil(tweets.length / 100), // Estimate API calls
          status: 'SUCCESS',
          duration: Math.floor((Date.now() - startTime) / 1000),
          completedAt: new Date()
        }
      });

      return { tweetsCollected };
    } catch (error) {
      // Log failed collection
      await this.prisma.collectionLog.create({
        data: {
          accountId: null,
          tweetsCollected,
          errors: 1,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          duration: Math.floor((Date.now() - startTime) / 1000),
          completedAt: new Date()
        }
      });

      throw error;
    }
  }

  private async processTweet(tweetData: TweetData, accountId: string): Promise<void> {
    try {
      // Check if tweet already exists
      const existingTweet = await this.prisma.tweet.findUnique({
        where: { tweetId: tweetData.id }
      });

      if (existingTweet) {
        // Update engagement metrics if tweet exists
        const engagementScore = this.twitterService.calculateEngagementScore(tweetData);
        
        await this.prisma.tweet.update({
          where: { id: existingTweet.id },
          data: {
            likeCount: tweetData.public_metrics.like_count,
            retweetCount: tweetData.public_metrics.retweet_count,
            replyCount: tweetData.public_metrics.reply_count,
            quoteCount: tweetData.public_metrics.quote_count,
            engagementScore,
            normalizedScore: this.calculateNormalizedScore(engagementScore, accountId)
          }
        });

        // Store analytics snapshot
        await this.prisma.tweetAnalytics.create({
          data: {
            tweetId: existingTweet.id,
            likeCount: tweetData.public_metrics.like_count,
            retweetCount: tweetData.public_metrics.retweet_count,
            replyCount: tweetData.public_metrics.reply_count,
            quoteCount: tweetData.public_metrics.quote_count,
            engagementScore,
            hoursAfterPost: Math.floor(
              (Date.now() - new Date(tweetData.created_at).getTime()) / (1000 * 60 * 60)
            )
          }
        });

        return;
      }

      // Create new tweet record
      const engagementScore = this.twitterService.calculateEngagementScore(tweetData);
      const hashtags = this.twitterService.extractHashtags(tweetData);
      const mentions = this.twitterService.extractMentions(tweetData);
      const urls = this.twitterService.extractUrls(tweetData);

      await this.prisma.tweet.create({
        data: {
          tweetId: tweetData.id,
          accountId,
          content: tweetData.text,
          authorUsername: tweetData.author_id, // This would need username resolution in real implementation
          authorDisplayName: '', // This would need user data lookup
          createdAt: new Date(tweetData.created_at),
          likeCount: tweetData.public_metrics.like_count,
          retweetCount: tweetData.public_metrics.retweet_count,
          replyCount: tweetData.public_metrics.reply_count,
          quoteCount: tweetData.public_metrics.quote_count,
          engagementScore,
          normalizedScore: this.calculateNormalizedScore(engagementScore, accountId),
          hashtags,
          mentions,
          urls,
          isRetweet: this.twitterService.isRetweet(tweetData),
          isReply: this.twitterService.isReply(tweetData),
          isQuote: this.twitterService.isQuote(tweetData)
        }
      });

      // Update trending topics
      await this.updateTrendingTopics(hashtags, mentions, engagementScore);

    } catch (error) {
      console.error('Error processing tweet:', error);
      throw error;
    }
  }

  private calculateNormalizedScore(score: number, accountId: string): number {
    // Simple normalization - in production, this would consider account size, industry averages, etc.
    return Math.min(100, (score / 1000) * 100);
  }

  private async updateTrendingTopics(
    hashtags: string[], 
    mentions: string[], 
    engagementScore: number
  ): Promise<void> {
    const allTopics = [
      ...hashtags.map(tag => ({ topic: tag, type: 'HASHTAG' as const })),
      ...mentions.map(mention => ({ topic: mention, type: 'MENTION' as const }))
    ];

    for (const { topic, type } of allTopics) {
      try {
        await this.prisma.trendingTopic.upsert({
          where: { topic },
          update: {
            mentionCount: { increment: 1 },
            engagementSum: { increment: engagementScore },
            lastSeen: new Date(),
            isActive: true
          },
          create: {
            topic,
            type,
            mentionCount: 1,
            engagementSum: engagementScore,
            trendScore: engagementScore,
            velocity: 0,
            isActive: true,
            isTrending: false
          }
        });
      } catch (error) {
        console.error(`Error updating trending topic ${topic}:`, error);
      }
    }
  }

  private async logCollectionResult(result: CollectionResult): Promise<void> {
    try {
      await this.prisma.collectionLog.create({
        data: {
          tweetsCollected: result.tweetsCollected,
          apiCalls: result.accountsProcessed * 2, // Estimate
          errors: result.errors.length,
          status: result.success ? 'SUCCESS' : 'FAILED',
          errorMessage: result.errors.join('; '),
          duration: Math.floor(result.duration / 1000),
          completedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error logging collection result:', error);
    }
  }
}

export default DataCollectionService;
export type { CollectionResult };
