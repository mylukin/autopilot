import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';

interface State {
  phase: 'clarify' | 'breakdown' | 'implement' | 'heal' | 'deliver';
  currentTask?: string;
  prd?: any;
  errors?: any[];
  startedAt: string;
  updatedAt: string;
}

export function registerStateCommands(program: Command, workspaceDir: string): void {
  const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');

  const state = program.command('state').description('Manage ralph-dev state');

  // Get current state
  state
    .command('get')
    .description('Get current ralph-dev state')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        if (!fs.existsSync(stateFile)) {
          const response = successResponse({ phase: 'none', active: false });
          outputResponse(response, options.json, () => {
            console.log(chalk.yellow('No active ralph-dev session'));
          });
          process.exit(ExitCode.SUCCESS);
        }

        const state: State = fs.readJSONSync(stateFile);
        const response = successResponse({ ...state, active: true });

        outputResponse(response, options.json, () => {
          console.log(chalk.bold('Current State:'));
          console.log(`Phase: ${chalk.cyan(state.phase)}`);
          if (state.currentTask) {
            console.log(`Current Task: ${chalk.green(state.currentTask)}`);
          }
          console.log(`Started: ${state.startedAt}`);
          console.log(`Updated: ${state.updatedAt}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to read state file', error), options.json);
      }
    });

  // Set state
  state
    .command('set')
    .description('Set ralph-dev state')
    .requiredOption('-p, --phase <phase>', 'Current phase')
    .option('-t, --task <taskId>', 'Current task ID')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        const validPhases = ['clarify', 'breakdown', 'implement', 'heal', 'deliver'];
        if (!validPhases.includes(options.phase)) {
          handleError(
            Errors.invalidInput(`Invalid phase "${options.phase}". Valid phases: ${validPhases.join(', ')}`),
            options.json
          );
        }

        const newState: State = {
          phase: options.phase,
          currentTask: options.task,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (fs.existsSync(stateFile)) {
          const existingState: State = fs.readJSONSync(stateFile);
          newState.startedAt = existingState.startedAt;
          newState.prd = existingState.prd;
          newState.errors = existingState.errors;
        }

        fs.ensureDirSync(path.dirname(stateFile));
        fs.writeJSONSync(stateFile, newState, { spaces: 2 });

        const response = successResponse(newState, {
          operation: 'set',
          stateFile,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green('✓ State updated'));
          console.log(`  Phase: ${chalk.cyan(data.phase)}`);
          if (data.currentTask) {
            console.log(`  Task: ${chalk.green(data.currentTask)}`);
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to set state', error), options.json);
      }
    });

  // Update state field
  state
    .command('update')
    .description('Update specific state fields')
    .option('--phase <phase>', 'Update phase')
    .option('--task <taskId>', 'Update current task')
    .option('--prd <prdJson>', 'Update PRD (JSON string)')
    .option('--add-error <errorJson>', 'Add error (JSON string)')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        if (!fs.existsSync(stateFile)) {
          handleError(Errors.stateNotFound(), options.json);
        }

        const state: State = fs.readJSONSync(stateFile);
        const updatedFields: string[] = [];

        if (options.phase) {
          const validPhases = ['clarify', 'breakdown', 'implement', 'heal', 'deliver'];
          if (!validPhases.includes(options.phase)) {
            handleError(
              Errors.invalidInput(`Invalid phase "${options.phase}". Valid phases: ${validPhases.join(', ')}`),
              options.json
            );
          }
          state.phase = options.phase;
          updatedFields.push('phase');
        }

        if (options.task) {
          state.currentTask = options.task;
          updatedFields.push('currentTask');
        }

        if (options.prd) {
          try {
            state.prd = JSON.parse(options.prd);
            updatedFields.push('prd');
          } catch (error) {
            handleError(Errors.invalidJson(error), options.json);
          }
        }

        if (options.addError) {
          try {
            state.errors = state.errors || [];
            state.errors.push(JSON.parse(options.addError));
            updatedFields.push('errors');
          } catch (error) {
            handleError(Errors.invalidJson(error), options.json);
          }
        }

        state.updatedAt = new Date().toISOString();
        fs.writeJSONSync(stateFile, state, { spaces: 2 });

        const response = successResponse(state, {
          operation: 'update',
          updatedFields,
        });

        outputResponse(response, options.json, () => {
          console.log(chalk.green('✓ State updated'));
          console.log(`  Updated fields: ${updatedFields.join(', ')}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to update state', error), options.json);
      }
    });

  // Clear state
  state
    .command('clear')
    .description('Clear ralph-dev state')
    .option('--json', 'Output as JSON')
    .action((options) => {
      try {
        const existed = fs.existsSync(stateFile);

        if (existed) {
          fs.removeSync(stateFile);
        }

        const response = successResponse({
          cleared: existed,
          stateFile,
        });

        outputResponse(response, options.json, (data) => {
          if (data.cleared) {
            console.log(chalk.green('✓ State cleared'));
          } else {
            console.log(chalk.yellow('No state to clear'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to clear state', error), options.json);
      }
    });
}
