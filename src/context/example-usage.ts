// Example usage of the Context Management system

import {
  createContextManager,
  createDefaultContextManagerConfig,
} from './index';
import { ConversationContext } from '../types/context';
import { MessageRole } from '../types/llm';
import { Priority } from '../types/common';
import { RecommendationCategory } from '../types/recommendations';

async function demonstrateContextManagement() {
  console.log('=== Context Management Demo ===\n');

  // Create context manager with default configuration
  const contextManager = createContextManager();
  const config = createDefaultContextManagerConfig();
  
  await contextManager.initialize(config);

  try {
    // Example 1: Create and retrieve a new context
    console.log('1. Creating new context...');
    const userId = 'user123';
    const sessionId = 'session456';
    
    let context = await contextManager.getContext(userId, sessionId);
    console.log(`Created context for user: ${context.userId}, session: ${context.sessionId}`);
    console.log(`Initial conversation history length: ${context.conversationHistory.length}`);

    // Example 2: Add some conversation history
    console.log('\n2. Adding conversation messages...');
    context.conversationHistory.push({
      id: 'msg1',
      role: MessageRole.USER,
      content: 'Hello, I need help with my e-commerce business',
      timestamp: new Date(),
    });

    context.conversationHistory.push({
      id: 'msg2',
      role: MessageRole.ASSISTANT,
      content: 'I\'d be happy to help! What specific area would you like to focus on?',
      timestamp: new Date(),
    });

    await contextManager.updateContext(context);
    console.log(`Updated context with ${context.conversationHistory.length} messages`);

    // Example 3: Retrieve the updated context
    console.log('\n3. Retrieving updated context...');
    const retrievedContext = await contextManager.getContext(userId, sessionId);
    console.log(`Retrieved context has ${retrievedContext.conversationHistory.length} messages`);
    console.log(`Last message: "${retrievedContext.conversationHistory[retrievedContext.conversationHistory.length - 1]?.content}"`);

    // Example 4: Test context refresh
    console.log('\n4. Testing context refresh...');
    const refreshedContext = await contextManager.refreshContext(userId, sessionId);
    console.log(`Refreshed context at: ${refreshedContext.lastUpdated}`);

    // Example 5: Test context compression
    console.log('\n5. Testing context compression...');
    
    // Add many messages to trigger compression
    for (let i = 0; i < 25; i++) {
      refreshedContext.conversationHistory.push({
        id: `msg${i + 3}`,
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        content: `Message ${i + 3} content`,
        timestamp: new Date(),
      });
    }

    console.log(`Before compression: ${refreshedContext.conversationHistory.length} messages`);
    const compressedContext = await contextManager.compressContext(refreshedContext);
    console.log(`After compression: ${compressedContext.conversationHistory.length} messages`);

    // Example 6: Get context metrics
    console.log('\n6. Context metrics...');
    const metrics = await contextManager.getContextMetrics();
    console.log(`Total contexts: ${metrics.totalContexts}`);
    console.log(`Active contexts: ${metrics.activeContexts}`);
    console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

    // Example 7: Clear context
    console.log('\n7. Clearing context...');
    await contextManager.clearContext(userId, sessionId);
    console.log('Context cleared successfully');

    // Verify context is cleared
    const clearedContext = await contextManager.getContext(userId, sessionId);
    console.log(`New context created with ${clearedContext.conversationHistory.length} messages`);

  } catch (error) {
    console.error('Error during context management demo:', error);
  } finally {
    // Clean up
    await contextManager.shutdown();
    console.log('\nContext manager shut down successfully');
  }
}

// Example of advanced context operations
async function demonstrateAdvancedFeatures() {
  console.log('\n=== Advanced Context Features Demo ===\n');

  const contextManager = createContextManager();
  const config = createDefaultContextManagerConfig();
  
  // Enable auto-refresh
  config.refreshConfig.autoRefreshEnabled = true;
  config.refreshConfig.businessDataTTL = 5; // 5 seconds for demo
  
  await contextManager.initialize(config);

  try {
    const userId = 'advanced-user';
    const sessionId = 'advanced-session';

    // Create context with business data
    const context = await contextManager.getContext(userId, sessionId);
    
    // Simulate business data
    context.businessData.totalProducts = 150;
    context.businessData.totalRevenue = { amount: 25000, currency: 'USD' };
    
    // Add some recommendations
    context.recommendations.set('seo', [
      {
        id: 'rec1',
        title: 'Optimize product titles',
        reason: 'Low SEO scores detected',
        priority: Priority.HIGH,
        category: RecommendationCategory.SEO_OPTIMIZATION,
        requiredActions: [],
        createdAt: new Date(),
      }
    ]);

    await contextManager.updateContext(context);
    console.log('Created context with business data and recommendations');

    // Wait for auto-refresh (in a real app, this would happen automatically)
    console.log('Waiting for auto-refresh...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Retrieve context to see if it was refreshed
    const refreshedContext = await contextManager.getContext(userId, sessionId);
    console.log(`Context last updated: ${refreshedContext.lastUpdated}`);

  } catch (error) {
    console.error('Error during advanced demo:', error);
  } finally {
    await contextManager.shutdown();
  }
}

// Enhanced Context Management Examples (Task 5.3 Implementation)
async function demonstrateEnhancedRefreshAndCleanup() {
  console.log('\n=== Enhanced Refresh and Cleanup Demo ===\n');

  const contextManager = createContextManager();
  const config = createDefaultContextManagerConfig();
  
  // Configure for enhanced refresh and cleanup
  config.refreshConfig.businessDataTTL = 30; // 30 seconds for demo
  config.refreshConfig.recommendationsTTL = 60; // 1 minute for demo
  config.refreshConfig.autoRefreshEnabled = true;
  config.compressionEnabled = true;
  config.maxContextSize = 50000; // 50KB
  
  await contextManager.initialize(config);

  try {
    // Create multiple contexts to demonstrate cleanup
    const users = ['user1', 'user2', 'user3'];
    const sessions = ['session-a', 'session-b'];
    
    console.log('1. Creating multiple contexts...');
    for (const userId of users) {
      for (const sessionId of sessions) {
        const context = await contextManager.getContext(userId, sessionId);
        
        // Add some data to make contexts more realistic
        context.conversationHistory.push({
          id: `msg-${userId}-${sessionId}`,
          role: MessageRole.USER,
          content: `Hello from ${userId} in ${sessionId}`,
          timestamp: new Date(),
        });
        
        await contextManager.updateContext(context);
      }
    }
    
    console.log(`Created contexts for ${users.length} users with ${sessions.length} sessions each`);

    // Demonstrate automatic stale data detection
    console.log('\n2. Testing stale data detection...');
    
    // Simulate stale context by modifying timestamp
    const staleContext = await contextManager.getContext('user1', 'session-a');
    staleContext.lastUpdated = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
    staleContext.businessData.lastUpdated = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    await contextManager.updateContext(staleContext);
    
    // Getting the context should trigger automatic refresh
    console.log('Retrieving stale context (should trigger auto-refresh)...');
    const autoRefreshedContext = await contextManager.getContext('user1', 'session-a');
    console.log(`Context was auto-refreshed at: ${autoRefreshedContext.lastUpdated}`);

    // Demonstrate compression functionality
    console.log('\n3. Testing automatic compression...');
    
    const largeContext = await contextManager.getContext('user2', 'session-a');
    
    // Add lots of conversation history to trigger compression
    for (let i = 0; i < 60; i++) {
      largeContext.conversationHistory.push({
        id: `bulk-msg-${i}`,
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        content: `Bulk message ${i} with some content to increase size`,
        timestamp: new Date(),
      });
    }
    
    console.log(`Before update: ${largeContext.conversationHistory.length} messages`);
    await contextManager.updateContext(largeContext); // Should trigger compression
    
    const retrievedLargeContext = await contextManager.getContext('user2', 'session-a');
    console.log(`After compression: ${retrievedLargeContext.conversationHistory.length} messages`);

    // Demonstrate force cleanup
    console.log('\n4. Testing force cleanup...');
    
    const initialMetrics = await contextManager.getContextMetrics();
    console.log(`Before cleanup - Total contexts: ${initialMetrics.totalContexts}, Active: ${initialMetrics.activeContexts}`);
    
    const cleanupResult = await contextManager.forceCleanup();
    console.log(`Cleanup result: ${cleanupResult.deletedContexts} contexts deleted, ${cleanupResult.cleanedTimers} timers cleaned`);
    
    const finalMetrics = await contextManager.getContextMetrics();
    console.log(`After cleanup - Total contexts: ${finalMetrics.totalContexts}, Active: ${finalMetrics.activeContexts}`);

    // Demonstrate bulk operations
    console.log('\n5. Testing bulk operations...');
    
    const refreshAllResult = await contextManager.refreshAllActiveContexts();
    console.log(`Refresh all result: ${refreshAllResult.refreshed} refreshed, ${refreshAllResult.failed} failed`);
    
    const compressAllResult = await contextManager.compressAllContexts();
    console.log(`Compress all result: ${compressAllResult.compressed} compressed, ${compressAllResult.failed} failed`);

  } catch (error) {
    console.error('Error during enhanced demo:', error);
  } finally {
    await contextManager.shutdown();
    console.log('\nEnhanced context manager demo completed');
  }
}

// Demonstrate different refresh strategies
async function demonstrateRefreshStrategies() {
  console.log('\n=== Refresh Strategy Examples ===\n');
  
  // Strategy 1: Aggressive refresh (short TTL)
  console.log('Strategy 1: Aggressive refresh (good for real-time data)');
  const aggressiveConfig = createDefaultContextManagerConfig();
  aggressiveConfig.refreshConfig.businessDataTTL = 300; // 5 minutes
  aggressiveConfig.refreshConfig.recommendationsTTL = 600; // 10 minutes
  aggressiveConfig.refreshConfig.autoRefreshEnabled = true;
  console.log('- Business data TTL: 5 minutes');
  console.log('- Recommendations TTL: 10 minutes');
  console.log('- Auto-refresh: enabled');
  
  // Strategy 2: Conservative refresh (long TTL)
  console.log('\nStrategy 2: Conservative refresh (good for stable data)');
  const conservativeConfig = createDefaultContextManagerConfig();
  conservativeConfig.refreshConfig.businessDataTTL = 7200; // 2 hours
  conservativeConfig.refreshConfig.recommendationsTTL = 14400; // 4 hours
  conservativeConfig.refreshConfig.autoRefreshEnabled = false;
  console.log('- Business data TTL: 2 hours');
  console.log('- Recommendations TTL: 4 hours');
  console.log('- Auto-refresh: disabled (manual only)');
  
  // Strategy 3: Balanced refresh
  console.log('\nStrategy 3: Balanced refresh (good for most use cases)');
  const balancedConfig = createDefaultContextManagerConfig();
  balancedConfig.refreshConfig.businessDataTTL = 1800; // 30 minutes
  balancedConfig.refreshConfig.recommendationsTTL = 3600; // 1 hour
  balancedConfig.refreshConfig.autoRefreshEnabled = true;
  console.log('- Business data TTL: 30 minutes');
  console.log('- Recommendations TTL: 1 hour');
  console.log('- Auto-refresh: enabled');
}

// Run the demos
if (require.main === module) {
  (async () => {
    await demonstrateContextManagement();
    await demonstrateAdvancedFeatures();
    await demonstrateEnhancedRefreshAndCleanup();
    await demonstrateRefreshStrategies();
  })();
}

export {
  demonstrateContextManagement,
  demonstrateAdvancedFeatures,
  demonstrateEnhancedRefreshAndCleanup,
  demonstrateRefreshStrategies,
};