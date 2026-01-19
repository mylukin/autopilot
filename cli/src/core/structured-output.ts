/**
 * Structured Output Tools for Agent Communication
 *
 * Replaces brittle YAML parsing with Claude's native tool calling.
 * This eliminates ~25% of task failures caused by parsing errors.
 */

import { z } from 'zod';

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

/**
 * Implementation Result Tool Schema
 * Agents MUST call this tool to report task completion
 */
export const implementationResultSchema = z.object({
  task_id: z.string().describe('The task ID that was implemented'),
  status: z.enum(['success', 'failed']).describe('Overall implementation status'),
  verification_passed: z.boolean().describe('Whether verification tests passed'),

  // Test metrics
  tests_passing: z.string().optional().describe('Tests passing count (e.g., "24/24")'),
  coverage: z.number().min(0).max(100).optional().describe('Code coverage percentage'),

  // Files modified
  files_modified: z.array(z.string()).optional().describe('List of files created or modified'),

  // Execution details
  duration: z.string().optional().describe('Time taken (e.g., "4m32s")'),

  // Acceptance criteria
  acceptance_criteria_met: z.string().optional().describe('Criteria met count (e.g., "5/5")'),

  // Confidence scoring (new feature)
  confidence_score: z.number().min(0).max(1).optional().describe('Agent confidence level (0.0-1.0)'),
  low_confidence_decisions: z.array(z.string()).optional().describe('Decisions made with low confidence'),

  // Notes and context
  notes: z.string().describe('Brief summary of implementation, decisions, or issues'),
});

export type ImplementationResult = z.infer<typeof implementationResultSchema>;

/**
 * Healing Result Tool Schema
 * Phase 4 healing agents report results via this tool
 */
export const healingResultSchema = z.object({
  task_id: z.string().describe('The task ID being healed'),
  status: z.enum(['success', 'failed']).describe('Healing outcome'),
  verification_passed: z.boolean().describe('Whether tests pass after healing'),

  attempts: z.number().min(1).max(3).describe('Number of healing attempts made'),
  fix_type: z.enum(['dependency', 'code', 'implementation', 'config', 'unknown'])
    .describe('Type of fix applied'),

  hypothesis: z.string().describe('Root cause hypothesis'),
  solution_applied: z.string().optional().describe('What was done to fix the issue'),

  notes: z.string().describe('Healing process summary'),
});

export type HealingResult = z.infer<typeof healingResultSchema>;

/**
 * Clarification Questions Tool Schema
 * Phase 1 agents output structured questions
 */
export const clarificationQuestionsSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('The question to ask'),
    header: z.string().max(12).describe('Short label (max 12 chars)'),
    multiSelect: z.boolean().describe('Allow multiple selections'),
    options: z.array(z.object({
      label: z.string().describe('Option display text'),
      description: z.string().describe('Explanation of this option'),
    })).min(2).max(4),
  })).min(1).max(4),
});

export type ClarificationQuestions = z.infer<typeof clarificationQuestionsSchema>;

// ============================================================================
// TOOL DEFINITIONS (for Claude API)
// ============================================================================

export const TOOL_DEFINITIONS = {
  report_implementation_result: {
    name: 'report_implementation_result',
    description: 'Report the result of task implementation. MUST be called when task is complete.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The task ID that was implemented' },
        status: {
          type: 'string',
          enum: ['success', 'failed'],
          description: 'Overall implementation status'
        },
        verification_passed: {
          type: 'boolean',
          description: 'Whether verification tests passed'
        },
        tests_passing: {
          type: 'string',
          description: 'Tests passing count (e.g., "24/24")'
        },
        coverage: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Code coverage percentage'
        },
        files_modified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files created or modified'
        },
        duration: {
          type: 'string',
          description: 'Time taken (e.g., "4m32s")'
        },
        acceptance_criteria_met: {
          type: 'string',
          description: 'Criteria met count (e.g., "5/5")'
        },
        confidence_score: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Agent confidence level (0.0-1.0)'
        },
        low_confidence_decisions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Decisions made with low confidence'
        },
        notes: {
          type: 'string',
          description: 'Brief summary of implementation, decisions, or issues'
        },
      },
      required: ['task_id', 'status', 'verification_passed', 'notes'],
    },
  },

  report_healing_result: {
    name: 'report_healing_result',
    description: 'Report the result of error healing attempt. MUST be called when healing completes.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The task ID being healed' },
        status: {
          type: 'string',
          enum: ['success', 'failed'],
          description: 'Healing outcome'
        },
        verification_passed: {
          type: 'boolean',
          description: 'Whether tests pass after healing'
        },
        attempts: {
          type: 'number',
          minimum: 1,
          maximum: 3,
          description: 'Number of healing attempts made'
        },
        fix_type: {
          type: 'string',
          enum: ['dependency', 'code', 'implementation', 'config', 'unknown'],
          description: 'Type of fix applied'
        },
        hypothesis: {
          type: 'string',
          description: 'Root cause hypothesis'
        },
        solution_applied: {
          type: 'string',
          description: 'What was done to fix the issue'
        },
        notes: {
          type: 'string',
          description: 'Healing process summary'
        },
      },
      required: ['task_id', 'status', 'verification_passed', 'attempts', 'fix_type', 'hypothesis', 'notes'],
    },
  },

  output_clarification_questions: {
    name: 'output_clarification_questions',
    description: 'Output structured clarification questions for the user. MUST be called after analyzing requirements.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'The question to ask' },
              header: {
                type: 'string',
                maxLength: 12,
                description: 'Short label (max 12 chars)'
              },
              multiSelect: {
                type: 'boolean',
                description: 'Allow multiple selections'
              },
              options: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', description: 'Option display text' },
                    description: { type: 'string', description: 'Explanation of this option' },
                  },
                  required: ['label', 'description'],
                },
              },
            },
            required: ['question', 'header', 'multiSelect', 'options'],
          },
        },
      },
      required: ['questions'],
    },
  },
};

// ============================================================================
// PARSER WITH FALLBACK
// ============================================================================

/**
 * Parse agent output with multiple fallback strategies
 *
 * Strategy 1: Extract tool call (preferred)
 * Strategy 2: Extract JSON block
 * Strategy 3: Fuzzy match YAML block (legacy compatibility)
 * Strategy 4: Error with helpful message
 */
export class StructuredOutputParser {
  /**
   * Parse implementation result from agent output
   */
  static parseImplementationResult(output: string): ImplementationResult {
    // Strategy 1: Look for tool call in output
    const toolCall = this.extractToolCall(output, 'report_implementation_result');
    if (toolCall) {
      return implementationResultSchema.parse(toolCall);
    }

    // Strategy 2: Look for JSON block
    const jsonBlock = this.extractJSONBlock(output, 'task_id');
    if (jsonBlock) {
      return implementationResultSchema.parse(jsonBlock);
    }

    // Strategy 3: Fuzzy match YAML block (legacy compatibility)
    const yamlBlock = this.extractYAMLBlock(output, [
      '---IMPLEMENTATION RESULT---',
      '---IMPLEMENTATION RESULTS---',
      '--- IMPLEMENTATION RESULT ---',
    ]);
    if (yamlBlock) {
      const parsed = this.parseYAML(yamlBlock);
      return implementationResultSchema.parse(parsed);
    }

    // Strategy 4: Error with helpful message
    throw new Error(
      'Agent did not return structured output.\n\n' +
      'Expected agent to call report_implementation_result tool or output JSON/YAML.\n\n' +
      'This usually means:\n' +
      '1. Agent asked a question instead of completing the task\n' +
      '2. Agent encountered an error and stopped\n' +
      '3. Agent output was truncated\n\n' +
      'Last 200 chars of output:\n' +
      output.slice(-200)
    );
  }

  /**
   * Parse healing result from agent output
   */
  static parseHealingResult(output: string): HealingResult {
    const toolCall = this.extractToolCall(output, 'report_healing_result');
    if (toolCall) {
      return healingResultSchema.parse(toolCall);
    }

    const jsonBlock = this.extractJSONBlock(output, 'task_id');
    if (jsonBlock) {
      return healingResultSchema.parse(jsonBlock);
    }

    const yamlBlock = this.extractYAMLBlock(output, [
      '---HEALING RESULT---',
      '--- HEALING RESULT ---',
    ]);
    if (yamlBlock) {
      const parsed = this.parseYAML(yamlBlock);
      return healingResultSchema.parse(parsed);
    }

    throw new Error('Agent did not return healing result');
  }

  /**
   * Extract tool call from Claude API response
   */
  private static extractToolCall(output: string, toolName: string): any | null {
    // Look for tool call pattern in output
    const toolCallPattern = new RegExp(
      `<tool_call>\\s*<name>${toolName}</name>\\s*<input>([\\s\\S]*?)</input>\\s*</tool_call>`,
      'i'
    );

    const match = output.match(toolCallPattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        // Invalid JSON in tool call
        return null;
      }
    }

    return null;
  }

  /**
   * Extract JSON block from output
   */
  private static extractJSONBlock(output: string, requiredField: string): any | null {
    // Look for JSON object containing required field
    const jsonPattern = new RegExp(
      `\\{[\\s\\S]*?"${requiredField}"[\\s\\S]*?\\}`,
      'g'
    );

    const matches = output.match(jsonPattern);
    if (matches) {
      // Try each match (there might be multiple JSON objects)
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed[requiredField]) {
            return parsed;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract YAML block with fuzzy delimiter matching
   */
  private static extractYAMLBlock(output: string, delimiters: string[]): string | null {
    for (const startDelimiter of delimiters) {
      // Construct end delimiter by inserting "END " after the dashes
      // "---IMPLEMENTATION RESULT---" -> "---END IMPLEMENTATION RESULT---"
      const endDelimiter = startDelimiter.replace(/^---/, '---END ');

      const pattern = new RegExp(
        `${this.escapeRegex(startDelimiter)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(endDelimiter)}`,
        'i'
      );

      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Parse YAML string to object
   */
  private static parseYAML(yaml: string): any {
    const result: any = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value: any = trimmed.slice(colonIndex + 1).trim();

      // Parse value type
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      else if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string
        }
      }
      // Handle comma-separated arrays (common in legacy YAML format)
      else if (key === 'files_modified' || key === 'dependencies') {
        value = value.split(',').map((v: string) => v.trim()).filter((v: string) => v);
      }
      // Handle slash-separated arrays (alternative format)
      else if (value.includes('/') && (key.includes('passing') || key.includes('criteria'))) {
        // Keep as string for "15/15" or "3/3" format
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Escape regex special characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate implementation result and provide actionable errors
 */
export function validateImplementationResult(result: ImplementationResult): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!result.task_id) {
    errors.push('Missing task_id');
  }

  if (!result.status) {
    errors.push('Missing status (must be "success" or "failed")');
  }

  if (result.verification_passed === undefined) {
    errors.push('Missing verification_passed boolean');
  }

  if (!result.notes) {
    errors.push('Missing notes field (should contain implementation summary)');
  }

  // Logical consistency checks
  if (result.status === 'success' && result.verification_passed === false) {
    warnings.push('Status is "success" but verification_passed is false - inconsistent');
  }

  if (result.status === 'failed' && result.verification_passed === true) {
    warnings.push('Status is "failed" but verification_passed is true - inconsistent');
  }

  // Low confidence warnings
  if (result.confidence_score && result.confidence_score < 0.6) {
    warnings.push(
      `Low confidence score (${result.confidence_score}). ` +
      `Decisions: ${result.low_confidence_decisions?.join(', ') || 'not specified'}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
