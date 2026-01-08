# Web Chat API Setup

The web chat interface has been converted from mock responses to real API calls using your existing AI agent implementation.

## What Changed

### Before (Mock Implementation)
- `callAgent()` function generated fake responses based on keywords
- No real AI processing
- Simulated delays and metadata

### After (Real API Implementation)
- `callAgent()` makes HTTP requests to `/api/sessions/{sessionId}/messages`
- Uses your actual `LLMAgnosticAIAgent` implementation
- Real AI processing with context management, tools, and business data

## How to Use

### 1. Start the Web Server
```bash
npm run web-server
```

This starts an Express server on `http://localhost:3000` that:
- Serves the web chat interface at `/`
- Exposes REST API endpoints at `/api/*`
- Initializes your AI agent with all business tools and connectors

### 2. Open the Web Chat
Navigate to `http://localhost:3000` in your browser to use the chat interface.

## API Endpoints

### Session Management
- `POST /api/sessions` - Create new chat session
- `GET /api/sessions/{sessionId}` - Get session info
- `DELETE /api/sessions/{sessionId}` - Delete session

### Messaging
- `POST /api/sessions/{sessionId}/messages` - Send message to agent
- `GET /api/sessions/{sessionId}/messages` - Get all messages
- `DELETE /api/sessions/{sessionId}/messages` - Clear session history

### Health Check
- `GET /api/health` - Check agent health status

## Key Features

### Real AI Processing
- Uses your complete agent implementation
- Context management across conversations
- Business data integration
- Tool execution (analytics, SEO, marketing, etc.)

### Session Management
- Persistent chat sessions
- Message history
- User identification

### Error Handling
- Graceful error responses
- Connection status indicators
- Retry mechanisms

## Architecture

```
Web Chat (Frontend) → Express Server → SimpleChatApp → LLMAgnosticAIAgent
                                                    ↓
                                            Business Tools & LLM Providers
```

The web interface now connects to your full AI agent stack, providing real business assistance capabilities instead of mock responses.

## Configuration

The agent uses the same configuration as your other implementations:
- LLM providers (OpenAI, Anthropic)
- Business data connectors (Shopify, Amazon, eBay)
- Tool registry with analytics, SEO, and marketing tools
- Context management and recommendation engine

## Development

To modify the web interface:
1. Edit `src/web-chat.html` for frontend changes
2. Edit `src/web-server.ts` for API changes
3. Restart with `npm run web-server`

The server automatically serves the updated HTML file.