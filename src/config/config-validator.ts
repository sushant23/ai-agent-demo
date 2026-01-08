import { AppConfig, LLMConfig, DatabaseConfig, CacheConfig, ApiConfig } from './index';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  severity: 'error' | 'warning';
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export class ConfigValidator {
  private rules: Map<string, ValidationRule[]>;

  constructor() {
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Validate complete application configuration
   */
  validate(config: AppConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate each section
    this.validateSection('environment', config.environment, errors, warnings);
    this.validateSection('logging', config.logging, errors, warnings);
    this.validateSection('llm', config.llm, errors, warnings);
    this.validateSection('database', config.database, errors, warnings);
    this.validateSection('cache', config.cache, errors, warnings);
    this.validateSection('api', config.api, errors, warnings);
    this.validateSection('conversationFlows', config.conversationFlows, errors, warnings);
    this.validateSection('market', config.market, errors, warnings);
    this.validateSection('tools', config.tools, errors, warnings);
    this.validateSection('recommendations', config.recommendations, errors, warnings);

    // Cross-section validation
    this.validateCrossSections(config, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors: [...errors, ...warnings],
      warnings
    };
  }

  /**
   * Add custom validation rule
   */
  addRule(section: string, rule: ValidationRule): void {
    if (!this.rules.has(section)) {
      this.rules.set(section, []);
    }
    this.rules.get(section)!.push(rule);
  }

  /**
   * Validate a specific configuration section
   */
  private validateSection(
    section: string, 
    value: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const rules = this.rules.get(section) || [];
    
    for (const rule of rules) {
      const result = rule.validate(value);
      if (!result.isValid) {
        const error: ValidationError = {
          path: section,
          message: result.message,
          value,
          severity: rule.severity || 'error'
        };
        
        if (error.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error as ValidationWarning);
        }
      }
    }
  }

  /**
   * Validate cross-section dependencies and constraints
   */
  private validateCrossSections(
    config: AppConfig, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Validate LLM provider configurations
    this.validateLLMProviders(config.llm, errors, warnings);
    
    // Validate database connection settings
    this.validateDatabaseSettings(config.database, errors, warnings);
    
    // Validate cache configuration consistency
    this.validateCacheSettings(config.cache, errors, warnings);
    
    // Validate API security settings
    this.validateApiSecurity(config.api, errors, warnings);

    // Validate new configuration sections
    this.validateConversationFlows(config.conversationFlows, errors, warnings);
    this.validateMarketSettings(config.market, errors, warnings);
    this.validateToolsConfiguration(config.tools, config.environment, errors, warnings);
    this.validateRecommendationSettings(config.recommendations, errors, warnings);
  }

  /**
   * Validate LLM provider configurations
   */
  private validateLLMProviders(llmConfig: LLMConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check if default provider exists in providers list
    if (!llmConfig.providers[llmConfig.defaultProvider]) {
      errors.push({
        path: 'llm.defaultProvider',
        message: `Default provider '${llmConfig.defaultProvider}' not found in providers configuration`,
        value: llmConfig.defaultProvider,
        severity: 'error'
      });
    }

    // Check if at least one provider is enabled
    const enabledProviders = Object.values(llmConfig.providers).filter(p => p.enabled);
    if (enabledProviders.length === 0) {
      errors.push({
        path: 'llm.providers',
        message: 'At least one LLM provider must be enabled',
        severity: 'error'
      });
    }

    // Validate provider API keys
    for (const [name, provider] of Object.entries(llmConfig.providers)) {
      if (provider.enabled && !provider.apiKey) {
        warnings.push({
          path: `llm.providers.${name}.apiKey`,
          message: `API key missing for enabled provider '${name}'`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate database connection settings
   */
  private validateDatabaseSettings(dbConfig: DatabaseConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check required fields
    if (!dbConfig.host) {
      errors.push({
        path: 'database.host',
        message: 'Database host is required',
        severity: 'error'
      });
    }

    if (!dbConfig.database) {
      errors.push({
        path: 'database.database',
        message: 'Database name is required',
        severity: 'error'
      });
    }

    // Validate SSL settings for production
    if (process.env.NODE_ENV === 'production' && !dbConfig.ssl) {
      warnings.push({
        path: 'database.ssl',
        message: 'SSL should be enabled for production database connections',
        severity: 'warning'
      });
    }

    // Validate pool size
    if (dbConfig.poolSize <= 0) {
      errors.push({
        path: 'database.poolSize',
        message: 'Database pool size must be greater than 0',
        value: dbConfig.poolSize,
        severity: 'error'
      });
    }
  }

  /**
   * Validate cache configuration settings
   */
  private validateCacheSettings(cacheConfig: CacheConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate Redis configuration if type is redis
    if (cacheConfig.type === 'redis') {
      if (!cacheConfig.host) {
        errors.push({
          path: 'cache.host',
          message: 'Redis host is required when cache type is redis',
          severity: 'error'
        });
      }

      if (!cacheConfig.port) {
        errors.push({
          path: 'cache.port',
          message: 'Redis port is required when cache type is redis',
          severity: 'error'
        });
      }
    }

    // Validate TTL
    if (cacheConfig.ttl <= 0) {
      errors.push({
        path: 'cache.ttl',
        message: 'Cache TTL must be greater than 0',
        value: cacheConfig.ttl,
        severity: 'error'
      });
    }

    // Validate max size for memory cache
    if (cacheConfig.type === 'memory' && cacheConfig.maxSize <= 0) {
      errors.push({
        path: 'cache.maxSize',
        message: 'Memory cache max size must be greater than 0',
        value: cacheConfig.maxSize,
        severity: 'error'
      });
    }
  }

  /**
   * Validate API security settings
   */
  private validateApiSecurity(apiConfig: ApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check CORS configuration for production
    if (process.env.NODE_ENV === 'production' && apiConfig.cors.origins.includes('*')) {
      warnings.push({
        path: 'api.cors.origins',
        message: 'Wildcard CORS origins should not be used in production',
        severity: 'warning'
      });
    }

    // Check rate limiting
    if (!apiConfig.rateLimit.enabled) {
      warnings.push({
        path: 'api.rateLimit.enabled',
        message: 'Rate limiting should be enabled for production APIs',
        severity: 'warning'
      });
    }

    // Validate rate limit settings
    if (apiConfig.rateLimit.enabled) {
      if (apiConfig.rateLimit.maxRequests <= 0) {
        errors.push({
          path: 'api.rateLimit.maxRequests',
          message: 'Rate limit max requests must be greater than 0',
          value: apiConfig.rateLimit.maxRequests,
          severity: 'error'
        });
      }

      if (apiConfig.rateLimit.windowMs <= 0) {
        errors.push({
          path: 'api.rateLimit.windowMs',
          message: 'Rate limit window must be greater than 0',
          value: apiConfig.rateLimit.windowMs,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate conversation flows configuration
   */
  private validateConversationFlows(
    flowsConfig: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Check if default flow exists
    if (flowsConfig.defaultFlow && !flowsConfig.flows[flowsConfig.defaultFlow]) {
      errors.push({
        path: 'conversationFlows.defaultFlow',
        message: `Default flow '${flowsConfig.defaultFlow}' not found in flows configuration`,
        value: flowsConfig.defaultFlow,
        severity: 'error'
      });
    }

    // Validate each flow definition
    for (const [flowId, flow] of Object.entries(flowsConfig.flows || {})) {
      const flowData = flow as any;
      
      if (!flowData.steps || !Array.isArray(flowData.steps)) {
        errors.push({
          path: `conversationFlows.flows.${flowId}.steps`,
          message: `Flow '${flowId}' must have a steps array`,
          severity: 'error'
        });
      }

      if (!flowData.triggers || !Array.isArray(flowData.triggers)) {
        warnings.push({
          path: `conversationFlows.flows.${flowId}.triggers`,
          message: `Flow '${flowId}' should have trigger keywords defined`,
          severity: 'warning'
        });
      }
    }

    // Validate max flow depth
    if (flowsConfig.maxFlowDepth <= 0 || flowsConfig.maxFlowDepth > 100) {
      errors.push({
        path: 'conversationFlows.maxFlowDepth',
        message: 'Max flow depth must be between 1 and 100',
        value: flowsConfig.maxFlowDepth,
        severity: 'error'
      });
    }
  }

  /**
   * Validate market configuration settings
   */
  private validateMarketSettings(
    marketConfig: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Validate language code format
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(marketConfig.language)) {
      errors.push({
        path: 'market.language',
        message: 'Language must be in format "en" or "en-US"',
        value: marketConfig.language,
        severity: 'error'
      });
    }

    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(marketConfig.currency)) {
      errors.push({
        path: 'market.currency',
        message: 'Currency must be a 3-letter ISO code (e.g., USD, EUR)',
        value: marketConfig.currency,
        severity: 'error'
      });
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: marketConfig.timezone });
    } catch (error) {
      errors.push({
        path: 'market.timezone',
        message: 'Invalid timezone identifier',
        value: marketConfig.timezone,
        severity: 'error'
      });
    }

    // Check for required localization messages
    const requiredMessages = ['welcome', 'error'];
    for (const messageKey of requiredMessages) {
      if (!marketConfig.localization?.messages?.[messageKey]) {
        warnings.push({
          path: `market.localization.messages.${messageKey}`,
          message: `Required localization message '${messageKey}' is missing`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate tools configuration
   */
  private validateToolsConfiguration(
    toolsConfig: any, 
    environment: string,
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Check if current environment has configuration
    if (!toolsConfig.environments?.[environment]) {
      warnings.push({
        path: `tools.environments.${environment}`,
        message: `No tool configuration found for environment '${environment}'`,
        severity: 'warning'
      });
      return;
    }

    const envConfig = toolsConfig.environments[environment];

    // Validate enabled tools have configurations
    for (const toolName of envConfig.enabledTools || []) {
      if (!envConfig.toolConfigurations?.[toolName]) {
        warnings.push({
          path: `tools.environments.${environment}.toolConfigurations.${toolName}`,
          message: `Enabled tool '${toolName}' has no configuration`,
          severity: 'warning'
        });
      }
    }

    // Validate global settings
    if (toolsConfig.globalSettings.defaultTimeout <= 0) {
      errors.push({
        path: 'tools.globalSettings.defaultTimeout',
        message: 'Default timeout must be greater than 0',
        value: toolsConfig.globalSettings.defaultTimeout,
        severity: 'error'
      });
    }

    if (toolsConfig.globalSettings.defaultRetries < 0) {
      errors.push({
        path: 'tools.globalSettings.defaultRetries',
        message: 'Default retries must be 0 or greater',
        value: toolsConfig.globalSettings.defaultRetries,
        severity: 'error'
      });
    }
  }

  /**
   * Validate recommendation configuration
   */
  private validateRecommendationSettings(
    recConfig: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Validate thresholds
    if (recConfig.thresholds.minConfidence < 0 || recConfig.thresholds.minConfidence > 1) {
      errors.push({
        path: 'recommendations.thresholds.minConfidence',
        message: 'Min confidence must be between 0 and 1',
        value: recConfig.thresholds.minConfidence,
        severity: 'error'
      });
    }

    if (recConfig.thresholds.maxRecommendations <= 0) {
      errors.push({
        path: 'recommendations.thresholds.maxRecommendations',
        message: 'Max recommendations must be greater than 0',
        value: recConfig.thresholds.maxRecommendations,
        severity: 'error'
      });
    }

    // Validate algorithm weights sum to reasonable value
    const algorithms = recConfig.algorithms || {};
    const enabledAlgorithms = Object.values(algorithms).filter((alg: any) => alg.enabled);
    const totalWeight = enabledAlgorithms.reduce((sum: number, alg: any) => sum + (alg.weight || 0), 0);
    
    if (enabledAlgorithms.length > 0 && Math.abs(totalWeight - 1.0) > 0.1) {
      warnings.push({
        path: 'recommendations.algorithms',
        message: 'Algorithm weights should sum to approximately 1.0',
        value: totalWeight,
        severity: 'warning'
      });
    }

    // Validate scoring factors sum to 1.0
    const factors = recConfig.scoring?.factors || {};
    const factorSum = Object.values(factors).reduce((sum: number, weight: any) => sum + weight, 0);
    
    if (Math.abs(factorSum - 1.0) > 0.01) {
      errors.push({
        path: 'recommendations.scoring.factors',
        message: 'Scoring factors must sum to 1.0',
        value: factorSum,
        severity: 'error'
      });
    }
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // Environment validation
    this.addRule('environment', {
      validate: (value: string) => ({
        isValid: ['development', 'staging', 'production', 'test'].includes(value),
        message: 'Environment must be one of: development, staging, production, test'
      })
    });

    // Logging level validation
    this.addRule('logging', {
      validate: (config: any) => ({
        isValid: ['debug', 'info', 'warn', 'error'].includes(config.level),
        message: 'Logging level must be one of: debug, info, warn, error'
      })
    });

    // API port validation
    this.addRule('api', {
      validate: (config: ApiConfig) => ({
        isValid: config.port > 0 && config.port <= 65535,
        message: 'API port must be between 1 and 65535'
      })
    });

    // Database port validation
    this.addRule('database', {
      validate: (config: DatabaseConfig) => ({
        isValid: config.port > 0 && config.port <= 65535,
        message: 'Database port must be between 1 and 65535'
      })
    });

    // LLM timeout validation
    this.addRule('llm', {
      validate: (config: LLMConfig) => ({
        isValid: config.timeout > 0,
        message: 'LLM timeout must be greater than 0'
      })
    });

    // LLM retries validation
    this.addRule('llm', {
      validate: (config: LLMConfig) => ({
        isValid: config.retries >= 0,
        message: 'LLM retries must be 0 or greater'
      })
    });
  }
}

export interface ValidationRule {
  validate: (value: any) => ValidationRuleResult;
  severity?: 'error' | 'warning';
}

export interface ValidationRuleResult {
  isValid: boolean;
  message: string;
}

// Export singleton validator instance
export const configValidator = new ConfigValidator();