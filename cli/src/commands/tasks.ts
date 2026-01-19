import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { TaskParser, Task } from '../core/task-parser';
import { TaskWriter } from '../core/task-writer';
import { IndexManager } from '../core/index-manager';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';

export function registerTaskCommands(program: Command, workspaceDir: string): void {
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const indexManager = new IndexManager(tasksDir);

  const tasks = program.command('tasks').description('Manage tasks');

  // Initialize tasks system
  tasks
    .command('init')
    .description('Initialize tasks directory and index')
    .option('--project-goal <goal>', 'Project goal description')
    .option('--language <language>', 'Programming language')
    .option('--framework <framework>', 'Framework name')
    .action((options) => {
      const index = indexManager.readIndex();

      if (options.projectGoal) {
        index.metadata.projectGoal = options.projectGoal;
      }

      if (options.language || options.framework) {
        index.metadata.languageConfig = {
          language: options.language || 'typescript',
          framework: options.framework || '',
        };
      }

      indexManager.writeIndex(index);
      console.log(chalk.green('✅ Tasks system initialized'));
      console.log(chalk.gray(`   Location: ${tasksDir}/index.json`));
    });

  // Create a new task
  tasks
    .command('create')
    .description('Create a new task')
    .requiredOption('--id <id>', 'Task ID (e.g., auth.signup.ui)')
    .requiredOption('--module <module>', 'Module name (e.g., auth)')
    .option('--priority <priority>', 'Priority (default: 1)', '1')
    .option('--estimated-minutes <minutes>', 'Estimated minutes (default: 30)', '30')
    .requiredOption('--description <desc>', 'Task description')
    .option('--criteria <criteria...>', 'Acceptance criteria (can specify multiple)')
    .option('--dependencies <deps...>', 'Task dependencies')
    .option('--test-pattern <pattern>', 'Test file pattern')
    .action((options) => {
      const task: Task = {
        id: options.id,
        module: options.module,
        priority: parseInt(options.priority),
        status: 'pending',
        estimatedMinutes: parseInt(options.estimatedMinutes),
        description: options.description,
        acceptanceCriteria: options.criteria || [],
        dependencies: options.dependencies || [],
        testRequirements: options.testPattern ? {
          unit: {
            required: true,
            pattern: options.testPattern,
          },
        } : undefined,
        notes: '',
      };

      const filePath = TaskWriter.writeTaskFile(tasksDir, task);
      indexManager.upsertTask(task, filePath);

      console.log(chalk.green(`✅ Task ${options.id} created`));
      console.log(chalk.gray(`   Module: ${options.module}`));
      console.log(chalk.gray(`   Priority: ${options.priority}`));
      console.log(chalk.gray(`   Estimated: ${options.estimatedMinutes} min`));
      console.log(chalk.gray(`   Location: ${filePath}`));
    });

  // List all tasks
  tasks
    .command('list')
    .description('List all tasks with advanced filtering')
    .option('-s, --status <status>', 'Filter by status (pending|in_progress|completed|failed)')
    .option('-m, --module <module>', 'Filter by module name')
    .option('-p, --priority <priority>', 'Filter by priority level')
    .option('--has-dependencies', 'Only show tasks with dependencies')
    .option('--ready', 'Only show tasks with satisfied dependencies')
    .option('--limit <n>', 'Limit number of results', '100')
    .option('--offset <n>', 'Skip first n results', '0')
    .option('--sort <field>', 'Sort by field (priority|status|estimatedMinutes)', 'priority')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        const index = indexManager.readIndex();
        let taskList = Object.entries(index.tasks);

        // Apply filters
        if (options.status) {
          taskList = taskList.filter(([, task]) => task.status === options.status);
        }

        if (options.module) {
          taskList = taskList.filter(([, task]) => task.module === options.module);
        }

        if (options.priority) {
          const priority = parseInt(options.priority);
          taskList = taskList.filter(([, task]) => task.priority === priority);
        }

        if (options.hasDependencies) {
          taskList = taskList.filter(([, task]) =>
            task.dependencies && task.dependencies.length > 0
          );
        }

        if (options.ready) {
          taskList = taskList.filter(([id, task]) => {
            if (!task.dependencies || task.dependencies.length === 0) {
              return true;
            }
            return task.dependencies.every(depId => {
              const depTask = index.tasks[depId];
              return depTask && depTask.status === 'completed';
            });
          });
        }

        // Sorting
        switch (options.sort) {
          case 'priority':
            taskList.sort(([, a], [, b]) => a.priority - b.priority);
            break;
          case 'status':
            taskList.sort(([, a], [, b]) => a.status.localeCompare(b.status));
            break;
          case 'estimatedMinutes':
            taskList.sort(([, a], [, b]) => (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0));
            break;
        }

        // Pagination
        const offset = parseInt(options.offset);
        const limit = parseInt(options.limit);
        const total = taskList.length;
        taskList = taskList.slice(offset, offset + limit);

        const response = successResponse({
          total,
          offset,
          limit,
          returned: taskList.length,
          tasks: taskList.map(([id, task]) => ({ id, ...task })),
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold(`Tasks (${data.returned} of ${data.total}):`));
          taskList.forEach(([id, task]) => {
            const statusColor =
              task.status === 'completed' ? 'green' :
                task.status === 'in_progress' ? 'yellow' :
                  task.status === 'failed' ? 'red' : 'gray';

            console.log(
              `  ${chalk[statusColor](`[${task.status}]`)} ` +
              `${chalk.cyan(id)} (P${task.priority}) - ${task.description}`
            );
          });

          if (data.total > data.returned) {
            console.log(chalk.gray(`\n  Showing ${data.offset + 1}-${data.offset + data.returned} of ${data.total}`));
            console.log(chalk.gray(`  Use --offset and --limit for pagination`));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to list tasks', error), options.json);
      }
    });

  // Get next task
  tasks
    .command('next')
    .description('Get next task to work on with comprehensive context')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const nextTaskId = indexManager.getNextTask();

      if (!nextTaskId) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'No pending tasks' }, null, 2));
        } else {
          console.log(chalk.yellow('No pending tasks'));
        }
        return;
      }

      const filePath = indexManager.getTaskFilePath(nextTaskId);
      if (!filePath) {
        console.error(chalk.red(`Task file not found: ${nextTaskId}`));
        process.exit(1);
      }

      const task = TaskParser.parseTaskFile(filePath);

      // === Gather comprehensive context ===
      const context: any = {};

      // 1. Current directory
      context.currentDirectory = process.cwd();

      // 2. Git information
      try {
        const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
        const gitLog = execSync('git log -1 --pretty=format:"%h|%s|%ar"', { encoding: 'utf-8' }).trim();
        const [hash, message, time] = gitLog.split('|');
        context.git = {
          branch: gitBranch,
          lastCommit: { hash, message, time },
        };
      } catch (error) {
        context.git = { error: 'Not a git repository or no commits' };
      }

      // 3. State context
      const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');
      if (fs.existsSync(stateFile)) {
        context.state = fs.readJSONSync(stateFile);
      }

      // 4. Progress statistics
      const index = indexManager.readIndex();
      const allTasks = Object.entries(index.tasks);
      const completed = allTasks.filter(([, t]) => t.status === 'completed').length;
      const failed = allTasks.filter(([, t]) => t.status === 'failed').length;
      const inProgress = allTasks.filter(([, t]) => t.status === 'in_progress').length;
      const pending = allTasks.filter(([, t]) => t.status === 'pending').length;
      const total = allTasks.length;

      context.progress = {
        completed,
        failed,
        inProgress,
        pending,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };

      // 5. Recent activity from progress.log
      const progressLog = path.join(workspaceDir, '.ralph-dev', 'progress.log');
      context.recentActivity = [];
      if (fs.existsSync(progressLog)) {
        try {
          const logContent = fs.readFileSync(progressLog, 'utf-8');
          const lines = logContent.trim().split('\n');
          context.recentActivity = lines.slice(-5); // Last 5 entries
        } catch (error) {
          context.recentActivity = ['Unable to read progress log'];
        }
      }

      // 6. Check task dependencies
      const dependencyStatus: any[] = [];
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const depTask = index.tasks[depId];
          if (depTask) {
            dependencyStatus.push({
              id: depId,
              status: depTask.status,
              satisfied: depTask.status === 'completed',
            });
          } else {
            dependencyStatus.push({
              id: depId,
              status: 'unknown',
              satisfied: false,
            });
          }
        });
      }

      // === Output ===
      if (options.json) {
        console.log(JSON.stringify({
          task,
          context,
          dependencyStatus,
        }, null, 2));
      } else {
        // Beautiful formatted output
        console.log(chalk.bold('┌─────────────────────────────────────────────────────────────────┐'));
        console.log(chalk.bold('│ 📍 CONTEXT                                                      │'));
        console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
        console.log(`│ ${chalk.gray('Current Directory:')} ${chalk.cyan(context.currentDirectory.slice(-50))}`);

        if (context.git.branch) {
          console.log(`│ ${chalk.gray('Git Branch:')} ${chalk.green(context.git.branch)}`);
          console.log(`│ ${chalk.gray('Last Commit:')} ${chalk.yellow(context.git.lastCommit.hash)} "${context.git.lastCommit.message.slice(0, 35)}" ${chalk.gray(context.git.lastCommit.time)}`);
        }

        if (context.state) {
          console.log(`│ ${chalk.gray('Phase:')} ${chalk.magenta(context.state.phase)} ${chalk.gray('(Phase 3/5)')}`);
        }

        console.log(`│ ${chalk.gray('Progress:')} ${chalk.green(context.progress.completed)}/${context.progress.total} tasks completed (${context.progress.percentage}%)`);
        if (context.progress.failed > 0) {
          console.log(`│ ${chalk.gray('Failed:')} ${chalk.red(context.progress.failed)} tasks`);
        }
        if (context.progress.inProgress > 0) {
          console.log(`│ ${chalk.gray('In Progress:')} ${chalk.yellow(context.progress.inProgress)} tasks`);
        }

        console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
        console.log(chalk.bold('│ 📝 NEXT TASK                                                    │'));
        console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
        console.log(`│ ${chalk.gray('ID:')} ${chalk.cyan(task.id)}`);
        console.log(`│ ${chalk.gray('Module:')} ${chalk.blue(task.module)}`);
        console.log(`│ ${chalk.gray('Priority:')} P${task.priority}`);
        console.log(`│ ${chalk.gray('Estimated:')} ${task.estimatedMinutes} min`);
        console.log(`│ ${chalk.gray('Status:')} ${chalk.yellow(task.status)}`);
        console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
        console.log(chalk.bold('│ Description:                                                    │'));
        console.log(`│ ${task.description}`);

        console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
        console.log(chalk.bold('│ Acceptance Criteria:                                            │'));
        task.acceptanceCriteria.forEach((criterion, index) => {
          console.log(`│ ${chalk.green(`${index + 1}.`)} ${criterion.slice(0, 58)}`);
        });

        if (dependencyStatus.length > 0) {
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          console.log(chalk.bold('│ Dependencies:                                                   │'));
          dependencyStatus.forEach(dep => {
            const icon = dep.satisfied ? '✅' : '❌';
            const statusColor = dep.satisfied ? 'green' : 'red';
            console.log(`│ ${icon} ${dep.id} (${chalk[statusColor](dep.status)})`);
          });
        }

        if (task.testRequirements) {
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          console.log(chalk.bold('│ Test Requirements:                                              │'));
          if (task.testRequirements.unit) {
            console.log(`│ ${chalk.gray('Unit:')} ${task.testRequirements.unit.pattern} ${task.testRequirements.unit.required ? chalk.red('(required)') : chalk.gray('(optional)')}`);
          }
          if (task.testRequirements.e2e) {
            console.log(`│ ${chalk.gray('E2E:')} ${task.testRequirements.e2e.pattern} ${task.testRequirements.e2e.required ? chalk.red('(required)') : chalk.gray('(optional)')}`);
          }
        }

        if (context.recentActivity.length > 0) {
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          console.log(chalk.bold('│ 📊 RECENT ACTIVITY (from progress.log)                          │'));
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          context.recentActivity.forEach((line: string) => {
            console.log(`│ ${chalk.gray(line.slice(0, 63))}`);
          });
        }

        console.log(chalk.bold('└─────────────────────────────────────────────────────────────────┘'));
      }
    });

  // Get specific task
  tasks
    .command('get <taskId>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      const task = TaskParser.parseTaskFile(filePath);

      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(chalk.bold(`Task: ${chalk.cyan(task.id)}`));
        console.log(`Module: ${task.module}`);
        console.log(`Priority: ${task.priority}`);
        console.log(`Status: ${task.status}`);
        console.log(`\nDescription: ${task.description}`);

        console.log(chalk.bold('\nAcceptance Criteria:'));
        task.acceptanceCriteria.forEach((criterion, index) => {
          console.log(`  ${index + 1}. ${criterion}`);
        });

        if (task.notes) {
          console.log(chalk.bold('\nNotes:'));
          console.log(task.notes);
        }
      }
    });

  // Update task status
  tasks
    .command('done <taskId>')
    .description('Mark task as completed')
    .option('-d, --duration <duration>', 'Task duration (e.g., "4m 32s")')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action((taskId, options) => {
      try {
        const filePath = indexManager.getTaskFilePath(taskId);

        if (!filePath) {
          handleError(Errors.taskNotFound(taskId), options.json);
        }

        const task = TaskParser.parseTaskFile(filePath);

        // Dry-run mode
        if (options.dryRun) {
          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'completed',
              affectedFiles: [filePath],
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Idempotent: Already completed is not an error
        if (task.status === 'completed') {
          const response = successResponse({
            taskId,
            status: 'completed',
            alreadyCompleted: true,
            message: 'Task already completed',
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.yellow(`⚠ Task ${taskId} is already completed`));
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        TaskWriter.updateTaskStatus(filePath, 'completed');
        indexManager.updateTaskStatus(taskId, 'completed');

        if (options.duration) {
          TaskWriter.appendNotes(filePath, `Completed in ${options.duration}`);
        }

        const response = successResponse({
          taskId,
          status: 'completed',
          previousStatus: task.status,
          duration: options.duration,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green(`✓ Task ${data.taskId} marked as completed`));
          if (data.duration) {
            console.log(`  Duration: ${data.duration}`);
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to mark task as done', error), options.json);
      }
    });

  // Mark task as failed
  tasks
    .command('fail <taskId>')
    .description('Mark task as failed')
    .requiredOption('-r, --reason <reason>', 'Failure reason')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action((taskId, options) => {
      try {
        const filePath = indexManager.getTaskFilePath(taskId);

        if (!filePath) {
          handleError(Errors.taskNotFound(taskId), options.json);
        }

        const task = TaskParser.parseTaskFile(filePath);

        // Dry-run mode
        if (options.dryRun) {
          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'failed',
              reason: options.reason,
              affectedFiles: [filePath],
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
            console.log(`  Reason: ${data.wouldUpdate.reason}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Idempotent: Already failed is acceptable (update reason)
        TaskWriter.updateTaskStatus(filePath, 'failed');
        indexManager.updateTaskStatus(taskId, 'failed');
        TaskWriter.appendNotes(filePath, `Failed: ${options.reason}`);

        const response = successResponse({
          taskId,
          status: 'failed',
          previousStatus: task.status,
          reason: options.reason,
          alreadyFailed: task.status === 'failed',
        });

        outputResponse(response, options.json, (data) => {
          if (data.alreadyFailed) {
            console.log(chalk.yellow(`⚠ Task ${data.taskId} was already failed, reason updated`));
          } else {
            console.log(chalk.red(`✗ Task ${data.taskId} marked as failed`));
          }
          console.log(`  Reason: ${data.reason}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to mark task as failed', error), options.json);
      }
    });

  // Mark task as in progress
  tasks
    .command('start <taskId>')
    .description('Mark task as in progress')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action((taskId, options) => {
      try {
        const filePath = indexManager.getTaskFilePath(taskId);

        if (!filePath) {
          handleError(Errors.taskNotFound(taskId), options.json);
        }

        const task = TaskParser.parseTaskFile(filePath);

        // Dry-run mode
        if (options.dryRun) {
          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'in_progress',
              affectedFiles: [filePath],
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Idempotent: Already in progress is not an error
        if (task.status === 'in_progress') {
          const response = successResponse({
            taskId,
            status: 'in_progress',
            alreadyInProgress: true,
            message: 'Task already in progress',
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.yellow(`⚠ Task ${taskId} is already in progress`));
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        TaskWriter.updateTaskStatus(filePath, 'in_progress');
        indexManager.updateTaskStatus(taskId, 'in_progress');

        const response = successResponse({
          taskId,
          status: 'in_progress',
          previousStatus: task.status,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.yellow(`→ Task ${data.taskId} started`));
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to start task', error), options.json);
      }
    });

  // Batch operations for multiple tasks
  tasks
    .command('batch')
    .description('Perform batch operations on multiple tasks')
    .requiredOption('--operations <json>', 'JSON array of operations')
    .option('--atomic', 'Rollback all on any failure (transactional)')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        let operations;
        try {
          operations = JSON.parse(options.operations);
        } catch (error) {
          handleError(Errors.invalidJson(error), options.json);
        }

        if (!Array.isArray(operations)) {
          handleError(Errors.invalidInput('Operations must be a JSON array'), options.json);
        }

        const results: any[] = [];
        const backupData: any[] = [];

        for (const op of operations) {
          try {
            const { action, taskId, ...params } = op;

            const filePath = indexManager.getTaskFilePath(taskId);
            if (!filePath) {
              throw new Error(`Task not found: ${taskId}`);
            }

            // Backup for atomic mode
            if (options.atomic) {
              const task = TaskParser.parseTaskFile(filePath);
              backupData.push({ taskId, filePath, originalTask: task });
            }

            // Perform operation
            let result: any = { taskId, action, success: true };

            switch (action) {
              case 'start':
                TaskWriter.updateTaskStatus(filePath, 'in_progress');
                indexManager.updateTaskStatus(taskId, 'in_progress');
                result.status = 'in_progress';
                break;

              case 'done':
                TaskWriter.updateTaskStatus(filePath, 'completed');
                indexManager.updateTaskStatus(taskId, 'completed');
                if (params.duration) {
                  TaskWriter.appendNotes(filePath, `Completed in ${params.duration}`);
                }
                result.status = 'completed';
                break;

              case 'fail':
                if (!params.reason) {
                  throw new Error('Reason required for fail action');
                }
                TaskWriter.updateTaskStatus(filePath, 'failed');
                indexManager.updateTaskStatus(taskId, 'failed');
                TaskWriter.appendNotes(filePath, `Failed: ${params.reason}`);
                result.status = 'failed';
                result.reason = params.reason;
                break;

              default:
                throw new Error(`Unknown action: ${action}`);
            }

            results.push(result);
          } catch (error) {
            results.push({
              taskId: op.taskId,
              action: op.action,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });

            // Rollback in atomic mode
            if (options.atomic) {
              for (const backup of backupData) {
                TaskWriter.updateTaskStatus(backup.filePath, backup.originalTask.status);
                indexManager.updateTaskStatus(backup.taskId, backup.originalTask.status);
              }
              handleError(Errors.invalidState(`Batch operation failed, rolled back: ${error}`), options.json);
            }
          }
        }

        const allSuccessful = results.every(r => r.success);
        const response = successResponse({
          totalOperations: operations.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          allSuccessful,
          results,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold('Batch Operations Result:'));
          console.log(`  Total: ${data.totalOperations}`);
          console.log(`  ${chalk.green(`Successful: ${data.successful}`)}`);
          if (data.failed > 0) {
            console.log(`  ${chalk.red(`Failed: ${data.failed}`)}`);
          }
        });

        process.exit(allSuccessful ? ExitCode.SUCCESS : ExitCode.GENERAL_ERROR);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to execute batch operations', error), options.json);
      }
    });
}
