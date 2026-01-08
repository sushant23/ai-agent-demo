// Main entry point for the LLM Agnostic AI Agent

export * from './types';

// Export interfaces with specific names to avoid conflicts
export {
  ILLMProviderRegistry,
  ILLMLoadBalancer,
  ILLMResponseNormalizer,
  ILLMHealthMonitor,
} from './interfaces/llm-abstraction';

export {
  IAgentCore,
  IFlowRouter,
  IWorkflowOrchestrator,
  IErrorHandler,
} from './interfaces/agent-core';

export {
  IToolRegistry,
  IToolExecutor,
  IToolVersionManager,
  IToolCatalog,
} from './interfaces/tool-registry';

export {
  IContextManager,
  IContextStorage,
  IContextCache,
  IContextRefresher,
  IContextCompressor,
  IContextValidator,
} from './interfaces/context-manager';

export {
  IRecommendationEngine,
  IRecommendationGenerator,
  IRecommendationStorage as IRecommendationStorageInterface,
  IImpactEstimator,
  IRecommendationTracker,
} from './interfaces/recommendation-engine';

export {
  IBusinessDataService,
  IMarketplaceConnector,
  IDataAggregator,
  IDataCache,
  IDataValidator,
  IPerformanceAnalyzer,
} from './interfaces/business-data-service';

export {
  IUIController,
  IUINavigator,
  IUIDrawerManager,
  IUIPanelManager,
  IFormManager,
  IProductResolver,
  IUIStateManager,
  IUIAnalytics,
  IUINotificationManager,
} from './interfaces/ui-controller';

// Configuration and utilities
export { AppConfig, defaultConfig, loadConfig } from './config';
export * from './utils';

// Progress tracking and indication
export * from './progress';

// Context management implementations
export {
  ContextManager,
  MemoryContextStorage,
  MemoryContextCache,
  ContextRefresher,
  ContextCompressor,
  ContextValidator,
  createContextManager,
  createDefaultContextManagerConfig,
} from './context';

// Agent Core and Flow Router implementations
export {
  AgentCoreImpl,
} from './agent';

export {
  FlowRouterImpl,
  FlowDefinitions,
} from './flow';

// Business Data Service implementations
export {
  BusinessDataServiceImpl,
  ShopifyConnector,
  AmazonConnector,
  EbayConnector,
  DataAggregator,
  DataCache,
  DataValidator,
  PerformanceAnalyzer,
  RevenueCalculator,
  SEOAnalyzer,
  ProfitabilityAnalyzer,
} from './business';

// UI Controller implementations
export {
  UIControllerImpl,
  UINavigationService,
  ProductNavigationService,
} from './ui';

// Main Application Class
export { LLMAgnosticAIAgent, createLLMAgnosticAIAgent } from './app';

// LLM Abstraction Layer implementations
export {
  BaseLLMProvider,
  LLMProviderRegistry,
  LLMLoadBalancer,
  LLMHealthMonitor,
  LLMResponseNormalizer,
  OpenAIProvider,
  AnthropicProvider,
} from './llm';

// Tool Registry implementations
export {
  ToolRegistry,
  ToolFactory,
} from './tools';

// Recommendation Engine implementations
export {
  RecommendationEngineImpl,
  RecommendationGenerator,
  RecommendationStorageImpl,
  RecommendationService,
} from './recommendation';

// Error Handling
export * from './error-handling';

console.log('LLM Agnostic AI Agent - All components loaded and ready');