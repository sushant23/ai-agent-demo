/**
 * Error Monitoring and Alerting System
 * 
 * Provides real-time monitoring of system errors and alerts
 * for critical issues that require immediate attention.
 */

import { Logger } from '../utils/errors';
import type { ErrorLogEntry, ErrorMetrics } from './global-error-handler';

/**
 * Error alert configuration
 */
export interface ErrorAlert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  actions: AlertAction[];
}

/**
 * Alert condition types
 */
export interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'specific_error' | 'component_failure';
  threshold: number;
  timeWindow: number; // minutes
  errorCode?: string;
  component?: string;
}

/**
 * Alert action types
 */
export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'slack';
  config: Record<string, unknown>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  checkInterval: number; // seconds
  retentionPeriod: number; // days
  alerts: ErrorAlert[];
  dashboardEnabled: boolean;
}

/**
 * Error monitoring class
 */
export class ErrorMonitor {
  private logger: Logger;
  private config: MonitoringConfig;
  private monitoringInterval?: NodeJS.Timeout | null;
  private alertHistory: Map<string, Date[]> = new Map();

  constructor(config: MonitoringConfig) {
    this.logger = new Logger('ErrorMonitor');
    this.config = config;
    
    if (config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start error monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.logger.info('Starting error monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      this.checkAlerts();
    }, this.config.checkInterval * 1000);

    this.logger.info(`Error monitoring started with ${this.config.checkInterval}s interval`);
  }

  /**
   * Stop error monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Error monitoring stopped');
    }
  }

  /**
   * Check all configured alerts
   */
  private async checkAlerts(): Promise<void> {
    try {
      // Get current error metrics (this would come from the global error handler)
      const metrics = await this.getCurrentMetrics();
      
      for (const alert of this.config.alerts) {
        if (!alert.enabled) continue;
        
        // Check cooldown period
        if (this.isInCooldown(alert)) continue;
        
        // Check alert condition
        if (await this.checkAlertCondition(alert, metrics)) {
          await this.triggerAlert(alert, metrics);
        }
      }
    } catch (error) {
      this.logger.error('Error checking alerts', error);
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alert: ErrorAlert): boolean {
    if (!alert.lastTriggered) return false;
    
    const cooldownEnd = new Date(alert.lastTriggered.getTime() + alert.cooldownPeriod * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * Check if alert condition is met
   */
  private async checkAlertCondition(alert: ErrorAlert, metrics: ErrorMetrics): Promise<boolean> {
    const condition = alert.condition;
    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.timeWindow * 60 * 1000);

    switch (condition.type) {
      case 'error_rate':
        return metrics.errorRate > condition.threshold;

      case 'error_count': {
        const recentErrors = metrics.recentErrors.filter(e => e.timestamp > windowStart);
        return recentErrors.length > condition.threshold;
      }

      case 'specific_error': {
        if (!condition.errorCode) return false;
        const specificErrors = metrics.recentErrors.filter(
          e => e.timestamp > windowStart && e.errorCode === condition.errorCode
        );
        return specificErrors.length > condition.threshold;
      }

      case 'component_failure': {
        if (!condition.component) return false;
        const componentErrors = metrics.recentErrors.filter(
          e => e.timestamp > windowStart && e.component === condition.component
        );
        return componentErrors.length > condition.threshold;
      }

      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(alert: ErrorAlert, metrics: ErrorMetrics): Promise<void> {
    this.logger.warn(`Alert triggered: ${alert.name} (${alert.severity})`);
    
    // Update last triggered time
    alert.lastTriggered = new Date();
    
    // Record alert in history
    const history = this.alertHistory.get(alert.id) || [];
    history.push(new Date());
    this.alertHistory.set(alert.id, history);

    // Execute alert actions
    for (const action of alert.actions) {
      try {
        await this.executeAlertAction(action, alert, metrics);
      } catch (error) {
        this.logger.error(`Failed to execute alert action: ${action.type}`, error);
      }
    }
  }

  /**
   * Execute an alert action
   */
  private async executeAlertAction(
    action: AlertAction,
    alert: ErrorAlert,
    metrics: ErrorMetrics
  ): Promise<void> {
    switch (action.type) {
      case 'log':
        this.logger.error(`ALERT: ${alert.name} - ${alert.condition.type} threshold exceeded`, {
          alert: alert.name,
          severity: alert.severity,
          condition: alert.condition,
          currentMetrics: {
            errorRate: metrics.errorRate,
            totalErrors: metrics.totalErrors,
            recentErrorCount: metrics.recentErrors.length
          }
        });
        break;

      case 'email':
        // In a real implementation, this would send an email
        this.logger.info(`Would send email alert: ${alert.name}`, action.config);
        break;

      case 'webhook':
        // In a real implementation, this would call a webhook
        this.logger.info(`Would call webhook for alert: ${alert.name}`, action.config);
        break;

      case 'slack':
        // In a real implementation, this would send a Slack message
        this.logger.info(`Would send Slack alert: ${alert.name}`, action.config);
        break;

      default:
        this.logger.warn(`Unknown alert action type: ${action.type}`);
    }
  }

  /**
   * Get current error metrics from the global error handler
   */
  private async getCurrentMetrics(): Promise<ErrorMetrics> {
    // Import the global error handler to get real metrics
    const { globalErrorHandler } = await import('./global-error-handler');
    return globalErrorHandler.getMetrics();
  }

  /**
   * Add a new alert
   */
  addAlert(alert: ErrorAlert): void {
    const existingIndex = this.config.alerts.findIndex(a => a.id === alert.id);
    if (existingIndex >= 0) {
      this.config.alerts[existingIndex] = alert;
      this.logger.info(`Updated alert: ${alert.name}`);
    } else {
      this.config.alerts.push(alert);
      this.logger.info(`Added new alert: ${alert.name}`);
    }
  }

  /**
   * Remove an alert
   */
  removeAlert(alertId: string): void {
    const index = this.config.alerts.findIndex(a => a.id === alertId);
    if (index >= 0) {
      const alert = this.config.alerts[index];
      this.config.alerts.splice(index, 1);
      this.logger.info(`Removed alert: ${alert?.name || alertId}`);
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(alertId?: string): Map<string, Date[]> {
    if (alertId) {
      const history = this.alertHistory.get(alertId);
      return history ? new Map([[alertId, history]]) : new Map();
    }
    return new Map(this.alertHistory);
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    alertCount: number;
    activeAlerts: number;
    lastCheck: Date;
  } {
    return {
      enabled: this.config.enabled,
      running: !!this.monitoringInterval,
      alertCount: this.config.alerts.length,
      activeAlerts: this.config.alerts.filter(a => a.enabled).length,
      lastCheck: new Date()
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !this.monitoringInterval) {
        this.startMonitoring();
      } else if (!newConfig.enabled && this.monitoringInterval) {
        this.stopMonitoring();
      }
    }
    
    this.logger.info('Monitoring configuration updated');
  }
}

/**
 * Create default monitoring configuration
 */
export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    enabled: true,
    checkInterval: 60, // 1 minute
    retentionPeriod: 7, // 7 days
    dashboardEnabled: true,
    alerts: [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: {
          type: 'error_rate',
          threshold: 10, // 10 errors per minute
          timeWindow: 5
        },
        severity: 'high',
        enabled: true,
        cooldownPeriod: 15, // 15 minutes
        actions: [
          {
            type: 'log',
            config: { level: 'error' }
          }
        ]
      },
      {
        id: 'llm_provider_failures',
        name: 'LLM Provider Failures',
        condition: {
          type: 'specific_error',
          threshold: 5,
          timeWindow: 10,
          errorCode: 'LLM_PROVIDER_ERROR'
        },
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 10,
        actions: [
          {
            type: 'log',
            config: { level: 'error' }
          }
        ]
      },
      {
        id: 'business_data_failures',
        name: 'Business Data Service Failures',
        condition: {
          type: 'component_failure',
          threshold: 3,
          timeWindow: 5,
          component: 'business-data-service'
        },
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 20,
        actions: [
          {
            type: 'log',
            config: { level: 'warn' }
          }
        ]
      }
    ]
  };
}

/**
 * Create error monitor with default configuration
 */
export function createErrorMonitor(config?: Partial<MonitoringConfig>): ErrorMonitor {
  const defaultConfig = createDefaultMonitoringConfig();
  const finalConfig = { ...defaultConfig, ...config };
  return new ErrorMonitor(finalConfig);
}