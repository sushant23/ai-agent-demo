import { ConfigManager, ConfigSource, initializeConfigManager } from './config-manager';
import { defaultConfig } from './index';
import * as fs from 'fs';
import * as path from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;

  beforeEach(() => {
    // Create a fresh config manager for each test
    configManager = new ConfigManager();
    tempConfigDir = path.join(__dirname, '../../temp-config');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempConfigDir)) {
      fs.mkdirSync(tempConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
    
    // Disable hot reload to clean up watchers
    configManager.disableHotReload();
    
    // Reset singleton instance for clean tests
    initializeConfigManager([]);
  });

  describe('loadConfiguration', () => {
    it('should load default configuration', async () => {
      const config = await configManager.loadConfiguration();
      
      expect(config).toBeDefined();
      expect(config.environment).toBe('test'); // NODE_ENV is set to test
      expect(config.logging).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.conversationFlows).toBeDefined();
      expect(config.market).toBeDefined();
      expect(config.tools).toBeDefined();
      expect(config.recommendations).toBeDefined();
    });

    it('should merge configuration from file source', async () => {
      // Create a test config file
      const testConfigPath = path.join(tempConfigDir, 'test-config.json');
      const testConfig = {
        environment: 'production',
        api: {
          port: 8080
        },
        market: {
          region: 'EU',
          language: 'de',
          currency: 'EUR'
        }
      };
      
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

      const sources: ConfigSource[] = [
        {
          type: 'file',
          path: testConfigPath,
          format: 'json'
        }
      ];

      const configManagerWithSources = new ConfigManager(sources);
      const config = await configManagerWithSources.loadConfiguration();

      expect(config.environment).toBe('production');
      expect(config.api.port).toBe(8080);
      expect(config.market.region).toBe('EU');
      expect(config.market.language).toBe('de');
      expect(config.market.currency).toBe('EUR');
    });
  });

  describe('get and set', () => {
    beforeEach(async () => {
      await configManager.loadConfiguration();
    });

    it('should get configuration values by path', () => {
      const environment = configManager.get('environment');
      expect(environment).toBe('test'); // NODE_ENV is set to test

      const logLevel = configManager.get('logging.level');
      expect(logLevel).toBe('info');

      const marketRegion = configManager.get('market.region');
      expect(marketRegion).toBe('US');
    });

    it('should set configuration values by path', () => {
      configManager.set('logging.level', 'debug');
      const logLevel = configManager.get('logging.level');
      expect(logLevel).toBe('debug');

      // Use a different path that won't affect other tests
      configManager.set('api.port', 4000);
      const port = configManager.get('api.port');
      expect(port).toBe(4000);
    });

    it('should emit configChanged event when setting values', (done) => {
      configManager.on('configChanged', (event) => {
        expect(event.path).toBe('logging.format');
        expect(event.oldValue).toBe('text');
        expect(event.newValue).toBe('json');
        expect(event.source).toBe('programmatic');
        done();
      });

      configManager.set('logging.format', 'json');
    });
  });

  describe('environment-specific configuration', () => {
    let freshConfigManager: ConfigManager;
    
    beforeEach(async () => {
      freshConfigManager = new ConfigManager();
      await freshConfigManager.loadConfiguration();
    });

    afterEach(() => {
      freshConfigManager.disableHotReload();
    });

    it('should get tool configuration for specific environment', () => {
      const devToolConfig = freshConfigManager.getToolConfig('business_data_service', 'development');
      expect(devToolConfig).toBeDefined();
      expect(devToolConfig.defaultTimeout).toBe(30000); // From global settings
      expect(devToolConfig.enabled).toBe(true);
      expect(devToolConfig.timeout).toBe(30000);
      expect(devToolConfig.customSettings.mockData).toBe(true);
      expect(devToolConfig.customSettings.debugMode).toBe(true);

      const prodToolConfig = freshConfigManager.getToolConfig('business_data_service', 'production');
      expect(prodToolConfig).toBeDefined();
      expect(prodToolConfig.customSettings.mockData).toBe(false);
      expect(prodToolConfig.customSettings.debugMode).toBe(false);
    });

    it('should get market configuration', () => {
      const marketConfig = freshConfigManager.getMarketConfig();
      expect(marketConfig).toBeDefined();
      expect(marketConfig.region).toBe('US');
      expect(marketConfig.language).toBe('en');
      expect(marketConfig.currency).toBe('USD');
      expect(marketConfig.localization).toBeDefined();
    });

    it('should get recommendation configuration', () => {
      const recConfig = freshConfigManager.getRecommendationConfig();
      expect(recConfig).toBeDefined();
      expect(recConfig.algorithms).toBeDefined();
      expect(recConfig.thresholds).toBeDefined();
      expect(recConfig.scoring).toBeDefined();
    });
  });

  describe('hot reload', () => {
    it('should enable and disable hot reload', () => {
      expect(configManager.isHotReloadEnabled()).toBe(false);
      
      configManager.enableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(true);
      
      configManager.disableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(false);
    });

    it('should track last reload time', async () => {
      const beforeReload = new Date();
      await configManager.reloadConfiguration();
      const afterReload = configManager.getLastReloadTime();
      
      expect(afterReload.getTime()).toBeGreaterThanOrEqual(beforeReload.getTime());
    });
  });

  describe('conversation flow configuration', () => {
    let freshConfigManager: ConfigManager;
    
    beforeEach(async () => {
      freshConfigManager = new ConfigManager();
      await freshConfigManager.loadConfiguration();
    });

    afterEach(() => {
      freshConfigManager.disableHotReload();
    });

    it('should update conversation flow configuration', () => {
      const newFlow = {
        id: 'test_flow',
        name: 'Test Flow',
        description: 'A test flow',
        steps: [],
        triggers: ['test'],
        enabled: true
      };

      freshConfigManager.updateConversationFlow('test_flow', newFlow);
      const updatedFlow = freshConfigManager.get('conversationFlows.flows.test_flow');
      
      expect(updatedFlow).toEqual(newFlow);
    });
  });
});