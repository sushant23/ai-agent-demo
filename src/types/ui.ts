// UI Controller types

export interface UIController {
  navigateToPage(page: string, parameters?: Record<string, unknown>): Promise<UIActionResult>;
  openDrawer(drawerId: string, context?: Record<string, unknown>): Promise<UIActionResult>;
  openPanel(panelId: string, context?: Record<string, unknown>): Promise<UIActionResult>;
  prefillForm(formId: string, data: Record<string, unknown>): Promise<UIActionResult>;
  resolveProductByName(productName: string): Promise<ProductResolution>;
}

export interface UIActionResult {
  success: boolean;
  actionId: string;
  error?: UIError;
  metadata?: Record<string, unknown>;
}

export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ProductResolution {
  found: boolean;
  product?: ResolvedProduct;
  alternatives?: ResolvedProduct[];
  confidence: number;
}

export interface ResolvedProduct {
  id: string;
  title: string;
  matchScore: number;
  marketplace: string;
}

// UI Navigation types
export enum UIPage {
  DASHBOARD = 'dashboard',
  PRODUCTS = 'products',
  PRODUCT_DETAIL = 'product_detail',
  ANALYTICS = 'analytics',
  SEO_OPTIMIZER = 'seo_optimizer',
  MARKETING = 'marketing',
  INVENTORY = 'inventory',
  SETTINGS = 'settings',
  RECOMMENDATIONS = 'recommendations',
}

export enum UIDrawer {
  SEO_OPTIMIZATION = 'seo_optimization',
  PRODUCT_EDITOR = 'product_editor',
  CAMPAIGN_CREATOR = 'campaign_creator',
  ANALYTICS_FILTER = 'analytics_filter',
  BULK_EDITOR = 'bulk_editor',
}

export enum UIPanel {
  RECOMMENDATION_DETAIL = 'recommendation_detail',
  PRODUCT_COMPARISON = 'product_comparison',
  PERFORMANCE_CHART = 'performance_chart',
  NOTIFICATION_CENTER = 'notification_center',
  HELP_ASSISTANT = 'help_assistant',
}

// Form pre-population types
export interface FormData {
  formId: string;
  fields: FormField[];
  context?: Record<string, unknown>;
}

export interface FormField {
  name: string;
  value: unknown;
  type: FormFieldType;
  validation?: FieldValidation;
}

export enum FormFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  URL = 'url',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  TEXTAREA = 'textarea',
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

// UI state management
export interface UIState {
  currentPage: UIPage;
  openDrawers: string[];
  openPanels: string[];
  activeProduct?: string;
  selectedItems: string[];
  filters: Record<string, unknown>;
}

export interface UIStateManager {
  getCurrentState(): UIState;
  updateState(updates: Partial<UIState>): Promise<void>;
  subscribeToChanges(callback: (state: UIState) => void): () => void;
}
