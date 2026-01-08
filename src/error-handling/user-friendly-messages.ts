/**
 * User-Friendly Error Messages
 * 
 * Provides human-readable error messages and recovery suggestions
 * for different types of errors that can occur in the system.
 */

import type { NextStepAction } from '../types/conversation';

/**
 * User-friendly error message templates
 */
export class UserFriendlyErrorMessages {
  private static messages: Record<string, {
    title: string;
    message: string;
    suggestion: string;
    actions: NextStepAction[];
  }> = {
    // LLM Provider Errors
    LLM_PROVIDER_ERROR: {
      title: 'AI Service Temporarily Unavailable',
      message: 'I\'m having trouble connecting to my AI processing service. This is usually temporary.',
      suggestion: 'Please try your request again in a moment, or try asking in a different way.',
      actions: [
        {
          id: 'retry_request',
          title: 'Try Again',
          description: 'Retry your request',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true }
        },
        {
          id: 'rephrase_request',
          title: 'Rephrase Request',
          description: 'Try asking in a different way',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    LLM_RATE_LIMIT: {
      title: 'Service Busy',
      message: 'I\'m currently handling a lot of requests. Please give me a moment to catch up.',
      suggestion: 'Try again in a few seconds, or I can help you with something else in the meantime.',
      actions: [
        {
          id: 'wait_retry',
          title: 'Wait and Retry',
          description: 'Try again in 30 seconds',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true, delay: 30000 }
        },
        {
          id: 'different_task',
          title: 'Try Something Else',
          description: 'Let me help you with a different task',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Business Data Errors
    BUSINESS_DATA_ERROR: {
      title: 'Business Data Unavailable',
      message: 'I\'m having trouble accessing your business data right now.',
      suggestion: 'This could be due to a connection issue with your marketplace or a temporary service problem.',
      actions: [
        {
          id: 'check_connections',
          title: 'Check Connections',
          description: 'Verify your marketplace connections',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'try_cached_data',
          title: 'Use Recent Data',
          description: 'Work with recently cached information',
          actionType: 'VIEW_ANALYTICS' as any
        },
        {
          id: 'manual_input',
          title: 'Provide Data Manually',
          description: 'Tell me about your business manually',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    MARKETPLACE_CONNECTION_ERROR: {
      title: 'Marketplace Connection Issue',
      message: 'I can\'t connect to one or more of your marketplaces right now.',
      suggestion: 'This might be due to expired credentials or a temporary service outage.',
      actions: [
        {
          id: 'reconnect_marketplace',
          title: 'Reconnect Marketplace',
          description: 'Update your marketplace credentials',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'work_offline',
          title: 'Work with Available Data',
          description: 'Use data from connected marketplaces',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ]
    },

    // Tool Execution Errors
    TOOL_EXECUTION_ERROR: {
      title: 'Feature Temporarily Unavailable',
      message: 'The feature you requested isn\'t working properly right now.',
      suggestion: 'I can try a different approach or help you with something else.',
      actions: [
        {
          id: 'alternative_approach',
          title: 'Try Different Approach',
          description: 'Let me try a different way to help',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'different_feature',
          title: 'Use Different Feature',
          description: 'Try a different type of analysis',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ]
    },

    TOOL_VALIDATION_ERROR: {
      title: 'Invalid Request',
      message: 'I need some additional information to complete your request.',
      suggestion: 'Could you provide more specific details about what you\'re looking for?',
      actions: [
        {
          id: 'provide_details',
          title: 'Provide More Details',
          description: 'Give me more specific information',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'guided_setup',
          title: 'Guided Setup',
          description: 'Let me walk you through the process',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Context and Session Errors
    CONTEXT_ERROR: {
      title: 'Session Issue',
      message: 'I\'m having trouble remembering our conversation context.',
      suggestion: 'Let me start fresh with a clean slate.',
      actions: [
        {
          id: 'restart_conversation',
          title: 'Start Fresh',
          description: 'Begin a new conversation',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'summarize_context',
          title: 'Summarize Previous Discussion',
          description: 'Tell me what we were discussing',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    SESSION_EXPIRED: {
      title: 'Session Expired',
      message: 'Your session has expired for security reasons.',
      suggestion: 'Please start a new conversation, and I\'ll be happy to help you again.',
      actions: [
        {
          id: 'new_session',
          title: 'Start New Session',
          description: 'Begin a fresh conversation',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Network and Performance Errors
    TIMEOUT_ERROR: {
      title: 'Request Timed Out',
      message: 'Your request is taking longer than expected to process.',
      suggestion: 'This might be due to high system load or a complex analysis.',
      actions: [
        {
          id: 'retry_request',
          title: 'Try Again',
          description: 'Retry your request',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true }
        },
        {
          id: 'simplify_request',
          title: 'Simplify Request',
          description: 'Try a simpler version of your request',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    NETWORK_ERROR: {
      title: 'Connection Issue',
      message: 'I\'m having trouble connecting to external services.',
      suggestion: 'This could be a temporary network issue.',
      actions: [
        {
          id: 'retry_later',
          title: 'Try Again Later',
          description: 'Retry in a few minutes',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true }
        },
        {
          id: 'offline_help',
          title: 'Get Offline Help',
          description: 'See what I can help with offline',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Validation and Input Errors
    VALIDATION_ERROR: {
      title: 'Invalid Input',
      message: 'I need some clarification about your request.',
      suggestion: 'Could you provide more specific or complete information?',
      actions: [
        {
          id: 'clarify_request',
          title: 'Clarify Request',
          description: 'Provide more details about what you need',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'example_request',
          title: 'See Examples',
          description: 'Show me examples of what you can help with',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Permission and Access Errors
    UNAUTHORIZED_ERROR: {
      title: 'Access Denied',
      message: 'You don\'t have permission to access this feature.',
      suggestion: 'This might require a different subscription level or additional setup.',
      actions: [
        {
          id: 'check_permissions',
          title: 'Check Permissions',
          description: 'Review your account permissions',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'contact_support',
          title: 'Contact Support',
          description: 'Get help from our support team',
          actionType: 'UPDATE_PROFILE' as any
        }
      ]
    },

    // Configuration and System Errors
    CONFIG_ERROR: {
      title: 'Configuration Issue',
      message: 'There\'s an issue with the system configuration.',
      suggestion: 'This might require administrator attention to resolve.',
      actions: [
        {
          id: 'retry_request',
          title: 'Try Again',
          description: 'Retry your request',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true }
        },
        {
          id: 'contact_support',
          title: 'Contact Support',
          description: 'Get help from our support team',
          actionType: 'UPDATE_PROFILE' as any
        }
      ]
    },

    SYSTEM_OVERLOAD: {
      title: 'System Busy',
      message: 'The system is currently experiencing high load.',
      suggestion: 'Please wait a moment and try again, or try a simpler request.',
      actions: [
        {
          id: 'wait_retry',
          title: 'Wait and Retry',
          description: 'Try again in a few minutes',
          actionType: 'ASK_QUESTION' as any,
          parameters: { retryOriginal: true, delay: 120000 }
        },
        {
          id: 'simpler_request',
          title: 'Simplify Request',
          description: 'Try a less complex request',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    DEPENDENCY_ERROR: {
      title: 'Service Dependency Issue',
      message: 'A required service is currently unavailable.',
      suggestion: 'This is usually temporary. I can help you with other tasks in the meantime.',
      actions: [
        {
          id: 'alternative_task',
          title: 'Try Different Task',
          description: 'Let me help you with something else',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'check_status',
          title: 'Check System Status',
          description: 'View current system status',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ]
    },

    // Data and Content Errors
    DATA_CORRUPTION: {
      title: 'Data Issue Detected',
      message: 'There seems to be an issue with the data for your request.',
      suggestion: 'I can try to refresh the data or help you with a different approach.',
      actions: [
        {
          id: 'refresh_data',
          title: 'Refresh Data',
          description: 'Try to reload the data',
          actionType: 'VIEW_ANALYTICS' as any
        },
        {
          id: 'manual_input',
          title: 'Provide Data Manually',
          description: 'Tell me the information manually',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    CONTENT_NOT_FOUND: {
      title: 'Content Not Available',
      message: 'The specific content or data you\'re looking for isn\'t available right now.',
      suggestion: 'This might be because it hasn\'t been set up yet or needs to be refreshed.',
      actions: [
        {
          id: 'setup_content',
          title: 'Set Up Content',
          description: 'Help me set up the missing information',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'browse_available',
          title: 'Browse Available Content',
          description: 'See what information is available',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ]
    },

    // Security and Permission Errors
    SECURITY_ERROR: {
      title: 'Security Check Failed',
      message: 'A security check prevented this action from completing.',
      suggestion: 'This helps protect your account and data. Please verify your permissions.',
      actions: [
        {
          id: 'verify_permissions',
          title: 'Check Permissions',
          description: 'Review your account permissions',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'contact_admin',
          title: 'Contact Administrator',
          description: 'Get help from your administrator',
          actionType: 'UPDATE_PROFILE' as any
        }
      ]
    },

    RATE_LIMIT_EXCEEDED: {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests in a short time.',
      suggestion: 'Please wait a moment before trying again to help maintain system performance.',
      actions: [
        {
          id: 'wait_cooldown',
          title: 'Wait and Continue',
          description: 'Wait for the cooldown period to end',
          actionType: 'ASK_QUESTION' as any,
          parameters: { delay: 60000 }
        },
        {
          id: 'batch_requests',
          title: 'Combine Requests',
          description: 'Tell me everything you need at once',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    // Integration and External Service Errors
    EXTERNAL_API_ERROR: {
      title: 'External Service Issue',
      message: 'An external service we depend on is having issues.',
      suggestion: 'This is usually temporary. I can work with cached data or try alternative approaches.',
      actions: [
        {
          id: 'use_cached_data',
          title: 'Use Recent Data',
          description: 'Work with recently cached information',
          actionType: 'VIEW_ANALYTICS' as any
        },
        {
          id: 'alternative_source',
          title: 'Try Alternative',
          description: 'Use a different data source or approach',
          actionType: 'ASK_QUESTION' as any
        }
      ]
    },

    INTEGRATION_ERROR: {
      title: 'Integration Problem',
      message: 'There\'s an issue connecting to one of your integrated services.',
      suggestion: 'This might be due to expired credentials or service maintenance.',
      actions: [
        {
          id: 'check_integrations',
          title: 'Check Integrations',
          description: 'Review your service connections',
          actionType: 'UPDATE_PROFILE' as any
        },
        {
          id: 'work_without_integration',
          title: 'Continue Without Integration',
          description: 'Work with available data only',
          actionType: 'VIEW_ANALYTICS' as any
        }
      ]
    },

    // Generic Fallback
    UNKNOWN_ERROR: {
      title: 'Unexpected Issue',
      message: 'Something unexpected happened, but I\'m still here to help.',
      suggestion: 'Let me try to assist you in a different way.',
      actions: [
        {
          id: 'general_help',
          title: 'Get General Help',
          description: 'See what I can help you with',
          actionType: 'ASK_QUESTION' as any
        },
        {
          id: 'report_issue',
          title: 'Report Issue',
          description: 'Let us know about this problem',
          actionType: 'UPDATE_PROFILE' as any
        }
      ]
    }
  };

  /**
   * Get user-friendly message for an error code
   */
  static getMessage(errorCode: string): {
    title: string;
    message: string;
    suggestion: string;
    actions: NextStepAction[];
  } {
    const message = this.messages[errorCode];
    if (!message) {
      const fallback = this.messages.UNKNOWN_ERROR;
      if (!fallback) {
        // Absolute fallback if UNKNOWN_ERROR is somehow missing
        return {
          title: 'Unexpected Issue',
          message: 'Something unexpected happened, but I\'m still here to help.',
          suggestion: 'Let me try to assist you in a different way.',
          actions: []
        };
      }
      return fallback;
    }
    return message;
  }

  /**
   * Get all available error message templates
   */
  static getAllMessages(): typeof UserFriendlyErrorMessages.messages {
    return { ...this.messages };
  }

  /**
   * Register a custom error message template
   */
  static registerMessage(
    errorCode: string,
    template: {
      title: string;
      message: string;
      suggestion: string;
      actions: NextStepAction[];
    }
  ): void {
    this.messages[errorCode] = template;
  }
}

/**
 * Create a user-friendly error message
 */
export function createUserFriendlyMessage(
  errorCode: string,
  customMessage?: string,
  customSuggestion?: string
): {
  title: string;
  message: string;
  suggestion: string;
  actions: NextStepAction[];
} {
  const template = UserFriendlyErrorMessages.getMessage(errorCode);
  
  return {
    title: template.title,
    message: customMessage || template.message,
    suggestion: customSuggestion || template.suggestion,
    actions: template.actions
  };
}

/**
 * Get recovery actions for an error code
 */
export function getRecoveryActions(errorCode: string): NextStepAction[] {
  const template = UserFriendlyErrorMessages.getMessage(errorCode);
  return template.actions;
}

/**
 * Create contextual error message based on user context
 */
export function createContextualErrorMessage(
  errorCode: string,
  context?: {
    userId?: string;
    feature?: string;
    marketplace?: string;
    retryCount?: number;
  }
): {
  title: string;
  message: string;
  suggestion: string;
  actions: NextStepAction[];
} {
  const baseTemplate = UserFriendlyErrorMessages.getMessage(errorCode);
  let message = baseTemplate.message;
  let suggestion = baseTemplate.suggestion;

  // Customize message based on context
  if (context?.retryCount && context.retryCount > 2) {
    message = 'This issue seems to be persistent. ' + message;
    suggestion = 'You might want to try again later or contact support for assistance.';
  }

  if (context?.marketplace) {
    message = message.replace('marketplace', context.marketplace);
  }

  if (context?.feature) {
    message = message.replace('feature', `${context.feature} feature`);
  }

  return {
    title: baseTemplate.title,
    message,
    suggestion,
    actions: baseTemplate.actions
  };
}