// Property-based test generators for fast-check

import * as fc from 'fast-check';
import {
  Message,
  MessageRole,
  TextGenerationRequest,
  LLMCapabilities,
  ToolDefinition,
} from '../types/llm';
import { UserInput, WorkflowType } from '../types/agent';
import { ActionType } from '../types/conversation';
import { Product, MarketplaceType } from '../types/business';
import { Money } from '../types/common';
import { Recommendation, RecommendationCategory, AnalysisType } from '../types/recommendations';
import { Priority } from '../types/common';

// Common generators
export const arbitraryUUID = (): fc.Arbitrary<string> =>
  fc.integer({ min: 0, max: 0xffffffff }).chain(() => fc.constant(generateUUID()));

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const arbitraryEmail = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(
        fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
        { minLength: 1, maxLength: 20 }
      ),
      fc.stringOf(
        fc.char().filter((c) => /[a-zA-Z0-9.-]/.test(c)),
        { minLength: 1, maxLength: 20 }
      ),
      fc.stringOf(
        fc.char().filter((c) => /[a-zA-Z]/.test(c)),
        { minLength: 2, maxLength: 10 }
      )
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

export const arbitraryMoney = (): fc.Arbitrary<Money> =>
  fc.record({
    amount: fc.float({ min: 0, max: 1000000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD', 'AUD'),
  });

export const arbitraryDate = (): fc.Arbitrary<Date> =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

// LLM types generators
export const arbitraryMessageRole = (): fc.Arbitrary<MessageRole> =>
  fc.constantFrom(MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM, MessageRole.TOOL);

export const arbitraryMessage = (): fc.Arbitrary<Message> =>
  fc
    .record({
      id: arbitraryUUID(),
      role: arbitraryMessageRole(),
      content: fc.string({ minLength: 1, maxLength: 1000 }),
      timestamp: arbitraryDate(),
    })
    .chain((base) =>
      fc.boolean().map((hasMetadata) => ({
        ...base,
        ...(hasMetadata ? { metadata: { provider: 'test' } } : {}),
      }))
    );

export const arbitraryLLMCapabilities = (): fc.Arbitrary<LLMCapabilities> =>
  fc.record({
    maxTokens: fc.integer({ min: 1000, max: 100000 }),
    supportsTools: fc.boolean(),
    supportsStreaming: fc.boolean(),
    supportsFunctionCalling: fc.boolean(),
  });

export const arbitraryToolDefinition = (): fc.Arbitrary<ToolDefinition> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ minLength: 10, maxLength: 200 }),
    parameters: fc.dictionary(fc.string(), fc.anything()),
  });

export const arbitraryTextGenerationRequest = (): fc.Arbitrary<TextGenerationRequest> =>
  fc
    .record({
      messages: fc.array(arbitraryMessage(), { minLength: 1, maxLength: 10 }),
    })
    .chain((base) =>
      fc
        .tuple(fc.boolean(), fc.boolean(), fc.boolean())
        .map(([hasTemp, hasMaxTokens, hasSystemPrompt]) => ({
          ...base,
          ...(hasTemp ? { temperature: Math.random() * 2 } : {}),
          ...(hasMaxTokens ? { maxTokens: Math.floor(Math.random() * 4000) + 1 } : {}),
          ...(hasSystemPrompt ? { systemPrompt: 'System prompt' } : {}),
        }))
    );

// Agent types generators
export const arbitraryWorkflowType = (): fc.Arbitrary<WorkflowType> =>
  fc.constantFrom(
    WorkflowType.PROMPT_CHAINING,
    WorkflowType.ROUTING,
    WorkflowType.PARALLELIZATION,
    WorkflowType.ORCHESTRATOR_WORKERS,
    WorkflowType.EVALUATOR_OPTIMIZER,
    WorkflowType.AUTONOMOUS_AGENT
  );

export const arbitraryActionType = (): fc.Arbitrary<ActionType> =>
  fc.constantFrom(
    ActionType.ANALYZE_PRODUCT,
    ActionType.VIEW_RECOMMENDATIONS,
    ActionType.OPEN_SEO_OPTIMIZER,
    ActionType.CREATE_CAMPAIGN,
    ActionType.VIEW_ANALYTICS,
    ActionType.MANAGE_INVENTORY,
    ActionType.UPDATE_PROFILE,
    ActionType.ASK_QUESTION
  );

export const arbitraryUserInput = (): fc.Arbitrary<UserInput> =>
  fc
    .record({
      content: fc.string({ minLength: 1, maxLength: 1000 }),
      userId: arbitraryUUID(),
      sessionId: arbitraryUUID(),
      timestamp: arbitraryDate(),
    })
    .chain((base) =>
      fc.boolean().map((hasMetadata) => ({
        ...base,
        ...(hasMetadata ? { metadata: { source: 'test' } } : {}),
      }))
    );

// Business types generators
export const arbitraryMarketplaceType = (): fc.Arbitrary<MarketplaceType> =>
  fc.constantFrom(
    MarketplaceType.SHOPIFY,
    MarketplaceType.AMAZON,
    MarketplaceType.EBAY,
    MarketplaceType.ETSY,
    MarketplaceType.WALMART
  );

export const arbitraryProduct = (): fc.Arbitrary<Partial<Product>> =>
  fc.record({
    id: arbitraryUUID(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ minLength: 20, maxLength: 500 }),
    price: arbitraryMoney(),
    cost: arbitraryMoney(),
    seoScore: fc.float({ min: 0, max: 100 }),
    tags: fc.array(fc.string({ minLength: 2, maxLength: 20 }), { maxLength: 10 }),
    sku: fc.string({ minLength: 3, maxLength: 20 }),
    category: fc.string({ minLength: 3, maxLength: 50 }),
  });

// Recommendation types generators
export const arbitraryPriority = (): fc.Arbitrary<Priority> =>
  fc.constantFrom(Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL);

export const arbitraryRecommendationCategory = (): fc.Arbitrary<RecommendationCategory> =>
  fc.constantFrom(
    RecommendationCategory.SEO_OPTIMIZATION,
    RecommendationCategory.PRICING_STRATEGY,
    RecommendationCategory.INVENTORY_MANAGEMENT,
    RecommendationCategory.MARKETING_CAMPAIGN,
    RecommendationCategory.PRODUCT_IMPROVEMENT,
    RecommendationCategory.COST_REDUCTION,
    RecommendationCategory.REVENUE_GROWTH
  );

export const arbitraryAnalysisType = (): fc.Arbitrary<AnalysisType> =>
  fc.constantFrom(
    AnalysisType.SEO_ANALYSIS,
    AnalysisType.PROFITABILITY_ANALYSIS,
    AnalysisType.COMPETITIVE_ANALYSIS,
    AnalysisType.PERFORMANCE_ANALYSIS,
    AnalysisType.INVENTORY_ANALYSIS,
    AnalysisType.MARKETING_ANALYSIS
  );

export const arbitraryRecommendation = (): fc.Arbitrary<Partial<Recommendation>> =>
  fc.record({
    id: arbitraryUUID(),
    title: fc.string({ minLength: 10, maxLength: 100 }),
    reason: fc.string({ minLength: 20, maxLength: 200 }),
    priority: arbitraryPriority(),
    category: arbitraryRecommendationCategory(),
    createdAt: arbitraryDate(),
  });

// Utility generators for testing edge cases
export const arbitraryNonEmptyString = (): fc.Arbitrary<string> => fc.string({ minLength: 1 });

export const arbitraryWhitespaceString = (): fc.Arbitrary<string> =>
  fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1 });

export const arbitraryValidJSON = (): fc.Arbitrary<string> =>
  fc.anything().map((obj) => JSON.stringify(obj));

export const arbitraryInvalidJSON = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('{invalid json}'),
    fc.constant('{"unclosed": '),
    fc.constant('null,'),
    fc.string().filter((s) => {
      try {
        JSON.parse(s);
        return false;
      } catch {
        return true;
      }
    })
  );
