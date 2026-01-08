// Conversation and response types

export interface NextStepAction {
  id: string;
  title: string;
  description: string;
  actionType: ActionType;
  parameters?: ActionParameters;
}

export enum ActionType {
  ANALYZE_PRODUCT = 'analyze_product',
  VIEW_RECOMMENDATIONS = 'view_recommendations',
  OPEN_SEO_OPTIMIZER = 'open_seo_optimizer',
  CREATE_CAMPAIGN = 'create_campaign',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_INVENTORY = 'manage_inventory',
  UPDATE_PROFILE = 'update_profile',
  ASK_QUESTION = 'ask_question',
}

export interface ActionParameters {
  productId?: string;
  recommendationId?: string;
  analysisType?: string;
  timeframe?: string;
  [key: string]: unknown;
}

export interface UIAction {
  type: UIActionType;
  target: string;
  parameters?: Record<string, unknown>;
}

export enum UIActionType {
  NAVIGATE = 'navigate',
  OPEN_DRAWER = 'open_drawer',
  OPEN_PANEL = 'open_panel',
  PREFILL_FORM = 'prefill_form',
  HIGHLIGHT_ELEMENT = 'highlight_element',
  SHOW_TOOLTIP = 'show_tooltip',
}
