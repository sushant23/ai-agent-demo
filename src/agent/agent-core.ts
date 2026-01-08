// Agent Core implementation with workflow patterns

import {
  AgentCore,
  UserInput,
  ConversationContext,
  AgentResponse,
  WorkflowType,
  WorkflowParameters,
  WorkflowResult,
  AgentError,
  ErrorResponse,
  ExecutionMetadata,
  WorkflowStep,
} from '../types/agent';
import { 
  IAgentCore, 
  AgentConfig, 
  AgentStatus, 
  WorkflowMetrics 
} from '../interfaces/agent-core';
import { FlowRouterImpl } from '../flow/flow-router';
import { ILLMProviderRegistry } from '../interfaces/llm-abstraction';
import { IContextManager } from '../interfaces/context-manager';
import { IToolRegistry } from '../interfaces/tool-registry';
import { TextGenerationRequest, ToolGenerationRequest, ToolDefinition, MessageRole } from '../types/llm';
import { NextStepAction, ActionType } from '../types/conversation';
import { BusinessTool, ToolCategory } from '../types/tools';

export class AgentCoreImpl implements IAgentCore {
  private workflowHandlers: Map<WorkflowType, WorkflowHandler> = new Map();
  private config: AgentConfig | null = null;
  private status: AgentStatus = {
    isRunning: false,
    activeWorkflows: 0,
    totalRequests: 0,
    errorRate: 0,
    averageResponseTime: 0,
  };
  private workflowMetrics: Map<WorkflowType, WorkflowMetrics> = new Map();
  private logger = console; // Simple logger for now

  constructor(
    private flowRouter: FlowRouterImpl,
    private llmRegistry: ILLMProviderRegistry,
    private contextManager: IContextManager,
    private toolRegistry: IToolRegistry
  ) {
    this.initializeWorkflowHandlers();
  }

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
    this.status.isRunning = true;
    
    // Initialize workflow metrics
    config.workflows.forEach(workflowConfig => {
      if (workflowConfig.enabled) {
        this.workflowMetrics.set(workflowConfig.type, {
          type: workflowConfig.type,
          executionCount: 0,
          averageExecutionTime: 0,
          successRate: 1.0,
          lastExecuted: new Date(),
        });
      }
    });
  }

  async shutdown(): Promise<void> {
    this.status.isRunning = false;
    this.status.activeWorkflows = 0;
  }

  getStatus(): AgentStatus {
    return { ...this.status };
  }

  registerWorkflowHandler(type: WorkflowType, handler: WorkflowHandler): void {
    this.workflowHandlers.set(type, handler);
  }

  async getWorkflowMetrics(type: WorkflowType): Promise<WorkflowMetrics> {
    const metrics = this.workflowMetrics.get(type);
    if (!metrics) {
      throw new AgentError({
        code: 'WORKFLOW_METRICS_NOT_FOUND',
        message: `No metrics found for workflow type: ${type}`,
        details: { type },
        recoverable: false,
        timestamp: new Date(),
      });
    }
    return { ...metrics };
  }

  async processUserInput(
    input: UserInput,
    context: ConversationContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    this.status.totalRequests++;
    
    console.log(`🎤 Processing user input: "${input.content}"`);
    
    try {
      // Step 1: Classify intent and select flow
      const intent = await this.flowRouter.classifyIntent(input, context);
      const flow = this.flowRouter.selectFlow(intent);
      
      console.log(`🎯 Intent: ${intent.intent}, Confidence: ${intent.confidence}`);
      console.log(`🌊 Selected flow: ${flow.name}`);
      
      // Step 2: Determine appropriate workflow pattern
      const workflowType = this.selectWorkflowType(intent, context);
      console.log(`⚙️ Workflow type: ${workflowType}`);
      
      // Step 3: Execute workflow
      const workflowParams: WorkflowParameters = {
        input,
        context,
        options: {
          flow,
          intent,
        },
      };
      
      this.status.activeWorkflows++;
      const workflowResult = await this.executeWorkflow(workflowType, workflowParams);
      this.status.activeWorkflows--;
      
      // Step 4: Update context
      await this.contextManager.updateContext(workflowResult.updatedContext);
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(processingTime);
      
      return workflowResult.response;
    } catch (error) {
      this.status.activeWorkflows = Math.max(0, this.status.activeWorkflows - 1);
      this.updateErrorRate();
      
      const errorResponse = await this.handleError(
        error instanceof AgentError ? error : this.createAgentError(error),
        context
      );
      
      return errorResponse.fallbackResponse || this.createFallbackResponse(input);
    }
  }

  async executeWorkflow(
    workflow: WorkflowType,
    parameters: WorkflowParameters
  ): Promise<WorkflowResult> {
    const handler = this.workflowHandlers.get(workflow);
    if (!handler) {
      throw new AgentError({
        code: 'WORKFLOW_NOT_FOUND',
        message: `No handler found for workflow type: ${workflow}`,
        details: { workflow, availableWorkflows: Array.from(this.workflowHandlers.keys()) },
        recoverable: true,
        timestamp: new Date(),
      });
    }

    const startTime = Date.now();
    const steps: WorkflowStep[] = [];
    
    try {
      // Validate parameters
      if (!handler.validate(parameters)) {
        throw new AgentError({
          code: 'INVALID_WORKFLOW_PARAMETERS',
          message: 'Workflow parameters validation failed',
          details: { workflow, parameters },
          recoverable: true,
          timestamp: new Date(),
        });
      }

      // Execute workflow
      const result = await handler.execute(parameters);
      
      // Update workflow metrics
      const executionTime = Date.now() - startTime;
      this.updateWorkflowMetrics(workflow, executionTime, true);
      
      const executionMetadata: ExecutionMetadata = {
        steps,
        totalTime: executionTime,
        tokensUsed: 0, // Would be calculated from LLM responses
        errors: [],
      };

      return {
        ...result,
        executionMetadata,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateWorkflowMetrics(workflow, executionTime, false);
      
      const agentError = error instanceof AgentError ? error : this.createAgentError(error);
      
      const executionMetadata: ExecutionMetadata = {
        steps,
        totalTime: executionTime,
        tokensUsed: 0,
        errors: [agentError],
      };

      throw new AgentError({
        code: 'WORKFLOW_EXECUTION_FAILED',
        message: `Workflow ${workflow} execution failed: ${agentError.message}`,
        details: { workflow, originalError: agentError, executionMetadata },
        recoverable: agentError.recoverable,
        timestamp: new Date(),
      });
    }
  }

  async handleError(error: AgentError, context: ConversationContext): Promise<ErrorResponse> {
    const suggestedActions: NextStepAction[] = [];
    
    // Generate context-appropriate error recovery actions
    switch (error.code) {
      case 'LLM_PROVIDER_UNAVAILABLE':
        suggestedActions.push({
          id: 'retry_request',
          title: 'Try again',
          description: 'Retry your request with a different approach',
          actionType: ActionType.ASK_QUESTION,
        });
        break;
        
      case 'TOOL_EXECUTION_FAILED':
        suggestedActions.push({
          id: 'manual_alternative',
          title: 'Manual approach',
          description: 'Let me help you accomplish this manually',
          actionType: ActionType.ASK_QUESTION,
        });
        break;
        
      case 'CONTEXT_UNAVAILABLE':
        suggestedActions.push({
          id: 'provide_context',
          title: 'Provide more details',
          description: 'Share more information about what you need',
          actionType: ActionType.ASK_QUESTION,
        });
        break;
        
      default:
        suggestedActions.push({
          id: 'general_help',
          title: 'Get help',
          description: 'Let me know how I can assist you differently',
          actionType: ActionType.ASK_QUESTION,
        });
    }

    // Create fallback response if possible
    let fallbackResponse: AgentResponse | undefined;
    if (error.recoverable) {
      fallbackResponse = await this.createGracefulFallbackResponse(error, context);
    }

    return {
      message: this.getUserFriendlyErrorMessage(error),
      suggestedActions,
      fallbackResponse: fallbackResponse || undefined,
      errorCode: error.code,
    };
  }

  private initializeWorkflowHandlers(): void {
    // Prompt Chaining Handler
    this.workflowHandlers.set(WorkflowType.PROMPT_CHAINING, {
      validate: (params) => !!params.input && !!params.context,
      execute: async (params) => this.executePromptChaining(params),
      getRequiredCapabilities: () => ['text_generation'],
    });

    // Routing Handler
    this.workflowHandlers.set(WorkflowType.ROUTING, {
      validate: (params) => !!params.input && !!params.context,
      execute: async (params) => this.executeRouting(params),
      getRequiredCapabilities: () => ['intent_classification'],
    });

    // Parallelization Handler
    this.workflowHandlers.set(WorkflowType.PARALLELIZATION, {
      validate: (params) => !!params.input && !!params.context,
      execute: async (params) => this.executeParallelization(params),
      getRequiredCapabilities: () => ['concurrent_execution'],
    });

    // Orchestrator-Workers Handler
    this.workflowHandlers.set(WorkflowType.ORCHESTRATOR_WORKERS, {
      validate: (params) => !!params.input && !!params.context,
      execute: async (params) => this.executeOrchestratorWorkers(params),
      getRequiredCapabilities: () => ['task_delegation', 'result_aggregation'],
    });

    // Evaluator-Optimizer Handler
    this.workflowHandlers.set(WorkflowType.EVALUATOR_OPTIMIZER, {
      validate: (params) => !!params.input && !!params.context,
      execute: async (params) => this.executeEvaluatorOptimizer(params),
      getRequiredCapabilities: () => ['response_evaluation', 'iterative_improvement'],
    });
  }

  private async executePromptChaining(params: WorkflowParameters): Promise<WorkflowResult> {
    // Decompose complex task into sequential steps
    const steps = await this.decomposeTask(params.input.content);
    let currentContext = params.context;
    let finalResponse: AgentResponse | null = null;

    for (const step of steps) {
      const stepResponse = await this.executeStep(step, currentContext);
      finalResponse = stepResponse;
      
      // Update context with step results
      currentContext = {
        ...currentContext,
        conversationHistory: [
          ...currentContext.conversationHistory,
          {
            id: `step-${Date.now()}`,
            role: MessageRole.ASSISTANT,
            content: stepResponse.content,
            timestamp: new Date(),
          },
        ],
      };
    }

    return {
      response: finalResponse || this.createFallbackResponse({ content: 'No steps completed' } as UserInput),
      updatedContext: currentContext,
      executionMetadata: {
        steps: [],
        totalTime: 0,
        tokensUsed: 0,
      },
    };
  }

  private async executeRouting(params: WorkflowParameters): Promise<WorkflowResult> {
    console.log(`🌊 Executing routing workflow`);
    
    // Use flow router to handle the request
    const intent = await this.flowRouter.classifyIntent(params.input, params.context);
    const flow = this.flowRouter.selectFlow(intent);
    
    console.log(`🎯 Flow selected: ${flow.name}`);
    
    // Get available tools and check if we should use them
    const availableTools = await this.getAvailableToolsForContext(params.context);
    const shouldUseTools = this.shouldUseToolsForStep(params.input.content, availableTools);
    
    console.log(`🔧 Available tools: ${availableTools.length}, Should use: ${shouldUseTools}`);
    
    if (shouldUseTools && availableTools.length > 0) {
      // Use tools for this request
      const response = await this.executeStepWithTools(params.input.content, params.context, availableTools);
      
      return {
        response,
        updatedContext: params.context,
        executionMetadata: {
          steps: [],
          totalTime: 0,
          tokensUsed: 0,
        },
      };
    } else {
      // Use regular flow execution
      const flowResult = await this.flowRouter.executeFlow(flow, {
        input: params.input,
        context: params.context,
        intent,
      });

      return {
        response: flowResult.response,
        updatedContext: params.context,
        executionMetadata: {
          steps: [],
          totalTime: 0,
          tokensUsed: 0,
        },
      };
    }
  }

  private async executeParallelization(params: WorkflowParameters): Promise<WorkflowResult> {
    // Execute multiple subtasks simultaneously
    const subtasks = await this.identifyParallelSubtasks(params.input.content);
    
    const subtaskPromises = subtasks.map(subtask => 
      this.executeSubtask(subtask, params.context)
    );
    
    const subtaskResults = await Promise.allSettled(subtaskPromises);
    const successfulResults = subtaskResults
      .filter((result): result is PromiseFulfilledResult<AgentResponse> => result.status === 'fulfilled')
      .map(result => result.value);

    // Aggregate results
    const aggregatedResponse = await this.aggregateResponses(successfulResults);

    return {
      response: aggregatedResponse,
      updatedContext: params.context,
      executionMetadata: {
        steps: [],
        totalTime: 0,
        tokensUsed: 0,
      },
    };
  }

  private async executeOrchestratorWorkers(params: WorkflowParameters): Promise<WorkflowResult> {
    // Dynamically delegate tasks to specialized workers
    const taskAnalysis = await this.analyzeTaskComplexity(params.input.content);
    const workers = await this.selectWorkers(taskAnalysis);
    
    const workerResults = await Promise.all(
      workers.map(worker => this.delegateToWorker(worker, params))
    );
    
    const orchestratedResponse = await this.orchestrateResults(workerResults);

    return {
      response: orchestratedResponse,
      updatedContext: params.context,
      executionMetadata: {
        steps: [],
        totalTime: 0,
        tokensUsed: 0,
      },
    };
  }

  private async executeEvaluatorOptimizer(params: WorkflowParameters): Promise<WorkflowResult> {
    // Iteratively improve responses through feedback loops
    let currentResponse = await this.generateInitialResponse(params);
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      const evaluation = await this.evaluateResponse(currentResponse, params);
      
      if (evaluation.score >= 0.8) {
        break; // Good enough
      }
      
      currentResponse = await this.optimizeResponse(currentResponse, evaluation, params);
      iterations++;
    }

    return {
      response: currentResponse,
      updatedContext: params.context,
      executionMetadata: {
        steps: [],
        totalTime: 0,
        tokensUsed: 0,
      },
    };
  }

  // Helper methods for workflow patterns
  private async decomposeTask(task: string): Promise<string[]> {
    // Use LLM to break down complex tasks into sequential steps
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      // Fallback to simple decomposition
      return [task];
    }

    const request: TextGenerationRequest = {
      messages: [
        {
          id: `system-${Date.now()}`,
          role: MessageRole.SYSTEM,
          content: 'Break down this complex task into 2-4 sequential steps. Return each step on a new line.',
          timestamp: new Date(),
        },
        {
          id: `user-${Date.now()}`,
          role: MessageRole.USER,
          content: `Task: ${task}`,
          timestamp: new Date(),
        },
      ],
    };

    try {
      const response = await provider.generateText(request);
      const steps = response.content.split('\n').filter(step => step.trim().length > 0);
      return steps.length > 1 ? steps : [task];
    } catch {
      return [task];
    }
  }

  private async executeStep(step: string, context: ConversationContext): Promise<AgentResponse> {
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      throw new AgentError({
        code: 'LLM_PROVIDER_UNAVAILABLE',
        message: 'No LLM provider available for step execution',
        details: { step },
        recoverable: true,
        timestamp: new Date(),
      });
    }

    // Get available tools and convert to LLM format
    const availableTools = await this.getAvailableToolsForContext(context);
    const toolDefinitions = this.convertBusinessToolsToLLMFormat(availableTools);

    // Decide whether to use tools based on step content and available tools
    const shouldUseTools = this.shouldUseToolsForStep(step, availableTools);

    console.log(`🤖 Agent Core: Processing step "${step.substring(0, 50)}..."`);
    console.log(`🔧 Available tools: ${availableTools.length}`);
    console.log(`🎯 Should use tools: ${shouldUseTools}`);
    console.log(`⚡ Provider supports tools: ${provider.capabilities.supportsTools}`);

    let response;
    if (shouldUseTools && toolDefinitions.length > 0 && provider.capabilities.supportsTools) {
      // Use generateWithTools when tools are available and relevant
      const toolRequest: ToolGenerationRequest = {
        messages: [
          {
            id: `system-${Date.now()}`,
            role: MessageRole.SYSTEM,
            content: 'You are a helpful business assistant. Use the available tools when they can help answer the user\'s request. Execute this step clearly and provide 2-4 specific next actions.',
            timestamp: new Date(),
          },
          ...context.conversationHistory.slice(-3), // Include recent context
          {
            id: `user-${Date.now()}`,
            role: MessageRole.USER,
            content: step,
            timestamp: new Date(),
          },
        ],
        tools: toolDefinitions,
        toolChoice: 'auto',
      };

      const toolResponse = await provider.generateWithTools(toolRequest);
      
      // Handle tool calls if any were made
      if (toolResponse.toolCalls && toolResponse.toolCalls.length > 0) {
        const toolResults = await this.executeToolCalls(toolResponse.toolCalls);
        
        // Create a follow-up request with tool results
        const followUpRequest: TextGenerationRequest = {
          messages: [
            ...toolRequest.messages,
            {
              id: `assistant-${Date.now()}`,
              role: MessageRole.ASSISTANT,
              content: toolResponse.content,
              timestamp: new Date(),
              metadata: { toolCalls: toolResponse.toolCalls },
            },
            ...toolResults.map((result, index) => ({
              id: `tool-${Date.now()}-${index}`,
              role: MessageRole.TOOL,
              content: JSON.stringify(result),
              timestamp: new Date(),
            })),
            {
              id: `user-followup-${Date.now()}`,
              role: MessageRole.USER,
              content: 'Based on the tool results above, provide a comprehensive response to the user.',
              timestamp: new Date(),
            },
          ],
        };

        response = await provider.generateText(followUpRequest);
      } else {
        response = toolResponse;
      }
    } else {
      // Use regular text generation when tools aren't needed or available
      const request: TextGenerationRequest = {
        messages: [
          {
            id: `system-${Date.now()}`,
            role: MessageRole.SYSTEM,
            content: 'You are a helpful business assistant. Execute this step clearly and provide 2-4 specific next actions.',
            timestamp: new Date(),
          },
          ...context.conversationHistory.slice(-3), // Include recent context
          {
            id: `user-${Date.now()}`,
            role: MessageRole.USER,
            content: step,
            timestamp: new Date(),
          },
        ],
      };

      response = await provider.generateText(request);
    }
    
    // Generate contextual next step actions
    const nextStepActions = await this.generateNextStepActions(step, context);
    
    return {
      content: response.content,
      nextStepActions,
      metadata: {
        processingTime: 0,
        provider: provider.name,
        workflow: WorkflowType.PROMPT_CHAINING,
        confidence: 0.8,
        toolsUsed: shouldUseTools && toolDefinitions.length > 0,
      },
    };
  }

  private async executeStepWithTools(step: string, context: ConversationContext, availableTools: BusinessTool[]): Promise<AgentResponse> {
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      throw new AgentError({
        code: 'LLM_PROVIDER_UNAVAILABLE',
        message: 'No LLM provider available for step execution',
        details: { step },
        recoverable: true,
        timestamp: new Date(),
      });
    }

    const toolDefinitions = this.convertBusinessToolsToLLMFormat(availableTools);

    console.log(`🔧 Executing step with ${toolDefinitions.length} tools available`);

    // Use generateWithTools when tools are available and relevant
    const toolRequest: ToolGenerationRequest = {
      messages: [
        {
          id: `system-${Date.now()}`,
          role: MessageRole.SYSTEM,
          content: 'You are a helpful business assistant. Use the available tools when they can help answer the user\'s request. Provide a comprehensive response and 2-4 specific next actions.',
          timestamp: new Date(),
        },
        ...context.conversationHistory.slice(-3), // Include recent context
        {
          id: `user-${Date.now()}`,
          role: MessageRole.USER,
          content: step,
          timestamp: new Date(),
        },
      ],
      tools: toolDefinitions,
      toolChoice: 'auto',
    };

    const toolResponse = await provider.generateWithTools(toolRequest);
    
    // Handle tool calls if any were made
    if (toolResponse.toolCalls && toolResponse.toolCalls.length > 0) {
      console.log(`🛠️ Executing ${toolResponse.toolCalls.length} tool calls`);
      const toolResults = await this.executeToolCalls(toolResponse.toolCalls);
      
      // Create a follow-up request with tool results
      const followUpRequest: TextGenerationRequest = {
        messages: [
          ...toolRequest.messages,
          {
            id: `assistant-${Date.now()}`,
            role: MessageRole.ASSISTANT,
            content: toolResponse.content,
            timestamp: new Date(),
            metadata: { toolCalls: toolResponse.toolCalls },
          },
          ...toolResults.map((result, index) => ({
            id: `tool-${Date.now()}-${index}`,
            role: MessageRole.TOOL,
            content: JSON.stringify(result),
            timestamp: new Date(),
          })),
          {
            id: `user-followup-${Date.now()}`,
            role: MessageRole.USER,
            content: 'Based on the tool results above, provide a comprehensive response to the user.',
            timestamp: new Date(),
          },
        ],
      };

      const finalResponse = await provider.generateText(followUpRequest);
      
      // Generate contextual next step actions
      const nextStepActions = await this.generateNextStepActions(step, context);
      
      return {
        content: finalResponse.content,
        nextStepActions,
        metadata: {
          processingTime: 0,
          provider: provider.name,
          workflow: WorkflowType.ROUTING,
          confidence: 0.8,
          toolsUsed: true,
          toolCallsExecuted: toolResponse.toolCalls.length,
        },
      };
    } else {
      console.log(`📝 No tool calls made, using direct response`);
      
      // Generate contextual next step actions
      const nextStepActions = await this.generateNextStepActions(step, context);
      
      return {
        content: toolResponse.content,
        nextStepActions,
        metadata: {
          processingTime: 0,
          provider: provider.name,
          workflow: WorkflowType.ROUTING,
          confidence: 0.8,
          toolsUsed: true,
          toolCallsExecuted: 0,
        },
      };
    }
  }

  private async identifyParallelSubtasks(task: string): Promise<string[]> {
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      return [task];
    }

    const request: TextGenerationRequest = {
      messages: [
        {
          id: `system-${Date.now()}`,
          role: MessageRole.SYSTEM,
          content: 'Identify independent subtasks that can be executed in parallel. Return each subtask on a new line.',
          timestamp: new Date(),
        },
        {
          id: `user-${Date.now()}`,
          role: MessageRole.USER,
          content: `Task: ${task}`,
          timestamp: new Date(),
        },
      ],
    };

    try {
      const response = await provider.generateText(request);
      const subtasks = response.content.split('\n').filter(subtask => subtask.trim().length > 0);
      return subtasks.length > 1 ? subtasks : [task];
    } catch {
      return [task];
    }
  }

  private async executeSubtask(subtask: string, context: ConversationContext): Promise<AgentResponse> {
    return this.executeStep(subtask, context);
  }

  private async aggregateResponses(responses: AgentResponse[]): Promise<AgentResponse> {
    if (responses.length === 0) {
      throw new AgentError({
        code: 'NO_RESPONSES_TO_AGGREGATE',
        message: 'No responses available for aggregation',
        details: {},
        recoverable: false,
        timestamp: new Date(),
      });
    }

    if (responses.length === 1) {
      return responses[0]!;
    }

    const combinedContent = responses.map((r, i) => `${i + 1}. ${r.content}`).join('\n\n');
    const allActions = responses.flatMap(r => r.nextStepActions);
    
    // Remove duplicate actions and limit to 4
    const uniqueActions = allActions.filter((action, index, self) => 
      index === self.findIndex(a => a.id === action.id)
    ).slice(0, 4);
    
    return {
      content: combinedContent,
      nextStepActions: uniqueActions,
      metadata: {
        processingTime: Math.max(...responses.map(r => r.metadata.processingTime)),
        provider: 'aggregated',
        workflow: WorkflowType.PARALLELIZATION,
        confidence: responses.reduce((sum, r) => sum + r.metadata.confidence, 0) / responses.length,
      },
    };
  }

  private async analyzeTaskComplexity(task: string): Promise<TaskAnalysis> {
    // Simple heuristic-based analysis
    const wordCount = task.split(' ').length;
    const hasMultipleQuestions = (task.match(/\?/g) || []).length > 1;
    const hasConjunctions = /\b(and|or|but|also|additionally)\b/i.test(task);
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    let requiredCapabilities = ['text_generation'];
    
    if (wordCount > 20 || hasMultipleQuestions || hasConjunctions) {
      complexity = 'medium';
      requiredCapabilities.push('task_decomposition');
    }
    
    if (wordCount > 50 || hasMultipleQuestions && hasConjunctions) {
      complexity = 'high';
      requiredCapabilities.push('parallel_processing', 'result_synthesis');
    }
    
    return {
      complexity,
      requiredCapabilities,
      estimatedTime: complexity === 'low' ? 1000 : complexity === 'medium' ? 3000 : 5000,
    };
  }

  private async selectWorkers(analysis: TaskAnalysis): Promise<Worker[]> {
    const workers: Worker[] = [];
    
    // Always include a general worker
    workers.push({
      id: 'general_worker',
      capabilities: ['text_generation', 'general_assistance'],
      specialization: 'general',
    });
    
    // Add specialized workers based on complexity
    if (analysis.complexity === 'high') {
      workers.push({
        id: 'analysis_worker',
        capabilities: ['data_analysis', 'business_insights'],
        specialization: 'analysis',
      });
      
      workers.push({
        id: 'synthesis_worker',
        capabilities: ['result_synthesis', 'report_generation'],
        specialization: 'synthesis',
      });
    }
    
    return workers;
  }

  private async delegateToWorker(worker: Worker, params: WorkflowParameters): Promise<AgentResponse> {
    // Customize the task based on worker specialization
    let specializedTask = params.input.content;
    
    switch (worker.specialization) {
      case 'analysis':
        specializedTask = `Analyze the following request and provide data-driven insights: ${params.input.content}`;
        break;
      case 'synthesis':
        specializedTask = `Synthesize and summarize the following request: ${params.input.content}`;
        break;
      default:
        // Keep original task for general workers
        break;
    }
    
    return this.executeStep(specializedTask, params.context);
  }

  private async orchestrateResults(results: AgentResponse[]): Promise<AgentResponse> {
    if (results.length === 1) {
      return results[0]!;
    }
    
    // Use LLM to orchestrate and synthesize results
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      return this.aggregateResponses(results);
    }
    
    const combinedResults = results.map((r, i) => `Worker ${i + 1}: ${r.content}`).join('\n\n');
    
    const request: TextGenerationRequest = {
      messages: [
        {
          id: `system-${Date.now()}`,
          role: MessageRole.SYSTEM,
          content: 'Synthesize these worker results into a coherent, comprehensive response.',
          timestamp: new Date(),
        },
        {
          id: `user-${Date.now()}`,
          role: MessageRole.USER,
          content: combinedResults,
          timestamp: new Date(),
        },
      ],
    };
    
    try {
      const response = await provider.generateText(request);
      const nextStepActions = await this.generateNextStepActions(response.content, {
        userId: '',
        sessionId: '',
        conversationHistory: [],
        businessData: {} as any,
        recommendations: new Map(),
        lastUpdated: new Date(),
        userPreferences: {
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          notificationSettings: {
            emailEnabled: true,
            pushEnabled: false,
            smsEnabled: false,
            frequency: 'daily' as const,
          },
          displaySettings: {
            theme: 'light' as const,
            compactMode: false,
            showAdvancedMetrics: true,
          },
        },
      });
      
      return {
        content: response.content,
        nextStepActions,
        metadata: {
          processingTime: Math.max(...results.map(r => r.metadata.processingTime)),
          provider: provider.name,
          workflow: WorkflowType.ORCHESTRATOR_WORKERS,
          confidence: 0.85,
        },
      };
    } catch {
      return this.aggregateResponses(results);
    }
  }

  private async generateInitialResponse(params: WorkflowParameters): Promise<AgentResponse> {
    return this.executeStep(params.input.content, params.context);
  }

  private async evaluateResponse(response: AgentResponse, params: WorkflowParameters): Promise<ResponseEvaluation> {
    // Simple evaluation based on response characteristics
    let score = 0.5; // Base score
    const feedback: string[] = [];
    const improvementAreas: string[] = [];
    
    // Check response length (not too short, not too long)
    if (response.content.length < 50) {
      score -= 0.2;
      improvementAreas.push('response_length');
      feedback.push('Response is too brief');
    } else if (response.content.length > 1000) {
      score -= 0.1;
      improvementAreas.push('response_conciseness');
      feedback.push('Response could be more concise');
    } else {
      score += 0.2;
    }
    
    // Check if response has next step actions
    if (response.nextStepActions.length === 0) {
      score -= 0.3;
      improvementAreas.push('next_step_actions');
      feedback.push('Missing next step actions');
    } else if (response.nextStepActions.length >= 2 && response.nextStepActions.length <= 4) {
      score += 0.2;
    }
    
    // Check confidence from metadata
    if (response.metadata.confidence) {
      score = (score + response.metadata.confidence) / 2;
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      feedback: feedback.join('; '),
      improvementAreas,
    };
  }

  private async optimizeResponse(
    response: AgentResponse,
    evaluation: ResponseEvaluation,
    params: WorkflowParameters
  ): Promise<AgentResponse> {
    if (evaluation.improvementAreas.length === 0) {
      return response;
    }
    
    const providers = await this.llmRegistry.listProviders();
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      return response;
    }
    
    const improvementPrompt = `Improve this response based on the following feedback: ${evaluation.feedback}. 
    Areas to improve: ${evaluation.improvementAreas.join(', ')}.
    
    Original response: ${response.content}`;
    
    const request: TextGenerationRequest = {
      messages: [
        {
          id: `system-${Date.now()}`,
          role: MessageRole.SYSTEM,
          content: 'Improve the given response based on the feedback provided. Maintain the core message while addressing the improvement areas.',
          timestamp: new Date(),
        },
        {
          id: `user-${Date.now()}`,
          role: MessageRole.USER,
          content: improvementPrompt,
          timestamp: new Date(),
        },
      ],
    };
    
    try {
      const improvedResponse = await provider.generateText(request);
      
      // Generate improved next step actions if needed
      let nextStepActions = response.nextStepActions;
      if (evaluation.improvementAreas.includes('next_step_actions')) {
        nextStepActions = await this.generateNextStepActions(improvedResponse.content, params.context);
      }
      
      return {
        content: improvedResponse.content,
        nextStepActions,
        metadata: {
          ...response.metadata,
          confidence: Math.min(1, response.metadata.confidence + 0.1),
        },
      };
    } catch {
      return response;
    }
  }

  private async generateNextStepActions(content: string, context: ConversationContext): Promise<NextStepAction[]> {
    // Generate contextual next step actions based on content and context
    const actions: NextStepAction[] = [];
    
    // Analyze content for action cues
    if (content.toLowerCase().includes('product') || content.toLowerCase().includes('inventory')) {
      actions.push({
        id: 'analyze_product',
        title: 'Analyze Product Performance',
        description: 'Get detailed insights about product performance',
        actionType: ActionType.ANALYZE_PRODUCT,
      });
    }
    
    if (content.toLowerCase().includes('seo') || content.toLowerCase().includes('optimization')) {
      actions.push({
        id: 'open_seo_optimizer',
        title: 'Open SEO Optimizer',
        description: 'Optimize your product for search engines',
        actionType: ActionType.OPEN_SEO_OPTIMIZER,
      });
    }
    
    if (content.toLowerCase().includes('marketing') || content.toLowerCase().includes('campaign')) {
      actions.push({
        id: 'create_campaign',
        title: 'Create Marketing Campaign',
        description: 'Set up a new marketing campaign',
        actionType: ActionType.CREATE_CAMPAIGN,
      });
    }
    
    if (content.toLowerCase().includes('analytics') || content.toLowerCase().includes('performance')) {
      actions.push({
        id: 'view_analytics',
        title: 'View Analytics Dashboard',
        description: 'Check your business performance metrics',
        actionType: ActionType.VIEW_ANALYTICS,
      });
    }
    
    // Always include a general help action if we don't have enough specific actions
    if (actions.length < 2) {
      actions.push({
        id: 'ask_question',
        title: 'Ask Another Question',
        description: 'Get more help with your business',
        actionType: ActionType.ASK_QUESTION,
      });
    }
    
    // Limit to 4 actions as per requirements
    return actions.slice(0, 4);
  }

  private updateResponseTimeMetrics(processingTime: number): void {
    const currentAvg = this.status.averageResponseTime;
    const totalRequests = this.status.totalRequests;
    
    this.status.averageResponseTime = 
      ((currentAvg * (totalRequests - 1)) + processingTime) / totalRequests;
  }

  private updateErrorRate(): void {
    // Simple error rate calculation - in production this would be more sophisticated
    const errorCount = this.status.totalRequests * this.status.errorRate + 1;
    this.status.errorRate = errorCount / this.status.totalRequests;
  }

  private updateWorkflowMetrics(workflow: WorkflowType, executionTime: number, success: boolean): void {
    const metrics = this.workflowMetrics.get(workflow);
    if (!metrics) return;
    
    metrics.executionCount++;
    metrics.averageExecutionTime = 
      ((metrics.averageExecutionTime * (metrics.executionCount - 1)) + executionTime) / metrics.executionCount;
    
    if (success) {
      metrics.successRate = 
        ((metrics.successRate * (metrics.executionCount - 1)) + 1) / metrics.executionCount;
    } else {
      metrics.successRate = 
        (metrics.successRate * (metrics.executionCount - 1)) / metrics.executionCount;
    }
    
    metrics.lastExecuted = new Date();
  }

  private selectWorkflowType(intent: any, context: ConversationContext): WorkflowType {
    // Intelligent workflow selection based on intent and context
    if (intent.confidence < 0.6) {
      return WorkflowType.ROUTING; // Use routing for unclear intents
    }
    
    // Check for complex multi-part requests
    const isComplexRequest = context.conversationHistory.length > 10 || 
                           intent.entities?.length > 3 ||
                           (intent.intent && intent.intent.includes('analyze') && intent.intent.includes('compare'));
    
    if (isComplexRequest) {
      return WorkflowType.ORCHESTRATOR_WORKERS; // Use orchestrator for complex tasks
    }
    
    // Check for requests that can benefit from parallel processing
    const hasMultipleParts = intent.entities?.some((entity: any) => entity.name === 'product_list') ||
                           (intent.intent && (intent.intent.includes('and') || intent.intent.includes('also')));
    
    if (hasMultipleParts) {
      return WorkflowType.PARALLELIZATION;
    }
    
    // Check for iterative improvement scenarios
    const needsOptimization = intent.intent && (
      intent.intent.includes('improve') || 
      intent.intent.includes('optimize') || 
      intent.intent.includes('better')
    );
    
    if (needsOptimization) {
      return WorkflowType.EVALUATOR_OPTIMIZER;
    }
    
    // Check for sequential task scenarios
    const isSequentialTask = intent.intent && (
      intent.intent.includes('step') || 
      intent.intent.includes('process') || 
      intent.intent.includes('guide')
    );
    
    if (isSequentialTask) {
      return WorkflowType.PROMPT_CHAINING;
    }
    
    return WorkflowType.ROUTING; // Default to routing
  }

  private createAgentError(error: unknown): AgentError {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new AgentError({
      code: 'UNKNOWN_ERROR',
      message,
      details: { originalError: error },
      recoverable: true,
      timestamp: new Date(),
    });
  }

  private async createGracefulFallbackResponse(
    error: AgentError,
    context: ConversationContext
  ): Promise<AgentResponse> {
    return {
      content: `I encountered an issue, but I'm here to help. ${this.getUserFriendlyErrorMessage(error)}`,
      nextStepActions: [
        {
          id: 'retry',
          title: 'Try again',
          description: 'Rephrase your request and try again',
          actionType: ActionType.ASK_QUESTION,
        },
        {
          id: 'help',
          title: 'Get help',
          description: 'Learn about what I can help you with',
          actionType: ActionType.VIEW_ANALYTICS,
        },
      ],
      metadata: {
        processingTime: 0,
        provider: 'fallback',
        workflow: WorkflowType.ROUTING,
        confidence: 0.5,
        errorRecovery: true,
      },
    };
  }

  private createFallbackResponse(input: UserInput): AgentResponse {
    return {
      content: `I'm having trouble processing your request right now. Could you please rephrase or try a different approach?`,
      nextStepActions: [
        {
          id: 'rephrase',
          title: 'Rephrase request',
          description: 'Try asking in a different way',
          actionType: ActionType.ASK_QUESTION,
        },
      ],
      metadata: {
        processingTime: 0,
        provider: 'fallback',
        workflow: WorkflowType.ROUTING,
        confidence: 0.3,
      },
    };
  }

  private getUserFriendlyErrorMessage(error: AgentError): string {
    switch (error.code) {
      case 'LLM_PROVIDER_UNAVAILABLE':
        return 'The AI service is temporarily unavailable. Please try again in a moment.';
      case 'TOOL_EXECUTION_FAILED':
        return 'I had trouble accessing the requested information. Let me try a different approach.';
      case 'CONTEXT_UNAVAILABLE':
        return 'I need a bit more context to help you effectively.';
      case 'WORKFLOW_EXECUTION_FAILED':
        return 'I encountered an issue processing your request.';
      default:
        return 'Something unexpected happened, but I\'m still here to help.';
    }
  }

  // Tool integration helper methods
  private async getAvailableToolsForContext(context: ConversationContext): Promise<BusinessTool[]> {
    try {
      // Get all available tools from the registry
      const allTools = await this.toolRegistry.listAvailableTools();
      
      // Filter tools based on context (could be enhanced with more sophisticated logic)
      return allTools.filter(tool => {
        // For now, include all tools, but this could be filtered based on:
        // - User permissions
        // - Current conversation context
        // - Business profile
        // - Tool relevance to current intent
        return !tool.metadata?.deprecated;
      });
    } catch (error) {
      this.logger?.warn('Failed to get available tools', error);
      return [];
    }
  }

  private convertBusinessToolsToLLMFormat(businessTools: BusinessTool[]): ToolDefinition[] {
    return businessTools.map(tool => ({
      name: tool.id,
      description: tool.description,
      parameters: tool.inputSchema as unknown as Record<string, unknown>,
    }));
  }

  private shouldUseToolsForStep(step: string, availableTools: BusinessTool[]): boolean {
    if (availableTools.length === 0) {
      console.log(`🚫 No tools available`);
      return false;
    }

    const stepLower = step.toLowerCase();
    console.log(`🔍 Analyzing step: "${stepLower}"`);
    
    // Check if the step mentions concepts that could benefit from tools
    const toolKeywords = [
      'analyze', 'analysis', 'data', 'revenue', 'sales', 'profit', 'seo',
      'product', 'inventory', 'performance', 'metrics', 'report', 'calculate',
      'list', 'show', 'get', 'find', 'search', 'marketing', 'campaign',
      'email', 'optimization', 'score', 'rating', 'comparison'
    ];

    const matchedKeywords = toolKeywords.filter(keyword => stepLower.includes(keyword));
    console.log(`🎯 Matched keywords: ${matchedKeywords.join(', ')}`);

    const shouldUse = matchedKeywords.length > 0;
    console.log(`🤖 Should use tools: ${shouldUse}`);
    
    return shouldUse;
  }

  private async executeToolCalls(toolCalls: Array<{ id: string; name: string; parameters: Record<string, unknown> }>): Promise<Array<{ toolCallId: string; result: any; success: boolean; error?: string | undefined }>> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.toolRegistry.executeTool(toolCall.name, toolCall.parameters);
        results.push({
          toolCallId: toolCall.id,
          result: result.data,
          success: result.success,
          error: result.success ? undefined : (result.error?.message || 'Unknown error'),
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown tool execution error',
        });
      }
    }

    return results;
  }
}

// Supporting interfaces for workflow patterns
interface WorkflowHandler {
  validate(parameters: WorkflowParameters): boolean;
  execute(parameters: WorkflowParameters): Promise<WorkflowResult>;
  getRequiredCapabilities(): string[];
}

interface TaskAnalysis {
  complexity: 'low' | 'medium' | 'high';
  requiredCapabilities: string[];
  estimatedTime: number;
}

interface Worker {
  id: string;
  capabilities: string[];
  specialization: string;
}

interface ResponseEvaluation {
  score: number;
  feedback: string;
  improvementAreas: string[];
}