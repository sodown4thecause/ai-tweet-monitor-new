
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import TrendingAnalysisService from '@/lib/services/trending-analysis-service';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');

    const trendingService = new TrendingAnalysisService(prisma);
    const analysis = await trendingService.analyzeTrends(hours);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trends' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const trendingService = new TrendingAnalysisService(prisma);
    const analysis = await trendingService.analyzeTrends(24);

    return NextResponse.json({
      message: 'Trending analysis completed',
      analysis
    });
  } catch (error) {
    console.error('Error running trending analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run trending analysis' },
      { status: 500 }
    );
  }
}
