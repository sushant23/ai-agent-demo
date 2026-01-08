/**
 * Demo script for the AI Agent Chat Application
 * 
 * This demonstrates how to use the SimpleChatApp and ConsoleChatInterface
 * with the existing AI agent implementation.
 */

import { SimpleChatApp, ConsoleChatInterface } from './chat-app';

/**
 * Demo configuration for the AI agent
 * In a real application, you would provide actual API keys
 */
const demoConfig = {
  llm: {
    // Uncomment and add your API keys to use real LLM providers
    // openai: {
    //   enabled: true,
    //   apiKey: 'your-openai-api-key',
    //   model: 'gpt-3.5-turbo'
    // },
    // anthropic: {
    //   enabled: true,
    //   apiKey: 'your-anthropic-api-key',
    //   model: 'claude-3-sonnet-20240229'
    // }
  }
};

/**
 * Basic chat app demo
 */
async function basicChatDemo() {
  console.log('🚀 Starting Basic Chat Demo...\n');
  
  const chatApp = new SimpleChatApp(demoConfig);
  
  try {
    // Initialize the chat app
    await chatApp.initialize();
    console.log('✅ Chat app initialized');
    
    // Create a session
    const sessionId = await chatApp.createSession('demo_user');
    console.log(`📱 Created session: ${sessionId}`);
    
    // Send some demo messages
    const messages = [
      "Hello! Can you help me with my e-commerce business?",
      "I want to analyze my product performance",
      "How can I improve my SEO?",
      "Show me my sales analytics"
    ];
    
    for (const message of messages) {
      console.log(`\n👤 User: ${message}`);
      
      const response = await chatApp.sendMessage(sessionId, message);
      console.log(`🤖 Assistant: ${response.content}`);
      
      // Show next step actions if available
      if (response.metadata?.nextStepActions) {
        const actions = response.metadata.nextStepActions as any[];
        if (actions.length > 0) {
          console.log('💡 Suggested actions:');
          actions.forEach((action, index) => {
            console.log(`   ${index + 1}. ${action.title}: ${action.description}`);
          });
        }
      }
      
      // Add a small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Show session info
    const session = chatApp.getSession(sessionId);
    console.log(`\n📊 Session has ${session?.messages.length} messages`);
    
    // Check health status
    const health = await chatApp.getHealthStatus();
    console.log(`🏥 System status: ${health.status}`);
    
    // Cleanup
    await chatApp.shutdown();
    console.log('\n✅ Demo completed successfully');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

/**
 * Interactive console chat demo
 */
async function interactiveChatDemo() {
  console.log('🎮 Starting Interactive Chat Demo...\n');
  
  const consoleChat = new ConsoleChatInterface('interactive_user', demoConfig);
  
  try {
    await consoleChat.start();
  } catch (error) {
    console.error('❌ Interactive demo failed:', error);
  }
}

/**
 * Multi-session demo
 */
async function multiSessionDemo() {
  console.log('👥 Starting Multi-Session Demo...\n');
  
  const chatApp = new SimpleChatApp(demoConfig);
  
  try {
    await chatApp.initialize();
    
    // Create multiple sessions for different users
    const users = ['alice', 'bob', 'charlie'];
    const sessions: string[] = [];
    
    for (const user of users) {
      const sessionId = await chatApp.createSession(user);
      sessions.push(sessionId);
      console.log(`📱 Created session for ${user}: ${sessionId}`);
    }
    
    // Send different messages from each user
    const userMessages = [
      { user: 'alice', message: 'I need help with product analytics' },
      { user: 'bob', message: 'How do I optimize my SEO?' },
      { user: 'charlie', message: 'Show me my marketing campaign performance' }
    ];
    
    for (let i = 0; i < userMessages.length; i++) {
      const { user, message } = userMessages[i]!;
      const sessionId = sessions[i]!;
      
      console.log(`\n👤 ${user}: ${message}`);
      const response = await chatApp.sendMessage(sessionId, message);
      console.log(`🤖 Assistant to ${user}: ${response.content.substring(0, 100)}...`);
    }
    
    // Show all user sessions
    for (const user of users) {
      const userSessions = chatApp.getUserSessions(user);
      console.log(`\n📊 ${user} has ${userSessions.length} session(s)`);
    }
    
    await chatApp.shutdown();
    console.log('\n✅ Multi-session demo completed');
    
  } catch (error) {
    console.error('❌ Multi-session demo failed:', error);
  }
}

/**
 * Error handling demo
 */
async function errorHandlingDemo() {
  console.log('⚠️ Starting Error Handling Demo...\n');
  
  const chatApp = new SimpleChatApp(demoConfig);
  
  try {
    await chatApp.initialize();
    const sessionId = await chatApp.createSession('error_test_user');
    
    // Test various error scenarios
    const errorMessages = [
      "This is a very complex message with lots of technical jargon and specific requirements that might be difficult to process",
      "", // Empty message
      "A".repeat(10000), // Very long message
    ];
    
    for (const message of errorMessages) {
      try {
        console.log(`\n👤 Testing message (length: ${message.length})`);
        const response = await chatApp.sendMessage(sessionId, message);
        console.log(`🤖 Response: ${response.content.substring(0, 100)}...`);
        
        if (response.metadata?.error) {
          console.log('⚠️ Error response detected');
        }
        
      } catch (error) {
        console.log(`❌ Caught error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    await chatApp.shutdown();
    console.log('\n✅ Error handling demo completed');
    
  } catch (error) {
    console.error('❌ Error handling demo failed:', error);
  }
}

/**
 * Main demo runner
 */
async function runDemo() {
  const args = process.argv.slice(2);
  const demoType = args[0] || 'basic';
  
  console.log('🤖 AI Agent Chat Application Demo\n');
  console.log('Available demos:');
  console.log('  basic - Basic chat functionality');
  console.log('  interactive - Interactive console chat');
  console.log('  multi - Multi-session demo');
  console.log('  error - Error handling demo');
  console.log('  all - Run all demos\n');
  
  switch (demoType) {
    case 'basic':
      await basicChatDemo();
      break;
      
    case 'interactive':
      await interactiveChatDemo();
      break;
      
    case 'multi':
      await multiSessionDemo();
      break;
      
    case 'error':
      await errorHandlingDemo();
      break;
      
    case 'all':
      await basicChatDemo();
      console.log('\n' + '='.repeat(50) + '\n');
      await multiSessionDemo();
      console.log('\n' + '='.repeat(50) + '\n');
      await errorHandlingDemo();
      console.log('\n' + '='.repeat(50) + '\n');
      console.log('🎉 All demos completed! Run with "interactive" for hands-on testing.');
      break;
      
    default:
      console.log(`❌ Unknown demo type: ${demoType}`);
      console.log('Use: npm run chat-demo [basic|interactive|multi|error|all]');
      process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Demo runner failed:', error);
    process.exit(1);
  });
}

export {
  basicChatDemo,
  interactiveChatDemo,
  multiSessionDemo,
  errorHandlingDemo,
  runDemo
};