/**
 * Main Application Class - Wires all components together
 * 
 * This class serves as the main entry point for the LLM Agnostic AI Agent,
 * providing dependency injection and service registration for all system components.
 */

import { AppConfig, ConfigManager, defaultConfig } from './config';
import { AgentCoreImpl } from './agent';
import { FlowRouterImpl } from './flow';
import { ContextManager } from './context';
import { RecommendationEngineImpl } from './recommendation';
import { BusinessDataServiceImpl } from './business';
import { UIControllerImpl } from './ui';
import { ToolRegistry } from './tools';
import { 
  LLMProviderRegistry, 
  LLMLoadBalancer, 
  LLMHealthMonitor,
  OpenAIProvider,
  AnthropicProvider 
} from './llm';
import { ProgressTracker } from './progress';
import { Logger } from './utils/errors';
import { globalErrorHandler, createErrorMonitor, type ErrorMonitor } from './error-handling';

// Import all required types from specific modules
import type { 
  IAgentCore,
  IFlowRouter,
} from './interfaces/agent-core';

import type {
  IContextManager,
} from './interfaces/context-manager';

import type {
  IRecommendationEngine,
} from './interfaces/recommendation-engine';

import type {
  IBusinessDataService,
} from './interfaces/business-data-service';

import type {
  IUIController,
} from './interfaces/ui-controller';

import type {
  IToolRegistry,
} from './interfaces/tool-registry';

import type {
  ILLMProviderRegistry,
  ILLMLoadBalancer,
  ILLMHealthMonitor
} from './interfaces/llm-abstraction';

import type {
  UserInput,
  AgentResponse,
} from './types/agent';

import type {
  ConversationContext,
} from './types/context';

import type {
  BusinessProfile
} from './types/business';

import { MessageRole } from './types/llm';

/**
 * Simple configuration interface for the application
 */
interface SimpleAppConfig {
  llm?: {
    openai?: {
      enabled: boolean;
      apiKey: string;
      model: string;
      maxTokens?: number;
      temperature?: number;
    };
    anthropic?: {
      enabled: boolean;
      apiKey: string;
      model: string;
      maxTokens?: number;
      temperature?: number;
    };
    loadBalancer?: {
      strategy: 'round_robin' | 'least_loaded' | 'cost_optimized';
      maxRetries?: number;
      retryDelay?: number;
    };
  };
  business?: {
    marketplaces?: {
      shopify?: {
        enabled: boolean;
        apiKey?: string;
        shopDomain?: string;
      };
      amazon?: {
        enabled: boolean;
      };
      ebay?: {
        enabled: boolean;
      };
    };
  };
}

/**
 * Application container that manages all system components
 */
export class LLMAgnosticAIAgent {
  private config: AppConfig;
  private logger: Logger;
  
  // Core components
  private llmProviderRegistry!: ILLMProviderRegistry;
  private llmLoadBalancer!: ILLMLoadBalancer;
  private llmHealthMonitor!: ILLMHealthMonitor;
  private toolRegistry!: IToolRegistry;
  private contextManager!: IContextManager;
  private recommendationEngine!: IRecommendationEngine;
  private businessDataService!: IBusinessDataService;
  private uiController!: IUIController;
  private flowRouter!: IFlowRouter;
  private agentCore!: IAgentCore;
  private progressTracker: ProgressTracker;
  private errorMonitor: ErrorMonitor;
  
  private isInitialized = false;

  constructor(config?: SimpleAppConfig) {
    this.logger = new Logger('LLMAgnosticAIAgent');
    const configManager = new ConfigManager();
    this.config = { ...defaultConfig };
    this.progressTracker = new ProgressTracker();
    this.errorMonitor = createErrorMonitor({
      enabled: true,
      checkInterval: 60 // Check every minute
    });
    
    // Apply simple config if provided
    if (config) {
      this.applySimpleConfig(config);
    }
  }

  /**
   * Apply simple configuration to the full config structure
   */
  private applySimpleConfig(simpleConfig: SimpleAppConfig): void {
    if (simpleConfig.llm?.openai) {
      this.config.llm.providers.openai = {
        apiKey: simpleConfig.llm.openai.apiKey,
        model: simpleConfig.llm.openai.model,
        priority: 1,
        enabled: simpleConfig.llm.openai.enabled
      };
    }
    
    if (simpleConfig.llm?.anthropic) {
      this.config.llm.providers.anthropic = {
        apiKey: simpleConfig.llm.anthropic.apiKey,
        model: simpleConfig.llm.anthropic.model,
        priority: 2,
        enabled: simpleConfig.llm.anthropic.enabled
      };
    }
    
    if (simpleConfig.llm?.loadBalancer) {
      this.config.llm.loadBalancer.strategy = simpleConfig.llm.loadBalancer.strategy;
      if (simpleConfig.llm.loadBalancer.maxRetries) {
        this.config.llm.retries = simpleConfig.llm.loadBalancer.maxRetries;
      }
    }
  }

  /**
   * Initialize the application and wire all components together
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Application already initialized');
      return;
    }

    try {
      this.logger.info('Initializing LLM Agnostic AI Agent...');
      
      // Initialize components in dependency order
      await this.initializeLLMLayer();
      await this.initializeToolRegistry();
      await this.initializeContextManager();
      await this.initializeRecommendationEngine();
      await this.initializeBusinessDataService();
      await this.initializeUIController();
      await this.initializeFlowRouter();
      await this.initializeAgentCore();
      
      this.isInitialized = true;
      this.logger.info('LLM Agnostic AI Agent initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize application', error);
      throw new Error(`Application initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize LLM abstraction layer components
   */
  private async initializeLLMLayer(): Promise<void> {
    this.logger.info('Initializing LLM layer...');
    
    // Create provider registry
    this.llmProviderRegistry = new LLMProviderRegistry();
    
    // Register LLM providers
    if (this.config.llm.providers.openai?.enabled && this.config.llm.providers.openai.apiKey) {
      const openaiProvider = new OpenAIProvider({
        name: 'openai',
        apiKey: this.config.llm.providers.openai.apiKey,
        model: this.config.llm.providers.openai.model,
        priority: this.config.llm.providers.openai.priority,
        enabled: this.config.llm.providers.openai.enabled
      });
      await this.llmProviderRegistry.registerProvider(
        {
          name: 'openai',
          apiKey: this.config.llm.providers.openai.apiKey,
          model: this.config.llm.providers.openai.model,
          priority: this.config.llm.providers.openai.priority,
          enabled: this.config.llm.providers.openai.enabled
        },
        openaiProvider
      );
    }
    
    if (this.config.llm.providers.anthropic?.enabled && this.config.llm.providers.anthropic.apiKey) {
      const anthropicProvider = new AnthropicProvider({
        name: 'anthropic',
        apiKey: this.config.llm.providers.anthropic.apiKey,
        model: this.config.llm.providers.anthropic.model,
        priority: this.config.llm.providers.anthropic.priority,
        enabled: this.config.llm.providers.anthropic.enabled
      });
      await this.llmProviderRegistry.registerProvider(
        {
          name: 'anthropic',
          apiKey: this.config.llm.providers.anthropic.apiKey,
          model: this.config.llm.providers.anthropic.model,
          priority: this.config.llm.providers.anthropic.priority,
          enabled: this.config.llm.providers.anthropic.enabled
        },
        anthropicProvider
      );
    }
    
    // Initialize health monitor
    this.llmHealthMonitor = new LLMHealthMonitor(this.llmProviderRegistry);
    this.llmHealthMonitor.startMonitoring({
      checkInterval: Math.max(60, this.config.llm.timeout / 1000 + 10), // Ensure checkInterval > timeout
      timeout: Math.min(10, this.config.llm.timeout / 1000), // Ensure timeout < checkInterval
      retryAttempts: this.config.llm.retries
    });
    
    // Initialize load balancer
    this.llmLoadBalancer = new LLMLoadBalancer(
      this.llmProviderRegistry,
      this.config.llm.loadBalancer
    );
  }

  /**
   * Initialize tool registry and register business tools
   */
  private async initializeToolRegistry(): Promise<void> {
    this.logger.info('Initializing tool registry...');
    
    this.toolRegistry = new ToolRegistry();
    
    // Register business tools - they will auto-register themselves
    // The tools are imported and registered in the business-tools module
  }

  /**
   * Initialize context management system
   */
  private async initializeContextManager(): Promise<void> {
    this.logger.info('Initializing context manager...');
    
    // Create simple memory-based context manager
    const { MemoryContextStorage, MemoryContextCache, ContextRefresher, ContextCompressor, ContextValidator } = await import('./context');
    
    const storage = new MemoryContextStorage();
    const cache = new MemoryContextCache();
    const refresher = new ContextRefresher();
    const compressor = new ContextCompressor();
    const validator = new ContextValidator();
    
    this.contextManager = new ContextManager(
      storage,
      cache,
      refresher,
      compressor,
      validator
    );
    
    // Initialize the context manager with configuration
    await this.contextManager.initialize({
      storage: storage as any,
      cache: cache as any,
      refreshConfig: {
        businessDataTTL: 300, // 5 minutes
        recommendationsTTL: 600, // 10 minutes
        conversationHistoryLimit: 50,
        autoRefreshEnabled: true,
      },
      compressionEnabled: true,
      maxContextSize: 1000,
    });
  }

  /**
   * Initialize recommendation engine
   */
  private async initializeRecommendationEngine(): Promise<void> {
    this.logger.info('Initializing recommendation engine...');
    
    this.recommendationEngine = new RecommendationEngineImpl();
  }

  /**
   * Initialize business data service with marketplace connectors
   */
  private async initializeBusinessDataService(): Promise<void> {
    this.logger.info('Initializing business data service...');
    
    this.businessDataService = new BusinessDataServiceImpl();
  }

  /**
   * Initialize UI controller
   */
  private async initializeUIController(): Promise<void> {
    this.logger.info('Initializing UI controller...');
    
    this.uiController = new UIControllerImpl();
  }

  /**
   * Initialize flow router with all dependencies
   */
  private async initializeFlowRouter(): Promise<void> {
    this.logger.info('Initializing flow router...');
    
    this.flowRouter = new FlowRouterImpl(this.llmProviderRegistry) as any; // Type assertion to handle interface mismatch
  }

  /**
   * Initialize agent core with all dependencies
   */
  private async initializeAgentCore(): Promise<void> {
    this.logger.info('Initializing agent core...');
    
    this.agentCore = new AgentCoreImpl(
      this.flowRouter as any, // Type assertion to handle interface mismatch
      this.llmProviderRegistry,
      this.contextManager,
      this.toolRegistry
    );
    
    // Initialize the agent core with configuration
    await this.agentCore.initialize({
      llmProvider: this.config.llm.defaultProvider,
      fallbackProviders: Object.keys(this.config.llm.providers).filter(name => 
        this.config.llm.providers[name]?.enabled && name !== this.config.llm.defaultProvider
      ),
      maxRetries: this.config.llm.retries,
      timeout: this.config.llm.timeout,
      enableLogging: this.config.logging.enableConsole,
      workflows: [
        {
          type: 'prompt_chaining' as any,
          enabled: true,
          parameters: {}
        },
        {
          type: 'routing' as any,
          enabled: true,
          parameters: {}
        }
      ]
    });
  }

  /**
   * Process user input through the complete agent pipeline
   */
  async processUserInput(
    input: UserInput, 
    userId: string, 
    sessionId?: string
  ): Promise<AgentResponse> {
    if (!this.isInitialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    try {
      // Get or create conversation context
      const context = await this.contextManager.getContext(userId, sessionId || 'default');
      
      // Process through agent core
      const response = await this.agentCore.processUserInput(input, context);
      
      // Update context with response
      await this.contextManager.updateContext({
        ...context,
        conversationHistory: [
          ...context.conversationHistory,
          { 
            id: `msg_${Date.now()}`, 
            role: MessageRole.USER, 
            content: input.content, 
            timestamp: new Date() 
          },
          { 
            id: `msg_${Date.now() + 1}`, 
            role: MessageRole.ASSISTANT, 
            content: response.content, 
            timestamp: new Date() 
          }
        ],
        lastUpdated: new Date()
      });
      
      return response;
      
    } catch (error) {
      this.logger.error('Error processing user input', error);
      
      // Handle error through global error handler with enhanced logging
      const context = await this.contextManager.getContext(userId, sessionId || 'default');
      const errorResponse = await globalErrorHandler.handleError(error, context, {
        component: 'agent-core',
        operation: 'processUserInput',
        userId,
        sessionId,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      // Convert error response to agent response format
      return {
        content: errorResponse.message,
        nextStepActions: errorResponse.suggestedActions,
        metadata: {
          processingTime: 0,
          provider: 'error-handler',
          workflow: 'ROUTING' as any,
          confidence: 0,
          isError: true,
          errorCode: errorResponse.errorCode
        }
      };
    }
  }

  /**
   * Get business profile for a user
   */
  async getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
    if (!this.isInitialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    try {
      return await this.businessDataService.getBusinessProfile(userId);
    } catch (error) {
      this.logger.error('Error getting business profile', error);
      
      // Handle error through global error handler with enhanced logging
      await globalErrorHandler.handleError(error, undefined, {
        component: 'business-data-service',
        operation: 'getBusinessProfile',
        userId,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      // Return null for business profile errors (non-critical)
      return null;
    }
  }

  /**
   * Update application configuration
   */
  async updateConfiguration(newConfig: Partial<SimpleAppConfig>): Promise<void> {
    this.applySimpleConfig(newConfig);
    
    // Reinitialize components that depend on configuration
    if (newConfig.llm) {
      await this.initializeLLMLayer();
    }
    
    this.logger.info('Configuration updated successfully');
  }

  /**
   * Get application health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'unhealthy'>;
    timestamp: Date;
    errorMonitoring?: {
      enabled: boolean;
      errorRate: number;
      recentErrors: number;
    };
  }> {
    const components: Record<string, 'healthy' | 'unhealthy'> = {};
    
    try {
      // Check LLM providers
      const llmHealth = await this.llmHealthMonitor.getHealthStatus();
      components.llm = llmHealth.providers.some(provider => provider.isHealthy) ? 'healthy' : 'unhealthy';
      
      // Check other components
      components.contextManager = this.contextManager ? 'healthy' : 'unhealthy';
      components.toolRegistry = this.toolRegistry ? 'healthy' : 'unhealthy';
      components.businessDataService = this.businessDataService ? 'healthy' : 'unhealthy';
      components.recommendationEngine = this.recommendationEngine ? 'healthy' : 'unhealthy';
      components.uiController = this.uiController ? 'healthy' : 'unhealthy';
      components.flowRouter = this.flowRouter ? 'healthy' : 'unhealthy';
      components.agentCore = this.agentCore ? 'healthy' : 'unhealthy';
      
      // Check error monitoring health
      const errorHealth = globalErrorHandler.getHealthStatus();
      components.errorHandling = errorHealth.isHealthy ? 'healthy' : 'unhealthy';
      
      const healthyCount = Object.values(components).filter(status => status === 'healthy').length;
      const totalCount = Object.keys(components).length;
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalCount) {
        overallStatus = 'healthy';
      } else if (healthyCount > totalCount / 2) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'unhealthy';
      }
      
      return {
        status: overallStatus,
        components,
        timestamp: new Date(),
        errorMonitoring: {
          enabled: this.errorMonitor.getStatus().enabled,
          errorRate: errorHealth.errorRate,
          recentErrors: errorHealth.recentErrorCount
        }
      };
      
    } catch (error) {
      this.logger.error('Error checking health status', error);
      
      // Handle error through global error handler with enhanced logging
      await globalErrorHandler.handleError(error, undefined, {
        component: 'application',
        operation: 'getHealthStatus',
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      return {
        status: 'unhealthy',
        components,
        timestamp: new Date(),
        errorMonitoring: {
          enabled: false,
          errorRate: 0,
          recentErrors: 0
        }
      };
    }
  }

  /**
   * Gracefully shutdown the application
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down LLM Agnostic AI Agent...');
    
    try {
      // Stop error monitoring
      this.errorMonitor.stopMonitoring();
      
      // Stop health monitoring
      if (this.llmHealthMonitor) {
        this.llmHealthMonitor.stopMonitoring();
      }
      
      // Shutdown agent core
      if (this.agentCore) {
        await this.agentCore.shutdown();
      }
      
      // Clean up resources
      if (this.contextManager) {
        // Context manager cleanup if needed
      }
      
      this.isInitialized = false;
      this.logger.info('Application shutdown complete');
      
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      
      // Handle error through global error handler with enhanced logging
      await globalErrorHandler.handleError(error, undefined, {
        component: 'application',
        operation: 'shutdown',
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      throw error;
    }
  }

  // Getters for accessing individual components (useful for testing)
  get components() {
    return {
      agentCore: this.agentCore,
      flowRouter: this.flowRouter,
      contextManager: this.contextManager,
      recommendationEngine: this.recommendationEngine,
      businessDataService: this.businessDataService,
      uiController: this.uiController,
      toolRegistry: this.toolRegistry,
      llmProviderRegistry: this.llmProviderRegistry,
      llmLoadBalancer: this.llmLoadBalancer,
      llmHealthMonitor: this.llmHealthMonitor,
      progressTracker: this.progressTracker,
      errorMonitor: this.errorMonitor,
      globalErrorHandler
    };
  }

  /**
   * Get error monitoring metrics
   */
  getErrorMetrics() {
    return {
      globalMetrics: globalErrorHandler.getMetrics(),
      monitoringStatus: this.errorMonitor.getStatus(),
      healthStatus: globalErrorHandler.getHealthStatus(),
      detailedStatistics: globalErrorHandler.getDetailedStatistics()
    };
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10) {
    return globalErrorHandler.getRecentErrors(limit);
  }

  /**
   * Get enhanced error logger for direct access
   */
  getErrorLogger() {
    return globalErrorHandler.getErrorLogger();
  }

  /**
   * Update error logging configuration
   */
  updateErrorLoggingConfig(config: Parameters<typeof globalErrorHandler.updateLoggingConfig>[0]) {
    globalErrorHandler.updateLoggingConfig(config);
    this.logger.info('Error logging configuration updated');
  }

  /**
   * Register custom error handler
   */
  registerCustomErrorHandler(errorCode: string, handler: Parameters<typeof globalErrorHandler.registerErrorHandler>[1]) {
    globalErrorHandler.registerErrorHandler(errorCode, handler);
    this.logger.info(`Custom error handler registered for: ${errorCode}`);
  }

  /**
   * Get comprehensive system diagnostics
   */
  async getSystemDiagnostics(): Promise<{
    health: Awaited<ReturnType<LLMAgnosticAIAgent['getHealthStatus']>>;
    errorMetrics: ReturnType<LLMAgnosticAIAgent['getErrorMetrics']>;
    recentErrors: ReturnType<LLMAgnosticAIAgent['getRecentErrors']>;
    errorLoggerStats: ReturnType<ReturnType<LLMAgnosticAIAgent['getErrorLogger']>['getStatistics']>;
    timestamp: Date;
  }> {
    const health = await this.getHealthStatus();
    const errorMetrics = this.getErrorMetrics();
    const recentErrors = this.getRecentErrors(20);
    const errorLogger = this.getErrorLogger();
    const errorLoggerStats = errorLogger.getStatistics();

    return {
      health,
      errorMetrics,
      recentErrors,
      errorLoggerStats,
      timestamp: new Date()
    };
  }
}

/**
 * Factory function to create and initialize the application
 */
export async function createLLMAgnosticAIAgent(config?: SimpleAppConfig): Promise<LLMAgnosticAIAgent> {
  const app = new LLMAgnosticAIAgent(config);
  await app.initialize();
  return app;
}

/**
 * Default export for convenience
 */
export default LLMAgnosticAIAgent;