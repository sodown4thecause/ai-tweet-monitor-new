
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import TwitterService from '@/lib/services/twitter-service';
import DataCollectionService from '@/lib/services/data-collection-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { accounts } = await request.json();

    // Check if Twitter API credentials are configured
    const twitterConfig = {
      apiKey: process.env.TWITTER_API_KEY!,
      apiSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    };

    if (!twitterConfig.apiKey || !twitterConfig.apiSecret) {
      return NextResponse.json(
        { error: 'Twitter API credentials not configured' },
        { status: 500 }
      );
    }

    const twitterService = new TwitterService(twitterConfig);
    const collectionService = new DataCollectionService(prisma, twitterService);

    let result;

    if (accounts && accounts.length > 0) {
      // Collect data for specific accounts
      let totalTweets = 0;
      const errors: string[] = [];

      for (const username of accounts) {
        try {
          const accountResult = await collectionService.collectAccountData(username);
          totalTweets += accountResult.tweetsCollected;
        } catch (error) {
          errors.push(`Failed to collect data for @${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result = {
        success: errors.length === 0,
        accountsProcessed: accounts.length,
        tweetsCollected: totalTweets,
        errors,
        duration: 0
      };
    } else {
      // Collect data for all active accounts
      result = await collectionService.collectAllAccountsData();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running collection:', error);
    return NextResponse.json(
      { error: 'Failed to run collection' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get recent collection logs
    const logs = await prisma.collectionLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching collection logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection logs' },
      { status: 500 }
    );
  }
}
