/**
 * Comprehensive Error Handling Example
 * 
 * Demonstrates the enhanced error handling system with all its features:
 * - Global error handling with recovery strategies
 * - Structured error logging with categorization
 * - Error monitoring and alerting
 * - User-friendly error messages
 */

import { 
  globalErrorHandler, 
  createErrorMonitor, 
  createErrorLogger,
  LogLevel,
  ErrorCategory,
  UserFriendlyErrorMessages,
  createContextualErrorMessage
} from './index';
import { AppError, LLMProviderError, ToolExecutionError } from '../utils/errors';
import type { ConversationContext } from '../types/context';

/**
 * Example demonstrating comprehensive error handling
 */
export async function demonstrateErrorHandling(): Promise<void> {
  console.log('🚀 Demonstrating Comprehensive Error Handling System...\n');

  // Step 1: Setup error monitoring
  console.log('📊 Step 1: Setting up Error Monitoring...');
  const errorMonitor = createErrorMonitor({
    enabled: true,
    checkInterval: 5, // Check every 5 seconds for demo
    alerts: [
      {
        id: 'demo_high_error_rate',
        name: 'Demo High Error Rate',
        condition: {
          type: 'error_rate',
          threshold: 2, // 2 errors per minute (low threshold for demo)
          timeWindow: 1
        },
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 1, // 1 minute cooldown
        actions: [
          {
            type: 'log',
            config: { level: 'warn' }
          }
        ]
      }
    ]
  });

  console.log('✅ Error monitoring configured and started');
  console.log(`   - Monitoring enabled: ${errorMonitor.getStatus().enabled}`);
  console.log(`   - Active alerts: ${errorMonitor.getStatus().activeAlerts}`);

  // Step 2: Create sample conversation context
  console.log('\n👤 Step 2: Creating Sample Conversation Context...');
  const sampleContext: ConversationContext = {
    userId: 'demo-user-123',
    sessionId: 'demo-session-456',
    conversationHistory: [
      {
        id: 'msg-1',
        role: 'USER' as any,
        content: 'Help me analyze my business performance',
        timestamp: new Date()
      }
    ],
    businessData: {
      businessProfile: {
        userId: 'demo-user-123',
        businessName: 'Demo E-commerce Store',
        primaryEmail: 'demo@example.com',
        timezone: 'UTC',
        connectedMarketplaces: [],
        subscriptionPlan: {
          name: 'Pro',
          features: ['analytics', 'recommendations'],
          limits: { apiCalls: 10000 }
        },
        businessGoals: []
      }
    } as any,
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
        frequency: 'daily' as const
      },
      displaySettings: {
        theme: 'light' as const,
        compactMode: false,
        showAdvancedMetrics: true
      }
    }
  };

  console.log('✅ Sample context created');
  console.log(`   - User: ${sampleContext.userId}`);
  console.log(`   - Session: ${sampleContext.sessionId}`);
  console.log(`   - Total Products: ${sampleContext.businessData.totalProducts}`);

  // Step 3: Demonstrate different error types and handling
  console.log('\n🔥 Step 3: Demonstrating Different Error Types...\n');

  const errorScenarios = [
    {
      name: 'LLM Provider Error',
      error: new LLMProviderError('Rate limit exceeded', 'openai', 'text-generation'),
      component: 'llm-provider'
    },
    {
      name: 'Tool Execution Error',
      error: new ToolExecutionError('Failed to fetch product data', 'product-analyzer', {
        productId: 'prod-123',
        marketplace: 'shopify'
      }),
      component: 'tool-registry'
    },
    {
      name: 'Network Timeout Error',
      error: new Error('Request timeout after 30000ms'),
      component: 'external-api'
    },
    {
      name: 'Validation Error',
      error: new AppError('Invalid product ID format', 'VALIDATION_ERROR', 400),
      component: 'input-validator'
    },
    {
      name: 'Configuration Error',
      error: new Error('Missing required configuration: API_KEY'),
      component: 'config-manager'
    }
  ];

  for (const scenario of errorScenarios) {
    console.log(`🔍 Testing: ${scenario.name}`);
    
    try {
      // Handle the error through the global error handler
      const errorResponse = await globalErrorHandler.handleError(
        scenario.error,
        sampleContext,
        {
          component: scenario.component,
          operation: 'demo-operation',
          retryCount: 0
        }
      );

      console.log(`   ✅ Error handled successfully`);
      console.log(`   📝 Error Code: ${errorResponse.errorCode}`);
      console.log(`   💬 Message: ${errorResponse.message}`);
      console.log(`   🎯 Suggested Actions: ${errorResponse.suggestedActions.length}`);
      
      errorResponse.suggestedActions.forEach((action, index) => {
        console.log(`      ${index + 1}. ${action.title}: ${action.description}`);
      });

      // Demonstrate user-friendly messages
      const friendlyMessage = UserFriendlyErrorMessages.getMessage(errorResponse.errorCode);
      console.log(`   🎨 User-Friendly Title: ${friendlyMessage.title}`);
      
      // Demonstrate contextual messages
      const contextualMessage = createContextualErrorMessage(errorResponse.errorCode, {
        userId: sampleContext.userId,
        retryCount: 1
      });
      console.log(`   🔄 Contextual Message: ${contextualMessage.message}`);

    } catch (handlingError) {
      console.log(`   ❌ Error handling failed: ${handlingError}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Step 4: Demonstrate error metrics and monitoring
  console.log('📈 Step 4: Checking Error Metrics and Health...\n');

  const healthStatus = globalErrorHandler.getHealthStatus();
  console.log('🏥 System Health Status:');
  console.log(`   - Is Healthy: ${healthStatus.isHealthy ? '✅' : '❌'}`);
  console.log(`   - Total Errors: ${healthStatus.totalErrors}`);
  console.log(`   - Error Rate: ${healthStatus.errorRate.toFixed(2)} errors/minute`);
  console.log(`   - Recent Errors: ${healthStatus.recentErrorCount}`);
  console.log(`   - Last Error: ${healthStatus.lastErrorTime?.toISOString() || 'None'}`);

  const detailedStats = globalErrorHandler.getDetailedStatistics();
  console.log('\n📊 Detailed Error Statistics:');
  console.log(`   - Enhanced Logs: ${detailedStats.enhancedStats.totalLogs}`);
  
  console.log('   - Errors by Level:');
  Object.entries(detailedStats.enhancedStats.logsByLevel).forEach(([level, count]) => {
    if (count > 0) {
      console.log(`     ${level}: ${count}`);
    }
  });
  
  console.log('   - Errors by Category:');
  Object.entries(detailedStats.enhancedStats.logsByCategory).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`     ${category}: ${count}`);
    }
  });

  // Step 5: Demonstrate error logger capabilities
  console.log('\n📝 Step 5: Enhanced Error Logger Capabilities...\n');

  const errorLogger = globalErrorHandler.getErrorLogger();
  
  // Get recent logs by category
  const systemErrors = errorLogger.getLogsByCategory(ErrorCategory.SYSTEM, 5);
  console.log(`🔧 Recent System Errors: ${systemErrors.length}`);
  
  const networkErrors = errorLogger.getLogsByCategory(ErrorCategory.NETWORK, 5);
  console.log(`🌐 Recent Network Errors: ${networkErrors.length}`);
  
  const businessErrors = errorLogger.getLogsByCategory(ErrorCategory.BUSINESS_LOGIC, 5);
  console.log(`💼 Recent Business Logic Errors: ${businessErrors.length}`);

  // Get recent logs by level
  const criticalErrors = errorLogger.getLogsByLevel(LogLevel.CRITICAL, 5);
  const errorLevelErrors = errorLogger.getLogsByLevel(LogLevel.ERROR, 5);
  const warnings = errorLogger.getLogsByLevel(LogLevel.WARN, 5);
  
  console.log(`\n🚨 Error Breakdown by Severity:`);
  console.log(`   - Critical: ${criticalErrors.length}`);
  console.log(`   - Error: ${errorLevelErrors.length}`);
  console.log(`   - Warning: ${warnings.length}`);

  // Step 6: Demonstrate error recovery (simulation)
  console.log('\n🔄 Step 6: Demonstrating Error Recovery Strategies...\n');

  // Simulate a recoverable error in non-test environment
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development'; // Enable recovery strategies

  try {
    const recoverableError = new Error('Temporary network issue');
    const recoveryResponse = await globalErrorHandler.handleError(
      recoverableError,
      sampleContext,
      {
        component: 'network-client',
        operation: 'fetch-data',
        retryCount: 0
      }
    );

    console.log('🔄 Recovery Strategy Applied:');
    console.log(`   - Error Code: ${recoveryResponse.errorCode}`);
    console.log(`   - Recovery Message: ${recoveryResponse.message}`);
    console.log(`   - Recovery Actions: ${recoveryResponse.suggestedActions.length}`);
    
    recoveryResponse.suggestedActions.forEach((action, index) => {
      console.log(`     ${index + 1}. ${action.title}: ${action.description}`);
    });

  } finally {
    process.env.NODE_ENV = originalEnv; // Restore original environment
  }

  // Step 7: Demonstrate monitoring alerts
  console.log('\n🚨 Step 7: Monitoring and Alerting...\n');

  const monitoringStatus = errorMonitor.getStatus();
  console.log('📡 Monitoring Status:');
  console.log(`   - Enabled: ${monitoringStatus.enabled}`);
  console.log(`   - Running: ${monitoringStatus.running}`);
  console.log(`   - Total Alerts: ${monitoringStatus.alertCount}`);
  console.log(`   - Active Alerts: ${monitoringStatus.activeAlerts}`);

  // Wait a moment for monitoring to potentially trigger
  console.log('\n⏳ Waiting for monitoring cycle...');
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

  const alertHistory = errorMonitor.getAlertHistory();
  console.log(`📋 Alert History: ${alertHistory.size} alerts have been triggered`);
  
  alertHistory.forEach((dates, alertId) => {
    console.log(`   - ${alertId}: ${dates.length} triggers`);
    if (dates.length > 0) {
      console.log(`     Last triggered: ${dates[dates.length - 1]?.toISOString()}`);
    }
  });

  // Step 8: Cleanup and summary
  console.log('\n🧹 Step 8: Cleanup and Summary...\n');

  // Stop monitoring
  errorMonitor.stopMonitoring();
  console.log('✅ Error monitoring stopped');

  // Final health check
  const finalHealth = globalErrorHandler.getHealthStatus();
  console.log('\n📋 Final System Health Summary:');
  console.log(`   - Total Errors Processed: ${finalHealth.totalErrors}`);
  console.log(`   - System Health: ${finalHealth.isHealthy ? 'Healthy ✅' : 'Needs Attention ⚠️'}`);
  console.log(`   - Error Rate: ${finalHealth.errorRate.toFixed(2)} errors/minute`);

  console.log('\n🎉 Error Handling Demonstration Complete!');
  console.log('\n📝 Key Features Demonstrated:');
  console.log('   ✅ Global error handling with automatic categorization');
  console.log('   ✅ Structured error logging with multiple levels and categories');
  console.log('   ✅ User-friendly error messages with contextual adaptation');
  console.log('   ✅ Error recovery strategies with automatic fallbacks');
  console.log('   ✅ Real-time error monitoring and alerting');
  console.log('   ✅ Comprehensive error metrics and health monitoring');
  console.log('   ✅ Integration with conversation context and user data');
}

/**
 * Example of custom error handler registration
 */
export function demonstrateCustomErrorHandlers(): void {
  console.log('\n🔧 Demonstrating Custom Error Handler Registration...\n');

  // Register a custom error handler for business-specific errors
  globalErrorHandler.registerErrorHandler('CUSTOM_BUSINESS_ERROR', async (error, context) => {
    console.log('🏢 Custom business error handler triggered');
    
    return {
      message: 'We encountered a business-specific issue. Our team has been notified and will resolve this shortly.',
      suggestedActions: [
        {
          id: 'contact_business_support',
          title: 'Contact Business Support',
          description: 'Get help from our business specialists',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'view_business_status',
          title: 'Check Business Status',
          description: 'View your business account status',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ],
      errorCode: 'CUSTOM_BUSINESS_ERROR'
    };
  });

  // Register a custom user-friendly message
  UserFriendlyErrorMessages.registerMessage('CUSTOM_BUSINESS_ERROR', {
    title: 'Business Account Issue',
    message: 'There\'s an issue with your business account configuration.',
    suggestion: 'Our business support team can help resolve this quickly.',
    actions: [
      {
        id: 'business_support',
        title: 'Contact Business Support',
        description: 'Get specialized help for business accounts',
        actionType: 'UPDATE_PROFILE' as any
      }
    ]
  });

  console.log('✅ Custom error handlers registered successfully');
  console.log('   - Custom business error handler');
  console.log('   - Custom user-friendly message template');
}

/**
 * Run the complete error handling demonstration
 */
export async function runErrorHandlingDemo(): Promise<void> {
  try {
    await demonstrateErrorHandling();
    demonstrateCustomErrorHandlers();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runErrorHandlingDemo()
    .then(() => {
      console.log('\n🏆 Error handling demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error handling demo failed:', error);
      process.exit(1);
    });
}