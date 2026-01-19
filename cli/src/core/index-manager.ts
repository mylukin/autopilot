import * as fs from 'fs-extra';
import * as path from 'path';
import { Task } from './task-parser';

export interface TaskIndex {
  version: string;
  updatedAt: string;
  metadata: {
    projectGoal: string;
    languageConfig?: any;
  };
  tasks: Record<string, {
    status: string;
    priority: number;
    module: string;
    description: string;
    filePath?: string;
    dependencies?: string[];
    estimatedMinutes?: number;
  }>;
}

export class IndexManager {
  private indexPath: string;

  constructor(tasksDir: string) {
    this.indexPath = path.join(tasksDir, 'index.json');
  }

  /**
   * Read the index file
   */
  readIndex(): TaskIndex {
    if (!fs.existsSync(this.indexPath)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: {
          projectGoal: '',
        },
        tasks: {},
      };
    }

    return fs.readJSONSync(this.indexPath);
  }

  /**
   * Write the index file
   */
  writeIndex(index: TaskIndex): void {
    index.updatedAt = new Date().toISOString();
    fs.ensureDirSync(path.dirname(this.indexPath));
    fs.writeJSONSync(this.indexPath, index, { spaces: 2 });
  }

  /**
   * Add or update a task in the index
   */
  upsertTask(task: Task, filePath?: string): void {
    const index = this.readIndex();

    index.tasks[task.id] = {
      status: task.status,
      priority: task.priority,
      module: task.module,
      description: task.description,
      filePath: filePath ? path.relative(path.dirname(this.indexPath), filePath) : undefined,
      dependencies: task.dependencies,
      estimatedMinutes: task.estimatedMinutes,
    };

    this.writeIndex(index);
  }

  /**
   * Update task status in the index
   */
  updateTaskStatus(taskId: string, status: Task['status']): void {
    const index = this.readIndex();

    if (!index.tasks[taskId]) {
      throw new Error(`Task not found in index: ${taskId}`);
    }

    index.tasks[taskId].status = status;
    this.writeIndex(index);
  }

  /**
   * Get the next task to work on (highest priority pending task)
   */
  getNextTask(): string | null {
    const index = this.readIndex();

    const pendingTasks = Object.entries(index.tasks)
      .filter(([, task]) => task.status === 'pending' || task.status === 'in_progress')
      .sort(([, a], [, b]) => a.priority - b.priority);

    return pendingTasks.length > 0 ? pendingTasks[0][0] : null;
  }

  /**
   * Get task file path from index
   */
  getTaskFilePath(taskId: string): string | null {
    const index = this.readIndex();
    const task = index.tasks[taskId];

    if (!task) {
      return null;
    }

    if (task.filePath) {
      return path.join(path.dirname(this.indexPath), task.filePath);
    }

    // Derive path from ID
    const module = task.module;
    const fileName = taskId.replace(`${module}.`, '') + '.md';
    return path.join(path.dirname(this.indexPath), module, fileName);
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<TaskIndex['metadata']>): void {
    const index = this.readIndex();
    index.metadata = { ...index.metadata, ...metadata };
    this.writeIndex(index);
  }
}
