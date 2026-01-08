/**
 * Error Handling Tests
 * 
 * Tests for the comprehensive error handling system
 */

import { globalErrorHandler, UserFriendlyErrorMessages, createErrorMonitor } from './index';
import { AppError } from '../utils/errors';

describe('Error Handling System', () => {
  beforeEach(() => {
    // Clear metrics before each test
    globalErrorHandler.clearMetrics();
  });

  describe('Global Error Handler', () => {
    it('should handle LLM provider errors', async () => {
      const error = new AppError('Provider unavailable', 'LLM_PROVIDER_ERROR', 502);
      
      const response = await globalErrorHandler.handleError(error);
      
      expect(response.errorCode).toBe('LLM_PROVIDER_ERROR');
      expect(response.message).toContain('technical difficulties');
      expect(response.suggestedActions).toHaveLength(2);
      expect(response.suggestedActions[0]?.title).toBe('Try Again');
    });

    it('should handle unknown errors with fallback', async () => {
      const error = new Error('Something went wrong');
      
      const response = await globalErrorHandler.handleError(error);
      
      expect(response.errorCode).toBe('UNKNOWN_ERROR');
      expect(response.message).toContain('unexpected issue');
      expect(response.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should record error metrics', async () => {
      const error = new AppError('Test error', 'TEST_ERROR', 500);
      
      await globalErrorHandler.handleError(error, undefined, {
        component: 'test-component'
      });
      
      const metrics = globalErrorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.errorsByType.get('TEST_ERROR')).toBe(1);
      expect(metrics.errorsByComponent.get('test-component')).toBe(1);
    });

    it('should provide health status', () => {
      const health = globalErrorHandler.getHealthStatus();
      
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('totalErrors');
      expect(health).toHaveProperty('recentErrorCount');
    });
  });

  describe('User Friendly Messages', () => {
    it('should provide user-friendly messages for known error codes', () => {
      const message = UserFriendlyErrorMessages.getMessage('LLM_PROVIDER_ERROR');
      
      expect(message.title).toBe('AI Service Temporarily Unavailable');
      expect(message.message).toContain('connecting to my AI processing service');
      expect(message.actions).toHaveLength(2);
    });

    it('should fallback to unknown error for unrecognized codes', () => {
      const message = UserFriendlyErrorMessages.getMessage('NONEXISTENT_ERROR');
      
      expect(message.title).toBe('Unexpected Issue');
      expect(message.message).toContain('unexpected happened');
    });

    it('should allow custom message registration', () => {
      UserFriendlyErrorMessages.registerMessage('CUSTOM_ERROR', {
        title: 'Custom Error',
        message: 'This is a custom error message',
        suggestion: 'Try something else',
        actions: []
      });
      
      const message = UserFriendlyErrorMessages.getMessage('CUSTOM_ERROR');
      expect(message.title).toBe('Custom Error');
      expect(message.message).toBe('This is a custom error message');
    });
  });

  describe('Error Monitor', () => {
    it('should create error monitor with default config', () => {
      const monitor = createErrorMonitor();
      const status = monitor.getStatus();
      
      expect(status.enabled).toBe(true);
      expect(status.alertCount).toBeGreaterThan(0);
    });

    it('should start and stop monitoring', () => {
      const monitor = createErrorMonitor({ enabled: false });
      
      expect(monitor.getStatus().running).toBe(false);
      
      monitor.startMonitoring();
      expect(monitor.getStatus().running).toBe(true);
      
      monitor.stopMonitoring();
      expect(monitor.getStatus().running).toBe(false);
    });

    it('should manage alerts', () => {
      const monitor = createErrorMonitor();
      
      const customAlert = {
        id: 'test_alert',
        name: 'Test Alert',
        condition: {
          type: 'error_rate' as const,
          threshold: 5,
          timeWindow: 10
        },
        severity: 'medium' as const,
        enabled: true,
        cooldownPeriod: 15,
        actions: []
      };
      
      monitor.addAlert(customAlert);
      const status = monitor.getStatus();
      expect(status.alertCount).toBeGreaterThan(3); // Default alerts + custom
      
      monitor.removeAlert('test_alert');
      const newStatus = monitor.getStatus();
      expect(newStatus.alertCount).toBe(status.alertCount - 1);
    });
  });

  describe('Integration', () => {
    it('should handle errors end-to-end', async () => {
      // Create a monitor
      const monitor = createErrorMonitor({ enabled: true, checkInterval: 1 });
      
      // Trigger an error
      const error = new AppError('Integration test error', 'INTEGRATION_TEST_ERROR', 500);
      const response = await globalErrorHandler.handleError(error, undefined, {
        component: 'integration-test'
      });
      
      // Verify error was handled
      expect(response.errorCode).toBe('UNKNOWN_ERROR'); // Falls back since no handler registered
      expect(response.message).toContain('unexpected issue');
      
      // Verify metrics were recorded
      const metrics = globalErrorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      
      // Verify health status reflects the error
      const health = globalErrorHandler.getHealthStatus();
      expect(health.totalErrors).toBe(1);
      
      // Clean up
      monitor.stopMonitoring();
    });
  });
});