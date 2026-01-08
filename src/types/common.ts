// Common types used across the system

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Duration {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  target?: number;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  estimatedTime: Duration;
  dependencies?: string[];
}

export interface Action {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
  description: string;
}

export interface ImpactEstimate {
  revenueImpact?: Money;
  timeToSeeResults: Duration;
  confidenceLevel: number; // 0-1
  riskLevel: RiskLevel;
}
