import * as fs from 'fs-extra';
import * as yaml from 'yaml';

export interface Task {
  id: string;
  module: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  estimatedMinutes?: number;
  dependencies?: string[];
  testRequirements?: {
    unit?: {
      required: boolean;
      pattern: string;
    };
    e2e?: {
      required: boolean;
      pattern: string;
    };
  };
  description: string;
  acceptanceCriteria: string[];
  notes?: string;
}

export class TaskParser {
  /**
   * Parse a markdown file with YAML frontmatter into a Task object
   */
  static parseTaskFile(filePath: string): Task {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split frontmatter and body
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error(`Invalid task file format: ${filePath}`);
    }

    const [, frontmatterStr, body] = frontmatterMatch;
    const frontmatter = yaml.parse(frontmatterStr);

    // Parse body sections
    const descriptionMatch = body.match(/^#\s+(.+)$/m);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    const criteriaMatch = body.match(/##\s+Acceptance Criteria\s*\n((?:\d+\.\s+.+\n?)+)/m);
    const acceptanceCriteria: string[] = [];

    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1];
      const criteriaLines = criteriaText.split('\n').filter(line => line.trim());
      criteriaLines.forEach(line => {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          acceptanceCriteria.push(match[1].trim());
        }
      });
    }

    const notesMatch = body.match(/##\s+Notes\s*\n([\s\S]+?)(?=\n##|$)/m);
    const notes = notesMatch ? notesMatch[1].trim() : undefined;

    return {
      ...frontmatter,
      description,
      acceptanceCriteria,
      notes,
    };
  }

  /**
   * Parse the index.json file
   */
  static parseIndex(indexPath: string): {
    version: string;
    updatedAt: string;
    metadata: {
      projectGoal: string;
      languageConfig?: any;
    };
    tasks: Record<string, {
      status: string;
      priority: number;
      module: string;
      description: string;
      filePath?: string;
    }>;
  } {
    if (!fs.existsSync(indexPath)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: {
          projectGoal: '',
        },
        tasks: {},
      };
    }

    return fs.readJSONSync(indexPath);
  }
}
