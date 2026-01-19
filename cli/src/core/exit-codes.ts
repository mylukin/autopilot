/**
 * Semantic exit codes for AI-agent-friendly error handling
 * Allows agents to determine failure types without parsing output
 */
export enum ExitCode {
  /** Command executed successfully */
  SUCCESS = 0,

  /** General error - use more specific codes when possible */
  GENERAL_ERROR = 1,

  /** Invalid command arguments or options */
  INVALID_INPUT = 2,

  /** Requested resource not found (task, state, file) */
  NOT_FOUND = 3,

  /** Task dependencies not satisfied */
  DEPENDENCY_NOT_MET = 4,

  /** Permission denied or unauthorized operation */
  PERMISSION_DENIED = 5,

  /** Resource already exists (duplicate task ID) */
  ALREADY_EXISTS = 6,

  /** Invalid state transition or operation */
  INVALID_STATE = 7,

  /** File system operation failed */
  FILE_SYSTEM_ERROR = 8,

  /** JSON parsing or validation failed */
  PARSE_ERROR = 9,
}

/**
 * Get exit code from error code string
 */
export function getExitCodeFromErrorCode(code: string): ExitCode {
  const mapping: Record<string, ExitCode> = {
    'TASK_NOT_FOUND': ExitCode.NOT_FOUND,
    'STATE_NOT_FOUND': ExitCode.NOT_FOUND,
    'FILE_NOT_FOUND': ExitCode.NOT_FOUND,
    'INVALID_INPUT': ExitCode.INVALID_INPUT,
    'INVALID_JSON': ExitCode.PARSE_ERROR,
    'DEPENDENCY_NOT_MET': ExitCode.DEPENDENCY_NOT_MET,
    'ALREADY_EXISTS': ExitCode.ALREADY_EXISTS,
    'INVALID_STATE': ExitCode.INVALID_STATE,
    'FILE_SYSTEM_ERROR': ExitCode.FILE_SYSTEM_ERROR,
  };

  return mapping[code] || ExitCode.GENERAL_ERROR;
}
