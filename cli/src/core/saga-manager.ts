/**
 * Saga Pattern Implementation for Phase Rollback
 *
 * Provides safe rollback mechanisms for each workflow phase.
 * Ensures production repos remain in consistent state even after failures.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

// ============================================================================
// SAGA STEP INTERFACE
// ============================================================================

/**
 * A single step in a saga with execute and compensate (rollback) logic
 */
export interface SagaStep {
  name: string;
  description: string;

  /**
   * Execute the forward action
   */
  execute: () => Promise<void>;

  /**
   * Compensate (rollback) the action if later steps fail
   */
  compensate: () => Promise<void>;

  /**
   * Check if this step was executed (for recovery)
   */
  wasExecuted?: () => boolean;
}

/**
 * Saga execution result
 */
export interface SagaResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
  rollbackPerformed: boolean;
  rollbackSuccessful?: boolean;
}

// ============================================================================
// SAGA EXECUTOR
// ============================================================================

export class SagaExecutor {
  private completedSteps: SagaStep[] = [];
  private workspaceDir: string;
  private sagaLogPath: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.sagaLogPath = path.join(workspaceDir, '.ralph-dev', 'saga.log');
  }

  /**
   * Execute saga with automatic rollback on failure
   */
  async execute(steps: SagaStep[]): Promise<SagaResult> {
    console.log(chalk.blue('🔄 Starting saga execution...'));
    console.log(chalk.gray(`   Steps: ${steps.length}`));
    console.log();

    this.logSagaEvent('saga_started', { stepCount: steps.length });

    try {
      // Execute each step sequentially
      for (const step of steps) {
        console.log(chalk.cyan(`▶️  Executing: ${step.name}`));
        console.log(chalk.gray(`   ${step.description}`));

        this.logSagaEvent('step_started', {
          step: step.name,
          description: step.description,
        });

        await step.execute();

        this.completedSteps.push(step);
        this.logSagaEvent('step_completed', { step: step.name });

        console.log(chalk.green(`✅ Completed: ${step.name}`));
        console.log();
      }

      // All steps succeeded
      this.logSagaEvent('saga_completed', {
        completedSteps: this.completedSteps.map(s => s.name),
      });

      console.log(chalk.green.bold('✅ Saga completed successfully!'));
      console.log();

      return {
        success: true,
        completedSteps: this.completedSteps.map(s => s.name),
        rollbackPerformed: false,
      };

    } catch (error) {
      // A step failed - rollback all completed steps
      const failedStep = steps[this.completedSteps.length]?.name || 'unknown';

      console.log();
      console.log(chalk.red.bold(`❌ Step failed: ${failedStep}`));
      console.log(chalk.red(`   Error: ${error instanceof Error ? error.message : String(error)}`));
      console.log();

      this.logSagaEvent('step_failed', {
        step: failedStep,
        error: error instanceof Error ? error.message : String(error),
      });

      // Perform rollback
      const rollbackSuccessful = await this.rollback();

      return {
        success: false,
        completedSteps: this.completedSteps.map(s => s.name),
        failedStep,
        error: error instanceof Error ? error : new Error(String(error)),
        rollbackPerformed: true,
        rollbackSuccessful,
      };
    }
  }

  /**
   * Rollback all completed steps in reverse order
   */
  async rollback(): Promise<boolean> {
    if (this.completedSteps.length === 0) {
      console.log(chalk.yellow('⚠️  No steps to roll back'));
      return true;
    }

    console.log(chalk.yellow.bold('🔙 Rolling back completed steps...'));
    console.log(chalk.gray(`   Steps to rollback: ${this.completedSteps.length}`));
    console.log();

    this.logSagaEvent('rollback_started', {
      stepsToRollback: this.completedSteps.map(s => s.name),
    });

    // Rollback in reverse order
    const stepsToRollback = [...this.completedSteps].reverse();
    const failedCompensations: { step: string; error: Error }[] = [];

    for (const step of stepsToRollback) {
      try {
        console.log(chalk.yellow(`↩️  Rolling back: ${step.name}`));

        await step.compensate();

        this.logSagaEvent('compensation_completed', { step: step.name });

        console.log(chalk.green(`✅ Rolled back: ${step.name}`));
        console.log();

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        console.log(chalk.red(`❌ Failed to roll back: ${step.name}`));
        console.log(chalk.red(`   Error: ${err.message}`));
        console.log();

        failedCompensations.push({ step: step.name, error: err });

        this.logSagaEvent('compensation_failed', {
          step: step.name,
          error: err.message,
        });
      }
    }

    const success = failedCompensations.length === 0;

    if (success) {
      console.log(chalk.green.bold('✅ Rollback completed successfully'));
      this.logSagaEvent('rollback_completed', { success: true });
    } else {
      console.log(chalk.red.bold('❌ Rollback partially failed'));
      console.log(chalk.red(`   ${failedCompensations.length} compensation(s) failed:`));
      failedCompensations.forEach(({ step, error }) => {
        console.log(chalk.red(`   - ${step}: ${error.message}`));
      });
      console.log();
      console.log(chalk.yellow('⚠️  Manual intervention required'));
      console.log(chalk.gray('   Check .ralph-dev/saga.log for details'));

      this.logSagaEvent('rollback_completed', {
        success: false,
        failedCompensations: failedCompensations.map(f => f.step),
      });
    }

    console.log();
    return success;
  }

  /**
   * Log saga events for debugging and recovery
   */
  private logSagaEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    // Ensure log directory exists
    fs.ensureDirSync(path.dirname(this.sagaLogPath));

    fs.appendFileSync(
      this.sagaLogPath,
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
  }

  /**
   * Recover from a previous failed saga
   */
  static async recover(workspaceDir: string): Promise<void> {
    const sagaLogPath = path.join(workspaceDir, '.ralph-dev', 'saga.log');

    if (!fs.existsSync(sagaLogPath)) {
      console.log(chalk.gray('No saga recovery needed'));
      return;
    }

    console.log(chalk.yellow('🔍 Checking for incomplete sagas...'));

    const logContent = fs.readFileSync(sagaLogPath, 'utf-8');
    const events = logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    const lastSagaStart = events.reverse().find(e => e.event === 'saga_started');
    const lastSagaComplete = events.find(
      e => e.event === 'saga_completed' || e.event === 'rollback_completed'
    );

    if (lastSagaStart && !lastSagaComplete) {
      console.log(chalk.yellow('⚠️  Found incomplete saga from previous session'));
      console.log(chalk.yellow('   Manual recovery recommended'));
      console.log(chalk.gray(`   Log file: ${sagaLogPath}`));
    } else {
      console.log(chalk.green('✅ No incomplete sagas found'));
    }

    console.log();
  }
}

// ============================================================================
// PHASE-SPECIFIC SAGA STEPS
// ============================================================================

/**
 * Phase 2: Task Breakdown Saga
 */
export class Phase2Saga {
  constructor(private workspaceDir: string) {}

  createSagaSteps(): SagaStep[] {
    const tasksDir = path.join(this.workspaceDir, '.ralph-dev', 'tasks');
    const indexPath = path.join(tasksDir, 'index.json');
    const backupDir = path.join(this.workspaceDir, '.ralph-dev', 'backups');

    return [
      {
        name: 'backup_existing_state',
        description: 'Backup existing tasks and index',
        execute: async () => {
          fs.ensureDirSync(backupDir);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = path.join(backupDir, `before-breakdown-${timestamp}`);

          if (fs.existsSync(tasksDir)) {
            fs.copySync(tasksDir, backupPath);
          }
        },
        compensate: async () => {
          // No compensation needed - backups are kept
        },
      },

      {
        name: 'initialize_tasks_directory',
        description: 'Create tasks directory structure',
        execute: async () => {
          fs.ensureDirSync(tasksDir);
        },
        compensate: async () => {
          if (fs.existsSync(tasksDir)) {
            fs.removeSync(tasksDir);
          }
        },
      },

      {
        name: 'create_task_index',
        description: 'Initialize task index.json',
        execute: async () => {
          const index = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            tasks: {},
            metadata: {},
          };
          fs.writeJSONSync(indexPath, index, { spaces: 2 });
        },
        compensate: async () => {
          if (fs.existsSync(indexPath)) {
            fs.removeSync(indexPath);
          }
        },
      },

      {
        name: 'verify_gitignore',
        description: 'Ensure .ralph-dev/ is gitignored',
        execute: async () => {
          const gitignorePath = path.join(this.workspaceDir, '.gitignore');
          let gitignoreContent = '';

          if (fs.existsSync(gitignorePath)) {
            gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
          }

          if (!gitignoreContent.includes('.ralph-dev/state.json')) {
            gitignoreContent += '\n# Ralph-dev temporary files\n';
            gitignoreContent += '.ralph-dev/state.json\n';
            gitignoreContent += '.ralph-dev/progress.log\n';
            gitignoreContent += '.ralph-dev/debug.log\n';
            gitignoreContent += '.ralph-dev/saga.log\n';
            gitignoreContent += '\n# Ralph-dev documentation (commit these)\n';
            gitignoreContent += '!.ralph-dev/prd.md\n';
            gitignoreContent += '!.ralph-dev/tasks/\n';

            fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
          }
        },
        compensate: async () => {
          // Don't remove gitignore entries - they're safe to keep
        },
      },
    ];
  }
}

/**
 * Phase 3: Implementation Saga
 */
export class Phase3Saga {
  constructor(private workspaceDir: string) {}

  createSagaSteps(): SagaStep[] {
    const backupDir = path.join(this.workspaceDir, '.ralph-dev', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stashName = `ralph-dev-phase3-${timestamp}`;

    return [
      {
        name: 'create_git_stash',
        description: 'Stash all changes before implementation',
        execute: async () => {
          try {
            // Check if there are changes to stash
            const status = execSync('git status --porcelain', {
              cwd: this.workspaceDir,
              encoding: 'utf-8',
            });

            if (status.trim()) {
              execSync(`git stash push -u -m "${stashName}"`, {
                cwd: this.workspaceDir,
                stdio: 'pipe',
              });

              // Save stash info for recovery
              const stashInfo = {
                name: stashName,
                timestamp,
                created: true,
              };

              fs.writeJSONSync(
                path.join(backupDir, `stash-${timestamp}.json`),
                stashInfo,
                { spaces: 2 }
              );
            }
          } catch (error) {
            // Ignore errors if not a git repo
          }
        },
        compensate: async () => {
          try {
            // Find the stash by name and pop it
            const stashList = execSync('git stash list', {
              cwd: this.workspaceDir,
              encoding: 'utf-8',
            });

            const stashMatch = stashList
              .split('\n')
              .find(line => line.includes(stashName));

            if (stashMatch) {
              const stashId = stashMatch.split(':')[0];
              execSync(`git stash pop ${stashId}`, {
                cwd: this.workspaceDir,
                stdio: 'inherit',
              });
            }
          } catch (error) {
            console.warn('Failed to restore git stash:', error);
          }
        },
      },

      {
        name: 'backup_task_states',
        description: 'Backup task states before execution',
        execute: async () => {
          const tasksIndexPath = path.join(this.workspaceDir, '.ralph-dev', 'tasks', 'index.json');

          if (fs.existsSync(tasksIndexPath)) {
            fs.ensureDirSync(backupDir);
            fs.copySync(
              tasksIndexPath,
              path.join(backupDir, `tasks-index-${timestamp}.json`)
            );
          }
        },
        compensate: async () => {
          const backupPath = path.join(backupDir, `tasks-index-${timestamp}.json`);
          const tasksIndexPath = path.join(this.workspaceDir, '.ralph-dev', 'tasks', 'index.json');

          if (fs.existsSync(backupPath)) {
            fs.copySync(backupPath, tasksIndexPath);
          }
        },
      },
    ];
  }
}

/**
 * Phase 5: Delivery Saga
 */
export class Phase5Saga {
  constructor(private workspaceDir: string) {}

  createSagaSteps(): SagaStep[] {
    let commitSha: string | null = null;
    let branchName: string | null = null;

    return [
      {
        name: 'create_feature_branch',
        description: 'Create feature branch if needed',
        execute: async () => {
          try {
            const currentBranch = execSync('git branch --show-current', {
              cwd: this.workspaceDir,
              encoding: 'utf-8',
            }).trim();

            const mainBranch = execSync(
              'git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed "s@^refs/remotes/origin/@@"',
              { cwd: this.workspaceDir, encoding: 'utf-8' }
            ).trim() || 'main';

            if (currentBranch === mainBranch) {
              const timestamp = Date.now();
              branchName = `ralph-dev/feature-${timestamp}`;

              execSync(`git checkout -b ${branchName}`, {
                cwd: this.workspaceDir,
                stdio: 'inherit',
              });
            }
          } catch (error) {
            // Not a git repo or other error - safe to ignore
          }
        },
        compensate: async () => {
          if (branchName) {
            try {
              const mainBranch = 'main';
              execSync(`git checkout ${mainBranch}`, {
                cwd: this.workspaceDir,
                stdio: 'inherit',
              });
              execSync(`git branch -D ${branchName}`, {
                cwd: this.workspaceDir,
                stdio: 'inherit',
              });
            } catch (error) {
              console.warn('Failed to delete feature branch:', error);
            }
          }
        },
      },

      {
        name: 'create_git_commit',
        description: 'Create git commit',
        execute: async () => {
          try {
            execSync('git add .', { cwd: this.workspaceDir, stdio: 'inherit' });

            // Commit will be created by Phase 5 skill
            // We just record the SHA for rollback
            commitSha = execSync('git rev-parse HEAD', {
              cwd: this.workspaceDir,
              encoding: 'utf-8',
            }).trim();
          } catch (error) {
            // Error will be caught by saga executor
            throw error;
          }
        },
        compensate: async () => {
          if (commitSha) {
            try {
              execSync(`git reset --hard ${commitSha}`, {
                cwd: this.workspaceDir,
                stdio: 'inherit',
              });
            } catch (error) {
              console.warn('Failed to reset git commit:', error);
            }
          }
        },
      },
    ];
  }
}

// ============================================================================
// SAGA FACTORY
// ============================================================================

export class SagaFactory {
  static createForPhase(phase: string, workspaceDir: string): SagaStep[] {
    switch (phase) {
      case 'breakdown':
        return new Phase2Saga(workspaceDir).createSagaSteps();

      case 'implement':
        return new Phase3Saga(workspaceDir).createSagaSteps();

      case 'deliver':
        return new Phase5Saga(workspaceDir).createSagaSteps();

      default:
        return [];
    }
  }
}
