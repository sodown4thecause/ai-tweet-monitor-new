
import { PrismaClient } from '@prisma/client';

interface TrendingAnalysisResult {
  topTrendingTweets: Array<{
    id: string;
    content: string;
    engagementScore: number;
    trendingScore: number;
    account: string;
    createdAt: Date;
  }>;
  topTrendingTopics: Array<{
    topic: string;
    type: string;
    trendScore: number;
    velocity: number;
    mentionCount: number;
  }>;
  insights: {
    totalTrending: number;
    averageEngagement: number;
    topPerformingAccounts: string[];
    emergingTopics: string[];
  };
}

class TrendingAnalysisService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async analyzeTrends(hours: number = 24): Promise<TrendingAnalysisResult> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      // Calculate trending scores for tweets
      await this.calculateTweetTrendingScores(cutoffTime);

      // Calculate trending scores for topics
      await this.calculateTopicTrendingScores(cutoffTime);

      // Get trending tweets
      const topTrendingTweets = await this.getTopTrendingTweets(50);

      // Get trending topics
      const topTrendingTopics = await this.getTopTrendingTopics(20);

      // Generate insights
      const insights = await this.generateInsights(cutoffTime);

      return {
        topTrendingTweets,
        topTrendingTopics,
        insights
      };
    } catch (error) {
      console.error('Error analyzing trends:', error);
      throw error;
    }
  }

  private async calculateTweetTrendingScores(cutoffTime: Date): Promise<void> {
    try {
      // Get recent tweets with their analytics
      const tweets = await this.prisma.tweet.findMany({
        where: {
          createdAt: { gte: cutoffTime }
        },
        include: {
          analytics: {
            orderBy: { recordedAt: 'desc' },
            take: 5 // Last 5 analytics records for velocity calculation
          },
          account: true
        }
      });

      for (const tweet of tweets) {
        const trendingScore = this.calculateTweetTrendingScore(tweet);
        
        await this.prisma.tweet.update({
          where: { id: tweet.id },
          data: {
            trendingScore,
            isTrending: trendingScore > parseFloat(process.env.TRENDING_THRESHOLD || '50')
          }
        });
      }
    } catch (error) {
      console.error('Error calculating tweet trending scores:', error);
      throw error;
    }
  }

  private calculateTweetTrendingScore(tweet: any): number {
    const hoursOld = (Date.now() - tweet.createdAt.getTime()) / (1000 * 60 * 60);
    const ageWeight = Math.max(0.1, 1 - (hoursOld / 168)); // Decay over a week
    
    // Calculate velocity if we have analytics data
    let velocity = 0;
    if (tweet.analytics.length >= 2) {
      const latest = tweet.analytics[0];
      const previous = tweet.analytics[1];
      const timeDiff = (latest.recordedAt.getTime() - previous.recordedAt.getTime()) / (1000 * 60 * 60);
      
      if (timeDiff > 0) {
        const engagementDiff = latest.engagementScore - previous.engagementScore;
        velocity = engagementDiff / timeDiff; // Engagement per hour
      }
    }

    // Normalize by account follower count (if available)
    const followerNormalization = tweet.account.followerCount 
      ? Math.log10(tweet.account.followerCount + 1) / 10 
      : 1;

    // Combined trending score
    const baseScore = tweet.engagementScore * ageWeight;
    const velocityBoost = velocity * 10; // Weight velocity highly
    const normalizedScore = baseScore / followerNormalization;

    return Math.max(0, normalizedScore + velocityBoost);
  }

  private async calculateTopicTrendingScores(cutoffTime: Date): Promise<void> {
    try {
      const topics = await this.prisma.trendingTopic.findMany({
        where: {
          lastSeen: { gte: cutoffTime },
          isActive: true
        }
      });

      for (const topic of topics) {
        // Calculate velocity (mentions per hour in recent period)
        const recentMentions = await this.prisma.tweet.count({
          where: {
            OR: [
              { hashtags: { has: topic.topic } },
              { mentions: { has: topic.topic } }
            ],
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Last 6 hours
          }
        });

        const velocity = recentMentions / 6; // Mentions per hour

        // Calculate trend score based on total engagement and velocity
        const trendScore = (topic.engagementSum / Math.max(1, topic.mentionCount)) + (velocity * 100);

        await this.prisma.trendingTopic.update({
          where: { id: topic.id },
          data: {
            velocity,
            trendScore,
            isTrending: trendScore > 50 && velocity > 1
          }
        });
      }
    } catch (error) {
      console.error('Error calculating topic trending scores:', error);
      throw error;
    }
  }

  private async getTopTrendingTweets(limit: number): Promise<TrendingAnalysisResult['topTrendingTweets']> {
    const tweets = await this.prisma.tweet.findMany({
      where: {
        isTrending: true,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last week
      },
      include: {
        account: true
      },
      orderBy: { trendingScore: 'desc' },
      take: limit
    });

    return tweets.map(tweet => ({
      id: tweet.id,
      content: tweet.content,
      engagementScore: tweet.engagementScore,
      trendingScore: tweet.trendingScore,
      account: tweet.account.username,
      createdAt: tweet.createdAt
    }));
  }

  private async getTopTrendingTopics(limit: number): Promise<TrendingAnalysisResult['topTrendingTopics']> {
    const topics = await this.prisma.trendingTopic.findMany({
      where: {
        isTrending: true,
        isActive: true
      },
      orderBy: { trendScore: 'desc' },
      take: limit
    });

    return topics.map(topic => ({
      topic: topic.topic,
      type: topic.type,
      trendScore: topic.trendScore,
      velocity: topic.velocity,
      mentionCount: topic.mentionCount
    }));
  }

  private async generateInsights(cutoffTime: Date): Promise<TrendingAnalysisResult['insights']> {
    try {
      // Count total trending tweets
      const totalTrending = await this.prisma.tweet.count({
        where: {
          isTrending: true,
          createdAt: { gte: cutoffTime }
        }
      });

      // Calculate average engagement
      const avgEngagement = await this.prisma.tweet.aggregate({
        where: {
          createdAt: { gte: cutoffTime }
        },
        _avg: {
          engagementScore: true
        }
      });

      // Get top performing accounts
      const topAccounts = await this.prisma.tweet.groupBy({
        by: ['accountId'],
        where: {
          createdAt: { gte: cutoffTime }
        },
        _avg: {
          engagementScore: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _avg: {
            engagementScore: 'desc'
          }
        },
        take: 5
      });

      const topPerformingAccounts = await Promise.all(
        topAccounts.map(async (group) => {
          const account = await this.prisma.account.findUnique({
            where: { id: group.accountId },
            select: { username: true }
          });
          return account?.username || 'Unknown';
        })
      );

      // Get emerging topics (high velocity, recent appearance)
      const emergingTopics = await this.prisma.trendingTopic.findMany({
        where: {
          velocity: { gt: 2 },
          firstSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          isActive: true
        },
        orderBy: { velocity: 'desc' },
        take: 10,
        select: { topic: true }
      });

      return {
        totalTrending,
        averageEngagement: avgEngagement._avg.engagementScore || 0,
        topPerformingAccounts,
        emergingTopics: emergingTopics.map(t => t.topic)
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        totalTrending: 0,
        averageEngagement: 0,
        topPerformingAccounts: [],
        emergingTopics: []
      };
    }
  }

  async getAccountAnalytics(username: string, days: number = 30): Promise<{
    totalTweets: number;
    averageEngagement: number;
    topTweets: Array<{
      content: string;
      engagementScore: number;
      createdAt: Date;
    }>;
    trendingTweets: number;
    engagementTrend: Array<{
      date: string;
      engagement: number;
    }>;
  }> {
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const account = await this.prisma.account.findUnique({
      where: { username },
      include: {
        tweets: {
          where: {
            createdAt: { gte: cutoffTime }
          },
          orderBy: { engagementScore: 'desc' }
        }
      }
    });

    if (!account) {
      throw new Error(`Account @${username} not found`);
    }

    const totalTweets = account.tweets.length;
    const averageEngagement = totalTweets > 0 
      ? account.tweets.reduce((sum, tweet) => sum + tweet.engagementScore, 0) / totalTweets 
      : 0;

    const topTweets = account.tweets.slice(0, 10).map(tweet => ({
      content: tweet.content,
      engagementScore: tweet.engagementScore,
      createdAt: tweet.createdAt
    }));

    const trendingTweets = account.tweets.filter(tweet => tweet.isTrending).length;

    // Generate engagement trend data (daily aggregates)
    const engagementTrend = await this.generateEngagementTrend(account.id, days);

    return {
      totalTweets,
      averageEngagement,
      topTweets,
      trendingTweets,
      engagementTrend
    };
  }

  private async generateEngagementTrend(accountId: string, days: number): Promise<Array<{
    date: string;
    engagement: number;
  }>> {
    const results = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEngagement = await this.prisma.tweet.aggregate({
        where: {
          accountId,
          createdAt: {
            gte: date,
            lt: nextDate
          }
        },
        _avg: {
          engagementScore: true
        }
      });

      results.push({
        date: date.toISOString().split('T')[0],
        engagement: dayEngagement._avg.engagementScore || 0
      });
    }

    return results;
  }
}

export default TrendingAnalysisService;
export type { TrendingAnalysisResult };
