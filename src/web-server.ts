/**
 * Web Server for Chat API
 * 
 * Exposes the SimpleChatApp as a REST API for web clients
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { SimpleChatApp } from './chat-app';

export class ChatWebServer {
  private app: express.Application;
  private chatApp: SimpleChatApp;
  private server: any;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    
    // Configure OpenAI for the chat app
    const agentConfig = {
      llm: {
        openai: {
          enabled: true,
          apiKey: '<OPEN_API_KEY_HERE>',
          model: 'gpt-4'
        }
      }
    };
    
    this.chatApp = new SimpleChatApp(agentConfig);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Serve static files (for the web chat HTML)
    this.app.use(express.static(path.join(__dirname, '../src')));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.chatApp.getHealthStatus();
        return res.json({ status: 'ok', health });
      } catch (error) {
        return res.status(500).json({ 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Create new chat session
    this.app.post('/api/sessions', async (req, res) => {
      try {
        const { userId = 'web_user' } = req.body;
        const sessionId = await this.chatApp.createSession(userId);
        const session = this.chatApp.getSession(sessionId);
        
        return res.json({
          sessionId,
          session: {
            id: session?.id,
            userId: session?.userId,
            createdAt: session?.createdAt,
            messageCount: session?.messages.length || 0
          }
        });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to create session',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Send message to agent
    this.app.post('/api/sessions/:sessionId/messages', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { content } = req.body;

        if (!content || typeof content !== 'string') {
          return res.status(400).json({ 
            error: 'Message content is required and must be a string' 
          });
        }

        const response = await this.chatApp.sendMessage(sessionId, content);
        
        return res.json({
          message: response,
          sessionId
        });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to process message',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Get session messages
    this.app.get('/api/sessions/:sessionId/messages', (req, res) => {
      try {
        const { sessionId } = req.params;
        const messages = this.chatApp.getMessages(sessionId);
        
        return res.json({
          sessionId,
          messages,
          count: messages.length
        });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to get messages',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Get session info
    this.app.get('/api/sessions/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.chatApp.getSession(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({
          session: {
            id: session.id,
            userId: session.userId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            messageCount: session.messages.length
          }
        });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to get session',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Clear session messages
    this.app.delete('/api/sessions/:sessionId/messages', (req, res) => {
      try {
        const { sessionId } = req.params;
        const success = this.chatApp.clearSession(sessionId);
        
        if (!success) {
          return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({ success: true, message: 'Session cleared' });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to clear session',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Delete session
    this.app.delete('/api/sessions/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const success = this.chatApp.deleteSession(sessionId);
        
        if (!success) {
          return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({ success: true, message: 'Session deleted' });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to delete session',
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Serve the web chat interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web-chat.html'));
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    });
  }

  /**
   * Start the web server
   */
  async start(): Promise<void> {
    try {
      // Initialize the chat app
      await this.chatApp.initialize();
      
      // Start the server
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Chat Web Server running on http://localhost:${this.port}`);
        console.log(`📱 Web Chat Interface: http://localhost:${this.port}`);
        console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      console.error('Failed to start web server:', error);
      throw error;
    }
  }

  /**
   * Stop the web server
   */
  async stop(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
      }
      await this.chatApp.shutdown();
      console.log('Web server stopped');
    } catch (error) {
      console.error('Error stopping web server:', error);
      throw error;
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new ChatWebServer(3000);
  
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.stop();
    process.exit(0);
  });
}