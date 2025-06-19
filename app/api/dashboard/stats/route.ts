
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalAccounts,
      activeAccounts,
      totalTweets,
      tweetsLast24h,
      trendingTweets,
      totalRewrites,
      topEngagementTweet,
      recentCollectionLogs,
      topTrendingTopics
    ] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { isActive: true } }),
      prisma.tweet.count(),
      prisma.tweet.count({ where: { createdAt: { gte: last24h } } }),
      prisma.tweet.count({ where: { isTrending: true } }),
      prisma.rewrite.count(),
      prisma.tweet.findFirst({
        orderBy: { engagementScore: 'desc' },
        include: { account: { select: { username: true } } },
        where: { createdAt: { gte: last7d } }
      }),
      prisma.collectionLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
      }),
      prisma.trendingTopic.findMany({
        where: { isTrending: true },
        orderBy: { trendScore: 'desc' },
        take: 10
      })
    ]);

    // Calculate engagement statistics
    const engagementStats = await prisma.tweet.aggregate({
      where: { createdAt: { gte: last7d } },
      _avg: { engagementScore: true },
      _max: { engagementScore: true },
      _sum: { 
        likeCount: true,
        retweetCount: true,
        replyCount: true,
        quoteCount: true
      }
    });

    // Get tweet volume by day for the last 7 days
    const tweetVolumeData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const count = await prisma.tweet.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      tweetVolumeData.push({
        date: date.toISOString().split('T')[0],
        tweets: count
      });
    }

    return NextResponse.json({
      overview: {
        totalAccounts,
        activeAccounts,
        totalTweets,
        tweetsLast24h,
        trendingTweets,
        totalRewrites
      },
      engagement: {
        averageScore: engagementStats._avg.engagementScore || 0,
        maxScore: engagementStats._max.engagementScore || 0,
        totalLikes: engagementStats._sum.likeCount || 0,
        totalRetweets: engagementStats._sum.retweetCount || 0,
        totalReplies: engagementStats._sum.replyCount || 0,
        totalQuotes: engagementStats._sum.quoteCount || 0
      },
      topTweet: topEngagementTweet,
      recentActivity: recentCollectionLogs,
      trendingTopics: topTrendingTopics,
      tweetVolume: tweetVolumeData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
