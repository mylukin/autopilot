import { Task } from '../domain/task-entity';

/**
 * Task filter interface for querying tasks
 */
export interface TaskFilter {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  module?: string;
  priority?: number;
}

/**
 * Task repository interface for persistence operations
 *
 * This interface abstracts task storage and retrieval,
 * making it easy to swap implementations (file system, database, etc.)
 */
export interface ITaskRepository {
  /**
   * Find task by ID
   * @param taskId - Task identifier
   * @returns Task object or null if not found
   */
  findById(taskId: string): Promise<Task | null>;

  /**
   * Find all tasks matching the filter
   * @param filter - Optional filter criteria
   * @returns Array of tasks matching filter
   */
  findAll(filter?: TaskFilter): Promise<Task[]>;

  /**
   * Save or update a task
   * @param task - Task to save
   */
  save(task: Task): Promise<void>;

  /**
   * Delete a task by ID
   * @param taskId - Task identifier to delete
   */
  delete(taskId: string): Promise<void>;

  /**
   * Find the next task to work on (highest priority pending task)
   * @returns Next task or null if no pending tasks
   */
  findNext(): Promise<Task | null>;
}
