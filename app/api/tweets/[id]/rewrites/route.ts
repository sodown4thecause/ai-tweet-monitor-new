
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAIService from '@/lib/services/openai-service';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rewrites = await prisma.rewrite.findMany({
      where: { tweetId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rewrites);
  } catch (error) {
    console.error('Error fetching rewrites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewrites' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { style, tone } = await request.json();

    // Get the original tweet
    const tweet = await prisma.tweet.findUnique({
      where: { id: params.id }
    });

    if (!tweet) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Generate rewrite using OpenAI
    const openaiService = new OpenAIService(openaiApiKey);
    const rewriteResult = await openaiService.rewriteTweet({
      originalTweet: tweet.content,
      style: style || 'ENGAGING',
      tone: tone || 'PROFESSIONAL'
    });

    // Calculate similarity score
    const similarityScore = await openaiService.calculateSimilarity(
      tweet.content,
      rewriteResult.rewrittenContent
    );

    // Save rewrite to database
    const rewrite = await prisma.rewrite.create({
      data: {
        tweetId: tweet.id,
        originalContent: tweet.content,
        rewrittenContent: rewriteResult.rewrittenContent,
        style: style || 'ENGAGING',
        tone: tone || 'PROFESSIONAL',
        similarityScore,
        engagementPrediction: rewriteResult.engagementPrediction,
        qualityScore: rewriteResult.qualityScore,
      }
    });

    return NextResponse.json(rewrite, { status: 201 });
  } catch (error) {
    console.error('Error generating rewrite:', error);
    return NextResponse.json(
      { error: 'Failed to generate rewrite' },
      { status: 500 }
    );
  }
}
