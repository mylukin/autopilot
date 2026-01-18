# Autopilot CLI | 自动驾驶命令行工具

**Version:** 1.0.0
**Language:** TypeScript
**Purpose:** Efficient operations for Autopilot skills

用TypeScript实现的高效命令行工具，供Autopilot技能调用。

---

## Overview | 概述

The Autopilot CLI is a TypeScript-based command-line tool that provides fast, reliable operations for:

- Task management (CRUD)
- State management
- PRD parsing and generation
- Language detection
- Verification execution

Autopilot CLI是一个基于TypeScript的命令行工具，提供快速、可靠的操作。

---

## Installation | 安装

```bash
# Install dependencies
cd autopilot/cli
npm install

# Build
npm run build

# Link globally (optional)
npm link

# Or use directly
npx autopilot-cli <command>
```

---

## Architecture | 架构

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── state.ts
│   │   ├── tasks.ts
│   │   ├── prd.ts
│   │   ├── verify.ts
│   │   ├── breakdown.ts
│   │   └── detect.ts
│   ├── core/                 # Core utilities
│   │   ├── task-parser.ts    # Parse markdown tasks
│   │   ├── task-writer.ts    # Write markdown tasks
│   │   ├── index-manager.ts  # Manage index.json
│   │   └── file-utils.ts
│   ├── language/             # Language-specific logic
│   │   ├── detector.ts
│   │   ├── typescript.ts
│   │   ├── python.ts
│   │   ├── go.ts
│   │   └── rust.ts
│   └── templates/            # Code templates
│       ├── typescript/
│       ├── python/
│       ├── go/
│       └── rust/
└── bin/
    └── autopilot-cli.js
```

---

## Commands Reference | 命令参考

### State Management | 状态管理

```bash
# Get state value
autopilot-cli state get <key>
autopilot-cli state get phase
# Output: "implement"

# Set state value
autopilot-cli state set <key> <value>
autopilot-cli state set phase deliver

# Update multiple values (JSON)
autopilot-cli state update '<json>'
autopilot-cli state update '{"autoFixes": 3}'

# Show full state
autopilot-cli state show
autopilot-cli state show --json

# Initialize state
autopilot-cli state init "<requirement>"
```

### Task Management | 任务管理

```bash
# List tasks
autopilot-cli tasks list
autopilot-cli tasks list --status pending
autopilot-cli tasks list --module auth
autopilot-cli tasks list --json

# Get next task
autopilot-cli tasks next
autopilot-cli tasks next --json

# Get specific task
autopilot-cli tasks get <task-id>
autopilot-cli tasks get auth.login.ui
autopilot-cli tasks get auth.login.ui --json

# Create task
autopilot-cli tasks create \
  --id <id> \
  --module <module> \
  --title "<title>" \
  --priority <number> \
  --criteria "<criterion>" \
  --estimated <minutes>

# Mark complete
autopilot-cli tasks done <task-id> \
  --duration "<duration>" \
  --files "<comma-separated>"

# Mark failed
autopilot-cli tasks fail <task-id> \
  --reason "<reason>"

# Update task
autopilot-cli tasks update <task-id> \
  --status <status> \
  --priority <number>

# Show progress
autopilot-cli tasks progress
```

### PRD Operations | PRD操作

```bash
# Parse PRD
autopilot-cli prd parse <file>
autopilot-cli prd parse ai/prd.md
autopilot-cli prd parse ai/prd.md --json

# Generate tasks from PRD
autopilot-cli prd generate-tasks <file>
autopilot-cli prd generate-tasks ai/prd.md --output ai/tasks/

# Validate PRD
autopilot-cli prd validate <file>
```

### Language Detection | 语言检测

```bash
# Detect language
autopilot-cli detect language
autopilot-cli detect language --json

# Detect framework
autopilot-cli detect framework

# Detect test framework
autopilot-cli detect test-framework

# Get verification commands
autopilot-cli detect verify-commands
autopilot-cli detect verify-commands --json
```

### Verification | 验证

```bash
# Run verification
autopilot-cli verify
autopilot-cli verify --language typescript
autopilot-cli verify --language python

# Custom commands
autopilot-cli verify --command "npm test" --command "npm run build"

# Parse test output
autopilot-cli verify parse-test-output <file>
```

### Breakdown | 任务拆解

```bash
# Decompose user story
autopilot-cli breakdown story \
  --text "<story>" \
  --language <lang> \
  --tech-stack "<stack>"

# Validate task size
autopilot-cli breakdown validate-size <task-file>

# Split oversized task
autopilot-cli breakdown split <task-file>

# Validate all tasks
autopilot-cli breakdown validate-all <tasks-dir>
```

---

## Implementation Examples | 实现示例

### 1. Task Parser | 任务解析器

```typescript
// cli/src/core/task-parser.ts

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

interface Task {
  id: string;
  module: string;
  priority: number;
  status: 'pending' | 'passing' | 'failing' | 'blocked';
  estimatedMinutes?: number;
  dependencies?: string[];
  testRequirements?: {
    unit?: {
      required: boolean;
      pattern: string;
    };
  };
  title: string;
  description: string;
  acceptanceCriteria: string[];
  notes?: string;
}

export class TaskParser {
  /**
   * Parse task from markdown file with YAML frontmatter.
   */
  static parseTaskFile(filePath: string): Task {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      throw new Error(`No frontmatter found in ${filePath}`);
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    const markdown = content.slice(frontmatterMatch[0].length).trim();

    // Parse markdown sections
    const sections = this.parseMarkdownSections(markdown);

    return {
      ...frontmatter,
      title: sections.title,
      description: sections.description,
      acceptanceCriteria: sections.acceptanceCriteria,
      notes: sections.notes
    };
  }

  private static parseMarkdownSections(markdown: string) {
    const lines = markdown.split('\n');
    const sections: any = {};

    let currentSection = '';
    let buffer: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // H1 = title
        sections.title = line.slice(2).trim();
      } else if (line.startsWith('## ')) {
        // H2 = new section
        if (currentSection && buffer.length > 0) {
          sections[currentSection] = buffer.join('\n').trim();
          buffer = [];
        }
        currentSection = line.slice(3).trim().toLowerCase().replace(/\s+/g, '_');
      } else {
        buffer.push(line);
      }
    }

    // Flush last section
    if (currentSection && buffer.length > 0) {
      sections[currentSection] = buffer.join('\n').trim();
    }

    // Parse acceptance criteria (numbered list)
    if (sections.acceptance_criteria) {
      const criteria = sections.acceptance_criteria
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());

      sections.acceptanceCriteria = criteria;
    }

    return sections;
  }

  /**
   * Get all tasks from directory.
   */
  static getAllTasks(tasksDir: string): Task[] {
    const indexPath = path.join(tasksDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const tasks: Task[] = [];

    for (const [taskId, meta] of Object.entries(index.features || {})) {
      const filePath = this.getTaskFilePath(tasksDir, taskId, meta as any);
      if (fs.existsSync(filePath)) {
        tasks.push(this.parseTaskFile(filePath));
      }
    }

    return tasks;
  }

  private static getTaskFilePath(
    tasksDir: string,
    taskId: string,
    meta: { module: string; filePath?: string }
  ): string {
    if (meta.filePath) {
      return path.join(tasksDir, meta.filePath);
    }

    // Default: {module}/{action}.md
    const parts = taskId.split('.');
    const module = meta.module;
    const action = parts.slice(1).join('.');

    return path.join(tasksDir, module, `${action}.md`);
  }
}
```

### 2. Task Writer | 任务写入器

```typescript
// cli/src/core/task-writer.ts

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

export class TaskWriter {
  /**
   * Create task file with YAML frontmatter.
   */
  static createTask(tasksDir: string, task: Task): void {
    const { id, module } = task;

    // Create module directory
    const moduleDir = path.join(tasksDir, module);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }

    // Create task file
    const action = id.split('.').slice(1).join('.');
    const filePath = path.join(moduleDir, `${action}.md`);

    const frontmatter = {
      id: task.id,
      module: task.module,
      priority: task.priority,
      status: task.status,
      estimatedMinutes: task.estimatedMinutes,
      dependencies: task.dependencies,
      testRequirements: task.testRequirements
    };

    const content = this.formatTaskMarkdown(frontmatter, task);

    fs.writeFileSync(filePath, content, 'utf-8');

    // Update index
    this.updateIndex(tasksDir, task);
  }

  private static formatTaskMarkdown(frontmatter: any, task: Task): string {
    const yamlStr = yaml.stringify(frontmatter);

    let md = `---\n${yamlStr}---\n\n`;
    md += `# ${task.title}\n\n`;

    if (task.description) {
      md += `## Description\n${task.description}\n\n`;
    }

    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      md += `## Acceptance Criteria\n`;
      task.acceptanceCriteria.forEach((criterion, i) => {
        md += `${i + 1}. ${criterion}\n`;
      });
      md += '\n';
    }

    if (task.notes) {
      md += `## Notes\n${task.notes}\n`;
    }

    return md;
  }

  private static updateIndex(tasksDir: string, task: Task): void {
    const indexPath = path.join(tasksDir, 'index.json');

    let index: any;
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } else {
      index = {
        version: '2.0.0',
        updatedAt: new Date().toISOString(),
        features: {}
      };
    }

    index.features[task.id] = {
      status: task.status,
      priority: task.priority,
      module: task.module
    };

    index.updatedAt = new Date().toISOString();

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Update task status.
   */
  static updateTaskStatus(
    tasksDir: string,
    taskId: string,
    status: string,
    metadata?: any
  ): void {
    const task = TaskParser.getTask(tasksDir, taskId);

    // Update frontmatter
    const filePath = TaskParser.getTaskFilePath(tasksDir, taskId, task);
    const content = fs.readFileSync(filePath, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    const frontmatter = yaml.parse(frontmatterMatch![1]);

    frontmatter.status = status;
    if (metadata) {
      Object.assign(frontmatter, metadata);
    }

    const markdown = content.slice(frontmatterMatch![0].length);
    const newContent = `---\n${yaml.stringify(frontmatter)}---${markdown}`;

    fs.writeFileSync(filePath, newContent, 'utf-8');

    // Update index
    this.updateIndex(tasksDir, { ...task, status });
  }
}
```

### 3. Language Detector | 语言检测器

```typescript
// cli/src/language/detector.ts

import * as fs from 'fs';
import * as path from 'path';

export interface LanguageConfig {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  verifyCommands: string[];
}

export class LanguageDetector {
  static detect(projectPath: string = '.'): LanguageConfig {
    // TypeScript/JavaScript
    if (this.fileExists(projectPath, 'package.json')) {
      return this.detectTypeScript(projectPath);
    }

    // Python
    if (
      this.fileExists(projectPath, 'requirements.txt') ||
      this.fileExists(projectPath, 'pyproject.toml')
    ) {
      return this.detectPython(projectPath);
    }

    // Go
    if (this.fileExists(projectPath, 'go.mod')) {
      return this.detectGo(projectPath);
    }

    // Rust
    if (this.fileExists(projectPath, 'Cargo.toml')) {
      return this.detectRust(projectPath);
    }

    // Java/Kotlin
    if (
      this.fileExists(projectPath, 'pom.xml') ||
      this.fileExists(projectPath, 'build.gradle')
    ) {
      return this.detectJava(projectPath);
    }

    return {
      language: 'unknown',
      verifyCommands: []
    };
  }

  private static detectTypeScript(projectPath: string): LanguageConfig {
    const packageJson = this.readJSON(projectPath, 'package.json');
    const hasTSConfig = this.fileExists(projectPath, 'tsconfig.json');

    const framework = this.detectJSFramework(packageJson);
    const testFramework = this.detectTestFramework(packageJson);
    const buildTool = this.detectBuildTool(projectPath);

    const commands: string[] = [];

    if (hasTSConfig) {
      commands.push('npx tsc --noEmit');
    }

    if (packageJson.scripts?.lint) {
      commands.push('npm run lint');
    }

    if (testFramework) {
      commands.push(this.getTestCommand(testFramework));
    }

    if (packageJson.scripts?.build) {
      commands.push('npm run build');
    }

    return {
      language: hasTSConfig ? 'typescript' : 'javascript',
      framework,
      testFramework,
      buildTool,
      verifyCommands: commands
    };
  }

  private static detectPython(projectPath: string): LanguageConfig {
    const framework = this.detectPythonFramework(projectPath);
    const testFramework = this.detectPythonTestFramework(projectPath);

    return {
      language: 'python',
      framework,
      testFramework,
      verifyCommands: [
        'mypy .',
        'pylint **/*.py',
        testFramework === 'pytest' ? 'pytest' : 'python -m unittest'
      ]
    };
  }

  private static detectGo(projectPath: string): LanguageConfig {
    return {
      language: 'go',
      verifyCommands: ['go vet ./...', 'golint ./...', 'go test ./...', 'go build']
    };
  }

  private static detectRust(projectPath: string): LanguageConfig {
    return {
      language: 'rust',
      verifyCommands: ['cargo clippy', 'cargo test', 'cargo build']
    };
  }

  private static detectJava(projectPath: string): LanguageConfig {
    const isMaven = this.fileExists(projectPath, 'pom.xml');
    const isGradle = this.fileExists(projectPath, 'build.gradle');

    return {
      language: 'java',
      buildTool: isMaven ? 'maven' : isGradle ? 'gradle' : 'unknown',
      verifyCommands: isMaven
        ? ['mvn verify', 'mvn test', 'mvn package']
        : ['./gradlew check', './gradlew test', './gradlew build']
    };
  }

  private static detectJSFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps['@angular/core']) return 'angular';
    if (deps.svelte) return 'svelte';
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';

    return undefined;
  }

  private static detectTestFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.ava) return 'ava';

    return undefined;
  }

  private static detectBuildTool(projectPath: string): string | undefined {
    if (this.fileExists(projectPath, 'vite.config.ts')) return 'vite';
    if (this.fileExists(projectPath, 'webpack.config.js')) return 'webpack';
    if (this.fileExists(projectPath, 'rollup.config.js')) return 'rollup';

    return undefined;
  }

  private static detectPythonFramework(projectPath: string): string | undefined {
    // Check for framework-specific files
    if (this.fileExists(projectPath, 'manage.py')) return 'django';
    if (this.fileExists(projectPath, 'app.py') || this.fileExists(projectPath, 'wsgi.py'))
      return 'flask';

    // Check requirements.txt
    if (this.fileExists(projectPath, 'requirements.txt')) {
      const requirements = fs.readFileSync(
        path.join(projectPath, 'requirements.txt'),
        'utf-8'
      );
      if (requirements.includes('fastapi')) return 'fastapi';
      if (requirements.includes('django')) return 'django';
      if (requirements.includes('flask')) return 'flask';
    }

    return undefined;
  }

  private static detectPythonTestFramework(projectPath: string): string {
    if (this.fileExists(projectPath, 'pytest.ini')) return 'pytest';
    if (this.fileExists(projectPath, 'setup.cfg')) {
      const setup = fs.readFileSync(path.join(projectPath, 'setup.cfg'), 'utf-8');
      if (setup.includes('[tool:pytest]')) return 'pytest';
    }
    return 'pytest'; // Default
  }

  private static getTestCommand(framework: string): string {
    const commands: Record<string, string> = {
      vitest: 'npx vitest run',
      jest: 'npm test',
      mocha: 'npm test',
      ava: 'npm test'
    };
    return commands[framework] || 'npm test';
  }

  private static fileExists(projectPath: string, filename: string): boolean {
    return fs.existsSync(path.join(projectPath, filename));
  }

  private static readJSON(projectPath: string, filename: string): any {
    const filePath = path.join(projectPath, filename);
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}
```

### 4. CLI Entry Point | CLI入口

```typescript
// cli/src/index.ts

import { Command } from 'commander';
import { StateCommands } from './commands/state';
import { TaskCommands } from './commands/tasks';
import { PRDCommands } from './commands/prd';
import { DetectCommands } from './commands/detect';
import { VerifyCommands } from './commands/verify';
import { BreakdownCommands } from './commands/breakdown';

const program = new Command();

program
  .name('autopilot-cli')
  .description('Autopilot CLI - Efficient operations for AI agents')
  .version('1.0.0');

// State management
const state = program.command('state').description('Manage autopilot state');
StateCommands.register(state);

// Task management
const tasks = program.command('tasks').description('Manage tasks');
TaskCommands.register(tasks);

// PRD operations
const prd = program.command('prd').description('PRD operations');
PRDCommands.register(prd);

// Language detection
const detect = program.command('detect').description('Detect project configuration');
DetectCommands.register(detect);

// Verification
const verify = program.command('verify').description('Run verification');
VerifyCommands.register(verify);

// Breakdown
const breakdown = program.command('breakdown').description('Task breakdown operations');
BreakdownCommands.register(breakdown);

program.parse();
```

---

## Usage in Skills | 在技能中使用

### Example: Phase 3 Implementation Skill

```markdown
# skills/phase-3-implement/SKILL.md

## Implementation Loop

```bash
# Use CLI for efficient task iteration

while true; do
  # Get next task (CLI is much faster than parsing files)
  TASK_JSON=$(autopilot-cli tasks next --json)

  if [ "$TASK_JSON" = "null" ]; then
    echo "✅ All tasks complete"
    break
  fi

  TASK_ID=$(echo $TASK_JSON | jq -r '.id')
  TASK_TITLE=$(echo $TASK_JSON | jq -r '.title')

  echo "⏳ Starting task: $TASK_ID - $TASK_TITLE"

  # Spawn implementer agent (skill uses fresh context)
  result=$(invoke_implementer_agent "$TASK_ID")

  # Update task using CLI (much faster than file editing)
  if [ "$result_status" = "success" ]; then
    autopilot-cli tasks done "$TASK_ID" \
      --duration "$result_duration" \
      --files "$result_files"
    echo "✅ Task complete"
  else
    autopilot-cli tasks fail "$TASK_ID" \
      --reason "$result_error"
    echo "❌ Task failed"
  fi

  # Show progress (CLI formats it nicely)
  autopilot-cli tasks progress
done
```
```

---

## Testing | 测试

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## Next Steps | 下一步

1. ✅ Implement core commands (state, tasks)
2. ✅ Add language detection
3. ✅ Add PRD parsing
4. ✅ Add verification logic
5. ✅ Write tests
6. ✅ Update skills to use CLI
7. ✅ Document all commands

---

**The CLI provides the efficient foundation for Autopilot skills!**

**CLI为Autopilot技能提供了高效的基础！**
