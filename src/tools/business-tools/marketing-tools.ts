import {
  BusinessTool,
  ToolCategory,
  ToolParameters,
  ToolResult,
} from '../../types/tools';
import {
  Product,
  BusinessDataService,
  BusinessProfile,
} from '../../types/business';

// Email Generation Tool
export const createEmailGenerationTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'email-generation',
  name: 'Generate Marketing Email',
  description: 'Generate marketing email content for products or campaigns',
  version: '1.0.0',
  category: ToolCategory.MARKETING,
  inputSchema: {
    type: 'object',
    properties: {
      emailType: {
        type: 'string',
        enum: ['product_launch', 'promotion', 'newsletter', 'abandoned_cart', 'follow_up'],
        description: 'Type of marketing email to generate',
      },
      productIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Product IDs to feature in the email',
      },
      targetAudience: {
        type: 'string',
        enum: ['new_customers', 'returning_customers', 'vip_customers', 'all_customers'],
        description: 'Target audience for the email',
      },
      tone: {
        type: 'string',
        enum: ['professional', 'casual', 'friendly', 'urgent', 'luxury'],
        description: 'Tone of voice for the email',
      },
      discountPercentage: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Discount percentage for promotional emails',
      },
      customMessage: {
        type: 'string',
        description: 'Custom message to include in the email',
      },
    },
    required: ['emailType', 'targetAudience', 'tone'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      htmlContent: { type: 'string' },
      textContent: { type: 'string' },
      previewText: { type: 'string' },
      callToAction: { type: 'string' },
    },
    required: ['subject', 'htmlContent', 'textContent', 'previewText', 'callToAction'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const emailType = parameters.emailType as string;
      const productIds = parameters.productIds as string[] || [];
      const targetAudience = parameters.targetAudience as string;
      const tone = parameters.tone as string;
      const discountPercentage = parameters.discountPercentage as number;
      const customMessage = parameters.customMessage as string;

      // Get featured products
      const products: Product[] = [];
      for (const productId of productIds) {
        const product = await dataService.getProduct(productId);
        if (product) products.push(product);
      }

      // Generate email content based on type and parameters
      const emailContent = generateEmailContent({
        emailType,
        products,
        targetAudience,
        tone,
        discountPercentage,
        customMessage,
      });

      return {
        success: true,
        data: emailContent,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EMAIL_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate email content',
        },
      };
    }
  },
});

// Campaign Creation Tool
export const createCampaignCreationTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'campaign-creation',
  name: 'Create Marketing Campaign',
  description: 'Create a comprehensive marketing campaign with multiple touchpoints',
  version: '1.0.0',
  category: ToolCategory.MARKETING,
  inputSchema: {
    type: 'object',
    properties: {
      campaignName: {
        type: 'string',
        description: 'Name of the marketing campaign',
      },
      campaignType: {
        type: 'string',
        enum: ['product_launch', 'seasonal_sale', 'brand_awareness', 'customer_retention', 'cross_sell'],
        description: 'Type of marketing campaign',
      },
      duration: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
        description: 'Campaign duration',
      },
      budget: {
        type: 'object',
        properties: {
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
        },
        description: 'Campaign budget',
      },
      targetAudience: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Target audience segments',
      },
      channels: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Marketing channels to use',
      },
      productIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Products to feature in the campaign',
      },
      goals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            target: { type: 'number' },
            unit: { type: 'string' },
          },
          required: ['metric', 'target', 'unit'],
        },
        description: 'Campaign goals and KPIs',
      },
    },
    required: ['campaignName', 'campaignType', 'duration', 'budget', 'targetAudience', 'channels'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      campaignPlan: { type: 'object' },
      timeline: { type: 'array' },
      contentSuggestions: { type: 'array' },
      budgetAllocation: { type: 'object' },
      kpis: { type: 'array' },
    },
    required: ['campaignPlan', 'timeline', 'contentSuggestions', 'budgetAllocation', 'kpis'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const campaignName = parameters.campaignName as string;
      const campaignType = parameters.campaignType as string;
      const duration = parameters.duration as { startDate: string; endDate: string };
      const budget = parameters.budget as { amount: number; currency: string };
      const targetAudience = parameters.targetAudience as string[];
      const channels = parameters.channels as string[];
      const productIds = parameters.productIds as string[] || [];
      const goals = parameters.goals as Array<{ metric: string; target: number; unit: string }> || [];

      // Get featured products
      const products: Product[] = [];
      for (const productId of productIds) {
        const product = await dataService.getProduct(productId);
        if (product) products.push(product);
      }

      // Generate campaign plan
      const campaignPlan = generateCampaignPlan({
        campaignName,
        campaignType,
        duration,
        budget,
        targetAudience,
        channels,
        products,
        goals,
      });

      return {
        success: true,
        data: campaignPlan,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_CREATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create campaign',
        },
      };
    }
  },
});

// Content Strategy Tool
export const createContentStrategyTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'content-strategy',
  name: 'Generate Content Strategy',
  description: 'Generate content marketing strategy and content calendar',
  version: '1.0.0',
  category: ToolCategory.MARKETING,
  inputSchema: {
    type: 'object',
    properties: {
      contentType: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Types of content to create',
      },
      targetKeywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target keywords for SEO',
      },
      contentGoals: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Content marketing goals',
      },
      frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'bi_weekly', 'monthly'],
        description: 'Content publishing frequency',
      },
      duration: {
        type: 'number',
        minimum: 1,
        maximum: 12,
        description: 'Strategy duration in months',
      },
    },
    required: ['contentType', 'contentGoals', 'frequency', 'duration'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      strategy: { type: 'object' },
      contentCalendar: { type: 'array' },
      contentIdeas: { type: 'array' },
      seoRecommendations: { type: 'array' },
    },
    required: ['strategy', 'contentCalendar', 'contentIdeas', 'seoRecommendations'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const contentType = parameters.contentType as string[];
      const targetKeywords = parameters.targetKeywords as string[] || [];
      const contentGoals = parameters.contentGoals as string[];
      const frequency = parameters.frequency as string;
      const duration = parameters.duration as number;

      // Get top products for content inspiration
      const topProducts = await dataService.getProducts({
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 10,
      });

      // Generate content strategy
      const strategy = generateContentStrategy({
        contentType,
        targetKeywords,
        contentGoals,
        frequency,
        duration,
        topProducts,
      });

      return {
        success: true,
        data: strategy,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTENT_STRATEGY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate content strategy',
        },
      };
    }
  },
});

// Helper functions
function generateEmailContent(params: {
  emailType: string;
  products: Product[];
  targetAudience: string;
  tone: string;
  discountPercentage?: number;
  customMessage?: string;
}): any {
  const { emailType, products, targetAudience, tone, discountPercentage, customMessage } = params;

  // Generate subject line based on email type and tone
  const subjects: Record<string, Record<string, string>> = {
    product_launch: {
      professional: 'Introducing Our Latest Product Innovation',
      casual: 'Check Out What\'s New!',
      friendly: 'We\'ve Got Something Special for You',
      urgent: 'Limited Time: New Product Launch',
      luxury: 'Exclusive First Access to Our Premium Collection',
    },
    promotion: {
      professional: `Save ${discountPercentage}% on Selected Items`,
      casual: `${discountPercentage}% Off - Don't Miss Out!`,
      friendly: `Special ${discountPercentage}% Discount Just for You`,
      urgent: `Flash Sale: ${discountPercentage}% Off Ends Soon!`,
      luxury: `Exclusive ${discountPercentage}% Savings on Premium Items`,
    },
  };

  const subject = subjects[emailType]?.[tone] || 'Special Offer from Our Store';

  // Generate content based on products and parameters
  const productSection = products.length > 0 
    ? products.map(p => `<div class="product">
         <h3>${p.title}</h3>
         <p>${p.description.substring(0, 100)}...</p>
         <p class="price">$${p.price.amount}</p>
       </div>`).join('')
    : '';

  const discountSection = discountPercentage 
    ? `<div class="discount">
         <h2>Save ${discountPercentage}%</h2>
         <p>Use code: SAVE${discountPercentage}</p>
       </div>`
    : '';

  const htmlContent = `
    <html>
      <body>
        <div class="email-container">
          <h1>${subject}</h1>
          ${customMessage ? `<p>${customMessage}</p>` : ''}
          ${discountSection}
          ${productSection}
          <div class="cta">
            <a href="#" class="button">Shop Now</a>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
    ${subject}
    
    ${customMessage || ''}
    
    ${discountPercentage ? `Save ${discountPercentage}% with code SAVE${discountPercentage}` : ''}
    
    ${products.map(p => `${p.title} - $${p.price.amount}`).join('\n')}
    
    Shop now at our store!
  `;

  return {
    subject,
    htmlContent,
    textContent,
    previewText: `${discountPercentage ? `Save ${discountPercentage}%` : 'Special offer'} on our best products`,
    callToAction: 'Shop Now',
  };
}

function generateCampaignPlan(params: any): any {
  const { campaignName, campaignType, duration, budget, targetAudience, channels, products, goals } = params;

  // Generate timeline
  const startDate = new Date(duration.startDate);
  const endDate = new Date(duration.endDate);
  const campaignDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const timeline = [
    { phase: 'Planning', duration: '1 week', tasks: ['Finalize creative assets', 'Set up tracking', 'Prepare content'] },
    { phase: 'Launch', duration: '1 week', tasks: ['Deploy campaigns', 'Monitor initial performance', 'Optimize based on early data'] },
    { phase: 'Optimization', duration: `${Math.max(1, campaignDays - 14)} days`, tasks: ['A/B test variations', 'Adjust targeting', 'Scale successful elements'] },
    { phase: 'Analysis', duration: '3 days', tasks: ['Compile results', 'Generate insights', 'Plan next steps'] },
  ];

  // Allocate budget across channels
  const budgetPerChannel = budget.amount / channels.length;
  const budgetAllocation = channels.reduce((acc: Record<string, any>, channel: string) => {
    acc[channel] = {
      amount: budgetPerChannel,
      currency: budget.currency,
      percentage: (100 / channels.length).toFixed(1),
    };
    return acc;
  }, {});

  // Generate content suggestions
  const contentSuggestions = [
    { type: 'Hero Image', description: 'Main campaign visual featuring top products' },
    { type: 'Email Series', description: '3-part email sequence for nurturing leads' },
    { type: 'Social Media Posts', description: '10 posts across different platforms' },
    { type: 'Landing Page', description: 'Dedicated campaign landing page' },
  ];

  // Set up KPIs
  const kpis = goals.length > 0 ? goals : [
    { metric: 'Revenue', target: budget.amount * 3, unit: budget.currency },
    { metric: 'Conversion Rate', target: 2.5, unit: '%' },
    { metric: 'Click-through Rate', target: 3.0, unit: '%' },
    { metric: 'Return on Ad Spend', target: 300, unit: '%' },
  ];

  return {
    campaignPlan: {
      name: campaignName,
      type: campaignType,
      duration: `${campaignDays} days`,
      targetAudience,
      channels,
      featuredProducts: products.length,
    },
    timeline,
    contentSuggestions,
    budgetAllocation,
    kpis,
  };
}

function generateContentStrategy(params: any): any {
  const { contentType, targetKeywords, contentGoals, frequency, duration, topProducts } = params;

  // Generate content calendar
  const postsPerMonthMap: Record<string, number> = {
    daily: 30,
    weekly: 4,
    bi_weekly: 2,
    monthly: 1,
  };
  const postsPerMonth = postsPerMonthMap[frequency] || 4;

  const totalPosts = postsPerMonth * duration;
  const contentCalendar = Array.from({ length: Math.min(totalPosts, 50) }, (_, i) => ({
    week: Math.floor(i / postsPerMonth) + 1,
    contentType: contentType[i % contentType.length],
    topic: `Content piece ${i + 1}`,
    keywords: targetKeywords.slice(0, 3),
    goal: contentGoals[i % contentGoals.length],
  }));

  // Generate content ideas based on top products
  const contentIdeas = topProducts.slice(0, 10).map((product: Product, i: number) => ({
    title: `How to Use ${product.title} for Maximum Benefit`,
    type: contentType[i % contentType.length],
    keywords: [product.title, ...product.tags.slice(0, 2)],
    description: `Educational content featuring ${product.title}`,
  }));

  // SEO recommendations
  const seoRecommendations = [
    'Focus on long-tail keywords related to your products',
    'Create pillar content around main product categories',
    'Optimize for featured snippets with FAQ-style content',
    'Build internal linking between related content pieces',
    'Create location-based content if applicable',
  ];

  return {
    strategy: {
      contentTypes: contentType,
      publishingFrequency: frequency,
      duration: `${duration} months`,
      totalPieces: totalPosts,
      primaryGoals: contentGoals,
    },
    contentCalendar,
    contentIdeas,
    seoRecommendations,
  };
}