// Agent Core types

import { ConversationContext } from './context';
import { Message, MessageRole } from './llm';
import { NextStepAction, UIAction, ActionType } from './conversation';
import { Recommendation } from './recommendations';

export interface AgentCore {
  processUserInput(input: UserInput, context: ConversationContext): Promise<AgentResponse>;
  executeWorkflow(workflow: WorkflowType, parameters: WorkflowParameters): Promise<WorkflowResult>;
  handleError(error: AgentError, context: ConversationContext): Promise<ErrorResponse>;
}

export interface UserInput {
  content: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  nextStepActions: NextStepAction[];
  uiActions?: UIAction[];
  recommendations?: Recommendation[];
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  processingTime: number;
  provider: string;
  workflow: WorkflowType;
  confidence: number;
  [key: string]: unknown;
}

export enum WorkflowType {
  PROMPT_CHAINING = 'prompt_chaining',
  ROUTING = 'routing',
  PARALLELIZATION = 'parallelization',
  ORCHESTRATOR_WORKERS = 'orchestrator_workers',
  EVALUATOR_OPTIMIZER = 'evaluator_optimizer',
  AUTONOMOUS_AGENT = 'autonomous_agent',
}

export interface WorkflowParameters {
  input: UserInput;
  context: ConversationContext;
  options?: Record<string, unknown>;
}

export interface WorkflowResult {
  response: AgentResponse;
  updatedContext: ConversationContext;
  executionMetadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  steps: WorkflowStep[];
  totalTime: number;
  tokensUsed: number;
  errors?: AgentError[];
}

export interface WorkflowStep {
  id: string;
  type: string;
  startTime: Date;
  endTime: Date;
  result: unknown;
}

export class AgentError extends Error {
  public code: string;
  public details?: Record<string, unknown> | undefined;
  public recoverable: boolean;
  public timestamp: Date;

  constructor(config: {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
    recoverable: boolean;
    timestamp: Date;
  }) {
    super(config.message);
    this.name = 'AgentError';
    this.code = config.code;
    this.details = config.details || undefined;
    this.recoverable = config.recoverable;
    this.timestamp = config.timestamp;
  }
}

export interface ErrorResponse {
  message: string;
  suggestedActions: NextStepAction[];
  fallbackResponse?: AgentResponse | undefined;
  errorCode: string;
}

// Flow Router types
export interface FlowRouter {
  classifyIntent(input: UserInput, context: ConversationContext): Promise<IntentClassification>;
  selectFlow(intent: IntentClassification): ConversationFlow;
  executeFlow(flow: ConversationFlow, parameters: FlowParameters): Promise<FlowResult>;
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  entities: Entity[];
  category: FlowCategory;
}

export interface Entity {
  name: string;
  value: string;
  confidence: number;
}

export enum FlowCategory {
  BUSINESS_PERFORMANCE = 'business_performance',
  PRODUCT_MANAGEMENT = 'product_management',
  MARKETING = 'marketing',
  ACCOUNT_MANAGEMENT = 'account_management',
  GENERAL = 'general',
}

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  category: FlowCategory;
  requiredTools: string[];
  expectedInputs: InputSchema[];
  outputFormat: OutputSchema;
  nextStepActions: NextStepAction[];
}

export interface InputSchema {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface OutputSchema {
  format: string;
  fields: Record<string, unknown>;
}

export interface FlowParameters {
  input: UserInput;
  context: ConversationContext;
  intent: IntentClassification;
}

export interface FlowResult {
  response: AgentResponse;
  flowState: FlowState;
  nextFlow?: string | undefined;
}

export interface FlowState {
  currentStep: string;
  completedSteps: string[];
  variables: Record<string, unknown>;
}

// Re-export ConversationContext for convenience
export { ConversationContext };
