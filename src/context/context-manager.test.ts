// Context Manager tests

import {
  createContextManager,
  createDefaultContextManagerConfig,
} from './index';
import { MessageRole } from '../types/llm';

describe('ContextManager', () => {
  let contextManager: any;
  let config: any;

  beforeEach(async () => {
    contextManager = createContextManager();
    config = createDefaultContextManagerConfig();
    await contextManager.initialize(config);
  });

  afterEach(async () => {
    await contextManager.shutdown();
  });

  test('should create and retrieve a new context', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    const context = await contextManager.getContext(userId, sessionId);

    expect(context.userId).toBe(userId);
    expect(context.sessionId).toBe(sessionId);
    expect(context.conversationHistory).toEqual([]);
    expect(context.recommendations).toBeInstanceOf(Map);
    expect(context.businessData).toBeDefined();
    expect(context.userPreferences).toBeDefined();
  });

  test('should update and persist context', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    const context = await contextManager.getContext(userId, sessionId);
    
    // Add a message
    context.conversationHistory.push({
      id: 'msg1',
      role: MessageRole.USER,
      content: 'Hello',
      timestamp: new Date(),
    });

    await contextManager.updateContext(context);

    // Retrieve the context again
    const retrievedContext = await contextManager.getContext(userId, sessionId);
    expect(retrievedContext.conversationHistory).toHaveLength(1);
    expect(retrievedContext.conversationHistory[0].content).toBe('Hello');
  });

  test('should clear context', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    // Create and update context
    const context = await contextManager.getContext(userId, sessionId);
    context.conversationHistory.push({
      id: 'msg1',
      role: MessageRole.USER,
      content: 'Hello',
      timestamp: new Date(),
    });
    await contextManager.updateContext(context);

    // Clear the context
    await contextManager.clearContext(userId, sessionId);

    // Get context again - should be a new one
    const newContext = await contextManager.getContext(userId, sessionId);
    expect(newContext.conversationHistory).toHaveLength(0);
  });

  test('should refresh context', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    const context = await contextManager.getContext(userId, sessionId);
    const originalTimestamp = context.lastUpdated;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // The refresh might fail due to simulated errors, so we'll retry
    let refreshedContext;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        refreshedContext = await contextManager.refreshContext(userId, sessionId);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    expect(refreshedContext!.lastUpdated.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  test('should compress context', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    const context = await contextManager.getContext(userId, sessionId);
    
    // Add many messages
    for (let i = 0; i < 30; i++) {
      context.conversationHistory.push({
        id: `msg${i}`,
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        content: `Message ${i}`,
        timestamp: new Date(),
      });
    }

    const compressedContext = await contextManager.compressContext(context);
    expect(compressedContext.conversationHistory.length).toBeLessThan(context.conversationHistory.length);
  });

  test('should get context metrics', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    // Create a context
    await contextManager.getContext(userId, sessionId);

    const metrics = await contextManager.getContextMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalContexts).toBe('number');
    expect(typeof metrics.activeContexts).toBe('number');
    expect(typeof metrics.cacheHitRate).toBe('number');
  });

  test('should validate context before updating', async () => {
    const userId = 'test-user';
    const sessionId = 'test-session';

    const context = await contextManager.getContext(userId, sessionId);
    
    // Make context invalid
    (context as any).userId = null;

    await expect(contextManager.updateContext(context)).rejects.toThrow();
  });
});