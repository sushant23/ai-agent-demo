import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, defaultConfig } from './index';

export interface ConfigSource {
  type: 'file' | 'environment' | 'remote';
  path?: string;
  url?: string;
  format?: 'json' | 'yaml' | 'env';
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
}

export interface ConfigChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source?: string;
}

export interface HotReloadEvent {
  filePath: string;
  timestamp: Date;
  changeType: 'modified' | 'created' | 'deleted';
  affectedPaths: string[];
}

export interface HotReloadErrorEvent {
  filePath: string;
  error: Error;
  timestamp: Date;
}

export class ConfigManager extends EventEmitter {
  private config: AppConfig;
  private sources: ConfigSource[];
  private watchers: Map<string, fs.FSWatcher>;
  private validationRules: Map<string, (value: any) => boolean>;
  private hotReloadEnabled: boolean;
  private reloadInProgress: boolean;
  private lastReloadTime: Date;

  constructor(sources: ConfigSource[] = []) {
    super();
    this.config = { ...defaultConfig };
    this.sources = sources;
    this.watchers = new Map();
    this.validationRules = new Map();
    this.hotReloadEnabled = false;
    this.reloadInProgress = false;
    this.lastReloadTime = new Date();
    this.setupValidationRules();
  }

  /**
   * Load configuration from all sources
   */
  async loadConfiguration(): Promise<AppConfig> {
    let mergedConfig = { ...defaultConfig };

    // Load from environment variables first
    mergedConfig = this.loadFromEnvironment(mergedConfig);

    // Load from each configured source
    for (const source of this.sources) {
      try {
        const sourceConfig = await this.loadFromSource(source);
        mergedConfig = this.mergeConfigs(mergedConfig, sourceConfig);
      } catch (error) {
        console.warn(`Failed to load config from source ${source.type}:`, error);
      }
    }

    // Validate the merged configuration
    const validationErrors = this.validateConfig(mergedConfig);
    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.config = mergedConfig;
    this.emit('configLoaded', this.config);
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string): T | undefined {
    return this.getValueByPath(this.config, path);
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: any): void {
    const oldValue = this.getValueByPath(this.config, path);
    this.setValueByPath(this.config, path, value);
    
    const changeEvent: ConfigChangeEvent = {
      path,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: 'programmatic'
    };
    
    this.emit('configChanged', changeEvent);
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig<T = any>(section: string, environment?: string): T | undefined {
    const env = environment || this.config.environment;
    const envPath = `${section}.environments.${env}`;
    return this.getValueByPath(this.config, envPath);
  }

  /**
   * Get market-specific configuration
   */
  getMarketConfig(): any {
    return this.config.market;
  }

  /**
   * Get tool configuration for current environment
   */
  getToolConfig(toolName: string, environment?: string): any {
    const env = environment || this.config.environment;
    const toolPath = `tools.environments.${env}.toolConfigurations.${toolName}`;
    const toolConfig = this.getValueByPath(this.config, toolPath);
    
    // Merge with global settings
    const globalSettings = this.config.tools.globalSettings;
    return {
      ...globalSettings,
      ...toolConfig
    };
  }

  /**
   * Get recommendation algorithm configuration
   */
  getRecommendationConfig(): any {
    return this.config.recommendations;
  }

  /**
   * Update conversation flow configuration
   */
  updateConversationFlow(flowId: string, flowConfig: any): void {
    const path = `conversationFlows.flows.${flowId}`;
    this.set(path, flowConfig);
  }

  /**
   * Enable hot reload for file-based configuration sources
   */
  enableHotReload(): void {
    if (this.hotReloadEnabled) {
      return; // Already enabled
    }

    this.hotReloadEnabled = true;
    
    for (const source of this.sources) {
      if (source.type === 'file' && source.path) {
        this.watchConfigFile(source.path);
      }
    }

    console.log('Configuration hot reload enabled');
  }

  /**
   * Disable hot reload and cleanup watchers
   */
  disableHotReload(): void {
    if (!this.hotReloadEnabled) {
      return; // Already disabled
    }

    this.hotReloadEnabled = false;
    
    for (const [filePath, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    console.log('Configuration hot reload disabled');
  }

  /**
   * Check if hot reload is enabled
   */
  isHotReloadEnabled(): boolean {
    return this.hotReloadEnabled;
  }

  /**
   * Get last reload time
   */
  getLastReloadTime(): Date {
    return this.lastReloadTime;
  }

  /**
   * Reload configuration from all sources
   */
  async reloadConfiguration(): Promise<AppConfig> {
    if (this.reloadInProgress) {
      console.warn('Configuration reload already in progress, skipping...');
      return this.config;
    }

    this.reloadInProgress = true;
    
    try {
      const oldConfig = { ...this.config };
      const newConfig = await this.loadConfiguration();
      
      // Emit change events for modified values
      this.emitConfigChanges(oldConfig, newConfig);
      
      this.lastReloadTime = new Date();
      this.emit('configReloaded', { 
        timestamp: this.lastReloadTime,
        changedPaths: this.getChangedPaths(oldConfig, newConfig)
      });
      
      return newConfig;
    } finally {
      this.reloadInProgress = false;
    }
  }

  /**
   * Add validation rule for a configuration path
   */
  addValidationRule(path: string, validator: (value: any) => boolean): void {
    this.validationRules.set(path, validator);
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(config: AppConfig): AppConfig {
    const envConfig = { ...config };

    // Map environment variables to config paths
    const envMappings = {
      'NODE_ENV': 'environment',
      'LOG_LEVEL': 'logging.level',
      'LOG_FORMAT': 'logging.format',
      'LLM_DEFAULT_PROVIDER': 'llm.defaultProvider',
      'LLM_TIMEOUT': 'llm.timeout',
      'DB_HOST': 'database.host',
      'DB_PORT': 'database.port',
      'DB_NAME': 'database.database',
      'DB_USER': 'database.username',
      'DB_PASSWORD': 'database.password',
      'CACHE_TYPE': 'cache.type',
      'CACHE_TTL': 'cache.ttl',
      'API_PORT': 'api.port',
      'API_HOST': 'api.host',
      'MARKET_REGION': 'market.region',
      'MARKET_LANGUAGE': 'market.language',
      'MARKET_CURRENCY': 'market.currency',
      'MARKET_TIMEZONE': 'market.timezone',
      'TOOLS_DEFAULT_TIMEOUT': 'tools.globalSettings.defaultTimeout',
      'TOOLS_DEFAULT_RETRIES': 'tools.globalSettings.defaultRetries',
      'TOOLS_ENABLE_CACHING': 'tools.globalSettings.enableCaching',
      'RECOMMENDATIONS_MIN_CONFIDENCE': 'recommendations.thresholds.minConfidence',
      'RECOMMENDATIONS_MAX_COUNT': 'recommendations.thresholds.maxRecommendations'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined && configPath) {
        const typedValue = this.parseEnvironmentValue(envValue, configPath);
        this.setValueByPath(envConfig, configPath, typedValue);
      }
    }

    return envConfig;
  }

  /**
   * Load configuration from a specific source
   */
  private async loadFromSource(source: ConfigSource): Promise<Partial<AppConfig>> {
    switch (source.type) {
      case 'file':
        return this.loadFromFile(source.path!, source.format || 'json');
      case 'remote':
        return this.loadFromRemote(source.url!);
      default:
        throw new Error(`Unsupported config source type: ${source.type}`);
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(filePath: string, format: string): Promise<Partial<AppConfig>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    switch (format) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
        // In a real implementation, you'd use a YAML parser like 'js-yaml'
        throw new Error('YAML format not implemented');
      case 'env':
        return this.parseEnvFile(content);
      default:
        throw new Error(`Unsupported config format: ${format}`);
    }
  }

  /**
   * Load configuration from remote URL
   */
  private async loadFromRemote(url: string): Promise<Partial<AppConfig>> {
    // In a real implementation, you'd use fetch or axios
    throw new Error('Remote config loading not implemented');
  }

  /**
   * Parse .env file content
   */
  private parseEnvFile(content: string): Partial<AppConfig> {
    const config: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          
          // Convert environment variable names to config paths
          const configPath = this.envVarToConfigPath(key);
          if (configPath) {
            const typedValue = this.parseEnvironmentValue(value, configPath);
            this.setValueByPath(config, configPath, typedValue);
          }
        }
      }
    }
    
    return config;
  }

  /**
   * Convert environment variable name to config path
   */
  private envVarToConfigPath(envVar: string): string | null {
    const mappings: Record<string, string> = {
      'NODE_ENV': 'environment',
      'LOG_LEVEL': 'logging.level',
      'LOG_FORMAT': 'logging.format',
      'LLM_DEFAULT_PROVIDER': 'llm.defaultProvider',
      'LLM_TIMEOUT': 'llm.timeout',
      'DB_HOST': 'database.host',
      'DB_PORT': 'database.port',
      'DB_NAME': 'database.database',
      'DB_USER': 'database.username',
      'DB_PASSWORD': 'database.password',
      'CACHE_TYPE': 'cache.type',
      'CACHE_TTL': 'cache.ttl',
      'API_PORT': 'api.port',
      'API_HOST': 'api.host',
      'MARKET_REGION': 'market.region',
      'MARKET_LANGUAGE': 'market.language',
      'MARKET_CURRENCY': 'market.currency',
      'MARKET_TIMEZONE': 'market.timezone',
      'TOOLS_DEFAULT_TIMEOUT': 'tools.globalSettings.defaultTimeout',
      'TOOLS_DEFAULT_RETRIES': 'tools.globalSettings.defaultRetries',
      'TOOLS_ENABLE_CACHING': 'tools.globalSettings.enableCaching',
      'RECOMMENDATIONS_MIN_CONFIDENCE': 'recommendations.thresholds.minConfidence',
      'RECOMMENDATIONS_MAX_COUNT': 'recommendations.thresholds.maxRecommendations'
    };
    
    return mappings[envVar] || null;
  }

  /**
   * Parse environment value with appropriate type conversion
   */
  private parseEnvironmentValue(value: string, configPath: string): any {
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Numeric values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // Array values (comma-separated)
    if (value.includes(',')) {
      return value.split(',').map(v => v.trim());
    }
    
    return value;
  }

  /**
   * Merge two configuration objects
   */
  private mergeConfigs(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const baseValue = merged[key as keyof AppConfig];
        if (baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)) {
          merged[key as keyof AppConfig] = {
            ...baseValue,
            ...value
          } as any;
        } else {
          merged[key as keyof AppConfig] = value as any;
        }
      } else {
        merged[key as keyof AppConfig] = value as any;
      }
    }
    
    return merged;
  }

  /**
   * Get value from object by dot-notation path
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set value in object by dot-notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Watch configuration file for changes
   */
  private watchConfigFile(filePath: string): void {
    if (this.watchers.has(filePath)) {
      return; // Already watching
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`Config file not found for watching: ${filePath}`);
      return;
    }

    const watcher = fs.watch(filePath, async (eventType, filename) => {
      if (eventType === 'change') {
        try {
          // Debounce rapid file changes
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const affectedPaths = await this.getAffectedConfigPaths(filePath);
          await this.reloadConfiguration();
          
          const hotReloadEvent: HotReloadEvent = {
            filePath,
            timestamp: new Date(),
            changeType: 'modified',
            affectedPaths
          };
          
          this.emit('hotReload', hotReloadEvent);
        } catch (error) {
          const errorEvent: HotReloadErrorEvent = {
            filePath,
            error: error as Error,
            timestamp: new Date()
          };
          
          this.emit('hotReloadError', errorEvent);
        }
      }
    });

    this.watchers.set(filePath, watcher);
  }

  /**
   * Get configuration paths affected by file change
   */
  private async getAffectedConfigPaths(filePath: string): Promise<string[]> {
    try {
      // Determine which config sections might be affected by this file
      const fileName = path.basename(filePath);
      const affectedPaths: string[] = [];
      
      if (fileName.includes('conversation') || fileName.includes('flow')) {
        affectedPaths.push('conversationFlows');
      }
      if (fileName.includes('market') || fileName.includes('locale')) {
        affectedPaths.push('market');
      }
      if (fileName.includes('tool')) {
        affectedPaths.push('tools');
      }
      if (fileName.includes('recommendation')) {
        affectedPaths.push('recommendations');
      }
      
      // If no specific matches, assume it could affect any section
      if (affectedPaths.length === 0) {
        affectedPaths.push('*');
      }
      
      return affectedPaths;
    } catch (error) {
      return ['*']; // Assume all paths affected if we can't determine
    }
  }

  /**
   * Get paths that changed between two configurations
   */
  private getChangedPaths(oldConfig: AppConfig, newConfig: AppConfig): string[] {
    const changedPaths: string[] = [];
    this.collectChangedPaths('', oldConfig, newConfig, changedPaths);
    return changedPaths;
  }

  /**
   * Recursively collect changed configuration paths
   */
  private collectChangedPaths(basePath: string, oldValue: any, newValue: any, changedPaths: string[]): void {
    if (oldValue === newValue) return;
    
    if (typeof oldValue === 'object' && typeof newValue === 'object' && 
        oldValue !== null && newValue !== null && 
        !Array.isArray(oldValue) && !Array.isArray(newValue)) {
      
      const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
      
      for (const key of allKeys) {
        const path = basePath ? `${basePath}.${key}` : key;
        this.collectChangedPaths(path, oldValue[key], newValue[key], changedPaths);
      }
    } else {
      changedPaths.push(basePath);
    }
  }

  /**
   * Setup default validation rules
   */
  private setupValidationRules(): void {
    this.addValidationRule('environment', (value) => 
      ['development', 'staging', 'production', 'test'].includes(value)
    );
    
    this.addValidationRule('logging.level', (value) => 
      ['debug', 'info', 'warn', 'error'].includes(value)
    );
    
    this.addValidationRule('api.port', (value) => 
      typeof value === 'number' && value > 0 && value <= 65535
    );
    
    this.addValidationRule('database.port', (value) => 
      typeof value === 'number' && value > 0 && value <= 65535
    );
    
    this.addValidationRule('llm.timeout', (value) => 
      typeof value === 'number' && value > 0
    );

    // New validation rules for enhanced configuration
    this.addValidationRule('market.region', (value) => 
      typeof value === 'string' && value.length > 0
    );
    
    this.addValidationRule('market.language', (value) => 
      typeof value === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(value)
    );
    
    this.addValidationRule('market.currency', (value) => 
      typeof value === 'string' && /^[A-Z]{3}$/.test(value)
    );
    
    this.addValidationRule('tools.globalSettings.defaultTimeout', (value) => 
      typeof value === 'number' && value > 0
    );
    
    this.addValidationRule('tools.globalSettings.defaultRetries', (value) => 
      typeof value === 'number' && value >= 0
    );
    
    this.addValidationRule('recommendations.thresholds.minConfidence', (value) => 
      typeof value === 'number' && value >= 0 && value <= 1
    );
    
    this.addValidationRule('recommendations.thresholds.maxRecommendations', (value) => 
      typeof value === 'number' && value > 0
    );
    
    this.addValidationRule('conversationFlows.maxFlowDepth', (value) => 
      typeof value === 'number' && value > 0 && value <= 100
    );
  }

  /**
   * Validate configuration against rules
   */
  private validateConfig(config: AppConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    
    for (const [path, validator] of this.validationRules) {
      const value = this.getValueByPath(config, path);
      if (value !== undefined && !validator(value)) {
        errors.push({
          path,
          message: `Invalid value for ${path}`,
          value
        });
      }
    }
    
    return errors;
  }

  /**
   * Emit change events for modified configuration values
   */
  private emitConfigChanges(oldConfig: AppConfig, newConfig: AppConfig): void {
    this.compareAndEmitChanges('', oldConfig, newConfig);
  }

  /**
   * Recursively compare configurations and emit change events
   */
  private compareAndEmitChanges(basePath: string, oldValue: any, newValue: any): void {
    if (oldValue === newValue) return;
    
    if (typeof oldValue === 'object' && typeof newValue === 'object' && 
        oldValue !== null && newValue !== null && 
        !Array.isArray(oldValue) && !Array.isArray(newValue)) {
      
      const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
      
      for (const key of allKeys) {
        const path = basePath ? `${basePath}.${key}` : key;
        this.compareAndEmitChanges(path, oldValue[key], newValue[key]);
      }
    } else {
      const changeEvent: ConfigChangeEvent = {
        path: basePath,
        oldValue,
        newValue,
        timestamp: new Date()
      };
      
      this.emit('configChanged', changeEvent);
    }
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

/**
 * Get the global configuration manager instance
 */
export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

/**
 * Initialize configuration manager with sources
 */
export function initializeConfigManager(sources: ConfigSource[]): ConfigManager {
  configManagerInstance = new ConfigManager(sources);
  return configManagerInstance;
}