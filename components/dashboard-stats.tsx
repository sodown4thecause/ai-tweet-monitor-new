
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, MessageSquare, BarChart3, Sparkles, Clock } from 'lucide-react';
import { formatEngagementScore } from '@/lib/utils/analytics';

interface DashboardStats {
  overview: {
    totalAccounts: number;
    activeAccounts: number;
    totalTweets: number;
    tweetsLast24h: number;
    trendingTweets: number;
    totalRewrites: number;
  };
  engagement: {
    averageScore: number;
    maxScore: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalQuotes: number;
  };
  topTweet?: {
    content: string;
    engagementScore: number;
    account: { username: string };
  };
  tweetVolume: Array<{
    date: string;
    tweets: number;
  }>;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Failed to load dashboard statistics
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Accounts',
      value: stats.overview.activeAccounts,
      total: stats.overview.totalAccounts,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Tweets',
      value: stats.overview.totalTweets,
      subtitle: `+${stats.overview.tweetsLast24h} today`,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Trending Tweets',
      value: stats.overview.trendingTweets,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Avg Engagement',
      value: Math.round(stats.engagement.averageScore),
      subtitle: `Max: ${formatEngagementScore(stats.engagement.maxScore)}`,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Rewrites',
      value: stats.overview.totalRewrites,
      icon: Sparkles,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Recent Activity',
      value: stats.overview.tweetsLast24h,
      subtitle: 'Last 24 hours',
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof stat.value === 'number' 
                    ? stat.value.toLocaleString() 
                    : stat.value
                  }
                  {stat.total && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {stat.total}
                    </span>
                  )}
                </div>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Performance Tweet */}
      {stats.topTweet && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">🏆 Top Performing Tweet (7 days)</CardTitle>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {formatEngagementScore(stats.topTweet.engagementScore)} engagement
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              @{stats.topTweet.account.username}
            </p>
            <p className="text-sm leading-relaxed">
              {stats.topTweet.content.length > 200 
                ? `${stats.topTweet.content.substring(0, 200)}...` 
                : stats.topTweet.content
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Engagement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Engagement Summary (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatEngagementScore(stats.engagement.totalLikes)}
              </div>
              <div className="text-sm text-muted-foreground">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatEngagementScore(stats.engagement.totalRetweets)}
              </div>
              <div className="text-sm text-muted-foreground">Retweets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatEngagementScore(stats.engagement.totalReplies)}
              </div>
              <div className="text-sm text-muted-foreground">Replies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatEngagementScore(stats.engagement.totalQuotes)}
              </div>
              <div className="text-sm text-muted-foreground">Quotes</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
