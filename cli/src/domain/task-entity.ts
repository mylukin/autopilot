/**
 * Task Domain Entity
 *
 * Rich domain model with business logic for task management.
 * Encapsulates status transitions, dependency checking, and time tracking.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';

export interface TaskTestRequirements {
  unit?: {
    required: boolean;
    pattern: string;
  };
  e2e?: {
    required: boolean;
    pattern: string;
  };
}

export interface TaskConfig {
  id: string;
  module: string;
  priority: number;
  status: TaskStatus;
  description: string;
  acceptanceCriteria: string[];
  estimatedMinutes?: number;
  dependencies?: string[];
  testRequirements?: TaskTestRequirements;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

/**
 * Task Domain Entity
 *
 * Represents a work item with business rules for:
 * - Status transitions (pending → in_progress → completed/failed)
 * - Dependency blocking
 * - Time tracking and estimation validation
 */
export class Task {
  // Core identification
  public readonly id: string;
  public readonly module: string;
  public readonly priority: number;

  // Status and lifecycle
  private _status: TaskStatus;
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _failedAt?: Date;

  // Requirements
  public readonly description: string;
  public readonly acceptanceCriteria: string[];
  public readonly estimatedMinutes?: number;
  public readonly dependencies: string[];
  public readonly testRequirements?: TaskTestRequirements;
  private _notes?: string;

  constructor(config: TaskConfig) {
    this.id = config.id;
    this.module = config.module;
    this.priority = config.priority;
    this._status = config.status;
    this.description = config.description;
    this.acceptanceCriteria = config.acceptanceCriteria;
    this.estimatedMinutes = config.estimatedMinutes;
    this.dependencies = config.dependencies || [];
    this.testRequirements = config.testRequirements;
    this._notes = config.notes;

    // Parse timestamps
    this._startedAt = config.startedAt ? new Date(config.startedAt) : undefined;
    this._completedAt = config.completedAt ? new Date(config.completedAt) : undefined;
    this._failedAt = config.failedAt ? new Date(config.failedAt) : undefined;
  }

  // Getters
  get status(): TaskStatus {
    return this._status;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get failedAt(): Date | undefined {
    return this._failedAt;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  /**
   * Check if task can be started
   * @returns true if status is 'pending'
   */
  canStart(): boolean {
    return this._status === 'pending';
  }

  /**
   * Start the task
   * @throws Error if task cannot be started
   */
  start(): void {
    if (!this.canStart()) {
      throw new Error(
        `Cannot start task ${this.id}: current status is ${this._status}. Only pending tasks can be started.`
      );
    }

    this._status = 'in_progress';
    this._startedAt = new Date();
  }

  /**
   * Mark task as completed
   * @throws Error if task is not in progress
   */
  complete(): void {
    if (this._status !== 'in_progress') {
      throw new Error(
        `Cannot complete task ${this.id}: current status is ${this._status}. Only in_progress tasks can be completed.`
      );
    }

    this._status = 'completed';
    this._completedAt = new Date();
  }

  /**
   * Mark task as failed
   * @throws Error if task is not in progress
   */
  fail(): void {
    if (this._status !== 'in_progress') {
      throw new Error(
        `Cannot fail task ${this.id}: current status is ${this._status}. Only in_progress tasks can be failed.`
      );
    }

    this._status = 'failed';
    this._failedAt = new Date();
  }

  /**
   * Append text to notes
   * @param note Text to append
   */
  appendNote(note: string): void {
    if (this._notes) {
      this._notes += '\n' + note;
    } else {
      this._notes = note;
    }
  }

  /**
   * Check if task is blocked by dependencies
   * @param completedTaskIds Set of completed task IDs
   * @returns true if any dependency is not completed
   */
  isBlocked(completedTaskIds: Set<string>): boolean {
    return this.dependencies.some((depId) => !completedTaskIds.has(depId));
  }

  /**
   * Get actual duration in minutes
   * @returns Duration from start to completion/failure, or undefined if not finished
   */
  getActualDuration(): number | undefined {
    if (!this._startedAt) {
      return undefined;
    }

    const endTime = this._completedAt || this._failedAt;
    if (!endTime) {
      return undefined;
    }

    const durationMs = endTime.getTime() - this._startedAt.getTime();
    return Math.round(durationMs / 60000); // Convert to minutes
  }

  /**
   * Check if task is over estimate
   * @returns true if actual duration exceeds estimated duration
   */
  isOverEstimate(): boolean {
    const actualDuration = this.getActualDuration();

    if (!actualDuration || !this.estimatedMinutes) {
      return false;
    }

    return actualDuration > this.estimatedMinutes;
  }

  /**
   * Get completion percentage (0-100)
   * Based on status only (not actual progress tracking)
   * @returns 0 for pending, 50 for in_progress, 100 for completed
   */
  getCompletionPercentage(): number {
    switch (this._status) {
      case 'pending':
        return 0;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      case 'blocked':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Check if task is terminal (completed or failed)
   */
  isTerminal(): boolean {
    return this._status === 'completed' || this._status === 'failed';
  }

  /**
   * Check if task has dependencies
   */
  hasDependencies(): boolean {
    return this.dependencies.length > 0;
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): TaskConfig {
    return {
      id: this.id,
      module: this.module,
      priority: this.priority,
      status: this._status,
      description: this.description,
      acceptanceCriteria: this.acceptanceCriteria,
      estimatedMinutes: this.estimatedMinutes,
      dependencies: this.dependencies,
      testRequirements: this.testRequirements,
      notes: this._notes,
      startedAt: this._startedAt?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      failedAt: this._failedAt?.toISOString(),
    };
  }

  /**
   * Create Task from plain object
   */
  static fromJSON(config: TaskConfig): Task {
    return new Task(config);
  }
}
