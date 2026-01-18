#!/usr/bin/env node

import { Command } from 'commander';
import { registerStateCommands } from './commands/state';
import { registerTaskCommands } from './commands/tasks';
import { registerDetectCommand } from './commands/detect';
import { registerDetectAICommand } from './commands/detect-ai';

const program = new Command();

// Get workspace directory (default to current directory)
const workspaceDir = process.env.AUTOPILOT_WORKSPACE || process.cwd();

program
  .name('autopilot-cli')
  .description('CLI tool for Autopilot - efficient operations for AI agents')
  .version('1.0.0');

// Register command groups
registerStateCommands(program, workspaceDir);
registerTaskCommands(program, workspaceDir);
registerDetectCommand(program, workspaceDir);
registerDetectAICommand(program, workspaceDir);

// Parse command line arguments
program.parse(process.argv);
