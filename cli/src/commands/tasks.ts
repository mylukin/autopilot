import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { TaskParser } from '../core/task-parser';
import { TaskWriter } from '../core/task-writer';
import { IndexManager } from '../core/index-manager';

export function registerTaskCommands(program: Command, workspaceDir: string): void {
  const tasksDir = path.join(workspaceDir, 'ai', 'tasks');
  const indexManager = new IndexManager(tasksDir);

  const tasks = program.command('tasks').description('Manage tasks');

  // List all tasks
  tasks
    .command('list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const index = indexManager.readIndex();

      let taskList = Object.entries(index.tasks);

      if (options.status) {
        taskList = taskList.filter(([, task]) => task.status === options.status);
      }

      taskList.sort(([, a], [, b]) => a.priority - b.priority);

      if (options.json) {
        console.log(JSON.stringify(taskList.map(([id, task]) => ({ id, ...task })), null, 2));
      } else {
        console.log(chalk.bold('Tasks:'));
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
      }
    });

  // Get next task
  tasks
    .command('next')
    .description('Get next task to work on')
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

      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(chalk.bold(`Next Task: ${chalk.cyan(task.id)}`));
        console.log(`Priority: ${task.priority}`);
        console.log(`Status: ${chalk.yellow(task.status)}`);
        console.log(`\nDescription: ${task.description}`);

        console.log(chalk.bold('\nAcceptance Criteria:'));
        task.acceptanceCriteria.forEach((criterion, index) => {
          console.log(`  ${index + 1}. ${criterion}`);
        });

        if (task.dependencies && task.dependencies.length > 0) {
          console.log(chalk.bold('\nDependencies:'));
          task.dependencies.forEach(dep => console.log(`  - ${dep}`));
        }

        if (task.testRequirements) {
          console.log(chalk.bold('\nTest Requirements:'));
          if (task.testRequirements.unit) {
            console.log(`  Unit: ${task.testRequirements.unit.pattern} (${task.testRequirements.unit.required ? 'required' : 'optional'})`);
          }
          if (task.testRequirements.e2e) {
            console.log(`  E2E: ${task.testRequirements.e2e.pattern} (${task.testRequirements.e2e.required ? 'required' : 'optional'})`);
          }
        }
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
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'completed');
      indexManager.updateTaskStatus(taskId, 'completed');

      if (options.duration) {
        TaskWriter.appendNotes(filePath, `Completed in ${options.duration}`);
      }

      console.log(chalk.green(`✓ Task ${taskId} marked as completed`));
    });

  // Mark task as failed
  tasks
    .command('fail <taskId>')
    .description('Mark task as failed')
    .requiredOption('-r, --reason <reason>', 'Failure reason')
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'failed');
      indexManager.updateTaskStatus(taskId, 'failed');
      TaskWriter.appendNotes(filePath, `Failed: ${options.reason}`);

      console.log(chalk.red(`✗ Task ${taskId} marked as failed`));
    });

  // Mark task as in progress
  tasks
    .command('start <taskId>')
    .description('Mark task as in progress')
    .action((taskId) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'in_progress');
      indexManager.updateTaskStatus(taskId, 'in_progress');

      console.log(chalk.yellow(`→ Task ${taskId} started`));
    });
}
