/**
 * Configuration Management Example Usage
 * 
 * This file demonstrates how to use the enhanced configuration management system
 * that supports requirements 9.1-9.5:
 * - Configurable conversation flows and response templates (9.1)
 * - Market-specific adaptations (9.2)
 * - Environment-specific tool configurations (9.3)
 * - Customizable recommendation algorithms and thresholds (9.4)
 * - Hot reload without restart (9.5)
 */

import { ConfigManager, ConfigSource, ConfigChangeEvent, HotReloadEvent } from './config-manager';
import { ConfigLoader } from './config-loader';
import { configValidator } from './config-validator';

async function demonstrateConfigurationManagement() {
  console.log('=== Configuration Management Demo ===\n');

  // 1. Basic Configuration Loading
  console.log('1. Loading default configuration...');
  const loader = new ConfigLoader({
    environment: 'development',
    enableHotReload: true
  });
  
  const config = await loader.load();
  const configManager = loader.getConfigManager();
  
  console.log(`Environment: ${config.environment}`);
  console.log(`Market Region: ${config.market.region}`);
  console.log(`Default LLM Provider: ${config.llm.defaultProvider}`);
  console.log();

  // 2. Environment-Specific Tool Configuration (Requirement 9.3)
  console.log('2. Environment-specific tool configuration...');
  const devToolConfig = configManager.getToolConfig('business_data_service', 'development');
  const prodToolConfig = configManager.getToolConfig('business_data_service', 'production');
  
  console.log('Development tool config:');
  console.log(`  Mock Data: ${devToolConfig.customSettings.mockData}`);
  console.log(`  Debug Mode: ${devToolConfig.customSettings.debugMode}`);
  console.log(`  Timeout: ${devToolConfig.timeout}ms`);
  
  console.log('Production tool config:');
  console.log(`  Mock Data: ${prodToolConfig.customSettings.mockData}`);
  console.log(`  Debug Mode: ${prodToolConfig.customSettings.debugMode}`);
  console.log(`  Timeout: ${prodToolConfig.timeout}ms`);
  console.log();

  // 3. Market-Specific Configuration (Requirement 9.2)
  console.log('3. Market-specific configuration...');
  const marketConfig = configManager.getMarketConfig();
  console.log(`Region: ${marketConfig.region}`);
  console.log(`Language: ${marketConfig.language}`);
  console.log(`Currency: ${marketConfig.currency}`);
  console.log(`Timezone: ${marketConfig.timezone}`);
  console.log(`Date Format: ${marketConfig.localization.dateFormat}`);
  console.log(`Welcome Message: ${marketConfig.localization.messages.welcome}`);
  console.log();

  // 4. Conversation Flow Configuration (Requirement 9.1)
  console.log('4. Conversation flow configuration...');
  const flowConfig = configManager.get('conversationFlows');
  console.log(`Default Flow: ${flowConfig.defaultFlow}`);
  console.log(`Max Flow Depth: ${flowConfig.maxFlowDepth}`);
  
  const businessAnalysisFlow = flowConfig.flows.business_analysis;
  console.log(`Business Analysis Flow Steps: ${businessAnalysisFlow.steps.length}`);
  console.log(`Triggers: ${businessAnalysisFlow.triggers.join(', ')}`);
  
  // Add a new conversation flow
  const newFlow = {
    id: 'customer_support',
    name: 'Customer Support Flow',
    description: 'Handle customer support inquiries',
    steps: [
      {
        id: 'classify_issue',
        type: 'prompt',
        config: { template: 'issue_classification' },
        nextSteps: ['route_to_specialist']
      },
      {
        id: 'route_to_specialist',
        type: 'decision',
        config: { rules: 'support_routing_rules' },
        nextSteps: []
      }
    ],
    triggers: ['help', 'support', 'issue', 'problem'],
    enabled: true
  };
  
  configManager.updateConversationFlow('customer_support', newFlow);
  console.log('Added new customer support flow');
  console.log();

  // 5. Recommendation Algorithm Configuration (Requirement 9.4)
  console.log('5. Recommendation algorithm configuration...');
  const recConfig = configManager.getRecommendationConfig();
  
  console.log('Enabled Algorithms:');
  Object.entries(recConfig.algorithms).forEach(([name, alg]: [string, any]) => {
    if (alg.enabled) {
      console.log(`  ${name}: weight=${alg.weight}, type=${alg.type}`);
    }
  });
  
  console.log(`Min Confidence Threshold: ${recConfig.thresholds.minConfidence}`);
  console.log(`Max Recommendations: ${recConfig.thresholds.maxRecommendations}`);
  console.log(`Impact Threshold: ${recConfig.thresholds.impactThreshold}`);
  console.log();

  // 6. Dynamic Configuration Updates (Requirement 9.5)
  console.log('6. Dynamic configuration updates...');
  
  // Set up event listeners for configuration changes
  configManager.on('configChanged', (event: ConfigChangeEvent) => {
    console.log(`Configuration changed: ${event.path} = ${JSON.stringify(event.newValue)}`);
  });

  configManager.on('hotReload', (event: HotReloadEvent) => {
    console.log(`Hot reload triggered for: ${event.filePath}`);
  });

  // Update recommendation thresholds
  configManager.set('recommendations.thresholds.minConfidence', 0.8);
  configManager.set('recommendations.thresholds.maxRecommendations', 3);
  
  // Update market settings
  configManager.set('market.currency', 'EUR');
  configManager.set('market.region', 'EU');
  console.log();

  // 7. Configuration Validation
  console.log('7. Configuration validation...');
  const currentConfig = configManager.getConfig();
  const validationResult = configValidator.validate(currentConfig);
  
  console.log(`Configuration is valid: ${validationResult.isValid}`);
  if (validationResult.warnings.length > 0) {
    console.log('Warnings:');
    validationResult.warnings.forEach(warning => {
      console.log(`  ${warning.path}: ${warning.message}`);
    });
  }
  console.log();

  // 8. Environment-Specific Configuration Loading
  console.log('8. Loading configuration for different environments...');
  
  // Create loaders for different environments
  const stagingLoader = new ConfigLoader({ environment: 'staging' });
  const productionLoader = new ConfigLoader({ environment: 'production' });
  
  const stagingConfig = await stagingLoader.load();
  const productionConfig = await productionLoader.load();
  
  console.log(`Staging environment: ${stagingConfig.environment}`);
  console.log(`Production environment: ${productionConfig.environment}`);
  console.log();

  // 9. Custom Configuration Sources
  console.log('9. Custom configuration sources...');
  
  const customSources: ConfigSource[] = [
    {
      type: 'file',
      path: './config/custom-config.json',
      format: 'json'
    }
  ];
  
  const customConfigManager = new ConfigManager(customSources);
  console.log('Created config manager with custom sources');
  console.log();

  // Cleanup
  configManager.disableHotReload();
  stagingLoader.getConfigManager().disableHotReload();
  productionLoader.getConfigManager().disableHotReload();
  
  console.log('=== Configuration Management Demo Complete ===');
}

// Example of configuration file structure for different environments
export const exampleConfigurations = {
  development: {
    environment: 'development',
    market: {
      region: 'US',
      language: 'en',
      currency: 'USD'
    },
    tools: {
      environments: {
        development: {
          enabledTools: ['business_data_service', 'recommendation_engine'],
          toolConfigurations: {
            business_data_service: {
              enabled: true,
              timeout: 30000,
              customSettings: {
                mockData: true,
                debugMode: true
              }
            }
          }
        }
      }
    }
  },
  
  production: {
    environment: 'production',
    market: {
      region: 'US',
      language: 'en',
      currency: 'USD'
    },
    tools: {
      environments: {
        production: {
          enabledTools: ['business_data_service', 'recommendation_engine', 'analytics_tools'],
          toolConfigurations: {
            business_data_service: {
              enabled: true,
              timeout: 15000,
              customSettings: {
                mockData: false,
                debugMode: false
              }
            }
          }
        }
      }
    },
    recommendations: {
      thresholds: {
        minConfidence: 0.8,
        maxRecommendations: 3,
        impactThreshold: 0.2
      }
    }
  }
};

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateConfigurationManagement().catch(console.error);
}