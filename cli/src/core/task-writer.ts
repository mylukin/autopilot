import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { Task } from './task-parser';

export class TaskWriter {
  /**
   * Write a task to a markdown file with YAML frontmatter
   */
  static writeTaskFile(tasksDir: string, task: Task): string {
    const { description, acceptanceCriteria, notes, ...frontmatter } = task;

    // Generate file path
    const module = task.module;
    const fileName = task.id.replace(`${module}.`, '') + '.md';
    const filePath = path.join(tasksDir, module, fileName);

    // Ensure directory exists
    fs.ensureDirSync(path.dirname(filePath));

    // Build markdown content
    let content = '---\n';
    content += yaml.stringify(frontmatter);
    content += '---\n\n';
    content += `# ${description}\n\n`;

    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      content += '## Acceptance Criteria\n\n';
      acceptanceCriteria.forEach((criterion, index) => {
        content += `${index + 1}. ${criterion}\n`;
      });
      content += '\n';
    }

    if (notes) {
      content += '## Notes\n\n';
      content += `${notes}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Update task status in the markdown file
   */
  static updateTaskStatus(filePath: string, status: Task['status']): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error(`Invalid task file format: ${filePath}`);
    }

    const [, frontmatterStr, body] = frontmatterMatch;
    const frontmatter = yaml.parse(frontmatterStr);

    frontmatter.status = status;

    const newContent = '---\n' + yaml.stringify(frontmatter) + '---\n' + body;
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  /**
   * Add notes to a task file
   */
  static appendNotes(filePath: string, newNotes: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error(`Invalid task file format: ${filePath}`);
    }

    const [, frontmatterStr, body] = frontmatterMatch;

    let newBody = body;
    const notesMatch = body.match(/##\s+Notes\s*\n([\s\S]+?)(?=\n##|$)/m);

    if (notesMatch) {
      // Append to existing notes
      const existingNotes = notesMatch[1].trim();
      newBody = body.replace(
        /##\s+Notes\s*\n[\s\S]+?(?=\n##|$)/m,
        `## Notes\n\n${existingNotes}\n\n${newNotes}\n`
      );
    } else {
      // Add new notes section
      newBody += `\n## Notes\n\n${newNotes}\n`;
    }

    const newContent = '---\n' + frontmatterStr + '\n---\n' + newBody;
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
}
