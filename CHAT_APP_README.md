# AI Agent Chat Application

A simple chat application built on top of the LLM Agnostic AI Agent architecture. This chat app provides both programmatic and interactive interfaces for communicating with the AI business assistant.

## Features

- **Multi-session support** - Handle multiple concurrent chat sessions
- **Context-aware conversations** - Maintains conversation history and business context
- **Next-step actions** - AI suggests relevant follow-up actions
- **Error handling** - Graceful error recovery with user-friendly messages
- **Web interface** - Beautiful HTML/CSS/JS chat interface
- **Console interface** - Interactive command-line chat for testing
- **Health monitoring** - System status and diagnostics

## Quick Start

### 1. Interactive Console Chat

Start an interactive chat session in your terminal:

```bash
npm run chat
```

This will launch a console-based chat interface where you can:
- Ask questions about your business
- Get product analytics
- Request SEO optimization help
- Explore marketing strategies
- Type `exit` to quit, `clear` to clear history, `health` for system status

### 2. Web Interface

Open the web chat interface:

```bash
# Serve the HTML file with a simple HTTP server
npx http-server src -p 8080
# Then open http://localhost:8080/web-chat.html
```

The web interface provides:
- Modern, responsive chat UI
- Typing indicators
- Clickable suggested actions
- Message history
- Status indicators

### 3. Programmatic Usage

Use the chat app in your own code:

```typescript
import { SimpleChatApp } from './src/chat-app';

const chatApp = new SimpleChatApp({
  llm: {
    openai: {
      enabled: true,
      apiKey: 'your-api-key',
      model: 'gpt-3.5-turbo'
    }
  }
});

await chatApp.initialize();
const sessionId = await chatApp.createSession('user123');
const response = await chatApp.sendMessage(sessionId, 'Hello!');
console.log(response.content);
```

## Demo Scripts

Run various demo scenarios:

```bash
# Basic functionality demo
npm run chat-basic

# Multi-session demo
npm run chat-multi

# Error handling demo
npm run chat-error

# Run all demos
npm run chat-all
```

## Configuration

### LLM Providers

Configure your LLM providers in the chat app constructor:

```typescript
const config = {
  llm: {
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    },
    anthropic: {
      enabled: true,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229'
    }
  }
};

const chatApp = new SimpleChatApp(config);
```

### Environment Variables

Set up your environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## API Reference

### SimpleChatApp

Main chat application class that manages sessions and agent interactions.

#### Methods

- `initialize()` - Initialize the chat app and underlying agent
- `createSession(userId: string)` - Create a new chat session
- `sendMessage(sessionId: string, content: string)` - Send a message and get response
- `getSession(sessionId: string)` - Get session details
- `getMessages(sessionId: string)` - Get all messages from a session
- `clearSession(sessionId: string)` - Clear session history
- `deleteSession(sessionId: string)` - Delete a session
- `getUserSessions(userId: string)` - Get all sessions for a user
- `getHealthStatus()` - Get system health status
- `shutdown()` - Gracefully shutdown the app

### ConsoleChatInterface

Interactive console-based chat interface for testing and demos.

#### Usage

```typescript
const consoleChat = new ConsoleChatInterface('user123', config);
await consoleChat.start();
```

### ChatMessage

Message structure used throughout the chat app:

```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  metadata?: {
    processingTime?: number;
    provider?: string;
    workflow?: string;
    confidence?: number;
    nextStepActions?: NextStepAction[];
    error?: boolean;
  };
}
```

### ChatSession

Session structure that maintains conversation state:

```typescript
interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: ConversationContext;
  createdAt: Date;
  lastActivity: Date;
}
```

## Integration with AI Agent

The chat app is built on top of the existing AI agent architecture and leverages:

- **Agent Core** - Main processing engine with workflow patterns
- **Flow Router** - Intent classification and conversation flow management
- **Context Manager** - Conversation history and business context
- **Tool Registry** - Business tools for product management, analytics, etc.
- **LLM Providers** - OpenAI, Anthropic, and other LLM integrations
- **Error Handling** - Comprehensive error recovery and user-friendly messages

## Example Conversations

### Product Management
```
User: "I want to analyze my product performance"
Agent: "I can help you with product management! I can analyze your product performance, optimize listings, and provide insights on inventory levels..."

Suggested Actions:
1. View Top Products: See your best-performing products
2. Analyze Product: Get detailed insights about a specific product
3. Optimize Listings: Improve your product listings for better visibility
```

### SEO Optimization
```
User: "How can I improve my SEO?"
Agent: "Great! SEO optimization is crucial for product visibility. I can help you optimize your product titles, descriptions, and tags for better search rankings..."

Suggested Actions:
1. SEO Analysis: Analyze current SEO performance
2. Optimize Product: Improve SEO for a specific product
3. Keyword Research: Find better keywords for your products
```

### Analytics
```
User: "Show me my sales analytics"
Agent: "I'd be happy to help with analytics! I can show you sales performance, revenue trends, conversion rates, and other key metrics..."

Suggested Actions:
1. View Dashboard: See your main analytics dashboard
2. Sales Report: Get detailed sales performance report
3. Trend Analysis: Analyze performance trends over time
```

## Architecture

The chat app follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Chat Interfaces           │
│  (Web UI, Console, Programmatic)    │
├─────────────────────────────────────┤
│          SimpleChatApp              │
│    (Session Management, API)        │
├─────────────────────────────────────┤
│       LLMAgnosticAIAgent           │
│     (Core Agent Architecture)       │
├─────────────────────────────────────┤
│  Agent Core | Flow Router | Tools   │
│  Context   | LLM Providers | UI     │
└─────────────────────────────────────┘
```

## Error Handling

The chat app includes comprehensive error handling:

- **Network errors** - Graceful fallback when LLM providers are unavailable
- **Invalid input** - Validation and user-friendly error messages
- **Session errors** - Automatic session recovery and cleanup
- **Agent errors** - Fallback responses with suggested actions

## Testing

The chat app includes several demo modes for testing:

- **Basic Demo** - Test core functionality
- **Interactive Demo** - Manual testing with console interface
- **Multi-Session Demo** - Test concurrent sessions
- **Error Handling Demo** - Test error scenarios

## Customization

### Custom Message Processing

Extend the chat app with custom message processing:

```typescript
class CustomChatApp extends SimpleChatApp {
  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    // Add custom preprocessing
    const processedContent = this.preprocessMessage(content);
    
    // Call parent method
    const response = await super.sendMessage(sessionId, processedContent);
    
    // Add custom postprocessing
    return this.postprocessResponse(response);
  }
}
```

### Custom UI Integration

The web interface can be easily customized or integrated into existing applications by modifying the HTML/CSS/JS files.

## Troubleshooting

### Common Issues

1. **"Chat app not initialized"** - Make sure to call `await chatApp.initialize()` before using
2. **"Session not found"** - Check that the session ID is valid and hasn't been deleted
3. **"LLM Provider unavailable"** - Verify your API keys and network connection
4. **Empty responses** - Check your LLM provider configuration and quotas

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export DEBUG=true
npm run chat
```

## Contributing

To extend the chat app:

1. Add new message types in the `ChatMessage` interface
2. Extend the `SimpleChatApp` class with new methods
3. Create new UI interfaces by following the existing patterns
4. Add new demo scenarios in `chat-demo.ts`

## License

This chat application is part of the LLM Agnostic AI Agent project and follows the same MIT license.