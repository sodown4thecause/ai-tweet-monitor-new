
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import TrendingAnalysisService from '@/lib/services/trending-analysis-service';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const trendingService = new TrendingAnalysisService(prisma);
    const analytics = await trendingService.getAccountAnalytics(params.username, days);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching account analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account analytics' },
      { status: 500 }
    );
  }
}
