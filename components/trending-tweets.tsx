
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, MessageSquare, Heart, Repeat, Quote, Sparkles, ExternalLink } from 'lucide-react';
import { formatEngagementScore } from '@/lib/utils/analytics';
import { formatDistanceToNow } from 'date-fns';

interface Tweet {
  id: string;
  content: string;
  engagementScore: number;
  trendingScore: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  createdAt: string;
  account: {
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
  _count: {
    rewrites: number;
  };
}

interface TweetsResponse {
  tweets: Tweet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function TrendingTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('trending');
  const [filterAccount, setFilterAccount] = useState('all');
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    fetchTweets();
    fetchAccounts();
  }, [sortBy, filterAccount]);

  const fetchTweets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        trending: 'true',
        sortBy,
        account: filterAccount,
        limit: '20'
      });

      const response = await fetch(`/api/tweets?${params}`);
      if (response.ok) {
        const data: TweetsResponse = await response.json();
        setTweets(data.tweets);
      }
    } catch (error) {
      console.error('Error fetching trending tweets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const accountsData = await response.json();
        setAccounts(accountsData.map((acc: any) => acc.username));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const generateRewrite = async (tweetId: string) => {
    try {
      const response = await fetch(`/api/tweets/${tweetId}/rewrites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'ENGAGING', tone: 'PROFESSIONAL' })
      });

      if (response.ok) {
        // Refresh tweets to update rewrite count
        fetchTweets();
      } else {
        const error = await response.json();
        console.error('Error generating rewrite:', error);
      }
    } catch (error) {
      console.error('Error generating rewrite:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Tweets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-8 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Trending Tweets
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.slice(0, 20).map((account) => (
                  <SelectItem key={account} value={account}>
                    @{account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="createdAt">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tweets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No trending tweets found. Try adjusting your filters or run data collection.
          </div>
        ) : (
          <div className="space-y-4">
            {tweets.map((tweet, index) => (
              <div
                key={tweet.id}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Tweet Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {tweet.account.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {tweet.account.displayName || `@${tweet.account.username}`}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        @{tweet.account.username} • {formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {Math.round(tweet.trendingScore)}
                    </Badge>
                  </div>
                </div>

                {/* Tweet Content */}
                <p className="text-sm leading-relaxed mb-4 text-foreground/90">
                  {tweet.content}
                </p>

                {/* Engagement Metrics */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>{formatEngagementScore(tweet.likeCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat className="h-4 w-4 text-green-500" />
                      <span>{formatEngagementScore(tweet.retweetCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span>{formatEngagementScore(tweet.replyCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Quote className="h-4 w-4 text-purple-500" />
                      <span>{formatEngagementScore(tweet.quoteCount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {tweet._count.rewrites > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {tweet._count.rewrites} rewrite{tweet._count.rewrites !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => generateRewrite(tweet.id)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Rewrite
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => window.open(`https://twitter.com/${tweet.account.username}/status/${tweet.id}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
