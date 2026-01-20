/**
 * TaskService - Business logic for task management
 *
 * Extracts task operations from CLI commands into testable service layer.
 * Uses dependency injection for repositories and logger.
 */

import { Task } from '../domain/task-entity';
import { ITaskRepository } from '../repositories/task-repository';
import { IStateRepository } from '../repositories/state-repository';
import { ILogger } from '../infrastructure/logger';

export interface TaskFilter {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  module?: string;
  priority?: number;
  hasDependencies?: boolean;
  ready?: boolean;
}

export interface TaskListOptions {
  filter?: TaskFilter;
  limit?: number;
  offset?: number;
  sort?: 'priority' | 'status' | 'estimatedMinutes';
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  offset: number;
  limit: number;
  returned: number;
}

export interface CreateTaskInput {
  id: string;
  module: string;
  priority?: number;
  estimatedMinutes?: number;
  description: string;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  testPattern?: string;
}

export interface BatchOperation {
  action: 'start' | 'done' | 'fail';
  taskId: string;
  reason?: string;
  duration?: string;
}

export interface BatchResult {
  taskId: string;
  action: string;
  success: boolean;
  error?: string;
}

/**
 * ITaskService interface for dependency injection
 */
export interface ITaskService {
  /**
   * Create a new task
   */
  createTask(input: CreateTaskInput): Promise<Task>;

  /**
   * Get task by ID
   */
  getTask(taskId: string): Promise<Task | null>;

  /**
   * List tasks with filtering and pagination
   */
  listTasks(options?: TaskListOptions): Promise<TaskListResult>;

  /**
   * Get next task to work on (highest priority, dependencies satisfied)
   */
  getNextTask(): Promise<Task | null>;

  /**
   * Start a task (mark as in_progress)
   */
  startTask(taskId: string): Promise<Task>;

  /**
   * Complete a task (mark as completed)
   */
  completeTask(taskId: string, duration?: string): Promise<Task>;

  /**
   * Fail a task (mark as failed)
   */
  failTask(taskId: string, reason: string): Promise<Task>;

  /**
   * Batch operations with optional atomic rollback
   */
  batchOperations(operations: BatchOperation[], atomic: boolean): Promise<BatchResult[]>;
}

/**
 * TaskService implementation
 */
export class TaskService implements ITaskService {
  constructor(
    private taskRepository: ITaskRepository,
    private stateRepository: IStateRepository,
    private logger: ILogger
  ) {}

  async createTask(input: CreateTaskInput): Promise<Task> {
    this.logger.info(`Creating task: ${input.id}`);

    // Check if task already exists
    const existing = await this.taskRepository.findById(input.id);
    if (existing) {
      this.logger.error(`Task already exists: ${input.id}`);
      throw new Error(`Task already exists: ${input.id}`);
    }

    // Create task entity
    const task = new Task({
      id: input.id,
      module: input.module,
      priority: input.priority ?? 1,
      status: 'pending',
      estimatedMinutes: input.estimatedMinutes ?? 30,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      dependencies: input.dependencies ?? [],
      testRequirements: input.testPattern
        ? {
            unit: {
              required: true,
              pattern: input.testPattern,
            },
          }
        : undefined,
      notes: '',
    });

    // Save to repository
    await this.taskRepository.save(task);

    this.logger.info(`Task created: ${input.id}`);
    return task;
  }

  async getTask(taskId: string): Promise<Task | null> {
    this.logger.debug(`Getting task: ${taskId}`);
    return await this.taskRepository.findById(taskId);
  }

  async listTasks(options: TaskListOptions = {}): Promise<TaskListResult> {
    this.logger.debug('Listing tasks', { options });

    const { filter, limit = 100, offset = 0, sort = 'priority' } = options;

    // Get all tasks
    let tasks = await this.taskRepository.findAll(filter);

    // Apply ready filter (requires dependency check)
    // Ready = pending tasks with satisfied dependencies
    if (filter?.ready) {
      const completedIds = new Set(
        tasks.filter((t) => t.status === 'completed').map((t) => t.id)
      );

      tasks = tasks.filter((task) => {
        // Only pending tasks can be ready
        if (task.status !== 'pending') {
          return false;
        }

        // Check if dependencies are satisfied
        if (!task.dependencies || task.dependencies.length === 0) {
          return true;
        }
        return !task.isBlocked(completedIds);
      });
    }

    // Sort tasks
    tasks.sort((a, b) => {
      switch (sort) {
        case 'priority':
          return a.priority - b.priority;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'estimatedMinutes':
          return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
        default:
          return 0;
      }
    });

    // Pagination
    const total = tasks.length;
    const paginatedTasks = tasks.slice(offset, offset + limit);

    return {
      tasks: paginatedTasks,
      total,
      offset,
      limit,
      returned: paginatedTasks.length,
    };
  }

  async getNextTask(): Promise<Task | null> {
    this.logger.debug('Getting next task');

    // Get all pending tasks
    const tasks = await this.taskRepository.findAll({ status: 'pending' });

    if (tasks.length === 0) {
      this.logger.info('No pending tasks found');
      return null;
    }

    // Get completed task IDs for dependency checking
    const allTasks = await this.taskRepository.findAll();
    const completedIds = new Set(
      allTasks.filter((t) => t.status === 'completed').map((t) => t.id)
    );

    // Filter tasks with satisfied dependencies
    const readyTasks = tasks.filter((task) => {
      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }
      return !task.isBlocked(completedIds);
    });

    if (readyTasks.length === 0) {
      this.logger.warn('No tasks with satisfied dependencies found');
      return null;
    }

    // Return highest priority task
    readyTasks.sort((a, b) => a.priority - b.priority);
    const nextTask = readyTasks[0];

    this.logger.info(`Next task: ${nextTask.id}`);
    return nextTask;
  }

  async startTask(taskId: string): Promise<Task> {
    this.logger.info(`Starting task: ${taskId}`);

    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      throw new Error(`Task not found: ${taskId}`);
    }

    // Idempotent: Already in progress is not an error
    if (task.status === 'in_progress') {
      this.logger.warn(`Task already in progress: ${taskId}`);
      return task;
    }

    // Start task (validates state transition)
    task.start();

    // Save updated task
    await this.taskRepository.save(task);

    // Update state to track current task
    const state = await this.stateRepository.get();
    if (state) {
      await this.stateRepository.update({ currentTask: taskId });
    }

    this.logger.info(`Task started: ${taskId}`);
    return task;
  }

  async completeTask(taskId: string, duration?: string): Promise<Task> {
    this.logger.info(`Completing task: ${taskId}`, { duration });

    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      throw new Error(`Task not found: ${taskId}`);
    }

    // Idempotent: Already completed is not an error
    if (task.status === 'completed') {
      this.logger.warn(`Task already completed: ${taskId}`);
      return task;
    }

    // Complete task (validates state transition)
    task.complete();

    // Append duration note if provided
    if (duration) {
      task.appendNote(`Completed in ${duration}`);
    }

    // Save updated task
    await this.taskRepository.save(task);

    this.logger.info(`Task completed: ${taskId}`);
    return task;
  }

  async failTask(taskId: string, reason: string): Promise<Task> {
    this.logger.info(`Failing task: ${taskId}`, { reason });

    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      throw new Error(`Task not found: ${taskId}`);
    }

    // Fail task (validates state transition)
    task.fail();

    // Append failure reason
    task.appendNote(`Failed: ${reason}`);

    // Save updated task
    await this.taskRepository.save(task);

    this.logger.error(`Task failed: ${taskId}`, { reason });
    return task;
  }

  async batchOperations(
    operations: BatchOperation[],
    atomic: boolean
  ): Promise<BatchResult[]> {
    this.logger.info(`Executing batch operations`, { count: operations.length, atomic });

    const results: BatchResult[] = [];
    const backupTasks: Map<string, Task> = new Map();

    try {
      for (const op of operations) {
        try {
          // Backup for atomic mode (create a copy of the task)
          if (atomic) {
            const task = await this.taskRepository.findById(op.taskId);
            if (task) {
              // Create a deep copy using JSON serialization/deserialization
              const taskCopy = Task.fromJSON(task.toJSON());
              backupTasks.set(op.taskId, taskCopy);
            }
          }

          // Perform operation
          let task: Task;
          switch (op.action) {
            case 'start':
              task = await this.startTask(op.taskId);
              results.push({ taskId: op.taskId, action: 'start', success: true });
              break;

            case 'done':
              task = await this.completeTask(op.taskId, op.duration);
              results.push({ taskId: op.taskId, action: 'done', success: true });
              break;

            case 'fail':
              if (!op.reason) {
                throw new Error('Reason required for fail action');
              }
              task = await this.failTask(op.taskId, op.reason);
              results.push({ taskId: op.taskId, action: 'fail', success: true });
              break;

            default:
              throw new Error(`Unknown action: ${op.action}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({
            taskId: op.taskId,
            action: op.action,
            success: false,
            error: errorMessage,
          });

          // Rollback in atomic mode
          if (atomic) {
            this.logger.warn('Batch operation failed, rolling back', { error: errorMessage });

            // Restore all backed up tasks
            for (const [taskId, backupTask] of backupTasks.entries()) {
              await this.taskRepository.save(backupTask);
            }

            throw new Error(`Batch operation failed, rolled back: ${errorMessage}`);
          }
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      this.logger.info('Batch operations completed', { total: operations.length, successful, failed });

      return results;
    } catch (error) {
      this.logger.error('Batch operations failed', { error });
      throw error;
    }
  }
}
