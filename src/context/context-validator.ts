// Context validator implementation

import {
  IContextValidator,
  ValidationResult,
  IntegrityResult,
} from '../interfaces/context-manager';
import { ConversationContext } from '../types/context';

export class ContextValidator implements IContextValidator {
  validate(context: ConversationContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!context.userId) {
      errors.push('userId is required');
    }

    if (!context.sessionId) {
      errors.push('sessionId is required');
    }

    if (!context.lastUpdated) {
      errors.push('lastUpdated is required');
    }

    if (!context.businessData) {
      errors.push('businessData is required');
    }

    if (!context.recommendations) {
      errors.push('recommendations is required');
    }

    if (!context.conversationHistory) {
      errors.push('conversationHistory is required');
    }

    if (!context.userPreferences) {
      errors.push('userPreferences is required');
    }

    // Validate data types
    if (context.userId && typeof context.userId !== 'string') {
      errors.push('userId must be a string');
    }

    if (context.sessionId && typeof context.sessionId !== 'string') {
      errors.push('sessionId must be a string');
    }

    if (context.lastUpdated && !(context.lastUpdated instanceof Date)) {
      errors.push('lastUpdated must be a Date');
    }

    if (context.conversationHistory && !Array.isArray(context.conversationHistory)) {
      errors.push('conversationHistory must be an array');
    }

    if (context.recommendations && !(context.recommendations instanceof Map)) {
      errors.push('recommendations must be a Map');
    }

    // Validate business data structure
    if (context.businessData) {
      if (typeof context.businessData.totalProducts !== 'number') {
        errors.push('businessData.totalProducts must be a number');
      }

      if (!context.businessData.totalRevenue || typeof context.businessData.totalRevenue.amount !== 'number') {
        errors.push('businessData.totalRevenue must have a numeric amount');
      }

      if (!Array.isArray(context.businessData.topPerformingProducts)) {
        errors.push('businessData.topPerformingProducts must be an array');
      }
    }

    // Validate user preferences
    if (context.userPreferences) {
      if (!context.userPreferences.language) {
        warnings.push('userPreferences.language is not set');
      }

      if (!context.userPreferences.timezone) {
        warnings.push('userPreferences.timezone is not set');
      }

      if (!context.userPreferences.currency) {
        warnings.push('userPreferences.currency is not set');
      }
    }

    // Validate conversation history messages
    if (context.conversationHistory) {
      context.conversationHistory.forEach((message, index) => {
        if (!message.id) {
          errors.push(`conversationHistory[${index}].id is required`);
        }

        if (!message.role) {
          errors.push(`conversationHistory[${index}].role is required`);
        }

        if (typeof message.content !== 'string') {
          errors.push(`conversationHistory[${index}].content must be a string`);
        }

        if (!message.timestamp || !(message.timestamp instanceof Date)) {
          errors.push(`conversationHistory[${index}].timestamp must be a Date`);
        }
      });
    }

    // Check for stale data
    if (context.lastUpdated) {
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - context.lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 24) {
        warnings.push('Context data is more than 24 hours old');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async repair(context: ConversationContext): Promise<ConversationContext> {
    const repairedContext = { ...context };

    // Repair missing required fields with defaults
    if (!repairedContext.userId) {
      throw new Error('Cannot repair context: userId is missing and cannot be defaulted');
    }

    if (!repairedContext.sessionId) {
      throw new Error('Cannot repair context: sessionId is missing and cannot be defaulted');
    }

    if (!repairedContext.lastUpdated) {
      repairedContext.lastUpdated = new Date();
    }

    if (!repairedContext.conversationHistory) {
      repairedContext.conversationHistory = [];
    }

    if (!repairedContext.recommendations) {
      repairedContext.recommendations = new Map();
    }

    if (!repairedContext.businessData) {
      repairedContext.businessData = {
        totalProducts: 0,
        totalRevenue: { amount: 0, currency: 'USD' },
        topPerformingProducts: [],
        recentMetrics: {
          revenue: { amount: 0, currency: 'USD' },
          salesCount: 0,
          conversionRate: 0,
          impressions: 0,
          clicks: 0,
          profitMargin: 0,
          period: {
            start: new Date(),
            end: new Date(),
          },
          trends: [],
        },
        marketplaceStatus: [],
        lastUpdated: new Date(),
      };
    }

    if (!repairedContext.userPreferences) {
      repairedContext.userPreferences = {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          frequency: 'daily',
        },
        displaySettings: {
          theme: 'auto',
          compactMode: false,
          showAdvancedMetrics: false,
        },
      };
    }

    // Repair conversation history messages
    repairedContext.conversationHistory = repairedContext.conversationHistory.map((message, index) => {
      const repairedMessage = { ...message };

      if (!repairedMessage.id) {
        repairedMessage.id = `repaired-${index}-${Date.now()}`;
      }

      if (!repairedMessage.timestamp) {
        repairedMessage.timestamp = new Date();
      }

      if (typeof repairedMessage.content !== 'string') {
        repairedMessage.content = String(repairedMessage.content || '');
      }

      return repairedMessage;
    });

    return repairedContext;
  }

  checkIntegrity(context: ConversationContext): IntegrityResult {
    const corruptedFields: string[] = [];
    const repairSuggestions: string[] = [];

    // Check for data corruption indicators
    try {
      JSON.stringify(context);
    } catch (error) {
      corruptedFields.push('context');
      repairSuggestions.push('Context contains non-serializable data');
    }

    // Check conversation history integrity
    if (context.conversationHistory) {
      const messageIds = new Set();
      let duplicateIds = false;

      context.conversationHistory.forEach((message, index) => {
        if (messageIds.has(message.id)) {
          duplicateIds = true;
        }
        messageIds.add(message.id);

        // Check for timestamp ordering
        if (index > 0) {
          const prevMessage = context.conversationHistory[index - 1];
          if (prevMessage && message.timestamp < prevMessage.timestamp) {
            corruptedFields.push('conversationHistory');
            repairSuggestions.push('Messages are not in chronological order');
          }
        }
      });

      if (duplicateIds) {
        corruptedFields.push('conversationHistory');
        repairSuggestions.push('Duplicate message IDs found');
      }
    }

    // Check recommendations integrity
    if (context.recommendations instanceof Map) {
      for (const [key, recommendations] of context.recommendations.entries()) {
        if (!Array.isArray(recommendations)) {
          corruptedFields.push(`recommendations.${key}`);
          repairSuggestions.push(`Recommendations for ${key} is not an array`);
        }
      }
    }

    // Check business data integrity
    if (context.businessData) {
      if (context.businessData.totalProducts < 0) {
        corruptedFields.push('businessData.totalProducts');
        repairSuggestions.push('Total products cannot be negative');
      }

      if (context.businessData.totalRevenue && context.businessData.totalRevenue.amount < 0) {
        corruptedFields.push('businessData.totalRevenue');
        repairSuggestions.push('Total revenue cannot be negative');
      }
    }

    return {
      isIntact: corruptedFields.length === 0,
      corruptedFields,
      repairSuggestions,
    };
  }
}