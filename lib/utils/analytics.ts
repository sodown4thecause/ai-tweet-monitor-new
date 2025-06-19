
// Utility functions for analytics calculations

export function calculateEngagementScore(
  likes: number,
  retweets: number,
  replies: number,
  quotes: number
): number {
  // Weighted engagement score
  return (likes * 1) + (retweets * 3) + (replies * 2) + (quotes * 4);
}

export function calculateNormalizedScore(
  engagementScore: number,
  followerCount: number,
  hoursOld: number
): number {
  // Normalize by follower count and age
  const followerNormalization = Math.log10(followerCount + 1) / 10;
  const ageWeight = Math.max(0.1, 1 - (hoursOld / 168)); // Decay over a week
  
  return (engagementScore / followerNormalization) * ageWeight;
}

export function extractTopics(content: string): {
  hashtags: string[];
  mentions: string[];
  keywords: string[];
} {
  const hashtagRegex = /#(\w+)/g;
  const mentionRegex = /@(\w+)/g;
  
  const hashtags = Array.from(content.matchAll(hashtagRegex), m => m[1]);
  const mentions = Array.from(content.matchAll(mentionRegex), m => m[1]);
  
  // Extract keywords (simple approach - can be enhanced with NLP)
  const keywords = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !isStopWord(word))
    .slice(0, 5); // Top 5 keywords

  return { hashtags, mentions, keywords };
}

function isStopWord(word: string): boolean {
  const stopWords = [
    'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
    'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
    'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
    'such', 'take', 'than', 'them', 'well', 'were'
  ];
  
  return stopWords.includes(word);
}

export function calculateTrendVelocity(
  currentMentions: number,
  previousMentions: number,
  timeWindow: number
): number {
  if (timeWindow <= 0 || previousMentions === 0) return 0;
  
  return ((currentMentions - previousMentions) / previousMentions) / timeWindow;
}

export function getEngagementCategory(score: number): 'low' | 'medium' | 'high' | 'viral' {
  if (score < 10) return 'low';
  if (score < 100) return 'medium';
  if (score < 1000) return 'high';
  return 'viral';
}

export function formatEngagementScore(score: number): string {
  if (score >= 1000000) {
    return (score / 1000000).toFixed(1) + 'M';
  }
  if (score >= 1000) {
    return (score / 1000).toFixed(1) + 'K';
  }
  return score.toString();
}

export function calculateSimilarityScore(text1: string, text2: string): number {
  // Simple Jaccard similarity for now - can be enhanced with semantic similarity
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return intersection.size / union.size;
}

export function generateTrendingInsights(data: {
  tweets: Array<{ engagementScore: number; createdAt: Date; content: string }>;
  topics: Array<{ topic: string; mentionCount: number; velocity: number }>;
}): {
  insights: string[];
  recommendations: string[];
} {
  const insights: string[] = [];
  const recommendations: string[] = [];

  // Analyze tweet patterns
  const avgEngagement = data.tweets.reduce((sum, t) => sum + t.engagementScore, 0) / data.tweets.length;
  const topTweets = data.tweets.filter(t => t.engagementScore > avgEngagement * 2);
  
  if (topTweets.length > 0) {
    insights.push(`${topTweets.length} tweets are performing exceptionally well (2x above average)`);
  }

  // Analyze trending topics
  const fastGrowingTopics = data.topics.filter(t => t.velocity > 5);
  if (fastGrowingTopics.length > 0) {
    insights.push(`${fastGrowingTopics.length} topics are rapidly gaining traction`);
    recommendations.push(`Consider creating content around: ${fastGrowingTopics.slice(0, 3).map(t => t.topic).join(', ')}`);
  }

  // Time-based insights
  const recentTweets = data.tweets.filter(t => 
    Date.now() - t.createdAt.getTime() < 24 * 60 * 60 * 1000
  );
  
  if (recentTweets.length > 0) {
    const recentAvg = recentTweets.reduce((sum, t) => sum + t.engagementScore, 0) / recentTweets.length;
    if (recentAvg > avgEngagement * 1.5) {
      insights.push('Recent content is performing significantly better than average');
    }
  }

  return { insights, recommendations };
}
