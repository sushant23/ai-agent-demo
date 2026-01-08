import * as path from 'path';
import { ConfigManager, ConfigSource, getConfigManager } from './config-manager';
import { AppConfig } from './index';

export interface ConfigLoaderOptions {
  configDir?: string;
  environment?: string;
  enableHotReload?: boolean;
  sources?: ConfigSource[];
}

export class ConfigLoader {
  private configManager: ConfigManager;
  private options: ConfigLoaderOptions;

  constructor(options: ConfigLoaderOptions = {}) {
    this.options = {
      configDir: options.configDir || './config',
      environment: options.environment || process.env.NODE_ENV || 'development',
      enableHotReload: options.enableHotReload ?? true,
      sources: options.sources || []
    };

    // Setup default configuration sources if none provided
    if (this.options.sources!.length === 0) {
      this.options.sources = this.getDefaultSources();
    }

    this.configManager = getConfigManager();
  }

  /**
   * Load configuration with all sources
   */
  async load(): Promise<AppConfig> {
    // Initialize config manager with sources
    this.configManager = new ConfigManager(this.options.sources!);

    // Load configuration
    const config = await this.configManager.loadConfiguration();

    // Enable hot reload if requested
    if (this.options.enableHotReload) {
      this.configManager.enableHotReload();
      this.setupHotReloadHandlers();
    }

    return config;
  }

  /**
   * Get the configuration manager instance
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Get default configuration sources based on environment
   */
  private getDefaultSources(): ConfigSource[] {
    const sources: ConfigSource[] = [];
    const configDir = this.options.configDir!;
    const env = this.options.environment!;

    // Base configuration file
    const baseConfigPath = path.join(configDir, 'config.json');
    sources.push({
      type: 'file',
      path: baseConfigPath,
      format: 'json'
    });

    // Environment-specific configuration file
    const envConfigPath = path.join(configDir, `config.${env}.json`);
    sources.push({
      type: 'file',
      path: envConfigPath,
      format: 'json'
    });

    // Local configuration file (for development overrides)
    if (env === 'development') {
      const localConfigPath = path.join(configDir, 'config.local.json');
      sources.push({
        type: 'file',
        path: localConfigPath,
        format: 'json'
      });
    }

    // Environment variables file
    const envFilePath = path.join(process.cwd(), '.env');
    sources.push({
      type: 'file',
      path: envFilePath,
      format: 'env'
    });

    // Environment-specific .env file
    const envSpecificPath = path.join(process.cwd(), `.env.${env}`);
    sources.push({
      type: 'file',
      path: envSpecificPath,
      format: 'env'
    });

    return sources;
  }

  /**
   * Setup hot reload event handlers
   */
  private setupHotReloadHandlers(): void {
    this.configManager.on('hotReload', (event) => {
      console.log(`Configuration hot reloaded from: ${event.filePath}`);
    });

    this.configManager.on('hotReloadError', (event) => {
      console.error(`Hot reload failed for ${event.filePath}:`, event.error);
    });

    this.configManager.on('configChanged', (event) => {
      console.log(`Configuration changed: ${event.path} = ${JSON.stringify(event.newValue)}`);
    });
  }
}

/**
 * Create and load configuration with default settings
 */
export async function loadConfiguration(options?: ConfigLoaderOptions): Promise<AppConfig> {
  const loader = new ConfigLoader(options);
  return await loader.load();
}

/**
 * Create configuration loader for specific environment
 */
export function createConfigLoader(environment: string, options?: Omit<ConfigLoaderOptions, 'environment'>): ConfigLoader {
  return new ConfigLoader({
    ...options,
    environment
  });
}