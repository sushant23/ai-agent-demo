// Context Management types

import { Message } from './llm';
import { BusinessDataSnapshot } from './business';
import { Recommendation } from './recommendations';

export interface ContextManager {
  getContext(userId: string, sessionId: string): Promise<ConversationContext>;
  updateContext(context: ConversationContext): Promise<void>;
  clearContext(userId: string, sessionId?: string): Promise<void>;
  persistRecommendations(recommendations: Recommendation[]): Promise<void>;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  activeProduct?: string;
  activeRecommendation?: string;
  currentFlow?: string;
  businessData: BusinessDataSnapshot;
  recommendations: Map<string, Recommendation[]>;
  conversationHistory: Message[];
  flowState?: FlowContextState;
  userPreferences: UserPreferences;
  lastUpdated: Date;
}

export interface FlowContextState {
  flowId: string;
  currentStep: string;
  completedSteps: string[];
  variables: Record<string, unknown>;
  startTime: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  notificationSettings: NotificationSettings;
  displaySettings: DisplaySettings;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showAdvancedMetrics: boolean;
}

// Context persistence and caching
export interface ContextStorage {
  save(context: ConversationContext): Promise<void>;
  load(userId: string, sessionId: string): Promise<ConversationContext | null>;
  delete(userId: string, sessionId?: string): Promise<void>;
  cleanup(olderThan: Date): Promise<number>;
}

export interface ContextCache {
  get(key: string): ConversationContext | null;
  set(key: string, context: ConversationContext, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface ContextRefreshConfig {
  businessDataTTL: number; // seconds
  recommendationsTTL: number;
  conversationHistoryLimit: number;
  autoRefreshEnabled: boolean;
}
