import chalk from 'chalk';
import { ExitCode, getExitCodeFromErrorCode } from './exit-codes';

/**
 * Standardized CLI error structure
 */
export interface CLIError {
  /** Error code for programmatic handling */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional error details (stack trace, context) */
  details?: any;

  /** Whether the error can be recovered from */
  recoverable: boolean;

  /** Suggested action for the user/agent */
  suggestedAction?: string;
}

/**
 * Handle and output errors in a standardized format
 */
export function handleError(error: CLIError, jsonMode: boolean = false): never {
  if (jsonMode) {
    console.error(JSON.stringify({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        recoverable: error.recoverable,
        suggestedAction: error.suggestedAction,
      },
      timestamp: new Date().toISOString(),
    }, null, 2));
  } else {
    console.error(chalk.red(`✗ Error [${error.code}]: ${error.message}`));
    if (error.details) {
      console.error(chalk.gray(`  Details: ${JSON.stringify(error.details)}`));
    }
    if (error.suggestedAction) {
      console.error(chalk.yellow(`  💡 Suggestion: ${error.suggestedAction}`));
    }
  }

  const exitCode = getExitCodeFromErrorCode(error.code);
  process.exit(exitCode);
}

/**
 * Create a standardized error object
 */
export function createError(
  code: string,
  message: string,
  options: {
    details?: any;
    recoverable?: boolean;
    suggestedAction?: string;
  } = {}
): CLIError {
  return {
    code,
    message,
    details: options.details,
    recoverable: options.recoverable ?? false,
    suggestedAction: options.suggestedAction,
  };
}

/**
 * Common error creators
 */
export const Errors = {
  taskNotFound: (taskId: string): CLIError => createError(
    'TASK_NOT_FOUND',
    `Task "${taskId}" does not exist`,
    {
      recoverable: false,
      suggestedAction: 'Use "ralph-dev tasks list" to see available tasks',
    }
  ),

  stateNotFound: (): CLIError => createError(
    'STATE_NOT_FOUND',
    'No active ralph-dev session',
    {
      recoverable: false,
      suggestedAction: 'Start a new session with /ralph-dev command',
    }
  ),

  invalidInput: (message: string): CLIError => createError(
    'INVALID_INPUT',
    message,
    {
      recoverable: false,
    }
  ),

  invalidJson: (details: any): CLIError => createError(
    'INVALID_JSON',
    'Failed to parse JSON input',
    {
      details,
      recoverable: false,
      suggestedAction: 'Ensure JSON is properly formatted',
    }
  ),

  dependencyNotMet: (taskId: string, missingDeps: string[]): CLIError => createError(
    'DEPENDENCY_NOT_MET',
    `Task "${taskId}" has unsatisfied dependencies`,
    {
      details: { missingDeps },
      recoverable: true,
      suggestedAction: `Complete dependencies first: ${missingDeps.join(', ')}`,
    }
  ),

  alreadyExists: (resource: string, id: string): CLIError => createError(
    'ALREADY_EXISTS',
    `${resource} "${id}" already exists`,
    {
      recoverable: false,
    }
  ),

  invalidState: (message: string): CLIError => createError(
    'INVALID_STATE',
    message,
    {
      recoverable: false,
    }
  ),

  fileSystemError: (message: string, details?: any): CLIError => createError(
    'FILE_SYSTEM_ERROR',
    message,
    {
      details,
      recoverable: false,
    }
  ),

  validationError: (message: string, details?: any): CLIError => createError(
    'VALIDATION_ERROR',
    message,
    {
      details,
      recoverable: false,
      suggestedAction: 'Check input parameters and try again',
    }
  ),

  parsingError: (message: string, details?: any): CLIError => createError(
    'PARSING_ERROR',
    message,
    {
      details,
      recoverable: false,
      suggestedAction: 'Verify the input format is correct',
    }
  ),
};
