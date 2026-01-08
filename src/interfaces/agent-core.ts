// Agent Core interfaces

import {
  AgentCore,
  UserInput,
  AgentResponse,
  WorkflowType,
  WorkflowParameters,
  WorkflowResult,
  AgentError,
  ErrorResponse,
  FlowRouter,
  IntentClassification,
  ConversationFlow,
  FlowParameters,
  FlowResult,
} from '../types/agent';
import { ConversationContext } from '../types/context';

export interface IAgentCore extends AgentCore {
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): AgentStatus;
}

export interface AgentConfig {
  llmProvider: string;
  fallbackProviders: string[];
  maxRetries: number;
  timeout: number;
  enableLogging: boolean;
  workflows: WorkflowConfig[];
}

export interface WorkflowConfig {
  type: WorkflowType;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export interface AgentStatus {
  isRunning: boolean;
  activeWorkflows: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface IFlowRouter extends FlowRouter {
  registerFlow(flow: ConversationFlow): Promise<void>;
  updateFlow(flowId: string, updates: Partial<ConversationFlow>): Promise<void>;
  removeFlow(flowId: string): Promise<void>;
  listFlows(): Promise<ConversationFlow[]>;
}

export interface IWorkflowOrchestrator {
  executeWorkflow(type: WorkflowType, parameters: WorkflowParameters): Promise<WorkflowResult>;

  registerWorkflowHandler(type: WorkflowType, handler: WorkflowHandler): void;

  getWorkflowMetrics(type: WorkflowType): Promise<WorkflowMetrics>;
}

export interface WorkflowHandler {
  execute(parameters: WorkflowParameters): Promise<WorkflowResult>;
  validate(parameters: WorkflowParameters): boolean;
  getRequiredCapabilities(): string[];
}

export interface WorkflowMetrics {
  type: WorkflowType;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecuted: Date;
}

export interface IErrorHandler {
  handleError(error: AgentError, context: ConversationContext): Promise<ErrorResponse>;
  registerErrorHandler(errorCode: string, handler: ErrorHandlerFunction): void;
  getErrorStats(): Promise<ErrorStats>;
}

export type ErrorHandlerFunction = (
  error: AgentError,
  context: ConversationContext
) => Promise<ErrorResponse>;

export interface ErrorStats {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  recoveryRate: number;
  lastError?: AgentError;
}
