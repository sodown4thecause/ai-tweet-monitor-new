
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const account = searchParams.get('account');
    const trending = searchParams.get('trending') === 'true';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (account && account !== 'all') {
      where.account = { username: account };
    }
    if (trending) {
      where.isTrending = true;
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'engagement') {
      orderBy.engagementScore = order;
    } else if (sortBy === 'trending') {
      orderBy.trendingScore = order;
    } else {
      orderBy.createdAt = order;
    }

    const [tweets, total] = await Promise.all([
      prisma.tweet.findMany({
        where,
        include: {
          account: {
            select: { username: true, displayName: true, profileImageUrl: true }
          },
          _count: {
            select: { rewrites: true }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.tweet.count({ where })
    ]);

    return NextResponse.json({
      tweets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
}
