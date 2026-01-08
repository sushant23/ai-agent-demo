/**
 * Simple Chat Application using the AI Agent Implementation
 * 
 * This creates a minimal chat interface that integrates with the existing
 * LLM Agnostic AI Agent architecture.
 */

import { LLMAgnosticAIAgent } from './app';
import { UserInput, AgentResponse } from './types/agent';
import { ConversationContext } from './types/context';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: ConversationContext;
  createdAt: Date;
  lastActivity: Date;
}

export class SimpleChatApp {
  private agent: LLMAgnosticAIAgent;
  private sessions: Map<string, ChatSession> = new Map();
  private isInitialized = false;

  constructor(agentConfig?: {
    llm?: {
      openai?: {
        enabled: boolean;
        apiKey: string;
        model: string;
      };
      anthropic?: {
        enabled: boolean;
        apiKey: string;
        model: string;
      };
    };
  }) {
    this.agent = new LLMAgnosticAIAgent(agentConfig);
  }

  /**
   * Initialize the chat app
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Chat app already initialized');
      return;
    }

    try {
      await this.agent.initialize();
      this.isInitialized = true;
      console.log('Chat app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chat app:', error);
      throw error;
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      userId,
      messages: [],
      context: await this.createInitialContext(userId, sessionId),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: "Hello! I'm your AI business assistant. I can help you with product management, analytics, SEO optimization, and more. What would you like to work on today?",
      sender: 'agent',
      timestamp: new Date(),
      metadata: { type: 'welcome' }
    };
    
    session.messages.push(welcomeMessage);
    
    console.log(`Created new chat session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  /**
   * Send a message and get agent response
   */
  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    if (!this.isInitialized) {
      throw new Error('Chat app not initialized. Call initialize() first.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    session.messages.push(userMessage);
    session.lastActivity = new Date();

    try {
      // Create user input for agent
      const userInput: UserInput = {
        content,
        userId: session.userId,
        sessionId,
        timestamp: new Date(),
        metadata: {
          messageId: userMessage.id,
          sessionMessageCount: session.messages.length,
        }
      };

      // Process through agent
      const agentResponse = await this.agent.processUserInput(
        userInput,
        session.userId,
        sessionId
      );

      // Create agent message
      const agentMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: agentResponse.content,
        sender: 'agent',
        timestamp: new Date(),
        metadata: {
          processingTime: agentResponse.metadata.processingTime,
          provider: agentResponse.metadata.provider,
          workflow: agentResponse.metadata.workflow,
          confidence: agentResponse.metadata.confidence,
          nextStepActions: agentResponse.nextStepActions,
        }
      };

      session.messages.push(agentMessage);
      
      console.log(`Processed message in session ${sessionId}:`, {
        userMessage: content.substring(0, 50) + '...',
        agentResponse: agentResponse.content.substring(0, 50) + '...',
        processingTime: agentResponse.metadata.processingTime,
        workflow: agentResponse.metadata.workflow,
      });

      return agentMessage;

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Create error response message
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: "I'm sorry, I encountered an issue processing your request. Please try rephrasing your question or try again in a moment.",
        sender: 'agent',
        timestamp: new Date(),
        metadata: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }
      };

      session.messages.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Get chat session
   */
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all messages from a session
   */
  getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * Get agent health status
   */
  async getHealthStatus() {
    return await this.agent.getHealthStatus();
  }

  /**
   * Clear session history
   */
  clearSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): ChatSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Shutdown the chat app
   */
  async shutdown(): Promise<void> {
    try {
      await this.agent.shutdown();
      this.sessions.clear();
      this.isInitialized = false;
      console.log('Chat app shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Create initial context for a new session
   */
  private async createInitialContext(userId: string, sessionId: string): Promise<ConversationContext> {
    // Get business profile if available
    const businessProfile = await this.agent.getBusinessProfile(userId);
    
    // Create a default business data snapshot
    const defaultBusinessData: any = {
      totalProducts: 0,
      totalRevenue: { amount: 0, currency: 'USD' },
      topPerformingProducts: [],
      recentMetrics: {
        revenue: { amount: 0, currency: 'USD' },
        salesCount: 0,
        conversionRate: 0,
        impressions: 0,
        clicks: 0,
        profitMargin: 0,
        period: { start: new Date(), end: new Date() },
        trends: []
      },
      marketplaceStatus: [],
      lastUpdated: new Date(),
    };

    // If we have a business profile, try to populate some data
    if (businessProfile) {
      defaultBusinessData.marketplaceStatus = businessProfile.connectedMarketplaces?.map((mp: any) => ({
        marketplace: mp,
        isHealthy: mp.isActive,
        productsCount: 0, // Would need to be fetched separately
      })) || [];
    }
    
    return {
      userId,
      sessionId,
      conversationHistory: [],
      businessData: defaultBusinessData,
      recommendations: new Map(),
      lastUpdated: new Date(),
      userPreferences: {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: false,
          frequency: 'daily',
        },
        displaySettings: {
          theme: 'light',
          compactMode: false,
          showAdvancedMetrics: true,
        },
      },
    };
  }
}

/**
 * Console-based chat interface for testing
 */
export class ConsoleChatInterface {
  private chatApp: SimpleChatApp;
  private currentSessionId: string | null = null;
  private userId: string;

  constructor(userId: string = 'demo_user', agentConfig?: ConstructorParameters<typeof SimpleChatApp>[0]) {
    this.userId = userId;
    this.chatApp = new SimpleChatApp(agentConfig);
  }

  /**
   * Start the console chat interface
   */
  async start(): Promise<void> {
    console.log('🤖 Starting AI Business Assistant Chat...\n');
    
    try {
      await this.chatApp.initialize();
      this.currentSessionId = await this.chatApp.createSession(this.userId);
      
      console.log('✅ Chat initialized successfully!');
      console.log('💡 Type your questions or commands. Type "exit" to quit, "clear" to clear history.\n');
      
      // Show welcome message
      const session = this.chatApp.getSession(this.currentSessionId);
      if (session && session.messages.length > 0) {
        const welcomeMsg = session.messages[0];
        if (welcomeMsg) {
          console.log(`🤖 Assistant: ${welcomeMsg.content}\n`);
        }
      }

      // Start interactive loop
      await this.startInteractiveLoop();
      
    } catch (error) {
      console.error('❌ Failed to start chat:', error);
      process.exit(1);
    }
  }

  /**
   * Interactive chat loop
   */
  private async startInteractiveLoop(): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question('👤 You: ', (answer: string) => {
          resolve(answer.trim());
        });
      });
    };

    while (true) {
      try {
        const userInput = await askQuestion();
        
        if (userInput.toLowerCase() === 'exit') {
          console.log('\n👋 Goodbye!');
          break;
        }
        
        if (userInput.toLowerCase() === 'clear') {
          if (this.currentSessionId) {
            this.chatApp.clearSession(this.currentSessionId);
            console.log('🧹 Chat history cleared.\n');
          }
          continue;
        }
        
        if (userInput.toLowerCase() === 'health') {
          const health = await this.chatApp.getHealthStatus();
          console.log('🏥 System Health:', JSON.stringify(health, null, 2));
          continue;
        }
        
        if (!userInput) {
          console.log('💭 Please enter a message.\n');
          continue;
        }

        if (!this.currentSessionId) {
          console.log('❌ No active session. Restarting...');
          this.currentSessionId = await this.chatApp.createSession(this.userId);
        }

        console.log('🤔 Processing...');
        const response = await this.chatApp.sendMessage(this.currentSessionId, userInput);
        
        console.log(`\n🤖 Assistant: ${response.content}`);
        
        // Show next step actions if available
        if (response.metadata?.nextStepActions && Array.isArray(response.metadata.nextStepActions)) {
          const actions = response.metadata.nextStepActions as any[];
          if (actions.length > 0) {
            console.log('\n💡 Suggested next steps:');
            actions.forEach((action, index) => {
              console.log(`   ${index + 1}. ${action.title}: ${action.description}`);
            });
          }
        }
        
        console.log(''); // Empty line for readability
        
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        console.log(''); // Empty line for readability
      }
    }

    rl.close();
    await this.chatApp.shutdown();
  }
}