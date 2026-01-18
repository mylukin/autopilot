# Autopilot Architecture V2 | 架构 V2 版本

**Version:** 2.0
**Date:** 2026-01-18
**Status:** Improved Design

本文档解决了初始设计中的关键问题，提供了一个更加实用、高效和通用的架构。

---

## Key Improvements | 关键改进

### 1. ✅ Multi-Language Support | 多语言支持

**Problem:** Original design was TypeScript-centric.

**Solution:** Language-agnostic architecture.

**问题：** 原始设计以TypeScript为中心。
**解决方案：** 语言无关的架构。

```yaml
# Phase 1 questions now include language preference
questions:
  - id: programming_language
    text: "Preferred programming language?"
    options:
      - A) TypeScript/JavaScript (Node.js)
      - B) Python
      - C) Go
      - D) Rust
      - E) Java/Kotlin
      - F) Other (specify)
```

### 2. ✅ Hybrid Architecture: Skills + CLI | 混合架构

**Problem:** Skills alone can be slow for frequent operations.

**Solution:** Combine skills (for intelligence) with CLI tools (for efficiency).

**问题：** 仅使用Skills对频繁操作来说可能很慢。
**解决方案：** 结合Skills（智能）和CLI工具（效率）。

```
┌─────────────────────────────────────────┐
│         SKILLS LAYER                    │
│  (Intelligence, Decision Making)        │
└──────────────┬──────────────────────────┘
               │ Calls
               ▼
┌─────────────────────────────────────────┐
│         CLI LAYER                       │
│  (Fast operations, State management)    │
│  TypeScript implementation              │
└─────────────────────────────────────────┘
```

**Example:**

```markdown
# In skill
Instead of parsing JSON directly:
  ❌ Read .claude/autopilot/state.json
  ❌ Parse with jq

Use CLI:
  ✅ Run: autopilot-cli state get phase
  ✅ Run: autopilot-cli tasks next
```

### 3. ✅ Agent-Foreman Style Task Storage | Agent-Foreman风格任务存储

**Problem:** Single `tasks.json` doesn't scale for large projects (100+ tasks).

**Solution:** Modular markdown files with YAML frontmatter (like agent-foreman).

**问题：** 单个 `tasks.json` 对大型项目（100+任务）无法扩展。
**解决方案：** 使用YAML frontmatter的模块化markdown文件（类似agent-foreman）。

**Before:**
```
.claude/autopilot/
└── tasks.json              # All tasks in one file (doesn't scale)
```

**After:**
```
ai/tasks/
├── index.json              # Lightweight index only
├── setup/
│   ├── scaffold.md
│   └── dependencies.md
├── auth/
│   ├── login.ui.md
│   ├── login.api.md
│   └── logout.md
└── chat/
    ├── message.send.md
    └── message.edit.md
```

**Task File Format:**

```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies:
  - setup.scaffold
testRequirements:
  unit:
    required: true
    pattern: "tests/auth/LoginForm.test.*"
---
# Create login form component

## Description
React/Vue/Angular component with email/password fields and submit button.

## Acceptance Criteria
1. Component exists at src/components/LoginForm.*
2. Form validates email format
3. Form validates password length (min 8 chars)
4. Submit button disabled when invalid
5. Unit tests pass (coverage >80%)

## Notes
- Use framework's form validation library
- Follow project's component structure patterns
```

### 4. ✅ CLI Tool Implementation | CLI工具实现

**New Component:** `autopilot-cli` (TypeScript implementation)

TypeScript实现的CLI工具，供skills调用以提高效率。

---

## Updated Architecture | 更新后的架构

```
┌────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                          │
│               /autopilot <requirement>                     │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR SKILL                            │
│         (Pure skill, calls CLI for operations)             │
└─┬────────┬────────┬────────┬────────┬──────────────────────┘
  │        │        │        │        │
  ▼        ▼        ▼        ▼        ▼
┌──────┐┌───────┐┌───────┐┌──────┐┌────────┐
│Phase1││Phase2 ││Phase3 ││Phase4││Phase5  │
│Skill ││Skill  ││Skill  ││Skill ││Skill   │
└──┬───┘└───┬───┘└───┬───┘└──┬───┘└───┬────┘
   │        │        │       │        │
   │        │        │       │        │  All skills call CLI
   └────────┴────────┴───────┴────────┴──────┐
                                              ▼
                          ┌──────────────────────────────────┐
                          │      AUTOPILOT-CLI               │
                          │   (TypeScript Implementation)    │
                          │                                  │
                          │  Commands:                       │
                          │  - state (get/set/update)        │
                          │  - tasks (list/get/create/done)  │
                          │  - verify (run checks)           │
                          │  - prd (parse/generate)          │
                          └──────────┬───────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────────────────┐
                          │    STATE PERSISTENCE             │
                          │  ai/                             │
                          │  ├── state.json                  │
                          │  ├── prd.md                      │
                          │  ├── progress.log                │
                          │  └── tasks/                      │
                          │      ├── index.json              │
                          │      ├── setup/*.md              │
                          │      ├── auth/*.md               │
                          │      └── ...                     │
                          └──────────────────────────────────┘
```

---

## CLI Tool Specification | CLI工具规范

### Installation | 安装

```bash
# Install globally from plugin
npm install -g @autopilot/cli

# Or use directly from plugin
npx autopilot-cli <command>
```

### Commands | 命令

#### 1. State Management | 状态管理

```bash
# Get state value
autopilot-cli state get phase
# Output: "implement"

autopilot-cli state get currentTask
# Output: "auth.login.ui"

# Set state value
autopilot-cli state set phase deliver

# Update multiple values
autopilot-cli state update '{"autoFixes": 3, "currentTaskIndex": 5}'

# Show full state
autopilot-cli state show
```

#### 2. Task Management | 任务管理

```bash
# List all tasks
autopilot-cli tasks list
# Output: JSON array of task summaries

# List by status
autopilot-cli tasks list --status pending
autopilot-cli tasks list --status failed

# Get next pending task
autopilot-cli tasks next
# Output: Task object with full details

# Get specific task
autopilot-cli tasks get auth.login.ui
# Output: Task object from markdown file

# Create task
autopilot-cli tasks create \
  --id auth.logout \
  --module auth \
  --title "Create logout button" \
  --priority 3 \
  --criteria "Button exists" \
  --criteria "Clears session on click"

# Mark task complete
autopilot-cli tasks done auth.login.ui \
  --duration "4m 32s" \
  --files "src/components/LoginForm.tsx,tests/LoginForm.test.tsx"

# Mark task failed
autopilot-cli tasks fail auth.login.api \
  --reason "Database connection refused"

# Update task status
autopilot-cli tasks update auth.login.ui --status passing
```

#### 3. PRD Management | PRD管理

```bash
# Parse PRD to extract user stories
autopilot-cli prd parse ai/prd.md
# Output: JSON array of user stories

# Generate tasks from PRD
autopilot-cli prd generate-tasks ai/prd.md
# Output: Creates task files in ai/tasks/

# Validate PRD format
autopilot-cli prd validate ai/prd.md
```

#### 4. Verification | 验证

```bash
# Run verification for specific language
autopilot-cli verify --language typescript
# Runs: tsc, eslint, npm test

autopilot-cli verify --language python
# Runs: mypy, pylint, pytest

autopilot-cli verify --language go
# Runs: go vet, golint, go test

# Custom verification
autopilot-cli verify --command "npm test" --command "npm run build"

# Parse test results
autopilot-cli verify parse-test-output test-output.txt
# Output: {passed: 24, failed: 0, total: 24, coverage: 87}
```

#### 5. Breakdown | 任务拆解

```bash
# Decompose user story to tasks
autopilot-cli breakdown story \
  --text "As a user, I can log in" \
  --language typescript \
  --tech-stack "React,Node.js,PostgreSQL"
# Output: Array of task objects

# Validate task size
autopilot-cli breakdown validate-size task.md
# Output: {valid: true, estimatedMinutes: 25}

# Split oversized task
autopilot-cli breakdown split task.md
# Output: Array of smaller tasks
```

#### 6. Language Detection | 语言检测

```bash
# Detect project language
autopilot-cli detect language
# Output: "typescript" (based on package.json, tsconfig.json)

# Detect test framework
autopilot-cli detect test-framework
# Output: "jest" (based on package.json)

# Detect build tool
autopilot-cli detect build-tool
# Output: "vite" (based on vite.config.ts)

# Get verification commands for detected language
autopilot-cli detect verify-commands
# Output: ["npx tsc --noEmit", "npm run lint", "npm test"]
```

---

## Language-Specific Adaptations | 语言特定适配

### Detection Strategy | 检测策略

```typescript
// autopilot-cli/src/detect.ts

interface LanguageConfig {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  verifyCommands: string[];
}

function detectLanguage(projectPath: string): LanguageConfig {
  // TypeScript/JavaScript
  if (fileExists('package.json')) {
    const pkg = readJSON('package.json');
    const hasTSConfig = fileExists('tsconfig.json');

    return {
      language: hasTSConfig ? 'typescript' : 'javascript',
      framework: detectJSFramework(pkg),
      testFramework: detectTestFramework(pkg),
      buildTool: detectBuildTool(),
      verifyCommands: [
        hasTSConfig ? 'npx tsc --noEmit' : null,
        'npm run lint',
        detectTestCommand(pkg),
        detectBuildCommand(pkg)
      ].filter(Boolean)
    };
  }

  // Python
  if (fileExists('requirements.txt') || fileExists('pyproject.toml')) {
    return {
      language: 'python',
      framework: detectPythonFramework(),
      testFramework: detectPythonTestFramework(),
      verifyCommands: [
        'mypy .',
        'pylint **/*.py',
        'pytest',
        detectPythonBuildCommand()
      ].filter(Boolean)
    };
  }

  // Go
  if (fileExists('go.mod')) {
    return {
      language: 'go',
      verifyCommands: [
        'go vet ./...',
        'golint ./...',
        'go test ./...',
        'go build'
      ]
    };
  }

  // Rust
  if (fileExists('Cargo.toml')) {
    return {
      language: 'rust',
      verifyCommands: [
        'cargo clippy',
        'cargo test',
        'cargo build'
      ]
    };
  }

  // Default
  return {
    language: 'unknown',
    verifyCommands: []
  };
}
```

### Language-Specific Templates | 语言特定模板

```bash
# autopilot-cli/templates/

templates/
├── typescript/
│   ├── component.template.ts
│   ├── test.template.ts
│   └── api.template.ts
├── python/
│   ├── class.template.py
│   ├── test.template.py
│   └── api.template.py
├── go/
│   ├── handler.template.go
│   ├── test.template.go
│   └── service.template.go
└── rust/
    ├── module.template.rs
    ├── test.template.rs
    └── service.template.rs
```

---

## Updated Phase Implementations | 更新的阶段实现

### Phase 1: Clarify (Updated)

```markdown
# skills/phase-1-clarify/SKILL.md

## Question Set (Updated)

### Question 1: Programming Language

```
🤔 Question 1/6: Preferred programming language?
   A) TypeScript/JavaScript (Node.js)
   B) Python
   C) Go
   D) Rust
   E) Java/Kotlin
   F) Other (specify)

Your choice: _
```

### Question 2: Application Type
(Same as before)

### Language-Specific Follow-ups

**If TypeScript/JavaScript:**
```
🤔 Follow-up: Frontend framework?
   A) React
   B) Vue
   C) Angular
   D) Svelte
   E) None (backend only)
```

**If Python:**
```
🤔 Follow-up: Web framework?
   A) FastAPI
   B) Django
   C) Flask
   D) None (CLI/script)
```

**If Go:**
```
🤔 Follow-up: Framework preference?
   A) Gin
   B) Echo
   C) Fiber
   D) Standard library only
```

## PRD Generation with Language Context

```markdown
# Product Requirements Document

## Project Goal
${requirement}

## Technical Specifications

### Language & Stack
- **Language:** ${language}
- **Framework:** ${framework}
- **Test Framework:** ${test_framework}
- **Build Tool:** ${build_tool}

### Verification Commands
${detected_verify_commands}

### File Patterns
- Source: ${source_pattern}
- Tests: ${test_pattern}
- Config: ${config_files}
```

## Use CLI for Detection

```bash
# In skill, detect language
LANG_CONFIG=$(autopilot-cli detect language --json)

# Extract values
LANGUAGE=$(echo $LANG_CONFIG | jq -r '.language')
FRAMEWORK=$(echo $LANG_CONFIG | jq -r '.framework')
```
```

### Phase 2: Breakdown (Updated with CLI)

```markdown
# skills/phase-2-breakdown/SKILL.md

## Use CLI for Task Generation

Instead of parsing PRD manually:

```bash
# Generate tasks from PRD using CLI
autopilot-cli prd generate-tasks ai/prd.md --output ai/tasks/

# This creates:
# ai/tasks/index.json (lightweight index)
# ai/tasks/setup/scaffold.md
# ai/tasks/setup/dependencies.md
# ai/tasks/auth/login.ui.md
# ... (all task files)
```

## Validate Task Sizes

```bash
# Check all tasks are appropriately sized
autopilot-cli breakdown validate-all ai/tasks/

# If any task too large, split it
for task in $(autopilot-cli tasks list --oversized); do
  autopilot-cli breakdown split ai/tasks/${task}.md
done
```

## Show Task Plan

```bash
# Get formatted task plan
autopilot-cli tasks plan --format markdown

# Output:
📋 Task Plan (15 tasks, est. 3.5 hours)

1. setup.scaffold        - Initialize project structure (15 min)
2. setup.dependencies    - Install dependencies (10 min)
...
```
```

### Phase 3: Implement (Updated with CLI)

```markdown
# skills/phase-3-implement/SKILL.md

## Use CLI for Task Iteration

```bash
while true; do
  # Get next pending task using CLI
  TASK_JSON=$(autopilot-cli tasks next --json)

  if [ "$TASK_JSON" = "null" ]; then
    break  # All tasks done
  fi

  TASK_ID=$(echo $TASK_JSON | jq -r '.id')

  # Spawn implementer agent
  result=$(invoke_agent implementer --task-id $TASK_ID)

  # Update task status using CLI
  if [ "$result.status" = "success" ]; then
    autopilot-cli tasks done $TASK_ID \
      --duration "$result.duration" \
      --files "$result.files_modified"
  else
    autopilot-cli tasks fail $TASK_ID \
      --reason "$result.error"
  fi

  # Update state using CLI
  autopilot-cli state increment currentTaskIndex
done
```

## Progress Display

```bash
# Show progress using CLI
autopilot-cli tasks progress

# Output:
📊 Progress Summary (40% complete)
   ✅ Completed: 6/15 tasks
   ⏱️  Estimated remaining: 27m
   🔧 Auto-fixes: 2 errors healed
```
```

### Phase 5: Deliver (Updated with Language Detection)

```markdown
# skills/phase-5-deliver/SKILL.md

## Language-Aware Verification

```bash
# Detect language and get verify commands
VERIFY_CMDS=$(autopilot-cli detect verify-commands --json)

# Run each verification gate
for cmd in $(echo $VERIFY_CMDS | jq -r '.[]'); do
  echo "Running: $cmd"

  if ! eval $cmd; then
    echo "❌ Verification failed: $cmd"
    exit 1
  fi
done

echo "✅ All verification gates passed"
```

## Quality Gates (Language-Agnostic)

```python
def run_quality_gates(language: str):
    gates = {
        "typescript": [
            ("Type checking", "npx tsc --noEmit"),
            ("Linting", "npm run lint"),
            ("Tests", "npm test"),
            ("Build", "npm run build")
        ],
        "python": [
            ("Type checking", "mypy ."),
            ("Linting", "pylint **/*.py"),
            ("Tests", "pytest"),
            ("Build", "python setup.py build")
        ],
        "go": [
            ("Vet", "go vet ./..."),
            ("Linting", "golint ./..."),
            ("Tests", "go test ./..."),
            ("Build", "go build")
        ],
        "rust": [
            ("Clippy", "cargo clippy"),
            ("Tests", "cargo test"),
            ("Build", "cargo build")
        ]
    }

    for gate_name, command in gates.get(language, []):
        result = run_command(command)
        if not result.success:
            return {"passed": False, "failed_gate": gate_name}

    return {"passed": True}
```
```

---

## File Structure (Updated) | 文件结构（更新）

```
autopilot/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
│
├── skills/                        # Claude Code skills
│   ├── autopilot-orchestrator/
│   ├── phase-1-clarify/
│   ├── phase-2-breakdown/
│   ├── phase-3-implement/
│   ├── phase-4-heal/
│   └── phase-5-deliver/
│
├── cli/                          # NEW: TypeScript CLI tool
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # CLI entry point
│   │   ├── commands/
│   │   │   ├── state.ts          # State management
│   │   │   ├── tasks.ts          # Task operations
│   │   │   ├── prd.ts            # PRD operations
│   │   │   ├── verify.ts         # Verification
│   │   │   ├── breakdown.ts      # Task breakdown
│   │   │   └── detect.ts         # Language detection
│   │   ├── core/
│   │   │   ├── task-parser.ts    # Parse markdown tasks
│   │   │   ├── task-writer.ts    # Write markdown tasks
│   │   │   └── index-manager.ts  # Manage index.json
│   │   ├── language/
│   │   │   ├── detector.ts       # Language detection
│   │   │   ├── typescript.ts     # TS-specific logic
│   │   │   ├── python.ts         # Python-specific logic
│   │   │   ├── go.ts             # Go-specific logic
│   │   │   └── rust.ts           # Rust-specific logic
│   │   └── templates/
│   │       ├── typescript/
│   │       ├── python/
│   │       ├── go/
│   │       └── rust/
│   └── bin/
│       └── autopilot-cli.js
│
├── agents/                       # Specialized agents
├── commands/                     # Slash commands
├── hooks/                        # Lifecycle hooks
└── workspace/
    └── ai/                       # NEW: Runtime workspace
        ├── state.json
        ├── prd.md
        ├── progress.log
        └── tasks/                # NEW: Modular task storage
            ├── index.json        # Lightweight index
            ├── setup/
            │   ├── scaffold.md
            │   └── dependencies.md
            ├── auth/
            │   ├── login.ui.md
            │   ├── login.api.md
            │   └── logout.md
            └── ...
```

---

## Migration Guide | 迁移指南

### From V1 to V2

#### 1. Add CLI Tool

```bash
cd autopilot
mkdir -p cli/src/commands
npm init -y
npm install commander chalk @types/node
```

#### 2. Update Task Storage Format

**Old (V1):**
```json
// .claude/autopilot/tasks.json
{
  "tasks": [
    {"id": "auth.login", "title": "...", ...}
  ]
}
```

**New (V2):**
```markdown
<!-- ai/tasks/auth/login.md -->
---
id: auth.login
module: auth
priority: 2
status: pending
---
# Create login endpoint

## Acceptance Criteria
1. Endpoint exists at POST /api/auth/login
2. Validates credentials
3. Returns JWT token
```

```json
// ai/tasks/index.json (lightweight)
{
  "version": "2.0.0",
  "features": {
    "auth.login": {
      "status": "pending",
      "priority": 2,
      "module": "auth"
    }
  }
}
```

#### 3. Update Skills to Use CLI

**Before:**
```bash
# Direct file parsing
TASK=$(jq '.tasks[0]' .claude/autopilot/tasks.json)
```

**After:**
```bash
# Use CLI
TASK=$(autopilot-cli tasks next --json)
```

---

## Benefits of V2 Architecture | V2架构的优势

### 1. Multi-Language Support | 多语言支持

✅ Works with any programming language
✅ Auto-detects project language
✅ Language-specific verification commands
✅ Language-specific templates

### 2. Better Scalability | 更好的可扩展性

✅ Modular task files (like agent-foreman)
✅ Lightweight index for quick lookups
✅ Handles 100+ tasks easily
✅ Git-friendly (one file per task)

### 3. Improved Performance | 提升性能

✅ CLI tool for fast operations
✅ Skills call CLI instead of parsing files
✅ Cached language detection
✅ Efficient task queries

### 4. Better Developer Experience | 更好的开发体验

✅ CLI can be used standalone
✅ Human-readable task files
✅ Easy to edit tasks manually
✅ Clear separation: skills (logic) + CLI (operations)

---

## Implementation Priority | 实施优先级

### Phase 1: Core CLI (Week 1)

```bash
# Implement basic CLI commands
cli/src/commands/
├── state.ts        # Priority 1
├── tasks.ts        # Priority 1
└── detect.ts       # Priority 2
```

### Phase 2: Language Support (Week 2)

```bash
# Add language detectors
cli/src/language/
├── detector.ts     # Priority 1
├── typescript.ts   # Priority 1
├── python.ts       # Priority 2
├── go.ts           # Priority 3
└── rust.ts         # Priority 3
```

### Phase 3: Update Skills (Week 3)

```bash
# Update all skills to use CLI
skills/
├── phase-1-clarify/    # Add language questions
├── phase-2-breakdown/  # Use CLI for task generation
├── phase-3-implement/  # Use CLI for task iteration
└── phase-5-deliver/    # Use CLI for verification
```

---

## Next Steps | 下一步

1. ✅ **Read this V2 architecture** - Understand improvements
2. ✅ **Implement CLI tool** - Start with core commands
3. ✅ **Add language detection** - Support multiple languages
4. ✅ **Update task storage** - Migrate to markdown format
5. ✅ **Update skills** - Use CLI for operations
6. ✅ **Test with different languages** - Python, Go, etc.

---

**V2 architecture provides a much more robust, scalable, and practical foundation for Autopilot!**

**V2架构为Autopilot提供了更加健壮、可扩展和实用的基础！**
