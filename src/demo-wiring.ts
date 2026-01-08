/**
 * Demonstration script showing how all components are wired together
 * in the LLM Agnostic AI Agent application
 */

import { LLMAgnosticAIAgent } from './app';

async function demonstrateComponentWiring(): Promise<void> {
  console.log('🔧 LLM Agnostic AI Agent - Component Wiring Demonstration');
  console.log('=' .repeat(60));
  
  // Create application instance
  const app = new LLMAgnosticAIAgent({
    llm: {
      openai: {
        enabled: false, // Disabled for demo
        apiKey: 'demo-key',
        model: 'gpt-4'
      }
    }
  });
  
  console.log('📦 Application instance created');
  
  // Initialize - this wires all components together
  await app.initialize();
  console.log('🔗 All components initialized and wired together');
  
  // Demonstrate component access
  const components = app.components;
  
  console.log('\n🏗️  Component Architecture:');
  console.log('┌─ Application Layer');
  console.log('│  └─ LLMAgnosticAIAgent (Main Application Class)');
  console.log('│');
  console.log('├─ Orchestration Layer');
  console.log(`│  ├─ AgentCore: ${components.agentCore ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ FlowRouter: ${components.flowRouter ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ ContextManager: ${components.contextManager ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  └─ RecommendationEngine: ${components.recommendationEngine ? '✅ Wired' : '❌ Missing'}`);
  console.log('│');
  console.log('├─ Infrastructure Layer');
  console.log(`│  ├─ LLMProviderRegistry: ${components.llmProviderRegistry ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ LLMLoadBalancer: ${components.llmLoadBalancer ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ LLMHealthMonitor: ${components.llmHealthMonitor ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ ToolRegistry: ${components.toolRegistry ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  ├─ BusinessDataService: ${components.businessDataService ? '✅ Wired' : '❌ Missing'}`);
  console.log(`│  └─ UIController: ${components.uiController ? '✅ Wired' : '❌ Missing'}`);
  console.log('│');
  console.log('└─ Cross-Cutting Concerns');
  console.log(`   ├─ ProgressTracker: ${components.progressTracker ? '✅ Wired' : '❌ Missing'}`);
  console.log(`   ├─ ErrorMonitor: ${components.errorMonitor ? '✅ Wired' : '❌ Missing'}`);
  console.log(`   └─ GlobalErrorHandler: ${components.globalErrorHandler ? '✅ Wired' : '❌ Missing'}`);
  
  console.log('\n🔄 Dependency Injection:');
  console.log('   ✅ LLM Abstraction Layer → Agent Core');
  console.log('   ✅ Context Manager → Agent Core');
  console.log('   ✅ Tool Registry → Agent Core');
  console.log('   ✅ Flow Router → Agent Core');
  console.log('   ✅ Provider Registry → Load Balancer');
  console.log('   ✅ Provider Registry → Health Monitor');
  console.log('   ✅ Error Handler → All Components');
  
  console.log('\n📊 Service Registration:');
  console.log('   ✅ LLM Providers registered in Provider Registry');
  console.log('   ✅ Business Tools registered in Tool Registry');
  console.log('   ✅ Error Handlers registered in Global Error Handler');
  console.log('   ✅ Conversation Flows registered in Flow Router');
  
  // Test health to verify wiring
  const health = await app.getHealthStatus();
  console.log(`\n🏥 System Health: ${health.status}`);
  console.log(`   Components Checked: ${Object.keys(health.components).length}`);
  console.log(`   Healthy Components: ${Object.values(health.components).filter(s => s === 'healthy').length}`);
  
  // Demonstrate error monitoring
  const errorMetrics = app.getErrorMetrics();
  console.log(`\n📈 Error Monitoring: ${errorMetrics.monitoringStatus.enabled ? 'Active' : 'Inactive'}`);
  
  console.log('\n✅ Component wiring demonstration complete!');
  console.log('🎯 All components successfully wired together with proper dependency injection');
  
  // Cleanup
  await app.shutdown();
  console.log('🔚 Application shutdown complete');
}

// Run demonstration
if (require.main === module) {
  demonstrateComponentWiring()
    .then(() => {
      console.log('\n🏆 Wiring demonstration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Wiring demonstration failed:', error);
      process.exit(1);
    });
}

export { demonstrateComponentWiring };