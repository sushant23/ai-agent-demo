/**
 * Tests for the Chat Application
 */

import { SimpleChatApp } from './chat-app';

// Mock the LLMAgnosticAIAgent to avoid needing real API keys for testing
jest.mock('./app', () => {
  return {
    LLMAgnosticAIAgent: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      processUserInput: jest.fn().mockResolvedValue({
        content: 'Mock response from agent',
        nextStepActions: [
          {
            id: 'test_action',
            title: 'Test Action',
            description: 'This is a test action',
            actionType: 'ASK_QUESTION'
          }
        ],
        metadata: {
          processingTime: 500,
          provider: 'mock-provider',
          workflow: 'ROUTING',
          confidence: 0.8
        }
      }),
      getBusinessProfile: jest.fn().mockResolvedValue(null),
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        components: {},
        timestamp: new Date()
      }),
      shutdown: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('SimpleChatApp', () => {
  let chatApp: SimpleChatApp;

  beforeEach(() => {
    chatApp = new SimpleChatApp();
  });

  afterEach(async () => {
    if (chatApp) {
      await chatApp.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(chatApp.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await chatApp.initialize();
      
      // Mock console.warn to verify it's called
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await chatApp.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('Chat app already initialized');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await chatApp.initialize();
    });

    it('should create a new session', async () => {
      const sessionId = await chatApp.createSession('test_user');
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      
      const session = chatApp.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.userId).toBe('test_user');
      expect(session?.messages).toHaveLength(1); // Welcome message
      expect(session?.messages[0]?.sender).toBe('agent');
    });

    it('should get session messages', async () => {
      const sessionId = await chatApp.createSession('test_user');
      const messages = chatApp.getMessages(sessionId);
      
      expect(messages).toHaveLength(1); // Welcome message
      expect(messages[0]?.content).toContain('Hello!');
    });

    it('should return empty array for non-existent session messages', () => {
      const messages = chatApp.getMessages('non_existent_session');
      expect(messages).toEqual([]);
    });

    it('should clear session history', async () => {
      const sessionId = await chatApp.createSession('test_user');
      
      // Send a message first
      await chatApp.sendMessage(sessionId, 'Test message');
      expect(chatApp.getMessages(sessionId)).toHaveLength(3); // Welcome + user + agent
      
      // Clear session
      const cleared = chatApp.clearSession(sessionId);
      expect(cleared).toBe(true);
      expect(chatApp.getMessages(sessionId)).toHaveLength(0);
    });

    it('should delete session', async () => {
      const sessionId = await chatApp.createSession('test_user');
      expect(chatApp.getSession(sessionId)).toBeDefined();
      
      const deleted = chatApp.deleteSession(sessionId);
      expect(deleted).toBe(true);
      expect(chatApp.getSession(sessionId)).toBeUndefined();
    });

    it('should get user sessions', async () => {
      const sessionId1 = await chatApp.createSession('user1');
      const sessionId2 = await chatApp.createSession('user1');
      const sessionId3 = await chatApp.createSession('user2');
      
      const user1Sessions = chatApp.getUserSessions('user1');
      const user2Sessions = chatApp.getUserSessions('user2');
      
      expect(user1Sessions).toHaveLength(2);
      expect(user2Sessions).toHaveLength(1);
      expect(user1Sessions.map(s => s.id)).toContain(sessionId1);
      expect(user1Sessions.map(s => s.id)).toContain(sessionId2);
      expect(user2Sessions[0]?.id).toBe(sessionId3);
    });
  });

  describe('Message Handling', () => {
    let sessionId: string;

    beforeEach(async () => {
      await chatApp.initialize();
      sessionId = await chatApp.createSession('test_user');
    });

    it('should send message and receive response', async () => {
      const response = await chatApp.sendMessage(sessionId, 'Hello, how are you?');
      
      expect(response).toBeDefined();
      expect(response.sender).toBe('agent');
      expect(response.content).toBe('Mock response from agent');
      expect(response.metadata?.processingTime).toBe(500);
      expect(response.metadata?.nextStepActions).toHaveLength(1);
      
      // Check that messages were added to session
      const messages = chatApp.getMessages(sessionId);
      expect(messages).toHaveLength(3); // Welcome + user + agent
      expect(messages[1]?.content).toBe('Hello, how are you?');
      expect(messages[1]?.sender).toBe('user');
      expect(messages[2]?.content).toBe('Mock response from agent');
      expect(messages[2]?.sender).toBe('agent');
    });

    it('should handle errors gracefully', async () => {
      // Mock the agent to throw an error
      const mockAgent = (chatApp as any).agent;
      mockAgent.processUserInput.mockRejectedValueOnce(new Error('Test error'));
      
      const response = await chatApp.sendMessage(sessionId, 'This will cause an error');
      
      expect(response.sender).toBe('agent');
      expect(response.content).toContain('encountered an issue');
      expect(response.metadata?.error).toBe(true);
      expect(response.metadata?.errorMessage).toBe('Test error');
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        chatApp.sendMessage('non_existent_session', 'Hello')
      ).rejects.toThrow('Session non_existent_session not found');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedApp = new SimpleChatApp();
      const sessionId = 'test_session';
      
      await expect(
        uninitializedApp.sendMessage(sessionId, 'Hello')
      ).rejects.toThrow('Chat app not initialized');
    });
  });

  describe('Health Status', () => {
    beforeEach(async () => {
      await chatApp.initialize();
    });

    it('should get health status', async () => {
      const health = await chatApp.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await chatApp.initialize();
      const sessionId = await chatApp.createSession('test_user');
      
      expect(chatApp.getSession(sessionId)).toBeDefined();
      
      await chatApp.shutdown();
      
      // Sessions should be cleared after shutdown
      expect(chatApp.getSession(sessionId)).toBeUndefined();
    });
  });
});

describe('Message Structure', () => {
  it('should create proper message structure', async () => {
    const chatApp = new SimpleChatApp();
    await chatApp.initialize();
    
    const sessionId = await chatApp.createSession('test_user');
    const response = await chatApp.sendMessage(sessionId, 'Test message');
    
    // Check message structure
    expect(response).toMatchObject({
      id: expect.stringMatching(/^msg_\d+$/),
      content: expect.any(String),
      sender: 'agent',
      timestamp: expect.any(Date),
      metadata: expect.objectContaining({
        processingTime: expect.any(Number),
        provider: expect.any(String),
        workflow: expect.any(String),
        confidence: expect.any(Number)
      })
    });
    
    await chatApp.shutdown();
  });
});

describe('Session Context', () => {
  it('should maintain conversation context', async () => {
    const chatApp = new SimpleChatApp();
    await chatApp.initialize();
    
    const sessionId = await chatApp.createSession('test_user');
    
    // Send multiple messages
    await chatApp.sendMessage(sessionId, 'First message');
    await chatApp.sendMessage(sessionId, 'Second message');
    
    const session = chatApp.getSession(sessionId);
    expect(session?.messages).toHaveLength(5); // Welcome + 2 user + 2 agent
    
    // Check that context is maintained
    expect(session?.context.userId).toBe('test_user');
    expect(session?.context.sessionId).toBe(sessionId);
    expect(session?.lastActivity).toBeInstanceOf(Date);
    
    await chatApp.shutdown();
  });
});