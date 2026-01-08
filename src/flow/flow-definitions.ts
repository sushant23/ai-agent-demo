// Conversation flow definitions for different business scenarios

import {
  ConversationFlow,
  FlowCategory,
  InputSchema,
  OutputSchema,
} from '../types/agent';
import { ActionType } from '../types/conversation';

export class FlowDefinitions {
  static getAllFlows(): ConversationFlow[] {
    return [
      ...this.getBusinessPerformanceFlows(),
      ...this.getProductManagementFlows(),
      ...this.getMarketingFlows(),
      ...this.getAccountManagementFlows(),
    ];
  }

  // Business Performance Flows
  static getBusinessPerformanceFlows(): ConversationFlow[] {
    return [
      {
        id: 'seo_analysis',
        name: 'SEO Performance Analysis',
        description: 'Analyze SEO scores and provide optimization recommendations',
        category: FlowCategory.BUSINESS_PERFORMANCE,
        requiredTools: ['seo_analyzer', 'product_catalog'],
        expectedInputs: [
          {
            name: 'product_id',
            type: 'string',
            required: false,
            description: 'Specific product to analyze (optional)',
          },
          {
            name: 'timeframe',
            type: 'string',
            required: false,
            description: 'Analysis timeframe (default: last 30 days)',
          },
        ],
        outputFormat: {
          format: 'structured_analysis',
          fields: {
            seoScore: 'number',
            recommendations: 'array',
            topIssues: 'array',
            improvementPotential: 'number',
          },
        },
        nextStepActions: [
          {
            id: 'optimize_seo',
            title: 'Optimize SEO',
            description: 'Open SEO optimization tools for selected products',
            actionType: ActionType.OPEN_SEO_OPTIMIZER,
          },
          {
            id: 'view_detailed_report',
            title: 'View detailed report',
            description: 'See comprehensive SEO analysis with specific recommendations',
            actionType: ActionType.VIEW_ANALYTICS,
          },
          {
            id: 'analyze_competitor',
            title: 'Analyze competitors',
            description: 'Compare your SEO performance with competitors',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'schedule_optimization',
            title: 'Schedule optimization',
            description: 'Set up automated SEO monitoring and optimization',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
        ],
      },
      {
        id: 'profitability_analysis',
        name: 'Profitability Analysis',
        description: 'Analyze profit margins and identify improvement opportunities',
        category: FlowCategory.BUSINESS_PERFORMANCE,
        requiredTools: ['analytics_engine', 'cost_calculator'],
        expectedInputs: [
          {
            name: 'analysis_period',
            type: 'string',
            required: false,
            description: 'Time period for analysis (default: last quarter)',
          },
          {
            name: 'product_category',
            type: 'string',
            required: false,
            description: 'Specific product category to analyze',
          },
        ],
        outputFormat: {
          format: 'financial_report',
          fields: {
            totalRevenue: 'number',
            totalCosts: 'number',
            profitMargin: 'number',
            topPerformers: 'array',
            improvementAreas: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'optimize_pricing',
            title: 'Optimize pricing',
            description: 'Adjust product pricing to improve margins',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'reduce_costs',
            title: 'Reduce costs',
            description: 'Identify cost reduction opportunities',
            actionType: ActionType.VIEW_ANALYTICS,
          },
          {
            id: 'expand_profitable_products',
            title: 'Expand profitable lines',
            description: 'Focus marketing on high-margin products',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
        ],
      },
      {
        id: 'top_products_analysis',
        name: 'Top Products Performance',
        description: 'Identify and analyze best-performing products',
        category: FlowCategory.BUSINESS_PERFORMANCE,
        requiredTools: ['product_analytics', 'sales_tracker'],
        expectedInputs: [
          {
            name: 'metric',
            type: 'string',
            required: false,
            description: 'Ranking metric (revenue, units_sold, profit_margin)',
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Number of top products to analyze (default: 10)',
          },
        ],
        outputFormat: {
          format: 'product_ranking',
          fields: {
            topProducts: 'array',
            performanceMetrics: 'object',
            trends: 'array',
            recommendations: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'promote_top_products',
            title: 'Promote top products',
            description: 'Create marketing campaigns for best performers',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'analyze_success_factors',
            title: 'Analyze success factors',
            description: 'Understand what makes these products successful',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'replicate_success',
            title: 'Replicate success',
            description: 'Apply successful strategies to other products',
            actionType: ActionType.VIEW_RECOMMENDATIONS,
          },
        ],
      },
    ];
  }

  // Product Management Flows
  static getProductManagementFlows(): ConversationFlow[] {
    return [
      {
        id: 'product_catalog_search',
        name: 'Product Catalog Search',
        description: 'Search and browse product catalog with filters',
        category: FlowCategory.PRODUCT_MANAGEMENT,
        requiredTools: ['product_search', 'inventory_manager'],
        expectedInputs: [
          {
            name: 'search_query',
            type: 'string',
            required: true,
            description: 'Product search terms or keywords',
          },
          {
            name: 'filters',
            type: 'object',
            required: false,
            description: 'Search filters (category, price range, availability)',
          },
        ],
        outputFormat: {
          format: 'product_list',
          fields: {
            products: 'array',
            totalCount: 'number',
            filters: 'object',
            suggestions: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'view_product_details',
            title: 'View product details',
            description: 'See detailed information for specific products',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'optimize_listings',
            title: 'Optimize listings',
            description: 'Improve product titles, descriptions, and SEO',
            actionType: ActionType.OPEN_SEO_OPTIMIZER,
          },
          {
            id: 'manage_inventory',
            title: 'Manage inventory',
            description: 'Update stock levels and availability',
            actionType: ActionType.MANAGE_INVENTORY,
          },
          {
            id: 'bulk_edit',
            title: 'Bulk edit products',
            description: 'Make changes to multiple products at once',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
        ],
      },
      {
        id: 'product_optimization',
        name: 'Product Optimization',
        description: 'Optimize individual product performance and visibility',
        category: FlowCategory.PRODUCT_MANAGEMENT,
        requiredTools: ['seo_optimizer', 'image_analyzer', 'pricing_optimizer'],
        expectedInputs: [
          {
            name: 'product_id',
            type: 'string',
            required: true,
            description: 'Product identifier to optimize',
          },
          {
            name: 'optimization_focus',
            type: 'string',
            required: false,
            description: 'Focus area (seo, pricing, images, description)',
          },
        ],
        outputFormat: {
          format: 'optimization_report',
          fields: {
            currentMetrics: 'object',
            recommendations: 'array',
            potentialImpact: 'object',
            implementationSteps: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'apply_seo_fixes',
            title: 'Apply SEO improvements',
            description: 'Implement recommended SEO optimizations',
            actionType: ActionType.OPEN_SEO_OPTIMIZER,
          },
          {
            id: 'update_pricing',
            title: 'Update pricing',
            description: 'Adjust product pricing based on analysis',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'improve_images',
            title: 'Improve images',
            description: 'Upload better product images',
            actionType: ActionType.ANALYZE_PRODUCT,
          },
          {
            id: 'track_performance',
            title: 'Track performance',
            description: 'Monitor optimization results over time',
            actionType: ActionType.VIEW_ANALYTICS,
          },
        ],
      },
      {
        id: 'inventory_management',
        name: 'Inventory Management',
        description: 'Manage stock levels, reorder points, and availability',
        category: FlowCategory.PRODUCT_MANAGEMENT,
        requiredTools: ['inventory_tracker', 'demand_forecaster'],
        expectedInputs: [
          {
            name: 'action_type',
            type: 'string',
            required: true,
            description: 'Management action (check_stock, update_levels, forecast_demand)',
          },
          {
            name: 'product_filter',
            type: 'object',
            required: false,
            description: 'Filter for specific products or categories',
          },
        ],
        outputFormat: {
          format: 'inventory_report',
          fields: {
            currentStock: 'object',
            lowStockAlerts: 'array',
            reorderSuggestions: 'array',
            demandForecast: 'object',
          },
        },
        nextStepActions: [
          {
            id: 'reorder_stock',
            title: 'Reorder stock',
            description: 'Place orders for low-stock items',
            actionType: ActionType.MANAGE_INVENTORY,
          },
          {
            id: 'set_alerts',
            title: 'Set stock alerts',
            description: 'Configure automatic low-stock notifications',
            actionType: ActionType.MANAGE_INVENTORY,
          },
          {
            id: 'analyze_trends',
            title: 'Analyze demand trends',
            description: 'Review historical demand patterns',
            actionType: ActionType.VIEW_ANALYTICS,
          },
        ],
      },
    ];
  }

  // Marketing Flows
  static getMarketingFlows(): ConversationFlow[] {
    return [
      {
        id: 'marketing_strategy',
        name: 'Marketing Strategy Development',
        description: 'Create comprehensive marketing strategies for products or campaigns',
        category: FlowCategory.MARKETING,
        requiredTools: ['market_analyzer', 'competitor_tracker', 'audience_segmenter'],
        expectedInputs: [
          {
            name: 'strategy_focus',
            type: 'string',
            required: true,
            description: 'Strategy focus (product_launch, brand_awareness, sales_boost)',
          },
          {
            name: 'target_audience',
            type: 'object',
            required: false,
            description: 'Target audience demographics and preferences',
          },
          {
            name: 'budget_range',
            type: 'object',
            required: false,
            description: 'Available marketing budget range',
          },
        ],
        outputFormat: {
          format: 'strategy_document',
          fields: {
            objectives: 'array',
            targetAudience: 'object',
            channels: 'array',
            timeline: 'object',
            budget: 'object',
            kpis: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'create_campaigns',
            title: 'Create campaigns',
            description: 'Develop specific marketing campaigns',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'analyze_competitors',
            title: 'Analyze competitors',
            description: 'Research competitor marketing strategies',
            actionType: ActionType.VIEW_ANALYTICS,
          },
          {
            id: 'set_budget',
            title: 'Set marketing budget',
            description: 'Allocate budget across marketing channels',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'schedule_execution',
            title: 'Schedule execution',
            description: 'Plan campaign timeline and milestones',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
        ],
      },
      {
        id: 'email_campaign_creation',
        name: 'Email Campaign Creation',
        description: 'Generate and optimize email marketing campaigns',
        category: FlowCategory.MARKETING,
        requiredTools: ['email_generator', 'audience_segmenter', 'a_b_tester'],
        expectedInputs: [
          {
            name: 'campaign_type',
            type: 'string',
            required: true,
            description: 'Email campaign type (promotional, newsletter, abandoned_cart)',
          },
          {
            name: 'target_segment',
            type: 'string',
            required: false,
            description: 'Customer segment to target',
          },
          {
            name: 'products',
            type: 'array',
            required: false,
            description: 'Products to feature in the email',
          },
        ],
        outputFormat: {
          format: 'email_campaign',
          fields: {
            subject: 'string',
            content: 'string',
            targetAudience: 'object',
            sendTime: 'string',
            abTestVariants: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'preview_email',
            title: 'Preview email',
            description: 'See how the email will look to recipients',
            actionType: ActionType.VIEW_ANALYTICS,
          },
          {
            id: 'setup_ab_test',
            title: 'Set up A/B test',
            description: 'Create variations to test performance',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'schedule_send',
            title: 'Schedule send',
            description: 'Set up automated sending schedule',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'track_performance',
            title: 'Track performance',
            description: 'Monitor email campaign metrics',
            actionType: ActionType.VIEW_ANALYTICS,
          },
        ],
      },
      {
        id: 'campaign_performance',
        name: 'Campaign Performance Analysis',
        description: 'Analyze marketing campaign effectiveness and ROI',
        category: FlowCategory.MARKETING,
        requiredTools: ['campaign_tracker', 'roi_calculator', 'attribution_analyzer'],
        expectedInputs: [
          {
            name: 'campaign_id',
            type: 'string',
            required: false,
            description: 'Specific campaign to analyze',
          },
          {
            name: 'time_period',
            type: 'string',
            required: false,
            description: 'Analysis time period',
          },
          {
            name: 'metrics',
            type: 'array',
            required: false,
            description: 'Specific metrics to focus on',
          },
        ],
        outputFormat: {
          format: 'performance_report',
          fields: {
            campaignMetrics: 'object',
            roi: 'number',
            conversionRates: 'object',
            recommendations: 'array',
            benchmarks: 'object',
          },
        },
        nextStepActions: [
          {
            id: 'optimize_campaign',
            title: 'Optimize campaign',
            description: 'Improve underperforming campaigns',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'scale_successful',
            title: 'Scale successful campaigns',
            description: 'Increase budget for high-performing campaigns',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
          {
            id: 'pause_ineffective',
            title: 'Pause ineffective campaigns',
            description: 'Stop campaigns with poor ROI',
            actionType: ActionType.CREATE_CAMPAIGN,
          },
        ],
      },
    ];
  }

  // Account Management Flows
  static getAccountManagementFlows(): ConversationFlow[] {
    return [
      {
        id: 'profile_management',
        name: 'Business Profile Management',
        description: 'Update business profile, settings, and preferences',
        category: FlowCategory.ACCOUNT_MANAGEMENT,
        requiredTools: ['profile_manager', 'settings_controller'],
        expectedInputs: [
          {
            name: 'update_type',
            type: 'string',
            required: true,
            description: 'Type of update (contact_info, business_details, preferences)',
          },
          {
            name: 'new_values',
            type: 'object',
            required: false,
            description: 'New values to update',
          },
        ],
        outputFormat: {
          format: 'profile_update',
          fields: {
            updatedFields: 'array',
            currentProfile: 'object',
            validationResults: 'object',
          },
        },
        nextStepActions: [
          {
            id: 'verify_changes',
            title: 'Verify changes',
            description: 'Confirm profile updates are correct',
            actionType: ActionType.UPDATE_PROFILE,
          },
          {
            id: 'update_marketplaces',
            title: 'Update marketplaces',
            description: 'Sync changes to connected marketplaces',
            actionType: ActionType.UPDATE_PROFILE,
          },
          {
            id: 'configure_notifications',
            title: 'Configure notifications',
            description: 'Set up notification preferences',
            actionType: ActionType.UPDATE_PROFILE,
          },
        ],
      },
      {
        id: 'subscription_management',
        name: 'Subscription Management',
        description: 'Manage subscription plans, billing, and features',
        category: FlowCategory.ACCOUNT_MANAGEMENT,
        requiredTools: ['billing_manager', 'feature_controller'],
        expectedInputs: [
          {
            name: 'action',
            type: 'string',
            required: true,
            description: 'Subscription action (upgrade, downgrade, cancel, renew)',
          },
          {
            name: 'plan_id',
            type: 'string',
            required: false,
            description: 'Target subscription plan',
          },
        ],
        outputFormat: {
          format: 'subscription_status',
          fields: {
            currentPlan: 'object',
            availablePlans: 'array',
            billingInfo: 'object',
            featureComparison: 'object',
          },
        },
        nextStepActions: [
          {
            id: 'change_plan',
            title: 'Change plan',
            description: 'Upgrade or downgrade subscription',
            actionType: ActionType.UPDATE_PROFILE,
          },
          {
            id: 'update_billing',
            title: 'Update billing',
            description: 'Change payment method or billing address',
            actionType: ActionType.UPDATE_PROFILE,
          },
          {
            id: 'view_usage',
            title: 'View usage',
            description: 'See current plan usage and limits',
            actionType: ActionType.VIEW_ANALYTICS,
          },
        ],
      },
      {
        id: 'goal_setting',
        name: 'Business Goal Setting',
        description: 'Set and track business objectives and KPIs',
        category: FlowCategory.ACCOUNT_MANAGEMENT,
        requiredTools: ['goal_tracker', 'kpi_calculator'],
        expectedInputs: [
          {
            name: 'goal_type',
            type: 'string',
            required: true,
            description: 'Type of goal (revenue, growth, efficiency, customer_satisfaction)',
          },
          {
            name: 'target_value',
            type: 'number',
            required: false,
            description: 'Target value for the goal',
          },
          {
            name: 'timeframe',
            type: 'string',
            required: false,
            description: 'Goal timeframe (monthly, quarterly, yearly)',
          },
        ],
        outputFormat: {
          format: 'goal_setup',
          fields: {
            goalDefinition: 'object',
            currentProgress: 'number',
            milestones: 'array',
            trackingMetrics: 'array',
          },
        },
        nextStepActions: [
          {
            id: 'track_progress',
            title: 'Track progress',
            description: 'Monitor goal achievement over time',
            actionType: ActionType.VIEW_ANALYTICS,
          },
          {
            id: 'adjust_targets',
            title: 'Adjust targets',
            description: 'Modify goals based on performance',
            actionType: ActionType.UPDATE_PROFILE,
          },
          {
            id: 'create_action_plan',
            title: 'Create action plan',
            description: 'Develop strategies to achieve goals',
            actionType: ActionType.VIEW_RECOMMENDATIONS,
          },
        ],
      },
    ];
  }

  // Helper method to get flow by ID
  static getFlowById(flowId: string): ConversationFlow | undefined {
    return this.getAllFlows().find(flow => flow.id === flowId);
  }

  // Helper method to get flows by category
  static getFlowsByCategory(category: FlowCategory): ConversationFlow[] {
    return this.getAllFlows().filter(flow => flow.category === category);
  }
}