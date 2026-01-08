// Configuration management

export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  logging: LoggingConfig;
  llm: LLMConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  api: ApiConfig;
  conversationFlows: ConversationFlowConfig;
  market: MarketConfig;
  tools: ToolsConfig;
  recommendations: RecommendationConfig;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
}

export interface LLMConfig {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  loadBalancer: LoadBalancerConfig;
  timeout: number;
  retries: number;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  priority: number;
  enabled: boolean;
}

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'least_loaded' | 'cost_optimized';
  fallbackEnabled: boolean;
  healthCheckInterval: number;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

export interface CacheConfig {
  type: 'memory' | 'redis';
  host?: string;
  port?: number;
  password?: string;
  ttl: number;
  maxSize: number;
}

export interface ApiConfig {
  port: number;
  host: string;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
}

// New configuration interfaces for requirements 9.1-9.4

export interface ConversationFlowConfig {
  flows: Record<string, FlowDefinition>;
  responseTemplates: Record<string, ResponseTemplate>;
  defaultFlow: string;
  maxFlowDepth: number;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  triggers: string[];
  enabled: boolean;
}

export interface FlowStep {
  id: string;
  type: 'prompt' | 'tool' | 'decision' | 'template';
  config: Record<string, any>;
  nextSteps: string[];
}

export interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  conditions?: Record<string, any>;
}

export interface MarketConfig {
  region: string;
  language: string;
  currency: string;
  timezone: string;
  businessRules: Record<string, any>;
  localization: LocalizationConfig;
}

export interface LocalizationConfig {
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  messages: Record<string, string>;
}

export interface ToolsConfig {
  environments: Record<string, EnvironmentToolConfig>;
  globalSettings: ToolGlobalSettings;
}

export interface EnvironmentToolConfig {
  enabledTools: string[];
  toolConfigurations: Record<string, ToolConfiguration>;
  apiEndpoints: Record<string, string>;
  credentials: Record<string, CredentialConfig>;
}

export interface ToolConfiguration {
  enabled: boolean;
  timeout: number;
  retries: number;
  rateLimit?: RateLimitConfig;
  customSettings: Record<string, any>;
}

export interface CredentialConfig {
  type: 'api_key' | 'oauth' | 'basic_auth';
  value?: string;
  envVar?: string;
  encrypted: boolean;
}

export interface ToolGlobalSettings {
  defaultTimeout: number;
  defaultRetries: number;
  enableCaching: boolean;
  cacheTtl: number;
}

export interface RecommendationConfig {
  algorithms: Record<string, AlgorithmConfig>;
  thresholds: RecommendationThresholds;
  scoring: ScoringConfig;
  filters: FilterConfig;
}

export interface AlgorithmConfig {
  name: string;
  type: 'rule_based' | 'ml_based' | 'hybrid';
  enabled: boolean;
  weight: number;
  parameters: Record<string, any>;
}

export interface RecommendationThresholds {
  minConfidence: number;
  maxRecommendations: number;
  impactThreshold: number;
  priorityWeights: Record<string, number>;
}

export interface ScoringConfig {
  factors: Record<string, number>;
  normalization: 'linear' | 'logarithmic' | 'exponential';
  decayFactor: number;
}

export interface FilterConfig {
  enabledFilters: string[];
  filterRules: Record<string, FilterRule>;
}

export interface FilterRule {
  condition: string;
  action: 'include' | 'exclude' | 'boost' | 'penalize';
  value: number;
}

// Default configuration
export const defaultConfig: AppConfig = {
  environment: 'development',
  logging: {
    level: 'info',
    format: 'text',
    enableConsole: true,
    enableFile: false,
  },
  llm: {
    defaultProvider: 'openai',
    providers: {},
    loadBalancer: {
      strategy: 'round_robin',
      fallbackEnabled: true,
      healthCheckInterval: 30000,
    },
    timeout: 30000,
    retries: 3,
  },
  database: {
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'llm_agent',
    username: 'postgres',
    password: '',
    ssl: false,
    poolSize: 10,
  },
  cache: {
    type: 'memory',
    ttl: 3600,
    maxSize: 1000,
  },
  api: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      headers: ['Content-Type', 'Authorization'],
    },
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
    },
  },
  conversationFlows: {
    flows: {
      'business_analysis': {
        id: 'business_analysis',
        name: 'Business Performance Analysis',
        description: 'Analyze business performance metrics and provide insights',
        steps: [
          {
            id: 'gather_data',
            type: 'tool',
            config: { tool: 'business_data_service' },
            nextSteps: ['analyze_metrics']
          },
          {
            id: 'analyze_metrics',
            type: 'prompt',
            config: { template: 'analysis_prompt' },
            nextSteps: ['generate_recommendations']
          },
          {
            id: 'generate_recommendations',
            type: 'tool',
            config: { tool: 'recommendation_engine' },
            nextSteps: []
          }
        ],
        triggers: ['analyze', 'performance', 'metrics'],
        enabled: true
      }
    },
    responseTemplates: {
      'analysis_prompt': {
        id: 'analysis_prompt',
        name: 'Business Analysis Prompt',
        template: 'Based on the business data: {{data}}, provide insights on {{focus_area}}',
        variables: ['data', 'focus_area']
      }
    },
    defaultFlow: 'business_analysis',
    maxFlowDepth: 10
  },
  market: {
    region: 'US',
    language: 'en',
    currency: 'USD',
    timezone: 'America/New_York',
    businessRules: {
      taxCalculation: 'us_standard',
      shippingRules: 'domestic_priority'
    },
    localization: {
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      currencyFormat: 'USD',
      messages: {
        'welcome': 'Welcome to your business assistant',
        'error': 'An error occurred while processing your request'
      }
    }
  },
  tools: {
    environments: {
      'development': {
        enabledTools: ['business_data_service', 'recommendation_engine'],
        toolConfigurations: {
          'business_data_service': {
            enabled: true,
            timeout: 30000,
            retries: 3,
            customSettings: {
              mockData: true,
              debugMode: true
            }
          }
        },
        apiEndpoints: {
          'shopify': 'https://api.shopify.com/dev',
          'amazon': 'https://api.amazon.com/dev'
        },
        credentials: {
          'shopify_key': {
            type: 'api_key',
            envVar: 'SHOPIFY_API_KEY_DEV',
            encrypted: false
          }
        }
      },
      'production': {
        enabledTools: ['business_data_service', 'recommendation_engine', 'analytics_tools'],
        toolConfigurations: {
          'business_data_service': {
            enabled: true,
            timeout: 15000,
            retries: 2,
            customSettings: {
              mockData: false,
              debugMode: false
            }
          }
        },
        apiEndpoints: {
          'shopify': 'https://api.shopify.com',
          'amazon': 'https://api.amazon.com'
        },
        credentials: {
          'shopify_key': {
            type: 'api_key',
            envVar: 'SHOPIFY_API_KEY',
            encrypted: true
          }
        }
      }
    },
    globalSettings: {
      defaultTimeout: 30000,
      defaultRetries: 3,
      enableCaching: true,
      cacheTtl: 3600
    }
  },
  recommendations: {
    algorithms: {
      'rule_based_seo': {
        name: 'Rule-based SEO Recommendations',
        type: 'rule_based',
        enabled: true,
        weight: 0.6,
        parameters: {
          minKeywordDensity: 0.02,
          maxKeywordDensity: 0.05,
          titleLengthRange: [30, 60]
        }
      },
      'ml_revenue_optimizer': {
        name: 'ML Revenue Optimization',
        type: 'ml_based',
        enabled: true,
        weight: 0.4,
        parameters: {
          modelVersion: 'v1.2',
          confidenceThreshold: 0.7
        }
      }
    },
    thresholds: {
      minConfidence: 0.6,
      maxRecommendations: 5,
      impactThreshold: 0.1,
      priorityWeights: {
        'high': 1.0,
        'medium': 0.7,
        'low': 0.4
      }
    },
    scoring: {
      factors: {
        'impact': 0.4,
        'effort': 0.3,
        'confidence': 0.3
      },
      normalization: 'linear',
      decayFactor: 0.95
    },
    filters: {
      enabledFilters: ['impact_filter', 'feasibility_filter'],
      filterRules: {
        'impact_filter': {
          condition: 'impact > 0.2',
          action: 'include',
          value: 1.0
        },
        'feasibility_filter': {
          condition: 'effort < 0.8',
          action: 'boost',
          value: 1.2
        }
      }
    }
  }
};

export function loadConfig(): AppConfig {
  // In a real implementation, this would load from environment variables,
  // config files, etc. For now, return the default config.
  return { ...defaultConfig };
}

// Export configuration management components
export * from './config-manager';
export * from './config-loader';
export * from './config-validator';
