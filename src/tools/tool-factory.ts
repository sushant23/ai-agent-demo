import { BusinessDataService } from '../types/business';
import { BusinessTool } from '../types/tools';
import { ToolRegistry } from './tool-registry';
import {
  createProductListTool,
  createProductSearchTool,
  createProductDetailTool,
  createRevenueAnalysisTool,
  createSEOAnalysisTool,
  createProfitabilityAnalysisTool,
  createEmailGenerationTool,
  createCampaignCreationTool,
  createContentStrategyTool,
} from './business-tools';

export class ToolFactory {
  private dataService: BusinessDataService;
  private registry: ToolRegistry;

  constructor(dataService: BusinessDataService, registry: ToolRegistry) {
    this.dataService = dataService;
    this.registry = registry;
  }

  async registerAllBusinessTools(): Promise<void> {
    const tools = this.createAllBusinessTools();
    
    for (const tool of tools) {
      await this.registry.registerTool(tool);
    }
  }

  createAllBusinessTools(): BusinessTool[] {
    return [
      // Product Management Tools
      createProductListTool(this.dataService),
      createProductSearchTool(this.dataService),
      createProductDetailTool(this.dataService),
      
      // Analytics Tools
      createRevenueAnalysisTool(this.dataService),
      createSEOAnalysisTool(this.dataService),
      createProfitabilityAnalysisTool(this.dataService),
      
      // Marketing Tools
      createEmailGenerationTool(this.dataService),
      createCampaignCreationTool(this.dataService),
      createContentStrategyTool(this.dataService),
    ];
  }

  async registerProductManagementTools(): Promise<void> {
    const tools = [
      createProductListTool(this.dataService),
      createProductSearchTool(this.dataService),
      createProductDetailTool(this.dataService),
    ];

    for (const tool of tools) {
      await this.registry.registerTool(tool);
    }
  }

  async registerAnalyticsTools(): Promise<void> {
    const tools = [
      createRevenueAnalysisTool(this.dataService),
      createSEOAnalysisTool(this.dataService),
      createProfitabilityAnalysisTool(this.dataService),
    ];

    for (const tool of tools) {
      await this.registry.registerTool(tool);
    }
  }

  async registerMarketingTools(): Promise<void> {
    const tools = [
      createEmailGenerationTool(this.dataService),
      createCampaignCreationTool(this.dataService),
      createContentStrategyTool(this.dataService),
    ];

    for (const tool of tools) {
      await this.registry.registerTool(tool);
    }
  }
}