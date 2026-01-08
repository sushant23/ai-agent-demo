// UI Controller interfaces

import {
  UIController,
  UIActionResult,
  ProductResolution,
  UIState,
  UIStateManager,
  FormData,
} from '../types/ui';

export interface IUIController extends UIController {
  initialize(config: UIControllerConfig): Promise<void>;
  shutdown(): Promise<void>;
  getControllerMetrics(): Promise<UIControllerMetrics>;
}

export interface UIControllerConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableAnalytics: boolean;
}

export interface UIControllerMetrics {
  totalActions: number;
  successRate: number;
  averageResponseTime: number;
  actionsByType: Record<string, number>;
  errorsByType: Record<string, number>;
}

export interface IUINavigator {
  navigate(page: string, parameters?: Record<string, unknown>): Promise<UIActionResult>;
  goBack(): Promise<UIActionResult>;
  goForward(): Promise<UIActionResult>;
  refresh(): Promise<UIActionResult>;
  getCurrentPage(): Promise<string>;
}

export interface IUIDrawerManager {
  openDrawer(drawerId: string, context?: Record<string, unknown>): Promise<UIActionResult>;
  closeDrawer(drawerId: string): Promise<UIActionResult>;
  toggleDrawer(drawerId: string): Promise<UIActionResult>;
  getOpenDrawers(): Promise<string[]>;
}

export interface IUIPanelManager {
  openPanel(panelId: string, context?: Record<string, unknown>): Promise<UIActionResult>;
  closePanel(panelId: string): Promise<UIActionResult>;
  resizePanel(panelId: string, size: PanelSize): Promise<UIActionResult>;
  getOpenPanels(): Promise<string[]>;
}

export interface PanelSize {
  width?: number;
  height?: number;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

export interface IFormManager {
  prefillForm(formId: string, data: Record<string, unknown>): Promise<UIActionResult>;
  submitForm(formId: string): Promise<UIActionResult>;
  validateForm(formId: string): Promise<FormValidationResult>;
  clearForm(formId: string): Promise<UIActionResult>;
  getFormData(formId: string): Promise<FormData>;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  warnings: FormFieldWarning[];
}

export interface FormFieldError {
  fieldName: string;
  message: string;
  code: string;
}

export interface FormFieldWarning {
  fieldName: string;
  message: string;
  suggestion?: string;
}

export interface IProductResolver {
  resolveByName(productName: string): Promise<ProductResolution>;
  resolveById(productId: string): Promise<ProductResolution>;
  resolveBySKU(sku: string): Promise<ProductResolution>;
  searchProducts(query: string, limit?: number): Promise<ProductResolution[]>;
}

export interface IUIStateManager extends UIStateManager {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  persistState(): Promise<void>;
  restoreState(): Promise<void>;
}

export interface IUIAnalytics {
  trackAction(action: UIAnalyticsEvent): Promise<void>;
  trackPageView(page: string, metadata?: Record<string, unknown>): Promise<void>;
  trackError(error: UIError, context?: Record<string, unknown>): Promise<void>;
  getAnalytics(period: DateRange): Promise<UIAnalyticsReport>;
}

export interface UIAnalyticsEvent {
  type: string;
  action: string;
  target: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UIAnalyticsReport {
  period: DateRange;
  totalActions: number;
  uniqueUsers: number;
  popularActions: ActionSummary[];
  errorRate: number;
  averageSessionDuration: number;
}

export interface ActionSummary {
  action: string;
  count: number;
  successRate: number;
  averageTime: number;
}

export interface IUINotificationManager {
  showNotification(notification: UINotification): Promise<void>;
  hideNotification(notificationId: string): Promise<void>;
  clearAllNotifications(): Promise<void>;
  getActiveNotifications(): Promise<UINotification[]>;
}

export interface UINotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => Promise<void>;
  style?: 'primary' | 'secondary' | 'danger';
}

// Import missing types
import { UIError } from '../types/ui';
import { DateRange } from '../types/common';
