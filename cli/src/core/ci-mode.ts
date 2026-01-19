/**
 * CI/CD Integration Mode
 *
 * Enables headless automation in CI/CD pipelines.
 * Unlocks enterprise use cases with GitHub Actions, GitLab CI, etc.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';

// ============================================================================
// CI CONFIGURATION
// ============================================================================

export interface CIConfig {
  enabled: boolean;
  auto_approve_breakdown: boolean;

  // Pre-defined answers for Phase 1 (no interactive questions)
  clarify_answers?: {
    project_type?: string;
    tech_stack?: string;
    scale?: string;
    auth?: string;
    deployment?: string;
    [key: string]: string | undefined;
  };

  // Resource limits for CI environment
  limits?: {
    max_tasks?: number;
    max_healing_time?: string;
    max_total_time?: string;
    max_healing_attempts_per_session?: number;
  };

  // Notifications
  notifications?: {
    slack_webhook?: string;
    webhook_url?: string;
    on_success?: boolean;
    on_failure?: boolean;
    on_healing?: boolean;
  };

  // Git configuration
  git?: {
    author?: string;
    committer?: string;
    branch_prefix?: string;
  };

  // PR configuration
  pr?: {
    labels?: string[];
    reviewers?: string[];
    auto_merge_on_success?: boolean;
  };
}

/**
 * CI Mode Runtime Context
 */
export interface CIModeContext {
  config: CIConfig;
  startTime: number;
  timeout: number;
  notificationsSent: number;
  resourcesUsed: {
    tasksCreated: number;
    healingAttempts: number;
  };
}

// ============================================================================
// CI CONFIG LOADER
// ============================================================================

export class CIConfigLoader {
  /**
   * Load CI configuration from file or environment
   */
  static load(workspaceDir: string): CIConfig {
    const configPath = path.join(workspaceDir, '.ralph-dev', 'ci-config.yml');

    // Default configuration
    let config: CIConfig = {
      enabled: false,
      auto_approve_breakdown: false,
    };

    // Load from file if exists
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const fileConfig = yaml.load(fileContent) as any;

        config = {
          ...config,
          ...fileConfig.ci_mode,
        };
      } catch (error) {
        console.warn(chalk.yellow('⚠️  Failed to load CI config:'), error);
      }
    }

    // Override with environment variables
    if (process.env.RALPH_DEV_CI_MODE === 'true') {
      config.enabled = true;
    }

    if (process.env.RALPH_DEV_AUTO_APPROVE === 'true') {
      config.auto_approve_breakdown = true;
    }

    if (process.env.SLACK_WEBHOOK_URL) {
      config.notifications = {
        ...config.notifications,
        slack_webhook: process.env.SLACK_WEBHOOK_URL,
      };
    }

    if (process.env.GIT_AUTHOR_NAME && process.env.GIT_AUTHOR_EMAIL) {
      config.git = {
        ...config.git,
        author: `${process.env.GIT_AUTHOR_NAME} <${process.env.GIT_AUTHOR_EMAIL}>`,
      };
    }

    return config;
  }

  /**
   * Create default CI config template
   */
  static createTemplate(workspaceDir: string): void {
    const configPath = path.join(workspaceDir, '.ralph-dev', 'ci-config.yml');

    const template = `# Ralph-dev CI/CD Configuration
# This file enables headless automation in CI/CD pipelines

ci_mode:
  enabled: true
  auto_approve_breakdown: true

  # Pre-defined answers for Phase 1 clarification
  # This eliminates interactive questions in CI environment
  clarify_answers:
    project_type: "Web app"
    tech_stack: "TypeScript"
    scale: "Production"
    auth: "Basic"
    deployment: "Cloud"

  # Resource limits to prevent runaway automation
  limits:
    max_tasks: 100
    max_healing_time: "30m"
    max_total_time: "2h"
    max_healing_attempts_per_session: 10

  # Notifications (use environment variables for secrets)
  notifications:
    slack_webhook: "\${SLACK_WEBHOOK_URL}"
    on_success: true
    on_failure: true
    on_healing: true

  # Git configuration
  git:
    author: "Ralph CI <[email protected]>"
    committer: "Ralph CI <[email protected]>"
    branch_prefix: "ralph-dev/"

  # Pull Request configuration
  pr:
    labels:
      - "auto-generated"
      - "ralph-dev"
    reviewers: []
    auto_merge_on_success: false
`;

    fs.writeFileSync(configPath, template, 'utf-8');
    console.log(chalk.green(`✅ Created CI config template: ${configPath}`));
  }

  /**
   * Validate CI configuration
   */
  static validate(config: CIConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.enabled) {
      if (!config.clarify_answers || Object.keys(config.clarify_answers).length === 0) {
        errors.push(
          'CI mode enabled but no clarify_answers provided. ' +
          'Interactive questions will fail in headless mode.'
        );
      }

      if (config.limits) {
        if (config.limits.max_tasks !== undefined && config.limits.max_tasks < 1) {
          errors.push('limits.max_tasks must be >= 1');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// CI MODE MANAGER
// ============================================================================

export class CIModeManager {
  private context: CIModeContext;
  private workspaceDir: string;

  constructor(workspaceDir: string, config: CIConfig) {
    this.workspaceDir = workspaceDir;

    const timeoutMs = this.parseTimeout(config.limits?.max_total_time || '2h');

    this.context = {
      config,
      startTime: Date.now(),
      timeout: timeoutMs,
      notificationsSent: 0,
      resourcesUsed: {
        tasksCreated: 0,
        healingAttempts: 0,
      },
    };
  }

  /**
   * Check if CI mode is enabled
   */
  isEnabled(): boolean {
    return this.context.config.enabled;
  }

  /**
   * Get clarification answers (for Phase 1)
   */
  getClarifyAnswers(): Record<string, string> | undefined {
    const answers = this.context.config.clarify_answers;
    if (!answers) return undefined;

    // Filter out undefined values to match return type
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  /**
   * Check if breakdown should be auto-approved
   */
  shouldAutoApproveBreakdown(): boolean {
    return this.context.config.auto_approve_breakdown;
  }

  /**
   * Check if timeout has been exceeded
   */
  checkTimeout(): { exceeded: boolean; elapsed: number; remaining: number } {
    const elapsed = Date.now() - this.context.startTime;
    const remaining = this.context.timeout - elapsed;

    return {
      exceeded: remaining <= 0,
      elapsed: Math.floor(elapsed / 1000),
      remaining: Math.max(0, Math.floor(remaining / 1000)),
    };
  }

  /**
   * Check if resource quota has been exceeded
   */
  checkResourceQuota(resource: 'tasks' | 'healing'): {
    exceeded: boolean;
    current: number;
    limit: number;
  } {
    const limits = this.context.config.limits;

    if (resource === 'tasks') {
      const limit = limits?.max_tasks || Infinity;
      const current = this.context.resourcesUsed.tasksCreated;

      return {
        exceeded: current >= limit,
        current,
        limit: limit === Infinity ? 0 : limit,
      };
    }

    if (resource === 'healing') {
      const limit = limits?.max_healing_attempts_per_session || Infinity;
      const current = this.context.resourcesUsed.healingAttempts;

      return {
        exceeded: current >= limit,
        current,
        limit: limit === Infinity ? 0 : limit,
      };
    }

    return { exceeded: false, current: 0, limit: 0 };
  }

  /**
   * Record resource usage
   */
  recordResourceUsage(resource: 'tasks' | 'healing', amount: number = 1): void {
    if (resource === 'tasks') {
      this.context.resourcesUsed.tasksCreated += amount;
    } else if (resource === 'healing') {
      this.context.resourcesUsed.healingAttempts += amount;
    }
  }

  /**
   * Send notification
   */
  async sendNotification(event: 'success' | 'failure' | 'healing', data: any): Promise<void> {
    const notifications = this.context.config.notifications;

    if (!notifications) return;

    // Check if this event type should trigger notification
    if (event === 'success' && !notifications.on_success) return;
    if (event === 'failure' && !notifications.on_failure) return;
    if (event === 'healing' && !notifications.on_healing) return;

    // Send to Slack if webhook configured
    if (notifications.slack_webhook) {
      await this.sendSlackNotification(notifications.slack_webhook, event, data);
    }

    // Send to generic webhook if configured
    if (notifications.webhook_url) {
      await this.sendWebhookNotification(notifications.webhook_url, event, data);
    }

    this.context.notificationsSent++;
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(webhook: string, event: string, data: any): Promise<void> {
    try {
      const color = event === 'success' ? 'good' : event === 'failure' ? 'danger' : 'warning';
      const emoji = event === 'success' ? '✅' : event === 'failure' ? '❌' : '🔧';

      const payload = {
        attachments: [
          {
            color,
            title: `${emoji} Ralph-dev ${event}`,
            fields: Object.entries(data).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
            footer: 'Ralph-dev CI',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(chalk.yellow('⚠️  Failed to send Slack notification'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Slack notification error:'), error);
    }
  }

  /**
   * Send generic webhook notification
   */
  private async sendWebhookNotification(url: string, event: string, data: any): Promise<void> {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(chalk.yellow('⚠️  Failed to send webhook notification'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Webhook notification error:'), error);
    }
  }

  /**
   * Configure git for CI environment
   */
  configureGit(): void {
    const gitConfig = this.context.config.git;

    if (!gitConfig) return;

    try {
      if (gitConfig.author) {
        const [name, email] = this.parseGitIdentity(gitConfig.author);
        process.env.GIT_AUTHOR_NAME = name;
        process.env.GIT_AUTHOR_EMAIL = email;
      }

      if (gitConfig.committer) {
        const [name, email] = this.parseGitIdentity(gitConfig.committer);
        process.env.GIT_COMMITTER_NAME = name;
        process.env.GIT_COMMITTER_EMAIL = email;
      }

      console.log(chalk.gray('✓ Git configured for CI environment'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to configure git:'), error);
    }
  }

  /**
   * Parse git identity string "Name <email>"
   */
  private parseGitIdentity(identity: string): [string, string] {
    const match = identity.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
    return ['Ralph CI', '[email protected]'];
  }

  /**
   * Parse timeout string to milliseconds
   */
  private parseTimeout(timeout: string): number {
    const match = timeout.match(/^(\d+)([smh])$/);
    if (!match) return 2 * 60 * 60 * 1000; // Default 2 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        return 2 * 60 * 60 * 1000;
    }
  }

  /**
   * Get final report for CI output
   */
  getFinalReport(): CIReport {
    const timeoutCheck = this.checkTimeout();

    return {
      success: !timeoutCheck.exceeded,
      duration: timeoutCheck.elapsed,
      resourcesUsed: this.context.resourcesUsed,
      notificationsSent: this.context.notificationsSent,
      config: {
        autoApprove: this.context.config.auto_approve_breakdown,
        limits: this.context.config.limits,
      },
    };
  }
}

export interface CIReport {
  success: boolean;
  duration: number;
  resourcesUsed: {
    tasksCreated: number;
    healingAttempts: number;
  };
  notificationsSent: number;
  config: {
    autoApprove: boolean;
    limits?: CIConfig['limits'];
  };
}

// ============================================================================
// CI MODE EXIT CODES
// ============================================================================

export enum CIExitCode {
  SUCCESS = 0,           // All tasks completed, PR created
  PARTIAL_FAILURE = 1,   // Some tasks failed, PR created with warnings
  FATAL_ERROR = 2,       // Workflow couldn't complete
  TIMEOUT = 3,           // Exceeded max_total_time
  QUOTA_EXCEEDED = 4,    // Exceeded resource quotas
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Print CI mode banner
 */
export function printCIBanner(config: CIConfig): void {
  console.log();
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('   🤖 RALPH-DEV CI/CD MODE'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log();
  console.log(chalk.cyan('Configuration:'));
  console.log(chalk.gray(`  • Auto-approve breakdown: ${config.auto_approve_breakdown}`));
  console.log(chalk.gray(`  • Max tasks: ${config.limits?.max_tasks || 'unlimited'}`));
  console.log(chalk.gray(`  • Max time: ${config.limits?.max_total_time || '2h'}`));
  console.log(chalk.gray(`  • Notifications: ${config.notifications ? 'enabled' : 'disabled'}`));
  console.log();
}

/**
 * Print final CI report
 */
export function printCIReport(report: CIReport): void {
  console.log();
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('   📊 CI MODE FINAL REPORT'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log();
  console.log(chalk.cyan('Duration:'));
  console.log(chalk.gray(`  ${formatDuration(report.duration)}`));
  console.log();
  console.log(chalk.cyan('Resources Used:'));
  console.log(chalk.gray(`  • Tasks created: ${report.resourcesUsed.tasksCreated}`));
  console.log(chalk.gray(`  • Healing attempts: ${report.resourcesUsed.healingAttempts}`));
  console.log(chalk.gray(`  • Notifications sent: ${report.notificationsSent}`));
  console.log();
  console.log(chalk.cyan('Result:'));
  console.log(report.success ? chalk.green('  ✅ SUCCESS') : chalk.red('  ❌ FAILURE'));
  console.log();
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
