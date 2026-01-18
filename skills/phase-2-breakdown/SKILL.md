---
name: phase-2-breakdown
description: Break down PRD into atomic, testable tasks using CLI for modular storage
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 2: Task Breakdown

## Overview | 概述

Read the PRD and break it down into atomic tasks (each <30 minutes), create modular markdown files using CLI, and get user approval before proceeding to implementation.

读取 PRD 并将其分解为原子任务（每个 <30 分钟），使用 CLI 创建模块化 markdown 文件，在继续实施前获得用户批准。

## When to Use | 何时使用

Invoked by autopilot-orchestrator as Phase 2, after Phase 1 (Clarify) completes.

## Input | 输入

- PRD file location: `workspace/ai/prd.md`
- Current state from Phase 1

## Execution | 执行

### Step 1: Read PRD

```bash
# Read the PRD generated in Phase 1
PRD_CONTENT=$(cat workspace/ai/prd.md)

echo "📖 Reading PRD..."
echo "PRD length: $(echo "$PRD_CONTENT" | wc -l) lines"
```

### Step 2: Extract User Stories and Requirements

Parse the PRD to extract:
- User stories from each Epic
- Functional requirements from each area
- Technical architecture components

```bash
# Extract epics and user stories
# Parse markdown sections:
# - ## User Stories
# - ### Epic 1: ...
# - ### Epic 2: ...
```

### Step 3: Break Down into Atomic Tasks

For each user story or requirement, create 1-3 atomic tasks.

**Task Breakdown Rules**:
1. Each task should be completable in <30 minutes
2. Each task should have clear acceptance criteria
3. Tasks should follow dependency order
4. Group related tasks into modules

**Example Breakdown**:

**User Story**: "As a user, I want to sign up with email/password"

→ **Tasks**:
- `auth.signup.ui` (20 min) - Create signup form component
- `auth.signup.validation` (15 min) - Add form validation
- `auth.signup.api` (25 min) - Create signup API endpoint
- `auth.signup.tests` (20 min) - Write unit & integration tests

### Step 4: Create Task Files Using CLI

For each task, create a markdown file in `workspace/ai/tasks/{module}/{task}.md`:

```bash
# Initialize tasks directory
mkdir -p workspace/ai/tasks

# Create index.json
cat > workspace/ai/tasks/index.json <<'EOF'
{
  "version": "1.0.0",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metadata": {
    "projectGoal": "{extracted from PRD}",
    "languageConfig": {
      "language": "{from PRD}",
      "framework": "{from PRD}",
      "verifyCommands": [
        "{language-specific commands}"
      ]
    }
  },
  "tasks": {}
}
EOF

# For each task, create markdown file
# Example for auth.signup.ui:
mkdir -p workspace/ai/tasks/auth

cat > workspace/ai/tasks/auth/signup.ui.md <<'EOF'
---
id: auth.signup.ui
module: auth
priority: 1
status: pending
estimatedMinutes: 20
dependencies: []
testRequirements:
  unit:
    required: true
    pattern: "tests/auth/SignupForm.test.*"
---
# Create signup form component

## Description

React/Vue component with email, password, and confirm password fields.

## Acceptance Criteria

1. Component exists at src/components/SignupForm.{tsx|vue}
2. Form has email, password, confirmPassword fields
3. Form validates email format
4. Form validates password strength (min 8 chars, uppercase, lowercase, number)
5. Form validates passwords match
6. Submit button disabled when form invalid
7. Component properly typed with TypeScript
8. Unit tests exist and pass (coverage >80%)

## Notes

Use form library (React Hook Form, Vuelidate, etc.) for validation.
Include proper ARIA labels for accessibility.
EOF

# Update index.json to include this task
# (In real implementation, use jq or the CLI)
```

**Actual CLI Usage** (once CLI has create command - for now create files manually):

```bash
# Future CLI command (not yet implemented):
# autopilot-cli tasks create \
#   --id "auth.signup.ui" \
#   --module "auth" \
#   --priority 1 \
#   --estimated-minutes 20 \
#   --description "Create signup form component" \
#   --criteria "Component exists at src/components/SignupForm.tsx" \
#   --criteria "Form validates email format" \
#   ...
```

### Step 5: Generate Complete Task List

Create a comprehensive task list covering the entire PRD:

**Standard Task Structure**:

```
Module: setup (Priority 1-5)
├── setup.scaffold (P1) - Initialize project structure
├── setup.dependencies (P2) - Install dependencies
├── setup.config (P3) - Configure build tools
└── setup.tests (P4) - Setup test framework

Module: auth (Priority 6-15)
├── auth.signup.ui (P6) - Signup form component
├── auth.signup.validation (P7) - Form validation
├── auth.signup.api (P8) - Signup API endpoint
├── auth.signup.db (P9) - User model & database
├── auth.signup.tests (P10) - Signup tests
├── auth.login.ui (P11) - Login form component
├── auth.login.api (P12) - Login API endpoint
├── auth.login.session (P13) - Session management
├── auth.login.tests (P14) - Login tests
└── auth.logout (P15) - Logout functionality

Module: tasks (Priority 16-30)
├── tasks.create.ui (P16) - Task creation form
├── tasks.create.api (P17) - Create task endpoint
├── tasks.list.ui (P18) - Task list component
├── tasks.list.api (P19) - Get tasks endpoint
├── tasks.update.ui (P20) - Edit task UI
├── tasks.update.api (P21) - Update task endpoint
├── tasks.delete (P22) - Delete task functionality
├── tasks.complete (P23) - Mark complete functionality
└── tasks.tests (P24) - Task CRUD tests

Module: deployment (Priority 31-35)
├── deployment.env (P31) - Environment configuration
├── deployment.build (P32) - Production build setup
├── deployment.ci (P33) - CI/CD pipeline
├── deployment.vercel (P34) - Vercel deployment config
└── deployment.tests (P35) - E2E tests
```

### Step 6: Show Task Plan to User

Display the task plan in a readable format:

```markdown
📋 Task Plan

**Project**: {Project name from PRD}
**Total Tasks**: {N} tasks
**Estimated Time**: {X} hours

## Tasks by Module

### Module: setup (Priority 1-4, ~1 hour)
1. [P1] setup.scaffold - Initialize project structure (15 min)
2. [P2] setup.dependencies - Install dependencies (10 min)
3. [P3] setup.config - Configure build tools (20 min)
4. [P4] setup.tests - Setup test framework (15 min)

### Module: auth (Priority 5-14, ~3 hours)
5. [P5] auth.signup.ui - Signup form component (20 min)
6. [P6] auth.signup.validation - Form validation (15 min)
7. [P7] auth.signup.api - Signup API endpoint (25 min)
...

**Total**: {N} tasks, {X} hours estimated

---

Do you approve this task breakdown?
  A) Yes, proceed with implementation
  B) No, let me modify tasks manually
  C) Cancel autopilot
```

Use AskUserQuestion:

```markdown
Use AskUserQuestion tool with:
  question: "Do you approve this task breakdown?"
  header: "Approval"
  options:
    - label: "Yes, proceed"
      description: "Start implementing tasks as planned"
    - label: "Modify first"
      description: "I'll edit tasks in workspace/ai/tasks/ before proceeding"
    - label: "Cancel"
      description: "Stop autopilot here"
```

### Step 7: Handle User Response

```bash
USER_RESPONSE="$ANSWER"

case "$USER_RESPONSE" in
  "Yes, proceed")
    echo "✅ Task breakdown approved"
    autopilot-cli state update --phase implement
    ;;
  "Modify first")
    echo "⏸️  Paused for manual task editing"
    echo "📝 Edit files in: workspace/ai/tasks/"
    echo "▶️  Resume with: /autopilot resume"
    autopilot-cli state update --phase breakdown
    exit 0
    ;;
  "Cancel")
    echo "❌ Autopilot cancelled by user"
    autopilot-cli state clear
    exit 1
    ;;
esac
```

### Step 8: Return Result

Return structured result to orchestrator:

```yaml
---PHASE RESULT---
phase: breakdown
status: complete
tasks_created: {N}
tasks_dir: workspace/ai/tasks
estimated_hours: {X}
next_phase: implement
summary: |
  Created {N} tasks across {M} modules.
  Estimated completion: {X} hours
  User approved task breakdown.
  Ready for implementation.
---END PHASE RESULT---
```

## Task File Format | 任务文件格式

Each task file follows this structure:

```markdown
---
id: {module}.{task-name}
module: {module-name}
priority: {number}
status: pending
estimatedMinutes: {number}
dependencies: [{task-ids}]
testRequirements:
  unit:
    required: true
    pattern: "tests/{module}/**/*.test.*"
  e2e:
    required: false
    pattern: "e2e/{module}/**/*.spec.*"
---
# {Task Title}

## Description

{What needs to be implemented}

## Acceptance Criteria

1. {Testable criterion 1}
2. {Testable criterion 2}
3. {Testable criterion 3}
...

## Notes

{Any additional context or implementation notes}
```

## Error Handling | 错误处理

| Error | Action |
|-------|--------|
| PRD file not found | Fail gracefully, prompt to run Phase 1 |
| Task creation fails | Retry, or create tasks as JSON fallback |
| User rejects plan | Save state, allow manual editing |
| Index.json creation fails | Try alternative format or location |

## Example Output | 示例输出

**Input PRD**: Task management app with auth

**Output**:
- 35 tasks created in `workspace/ai/tasks/`
- Modules: setup (4), auth (10), tasks (16), deployment (5)
- Estimated time: 8.5 hours
- Priority order: 1-35
- All tasks have acceptance criteria and test requirements

## Rules | 规则

1. **Each task <30 minutes** - Break down larger features
2. **Clear acceptance criteria** - Must be testable
3. **Proper dependencies** - Ensure correct order
4. **Module organization** - Group related tasks
5. **Get user approval** - Don't proceed without confirmation
6. **Use CLI when available** - For task management
7. **Create modular files** - One file per task

## Notes | 注意事项

- Task breakdown quality determines implementation success
- Include setup and deployment tasks, not just features
- Consider test tasks separately if complex
- Priority numbers determine execution order
- Ensure dependencies are realistic and necessary
