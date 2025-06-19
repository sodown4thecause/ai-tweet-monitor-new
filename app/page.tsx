
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardStats from '@/components/dashboard-stats';
import TrendingTweets from '@/components/trending-tweets';
import TrendingTopics from '@/components/trending-topics';
import DataCollectionPanel from '@/components/data-collection-panel';
import { 
  BarChart3, 
  TrendingUp, 
  Hash, 
  Download, 
  Sparkles,
  Brain,
  Twitter
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Tweet Monitor</h1>
                <p className="text-sm text-gray-600">Intelligent Tweet Analysis & Rewriting</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Twitter className="h-4 w-4" />
              <span>Monitoring 106 AI Accounts</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            AI Twitter Intelligence Dashboard
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Monitor trending AI content, analyze engagement patterns, and generate optimized rewrites 
            with advanced AI-powered insights from the top voices in artificial intelligence.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Topics</span>
            </TabsTrigger>
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Collection</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DashboardStats />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendingTweets />
              <TrendingTopics />
            </div>
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Trending Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Discover the most engaging AI-related tweets and emerging conversations 
                across your monitored accounts.
              </p>
            </div>
            <TrendingTweets />
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Topic Intelligence</h3>
              </div>
              <p className="text-sm text-gray-600">
                Track trending hashtags, mentions, and emerging topics in the AI community 
                with real-time velocity analysis.
              </p>
            </div>
            <TrendingTopics />
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Data Collection Engine</h3>
              </div>
              <p className="text-sm text-gray-600">
                Manage automated tweet collection from AI accounts with rate limiting, 
                error handling, and comprehensive logging.
              </p>
            </div>
            <DataCollectionPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              © 2025 AI Tweet Monitor. Intelligent content analysis for the AI community.
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Built with Next.js & Prisma</span>
              <span>•</span>
              <span>Powered by OpenAI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
