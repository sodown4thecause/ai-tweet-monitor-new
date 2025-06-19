
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TWEETS = [
  {
    account: 'OpenAI',
    content: 'Excited to announce GPT-5! 🚀 The future of AI is here with unprecedented reasoning capabilities and multimodal understanding. This is a game-changer for how we interact with AI systems. #GPT5 #AI #Innovation',
    likes: 15420,
    retweets: 8930,
    replies: 2140,
    quotes: 1680,
    hours_ago: 2
  },
  {
    account: 'AnthropicAI',
    content: 'Claude 3.5 Sonnet now supports advanced code generation and mathematical reasoning. Early benchmarks show 40% improvement in complex problem-solving tasks. The AI safety research continues to drive innovation. 🧠💡',
    likes: 8230,
    retweets: 4210,
    replies: 890,
    quotes: 650,
    hours_ago: 5
  },
  {
    account: 'GoogleDeepMind',
    content: 'AlphaFold 3 predicts protein interactions with 95% accuracy, revolutionizing drug discovery and biological research. This breakthrough will accelerate medical advances by decades. 🧬 #AlphaFold #Science',
    likes: 12100,
    retweets: 6740,
    replies: 1230,
    quotes: 890,
    hours_ago: 8
  },
  {
    account: 'huggingface',
    content: 'Transformers 5.0 is here! 🤗 New optimizations, better model support, and 50% faster inference. Download now: pip install transformers --upgrade. Thanks to our amazing community for making this possible!',
    likes: 6890,
    retweets: 3420,
    replies: 780,
    quotes: 450,
    hours_ago: 12
  },
  {
    account: 'karpathy',
    content: 'Teaching neural networks is like teaching a very smart but very literal student. They excel at pattern recognition but miss obvious context that humans take for granted. The art is in the data preparation. 🎓',
    likes: 9340,
    retweets: 2890,
    replies: 1450,
    quotes: 320,
    hours_ago: 18
  },
  {
    account: 'ylecun',
    content: 'Self-supervised learning is the key to true AI intelligence. We need systems that can learn from observation like babies do, not just from labeled data. This is where the next breakthrough will come from. 👶🧠',
    likes: 7650,
    retweets: 3210,
    replies: 890,
    quotes: 560,
    hours_ago: 24
  },
  {
    account: 'sama',
    content: 'AI will transform every industry in the next 5 years. The companies that adapt and integrate AI thoughtfully will lead their markets. The question isn\'t if, but how fast you can learn and implement. ⚡',
    likes: 11200,
    retweets: 5670,
    replies: 1340,
    quotes: 780,
    hours_ago: 6
  },
  {
    account: 'jeremyphoward',
    content: 'Just released a new fast.ai course on practical AI for everyone! 📚 No PhD required - we focus on what actually works in practice. Join thousands learning to build real AI applications. Link in bio!',
    likes: 4320,
    retweets: 2890,
    replies: 456,
    quotes: 234,
    hours_ago: 15
  },
  {
    account: 'emollick',
    content: 'Used AI to write, edit, and format an entire research paper in 3 hours. The quality was surprisingly good. We\'re entering an era where AI becomes a true intellectual partner, not just a tool. 📝✨',
    likes: 5890,
    retweets: 1890,
    replies: 670,
    quotes: 290,
    hours_ago: 9
  },
  {
    account: 'GaryMarcus',
    content: 'Still waiting for AI that can understand context like a 5-year-old. Yes, LLMs are impressive, but true intelligence requires common sense reasoning that current architectures struggle with. 🤔',
    likes: 3450,
    retweets: 1230,
    replies: 890,
    quotes: 120,
    hours_ago: 20
  }
];

async function createDemoData() {
  console.log('🎭 Creating demo tweet data...');

  for (const demoTweet of DEMO_TWEETS) {
    try {
      // Find the account
      const account = await prisma.account.findUnique({
        where: { username: demoTweet.account }
      });

      if (!account) {
        console.log(`Account @${demoTweet.account} not found, skipping...`);
        continue;
      }

      // Calculate engagement score
      const engagementScore = (demoTweet.likes * 1) + (demoTweet.retweets * 3) + 
                             (demoTweet.replies * 2) + (demoTweet.quotes * 4);

      // Calculate trending score (higher for recent tweets with good engagement)
      const ageWeight = Math.max(0.1, 1 - (demoTweet.hours_ago / 168));
      const trendingScore = engagementScore * ageWeight;

      // Extract hashtags and mentions
      const hashtags = (demoTweet.content.match(/#\w+/g) || []).map(tag => tag.slice(1));
      const mentions = (demoTweet.content.match(/@\w+/g) || []).map(mention => mention.slice(1));

      // Create tweet
      const createdAt = new Date(Date.now() - demoTweet.hours_ago * 60 * 60 * 1000);
      
      const tweet = await prisma.tweet.create({
        data: {
          tweetId: `demo_${account.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          accountId: account.id,
          content: demoTweet.content,
          authorUsername: account.username,
          authorDisplayName: account.displayName || `@${account.username}`,
          createdAt,
          likeCount: demoTweet.likes,
          retweetCount: demoTweet.retweets,
          replyCount: demoTweet.replies,
          quoteCount: demoTweet.quotes,
          engagementScore,
          normalizedScore: Math.min(100, (engagementScore / 1000) * 100),
          trendingScore,
          hashtags,
          mentions,
          urls: [],
          isRetweet: false,
          isReply: false,
          isQuote: false,
          isTrending: trendingScore > 5000
        }
      });

      // Create analytics snapshot
      await prisma.tweetAnalytics.create({
        data: {
          tweetId: tweet.id,
          likeCount: demoTweet.likes,
          retweetCount: demoTweet.retweets,
          replyCount: demoTweet.replies,
          quoteCount: demoTweet.quotes,
          engagementScore,
          hoursAfterPost: demoTweet.hours_ago
        }
      });

      // Update trending topics
      for (const hashtag of hashtags) {
        await prisma.trendingTopic.upsert({
          where: { topic: hashtag },
          update: {
            mentionCount: { increment: 1 },
            engagementSum: { increment: engagementScore },
            lastSeen: new Date(),
            isActive: true,
            trendScore: { increment: engagementScore / 10 },
            velocity: Math.random() * 5 + 1,
            isTrending: true
          },
          create: {
            topic: hashtag,
            type: 'HASHTAG',
            mentionCount: 1,
            engagementSum: engagementScore,
            trendScore: engagementScore / 10,
            velocity: Math.random() * 5 + 1,
            isActive: true,
            isTrending: true
          }
        });
      }

      // Create some demo rewrites for trending tweets
      if (trendingScore > 5000) {
        await prisma.rewrite.create({
          data: {
            tweetId: tweet.id,
            originalContent: demoTweet.content,
            rewrittenContent: generateDemoRewrite(demoTweet.content),
            style: 'ENGAGING',
            tone: 'PROFESSIONAL',
            similarityScore: Math.random() * 30 + 60, // 60-90% similarity
            engagementPrediction: Math.random() * 20 + 70, // 70-90% prediction
            qualityScore: Math.random() * 15 + 80, // 80-95% quality
            isApproved: Math.random() > 0.3 // 70% approval rate
          }
        });
      }

      console.log(`✅ Created tweet for @${demoTweet.account}`);
    } catch (error) {
      console.error(`Error creating tweet for @${demoTweet.account}:`, error);
    }
  }

  // Create collection log
  await prisma.collectionLog.create({
    data: {
      tweetsCollected: DEMO_TWEETS.length,
      apiCalls: 5,
      errors: 0,
      status: 'SUCCESS',
      duration: 45,
      completedAt: new Date()
    }
  });

  console.log('✨ Demo data creation completed!');
  console.log(`📊 Created ${DEMO_TWEETS.length} demo tweets with analytics`);
}

function generateDemoRewrite(originalContent: string): string {
  const rewriteTemplates = [
    "🚀 THREAD: Why this matters for the future of AI",
    "🧵 Here's what this means for developers:",
    "💡 Hot take: This changes everything in AI",
    "🔥 Breaking: Major AI breakthrough explained",
    "⚡ Quick insights: Why this AI development matters",
    "🎯 Key takeaway: The next phase of AI is here"
  ];
  
  const template = rewriteTemplates[Math.floor(Math.random() * rewriteTemplates.length)];
  const shortContent = originalContent.length > 180 
    ? originalContent.substring(0, 180) + "..." 
    : originalContent;
  
  return `${template}\n\n${shortContent}`;
}

async function main() {
  await createDemoData();
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
