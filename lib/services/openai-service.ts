
import OpenAI from 'openai';

interface RewriteRequest {
  originalTweet: string;
  style: 'ENGAGING' | 'THREAD' | 'HOOK_BASED' | 'STORYTELLING' | 'EDUCATIONAL' | 'VIRAL' | 'QUESTION' | 'CONTROVERSIAL';
  tone: 'PROFESSIONAL' | 'CASUAL' | 'HUMOROUS' | 'SERIOUS' | 'INSPIRATIONAL' | 'TECHNICAL' | 'CONVERSATIONAL';
  context?: string;
}

interface RewriteResponse {
  rewrittenContent: string;
  qualityScore: number;
  engagementPrediction: number;
  explanation: string;
}

class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async rewriteTweet(request: RewriteRequest): Promise<RewriteResponse> {
    try {
      const prompt = this.buildRewritePrompt(request);
      
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert social media content creator specializing in viral Twitter content. Your task is to rewrite tweets to maximize engagement while maintaining authenticity and value. Always respond in JSON format with the following structure:
            {
              "rewrittenContent": "The rewritten tweet (max 280 characters)",
              "qualityScore": 0-100,
              "engagementPrediction": 0-100,
              "explanation": "Brief explanation of changes made"
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsed = JSON.parse(responseContent);
        return {
          rewrittenContent: parsed.rewrittenContent || '',
          qualityScore: parsed.qualityScore || 0,
          engagementPrediction: parsed.engagementPrediction || 0,
          explanation: parsed.explanation || ''
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          rewrittenContent: responseContent.substring(0, 280),
          qualityScore: 75,
          engagementPrediction: 70,
          explanation: 'Content rewritten for better engagement'
        };
      }
    } catch (error) {
      console.error('Error rewriting tweet:', error);
      throw error;
    }
  }

  private buildRewritePrompt(request: RewriteRequest): string {
    const styleInstructions = this.getStyleInstructions(request.style);
    const toneInstructions = this.getToneInstructions(request.tone);

    return `
    Original Tweet: "${request.originalTweet}"
    
    Rewrite this tweet with the following requirements:
    
    STYLE: ${request.style}
    ${styleInstructions}
    
    TONE: ${request.tone}
    ${toneInstructions}
    
    CONSTRAINTS:
    - Maximum 280 characters
    - Keep the core message and value
    - Make it more engaging and shareable
    - Use relevant emojis sparingly (1-2 max)
    - Ensure it sounds natural and authentic
    
    ${request.context ? `CONTEXT: ${request.context}` : ''}
    
    HOOKS TO CONSIDER:
    - Start with numbers or statistics
    - Use power words (amazing, breakthrough, revolutionary)
    - Ask questions to encourage engagement
    - Create urgency or scarcity
    - Use storytelling elements
    - Include calls to action
    
    Analyze the original tweet's engagement potential and improve upon it while maintaining the core message.
    `;
  }

  private getStyleInstructions(style: string): string {
    const instructions: Record<string, string> = {
      'ENGAGING': 'Make it highly interactive with calls to action, questions, or controversial takes that spark discussion.',
      'THREAD': 'Structure as the first tweet of a potential thread, include "🧵" emoji and hint at more content.',
      'HOOK_BASED': 'Start with a powerful hook that grabs attention immediately - use numbers, bold statements, or surprising facts.',
      'STORYTELLING': 'Frame the content as a story with a clear beginning, conflict, or transformation.',
      'EDUCATIONAL': 'Position as valuable learning content, use phrases like "Here\'s how", "The secret to", or "Most people don\'t know".',
      'VIRAL': 'Optimize for maximum shareability - use trending formats, relatable content, and shareable insights.',
      'QUESTION': 'Frame as a thought-provoking question that encourages replies and discussion.',
      'CONTROVERSIAL': 'Present a contrarian viewpoint or challenge common assumptions (while staying respectful).'
    };
    return instructions[style] || instructions['ENGAGING'];
  }

  private getToneInstructions(tone: string): string {
    const instructions: Record<string, string> = {
      'PROFESSIONAL': 'Use professional language, industry terminology, and maintain authority.',
      'CASUAL': 'Use conversational language, contractions, and relatable expressions.',
      'HUMOROUS': 'Include witty remarks, wordplay, or light humor while keeping the message clear.',
      'SERIOUS': 'Use formal language and focus on the gravity or importance of the topic.',
      'INSPIRATIONAL': 'Use motivational language, positive framing, and uplifting messages.',
      'TECHNICAL': 'Use precise technical language and focus on accuracy and detail.',
      'CONVERSATIONAL': 'Write as if talking to a friend, use personal pronouns and informal expressions.'
    };
    return instructions[tone] || instructions['PROFESSIONAL'];
  }

  async analyzeTweetSentiment(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: string[];
  }> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze the sentiment and emotions in the given tweet. Respond in JSON format:
            {
              "sentiment": "positive|negative|neutral",
              "confidence": 0-100,
              "emotions": ["emotion1", "emotion2"]
            }`
          },
          {
            role: 'user',
            content: `Tweet: "${content}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(responseContent);
      return {
        sentiment: parsed.sentiment || 'neutral',
        confidence: parsed.confidence || 0,
        emotions: parsed.emotions || []
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0,
        emotions: []
      };
    }
  }

  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Calculate the semantic similarity between two texts on a scale of 0-100. Only respond with the number.'
          },
          {
            role: 'user',
            content: `Text 1: "${text1}"\nText 2: "${text2}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const responseContent = completion.choices[0]?.message?.content;
      const similarity = parseInt(responseContent?.trim() || '0');
      return Math.max(0, Math.min(100, similarity));
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }
}

export default OpenAIService;
export type { RewriteRequest, RewriteResponse };
