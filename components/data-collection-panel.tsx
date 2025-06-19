
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Play, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Account {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  _count: {
    tweets: number;
  };
}

interface CollectionLog {
  id: string;
  tweetsCollected: number;
  apiCalls: number;
  errors: number;
  status: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  account?: {
    username: string;
  };
}

export default function DataCollectionPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchAccounts();
    fetchLogs();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/collection/run');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const runCollection = async () => {
    setIsCollecting(true);
    setProgress(0);

    try {
      const accountsToCollect = selectedAccounts.length > 0 
        ? selectedAccounts 
        : accounts.filter(acc => acc.isActive).map(acc => acc.username);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const response = await fetch('/api/collection/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accounts: accountsToCollect.length > 0 ? accountsToCollect : undefined 
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        console.log('Collection result:', result);
        
        // Refresh data
        await Promise.all([fetchAccounts(), fetchLogs()]);
      } else {
        const error = await response.json();
        console.error('Collection failed:', error);
      }
    } catch (error) {
      console.error('Error running collection:', error);
    } finally {
      setTimeout(() => {
        setIsCollecting(false);
        setProgress(0);
      }, 1000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PARTIAL_SUCCESS':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PARTIAL_SUCCESS':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAccounts = accounts.filter(acc => acc.isActive);
  const totalTweets = accounts.reduce((sum, acc) => sum + acc._count.tweets, 0);

  return (
    <div className="space-y-6">
      {/* Collection Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Data Collection Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeAccounts.length}</div>
              <div className="text-sm text-muted-foreground">Active Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalTweets.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Tweets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{logs.length}</div>
              <div className="text-sm text-muted-foreground">Collection Runs</div>
            </div>
          </div>

          {/* Collection Controls */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Accounts (leave empty for all active accounts)
              </label>
              <Select 
                value={selectedAccounts.length > 0 ? selectedAccounts[0] : ''} 
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedAccounts([]);
                  } else {
                    setSelectedAccounts([value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All active accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Accounts ({activeAccounts.length})</SelectItem>
                  {activeAccounts.slice(0, 20).map((account) => (
                    <SelectItem key={account.id} value={account.username}>
                      @{account.username} ({account._count.tweets} tweets)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCollecting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Collection Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={runCollection}
                disabled={isCollecting}
                className="flex items-center gap-2"
              >
                {isCollecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isCollecting ? 'Collecting...' : 'Start Collection'}
              </Button>
              
              <Button
                variant="outline"
                onClick={fetchLogs}
                disabled={isCollecting}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Recent Collection Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No collection activity yet. Run your first data collection above.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="text-sm font-medium">
                        {log.account ? `@${log.account.username}` : 'All Accounts'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                        {log.duration && ` • ${log.duration}s`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {log.tweetsCollected} tweets
                    </div>
                    <Badge className={getStatusColor(log.status)}>
                      {log.status.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Management Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Monitored Accounts ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.slice(0, 12).map((account) => (
              <div
                key={account.id}
                className={`p-3 border rounded-lg ${
                  account.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">@{account.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {account._count.tweets} tweets
                    </div>
                  </div>
                  <Badge
                    variant={account.isActive ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {accounts.length > 12 && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              ... and {accounts.length - 12} more accounts
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
