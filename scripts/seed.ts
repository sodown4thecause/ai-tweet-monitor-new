
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AI_ACCOUNTS = [
  'EurekaLabsAI', 'ssi', 'crewAIInc', 'udiomusic', 'cursor_ai', 'xai', 'pika_labs', 
  'FlowiseAI', 'poe_platform', 'SumlyAI', 'visualhound_', 'llama_index', 
  'brancherdotai', 'perplexity_ai', 'TheRevolutionAI', 'LangChainAI', 
  'explain_paper', 'bearlyai', 'AiBreakfast', 'aifunhouse', 'prompthero', 
  'RewindAI', 'ai__pub', 'mreflow', 'taranjeetio', 'javilopen', 'krea_ai', 
  'lightfld', 'aiDotEngineer', 'AnthropicAI', 'heyjasperai', 'wordtune', 
  'midjourney', 'copy_ai', 'StabilityAI', 'PredisAI', 'Saboo_Shubham_', 
  'JinaAI_', 'mattshumer_', 'dr_cintas', 'Gradio', 'AIatMeta', 'streamlit', 
  'AssemblyAI', 'JeffDean', 'GroqInc', 'huggingface', 'scale_AI', 'PrismaAI', 
  'DotCSV', 'JackSoslow', 'GoogleDeepMind', 'OpenAI', 'Hora_NFT', 
  'mckaywrigley', 'hwchase17', 'JacobColling', 'ilyasut', 'levelsio', 
  'mathemagic1an', 'rowancheung', 'RubenHssd', 'DrJimFan', 'LiorOnAI', 
  'rasbt', 'alexandr_wang', 'breath_mirror', 'iScienceLuvr', 'EMostaque', 
  'jerryjliu0', 'anitakirkovska', 'GaryMarcus', 'AndrewYNg', 'amasad', 
  'gdb', 'dvainrub', 'sharifshameem', 'bentossell', 'williamcusick', 
  'ylecun', 'joaomdmoura', 'alliekmiller', 'emollick', 'GoogleAI', 
  'karpathy', 'yoheinakajima', 'Plinz', 'Google', 'danshipper', 
  'DataChaz', 'goodside', 'enricoros', 'bengoertzel', 'adamdangelo', 
  'MatthewBerman', 'jyap', 'Suhail', 'Scobleizer', 'sama', 'officiallogank', 
  'drfeifei', 'andrewyng', 'jeremyphoward', 'demishassabis', 'pabbeel', 
  'boringmarketer'
];

async function main() {
  console.log('🌱 Starting seed data creation...');

  // Create AI accounts
  console.log('📝 Creating AI accounts...');
  for (const username of AI_ACCOUNTS) {
    try {
      await prisma.account.upsert({
        where: { username },
        update: {},
        create: {
          username,
          displayName: `@${username}`,
          description: `AI-related Twitter account: @${username}`,
          isActive: true,
        },
      });
    } catch (error) {
      console.error(`Error creating account ${username}:`, error);
    }
  }

  // Create system configuration
  console.log('⚙️ Creating system configuration...');
  const configs = [
    { key: 'COLLECTION_ENABLED', value: 'true', description: 'Enable automated tweet collection' },
    { key: 'TRENDING_THRESHOLD', value: '50', description: 'Minimum score for trending tweets' },
    { key: 'MAX_TWEETS_PER_COLLECTION', value: '100', description: 'Maximum tweets to collect per account per run' },
    { key: 'REWRITE_AUTO_GENERATE', value: 'true', description: 'Automatically generate rewrites for trending tweets' },
    { key: 'NOTIFICATION_THRESHOLD', value: '100', description: 'Engagement threshold for notifications' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  // Create some sample trending topics
  console.log('📈 Creating sample trending topics...');
  const sampleTopics = [
    { topic: 'AI', type: 'KEYWORD', mentionCount: 150, engagementSum: 5000, trendScore: 85 },
    { topic: 'MachineLearning', type: 'HASHTAG', mentionCount: 89, engagementSum: 3200, trendScore: 72 },
    { topic: 'GPT', type: 'KEYWORD', mentionCount: 76, engagementSum: 2800, trendScore: 68 },
    { topic: 'OpenAI', type: 'MENTION', mentionCount: 124, engagementSum: 4500, trendScore: 92 },
    { topic: 'LLM', type: 'KEYWORD', mentionCount: 67, engagementSum: 2100, trendScore: 58 },
  ];

  for (const topic of sampleTopics) {
    await prisma.trendingTopic.upsert({
      where: { topic: topic.topic },
      update: {
        mentionCount: topic.mentionCount,
        engagementSum: topic.engagementSum,
        trendScore: topic.trendScore,
        velocity: Math.random() * 10,
        isActive: true,
        isTrending: topic.trendScore > 60,
      },
      create: {
        ...topic,
        type: topic.type as any,
        velocity: Math.random() * 10,
        isActive: true,
        isTrending: topic.trendScore > 60,
      },
    });
  }

  console.log('✅ Seed data creation completed!');
  console.log(`📊 Created ${AI_ACCOUNTS.length} AI accounts`);
  console.log(`⚙️ Created ${configs.length} system configurations`);
  console.log(`📈 Created ${sampleTopics.length} sample trending topics`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
