import chalk from 'chalk';

/**
 * Schema version for CLI outputs
 * Increment when making breaking changes to output format
 */
export const CLI_SCHEMA_VERSION = '1.0.0';

/**
 * Standardized CLI response structure
 */
export interface CLIResponse<T = any> {
  /** Schema version for compatibility checking */
  schemaVersion: string;

  /** Operation success status */
  success: boolean;

  /** Response data (type varies by command) */
  data?: T;

  /** Error information (only present if success=false) */
  error?: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
    suggestedAction?: string;
  };

  /** ISO timestamp of response */
  timestamp: string;

  /** Optional metadata */
  metadata?: {
    command?: string;
    executionTime?: number;
    [key: string]: any;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  metadata?: Record<string, any>
): CLIResponse<T> {
  return {
    schemaVersion: CLI_SCHEMA_VERSION,
    success: true,
    data,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  options: {
    details?: any;
    recoverable?: boolean;
    suggestedAction?: string;
    metadata?: Record<string, any>;
  } = {}
): CLIResponse<never> {
  return {
    schemaVersion: CLI_SCHEMA_VERSION,
    success: false,
    error: {
      code,
      message,
      details: options.details,
      recoverable: options.recoverable ?? false,
      suggestedAction: options.suggestedAction,
    },
    timestamp: new Date().toISOString(),
    metadata: options.metadata,
  };
}

/**
 * Output response in JSON or human-readable format
 */
export function outputResponse<T>(
  response: CLIResponse<T>,
  jsonMode: boolean,
  humanFormatter?: (data: T) => void
): void {
  if (jsonMode) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.success && humanFormatter && response.data) {
      humanFormatter(response.data);
    } else if (!response.success && response.error) {
      console.error(chalk.red(`✗ Error [${response.error.code}]: ${response.error.message}`));
      if (response.error.details) {
        console.error(chalk.gray(`  Details: ${JSON.stringify(response.error.details)}`));
      }
      if (response.error.suggestedAction) {
        console.error(chalk.yellow(`  💡 Suggestion: ${response.error.suggestedAction}`));
      }
    }
  }
}
