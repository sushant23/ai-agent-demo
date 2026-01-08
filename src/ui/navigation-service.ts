// UI Navigation Service - Higher level navigation functionality

import { UIControllerImpl } from './ui-controller';
import { ConversationContext } from '../types/context';
import { UIActionResult, UIPage, UIDrawer, UIPanel } from '../types/ui';
import { Recommendation, RecommendationCategory } from '../types/recommendations';
import { Product, BusinessProfile } from '../types/business';

export class UINavigationService {
  constructor(private uiController: UIControllerImpl) {}

  // Context-aware navigation methods based on conversation flow
  async navigateBasedOnRecommendation(
    recommendation: Recommendation,
    context: ConversationContext
  ): Promise<UIActionResult> {
    switch (recommendation.category) {
      case RecommendationCategory.SEO_OPTIMIZATION:
        if (context.activeProduct) {
          return this.uiController.openSEOOptimizationDrawer(context.activeProduct, context);
        }
        return this.uiController.navigateToPage(UIPage.SEO_OPTIMIZER);

      case RecommendationCategory.PRODUCT_IMPROVEMENT:
        if (context.activeProduct) {
          return this.uiController.navigateToProductPage(context.activeProduct, context);
        }
        return this.uiController.navigateToPage(UIPage.PRODUCTS);

      case RecommendationCategory.MARKETING_CAMPAIGN:
        return this.uiController.navigateToPage(UIPage.ANALYTICS, {
          recommendationId: recommendation.id,
          analysisType: recommendation.category,
        });

      case RecommendationCategory.REVENUE_GROWTH:
        return this.uiController.openDrawer(UIDrawer.CAMPAIGN_CREATOR, {
          recommendationId: recommendation.id,
          context: context.businessData,
        });

      default:
        return this.uiController.navigateToPage(UIPage.RECOMMENDATIONS, {
          recommendationId: recommendation.id,
        });
    }
  }

  // Navigate based on conversation flow type
  async navigateBasedOnFlow(flowType: string, context: ConversationContext): Promise<UIActionResult> {
    switch (flowType) {
      case 'business_performance':
        return this.uiController.navigateToPage(UIPage.ANALYTICS, {
          flow: flowType,
          businessData: context.businessData,
        });

      case 'product_management':
        if (context.activeProduct) {
          return this.uiController.navigateToProductPage(context.activeProduct, context);
        }
        return this.uiController.navigateToPage(UIPage.PRODUCTS, { flow: flowType });

      case 'seo_optimization':
        if (context.activeProduct) {
          return this.uiController.openSEOOptimizationDrawer(context.activeProduct, context);
        }
        return this.uiController.navigateToPage(UIPage.SEO_OPTIMIZER, { flow: flowType });

      case 'marketing_strategy':
        return this.uiController.openDrawer(UIDrawer.CAMPAIGN_CREATOR, {
          flow: flowType,
          businessData: context.businessData,
        });

      case 'account_management':
        return this.uiController.navigateToPage(UIPage.SETTINGS, { flow: flowType });

      default:
        return this.uiController.navigateToPage(UIPage.DASHBOARD, { flow: flowType });
    }
  }

  // Open appropriate panels based on analysis type
  async openAnalysisPanel(analysisType: string, data: any): Promise<UIActionResult> {
    switch (analysisType) {
      case 'revenue_analysis':
      case 'profitability_analysis':
        return this.uiController.openPanel(UIPanel.PERFORMANCE_CHART, {
          analysisType,
          data,
        });

      case 'product_comparison':
        return this.uiController.openPanel(UIPanel.PRODUCT_COMPARISON, {
          products: data.products,
          metrics: data.metrics,
        });

      case 'recommendation_detail':
        return this.uiController.openPanel(UIPanel.RECOMMENDATION_DETAIL, {
          recommendation: data.recommendation,
          context: data.context,
        });

      default:
        return this.uiController.openPanel(UIPanel.HELP_ASSISTANT, {
          analysisType,
          data,
        });
    }
  }

  // Pre-populate forms based on context and intent
  async prefillFormBasedOnContext(
    formType: string,
    context: ConversationContext,
    additionalData?: Record<string, unknown>
  ): Promise<UIActionResult> {
    const baseData: Record<string, unknown> = {};

    // Add business context from business data snapshot
    if (context.businessData) {
      // Note: BusinessDataSnapshot doesn't have direct business profile fields
      // We would need to fetch the business profile separately or extend the context
      baseData.lastUpdated = context.businessData.lastUpdated;
      baseData.totalProducts = context.businessData.totalProducts;
    }

    // Add active product context
    if (context.activeProduct && context.businessData?.topPerformingProducts) {
      const activeProduct = context.businessData.topPerformingProducts.find(
        (p: Product) => p.id === context.activeProduct
      );
      if (activeProduct) {
        baseData.productId = activeProduct.id;
        baseData.productTitle = activeProduct.title;
        baseData.marketplace = activeProduct.marketplace;
      }
    }

    // Merge with additional data
    const formData = { ...baseData, ...additionalData };

    return this.uiController.prefillForm(formType, formData);
  }

  // Handle navigation failures with alternatives
  async handleNavigationFailure(
    originalAction: string,
    error: any,
    context: ConversationContext
  ): Promise<UIActionResult> {
    console.warn(`Navigation failed for ${originalAction}:`, error);

    // Provide alternative actions based on the failed action
    switch (originalAction) {
      case 'navigateToProduct':
        // If product navigation fails, go to products list
        return this.uiController.navigateToPage(UIPage.PRODUCTS, {
          error: 'Product not found',
          searchQuery: context.activeProduct,
        });

      case 'openSEODrawer':
        // If SEO drawer fails, navigate to SEO optimizer page
        return this.uiController.navigateToPage(UIPage.SEO_OPTIMIZER, {
          error: 'Drawer unavailable',
          productId: context.activeProduct,
        });

      case 'openAnalyticsPanel':
        // If panel fails, navigate to analytics page
        return this.uiController.navigateToPage(UIPage.ANALYTICS, {
          error: 'Panel unavailable',
        });

      default:
        // Default fallback to dashboard
        return this.uiController.navigateToPage(UIPage.DASHBOARD, {
          error: `Failed action: ${originalAction}`,
          originalContext: context,
        });
    }
  }
}