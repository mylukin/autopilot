import { ITaskRepository, TaskFilter } from './task-repository';
import { Task, TaskConfig } from '../domain/task-entity';
import { IFileSystem } from '../infrastructure/file-system';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * Task index structure stored in index.json
 */
interface TaskIndex {
  version: string;
  updatedAt: string;
  metadata: {
    projectGoal: string;
    languageConfig?: any;
  };
  tasks: Record<
    string,
    {
      status: string;
      priority: number;
      module: string;
      description: string;
      filePath?: string;
      dependencies?: string[];
      estimatedMinutes?: number;
    }
  >;
}

/**
 * File system implementation of ITaskRepository
 *
 * Stores tasks as Markdown files with YAML frontmatter in a directory structure.
 * Maintains an index.json file for fast lookups and metadata.
 *
 * Directory structure:
 * - {tasksDir}/
 *   - index.json
 *   - {module}/
 *     - {taskName}.md
 */
export class FileSystemTaskRepository implements ITaskRepository {
  private indexPath: string;

  constructor(
    private fileSystem: IFileSystem,
    private tasksDir: string
  ) {
    this.indexPath = path.join(tasksDir, 'index.json');
  }

  /**
   * Find task by ID
   */
  async findById(taskId: string): Promise<Task | null> {
    try {
      const index = await this.readIndex();
      const taskEntry = index.tasks[taskId];

      if (!taskEntry) {
        return null;
      }

      const taskFilePath = this.getTaskFilePath(taskId, taskEntry.module, taskEntry.filePath);

      // Check if file exists
      const exists = await this.fileSystem.exists(taskFilePath);
      if (!exists) {
        return null;
      }

      // Read and parse task file
      const content = (await this.fileSystem.readFile(taskFilePath, 'utf-8')) as string;
      const task = this.parseTaskFile(content);

      return task;
    } catch (error) {
      // If index doesn't exist or any other error, return null
      return null;
    }
  }

  /**
   * Find all tasks matching the filter
   */
  async findAll(filter?: TaskFilter): Promise<Task[]> {
    try {
      const index = await this.readIndex();
      const tasks: Task[] = [];

      // Get all task IDs from index
      const taskIds = Object.keys(index.tasks);

      // Filter task IDs based on criteria
      const filteredIds = taskIds.filter(taskId => {
        const taskEntry = index.tasks[taskId];

        if (filter?.status && taskEntry.status !== filter.status) {
          return false;
        }

        if (filter?.module && taskEntry.module !== filter.module) {
          return false;
        }

        if (filter?.priority !== undefined && taskEntry.priority !== filter.priority) {
          return false;
        }

        return true;
      });

      // Load full task objects
      for (const taskId of filteredIds) {
        const task = await this.findById(taskId);
        if (task) {
          tasks.push(task);
        }
      }

      return tasks;
    } catch (error) {
      // If index doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Save or update a task
   */
  async save(task: Task): Promise<void> {
    // Generate file path
    const fileName = task.id.replace(`${task.module}.`, '') + '.md';
    const taskFilePath = path.join(this.tasksDir, task.module, fileName);

    // Ensure directory exists
    await this.fileSystem.ensureDir(path.dirname(taskFilePath));

    // Generate task file content
    const content = this.generateTaskFile(task);

    // Write task file
    await this.fileSystem.writeFile(taskFilePath, content, { encoding: 'utf-8' });

    // Update index
    await this.updateIndex(task, path.join(task.module, fileName));
  }

  /**
   * Delete a task by ID
   */
  async delete(taskId: string): Promise<void> {
    try {
      const index = await this.readIndex();
      const taskEntry = index.tasks[taskId];

      if (!taskEntry) {
        // Task doesn't exist in index, nothing to delete
        return;
      }

      // Delete task file
      const taskFilePath = this.getTaskFilePath(taskId, taskEntry.module, taskEntry.filePath);
      const exists = await this.fileSystem.exists(taskFilePath);
      if (exists) {
        await this.fileSystem.remove(taskFilePath);
      }

      // Remove from index
      delete index.tasks[taskId];
      await this.writeIndex(index);
    } catch (error) {
      // Silently handle errors (task might not exist)
    }
  }

  /**
   * Find the next task to work on (highest priority pending task)
   */
  async findNext(): Promise<Task | null> {
    try {
      const index = await this.readIndex();

      // Find pending or in_progress tasks, sorted by priority
      const candidates = Object.entries(index.tasks)
        .filter(([, taskEntry]) => taskEntry.status === 'pending' || taskEntry.status === 'in_progress')
        .sort(([, a], [, b]) => a.priority - b.priority);

      if (candidates.length === 0) {
        return null;
      }

      // Return the highest priority task
      const [taskId] = candidates[0];
      return await this.findById(taskId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Read index.json file
   */
  private async readIndex(): Promise<TaskIndex> {
    const exists = await this.fileSystem.exists(this.indexPath);

    if (!exists) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: {
          projectGoal: '',
        },
        tasks: {},
      };
    }

    const content = (await this.fileSystem.readFile(this.indexPath, 'utf-8')) as string;
    return JSON.parse(content);
  }

  /**
   * Write index.json file
   */
  private async writeIndex(index: TaskIndex): Promise<void> {
    index.updatedAt = new Date().toISOString();
    await this.fileSystem.ensureDir(path.dirname(this.indexPath));
    await this.fileSystem.writeFile(this.indexPath, JSON.stringify(index, null, 2), {
      encoding: 'utf-8',
    });
  }

  /**
   * Update index with task information
   */
  private async updateIndex(task: Task, relativeFilePath: string): Promise<void> {
    const index = await this.readIndex();

    index.tasks[task.id] = {
      status: task.status,
      priority: task.priority,
      module: task.module,
      description: task.description,
      filePath: relativeFilePath,
      dependencies: task.dependencies,
      estimatedMinutes: task.estimatedMinutes,
    };

    await this.writeIndex(index);
  }

  /**
   * Get task file path from task ID and module
   */
  private getTaskFilePath(taskId: string, module: string, relativeFilePath?: string): string {
    if (relativeFilePath) {
      return path.join(this.tasksDir, relativeFilePath);
    }

    // Derive path from ID
    const fileName = taskId.replace(`${module}.`, '') + '.md';
    return path.join(this.tasksDir, module, fileName);
  }

  /**
   * Parse task file content (YAML frontmatter + Markdown body)
   */
  private parseTaskFile(content: string): Task {
    // Split frontmatter and body
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error('Invalid task file format');
    }

    const [, frontmatterStr, body] = frontmatterMatch;
    const frontmatter = yaml.parse(frontmatterStr);

    // Parse body sections
    const descriptionMatch = body.match(/^#\s+(.+)$/m);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    const criteriaMatch = body.match(/##\s+Acceptance Criteria\s*\n((?:\d+\.\s+.+\n?)+)/m);
    const acceptanceCriteria: string[] = [];

    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1];
      const criteriaLines = criteriaText.split('\n').filter(line => line.trim());
      criteriaLines.forEach(line => {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          acceptanceCriteria.push(match[1].trim());
        }
      });
    }

    const notesMatch = body.match(/##\s+Notes\s*\n([\s\S]+?)(?=\n##|$)/m);
    const notes = notesMatch ? notesMatch[1].trim() : '';

    // Create domain entity from parsed data
    const taskConfig: TaskConfig = {
      id: frontmatter.id,
      module: frontmatter.module,
      priority: frontmatter.priority,
      status: frontmatter.status,
      estimatedMinutes: frontmatter.estimatedMinutes,
      description,
      acceptanceCriteria,
      dependencies: frontmatter.dependencies || [],
      testRequirements: frontmatter.testRequirements,
      notes,
    };

    return new Task(taskConfig);
  }

  /**
   * Generate task file content (YAML frontmatter + Markdown body)
   */
  private generateTaskFile(task: Task): string {
    // Build frontmatter
    const frontmatter: any = {
      id: task.id,
      module: task.module,
      priority: task.priority,
      status: task.status,
    };

    if (task.estimatedMinutes !== undefined) {
      frontmatter.estimatedMinutes = task.estimatedMinutes;
    }

    if (task.dependencies && task.dependencies.length > 0) {
      frontmatter.dependencies = task.dependencies;
    }

    if (task.testRequirements) {
      frontmatter.testRequirements = task.testRequirements;
    }

    const frontmatterStr = yaml.stringify(frontmatter);

    // Build body
    let body = `# ${task.description}\n\n`;

    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      body += '## Acceptance Criteria\n';
      task.acceptanceCriteria.forEach((criterion, index) => {
        body += `${index + 1}. ${criterion}\n`;
      });
      body += '\n';
    }

    if (task.notes) {
      body += '## Notes\n';
      body += `${task.notes}\n`;
    }

    return `---\n${frontmatterStr}---\n\n${body}`;
  }
}
