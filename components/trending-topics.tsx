
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, AtSign, TrendingUp, MessageSquare } from 'lucide-react';

interface TrendingTopic {
  topic: string;
  type: string;
  trendScore: number;
  velocity: number;
  mentionCount: number;
}

interface TrendingAnalysis {
  topTrendingTopics: TrendingTopic[];
  insights: {
    totalTrending: number;
    averageEngagement: number;
    topPerformingAccounts: string[];
    emergingTopics: string[];
  };
}

export default function TrendingTopics() {
  const [analysis, setAnalysis] = useState<TrendingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingAnalysis();
  }, []);

  const fetchTrendingAnalysis = async () => {
    try {
      const response = await fetch('/api/trending');
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching trending analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopicIcon = (type: string) => {
    switch (type) {
      case 'HASHTAG':
        return <Hash className="h-4 w-4" />;
      case 'MENTION':
        return <AtSign className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getVelocityColor = (velocity: number) => {
    if (velocity > 5) return 'text-red-600 bg-red-50';
    if (velocity > 2) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded w-12"></div>
                    <div className="h-5 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Failed to load trending analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.topTrendingTopics.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No trending topics found. Run data collection to analyze trends.
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.topTrendingTopics.map((topic, index) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getTopicIcon(topic.type)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {topic.type === 'HASHTAG' ? '#' : topic.type === 'MENTION' ? '@' : ''}
                        {topic.topic}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {topic.mentionCount} mentions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Score: {Math.round(topic.trendScore)}
                    </Badge>
                    <Badge className={`text-xs ${getVelocityColor(topic.velocity)}`}>
                      {topic.velocity.toFixed(1)}/hr
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📈 Trend Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Trending</span>
              <Badge variant="secondary">{analysis.insights.totalTrending}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Engagement</span>
              <Badge variant="outline">{Math.round(analysis.insights.averageEngagement)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🚀 Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.insights.topPerformingAccounts.length > 0 ? (
              <div className="space-y-2">
                {analysis.insights.topPerformingAccounts.slice(0, 5).map((account, index) => (
                  <div key={account} className="flex items-center justify-between">
                    <span className="text-sm">@{account}</span>
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emerging Topics */}
      {analysis.insights.emergingTopics.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🌱 Emerging Topics
              <Badge className="bg-green-100 text-green-800">
                {analysis.insights.emergingTopics.length} new
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.insights.emergingTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="bg-green-50 text-green-700">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
