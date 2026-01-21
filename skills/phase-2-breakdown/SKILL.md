---
name: phase-2-breakdown
description: Break down PRD into atomic, testable tasks using CLI for modular storage
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 2: Task Breakdown

## Goal

Break down the PRD into atomic, testable tasks (each <30 minutes), create task files via CLI, and get user approval before implementation.

## Input

- PRD file: `.ralph-dev/prd.md`
- Language config from CLI (if available)

---

## Workflow

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
ralph-dev --version

# Context-compression resilience: Verify current phase
CURRENT_PHASE=$(ralph-dev state get --json 2>/dev/null | jq -r '.phase // "none"')
echo "Current phase: $CURRENT_PHASE"
# Expected: breakdown
```

### Step 1: Verify Prerequisites

```bash
# Ensure .ralph-dev is gitignored (add if missing)
git check-ignore -q .ralph-dev 2>/dev/null || {
  echo ".ralph-dev/" >> .gitignore
  git add .gitignore && git commit -m "chore: gitignore .ralph-dev temp files"
}

# Verify PRD exists
[ -f ".ralph-dev/prd.md" ] || { echo "ERROR: PRD not found"; exit 1; }
```

### Step 2: Read and Analyze PRD

Read `.ralph-dev/prd.md` and extract:
- User stories from each Epic
- Technical requirements
- Architecture components

### Step 3: Create Atomic Tasks

For each user story, create 1-3 tasks following these rules:

**Task Breakdown Rules:**
- Each task completable in <30 minutes
- Each task has clear, testable acceptance criteria
- Tasks follow dependency order
- Group related tasks into modules

**Task Naming Convention:** `{module}.{feature}.{aspect}`
- Example: `auth.signup.ui`, `auth.signup.api`, `auth.signup.tests`

### Step 4: Create Tasks via CLI (Sequential)

**CRITICAL:** Create tasks one at a time for context-compression resilience.

```bash
# Initialize tasks
ralph-dev tasks init --project-goal "..." --language "..."

# Create each task immediately (not batched)
ralph-dev tasks create \
  --id "{module}.{feature}" \
  --module "{module}" \
  --priority {N} \
  --estimated-minutes {M} \
  --description "..." \
  --criteria "Criterion 1" \
  --criteria "Criterion 2" \
  --json

# Verify creation
ralph-dev tasks list --json
```

### Step 5: Show Task Plan for Approval

Display the task plan and ask for user approval:

```markdown
📋 Task Plan

**Total Tasks**: {N} tasks
**Estimated Time**: {X} hours

## Tasks by Module
### Module: {name} (Priority {range})
1. [P{n}] {task.id} - {description} ({minutes} min)
...
```

**Use AskUserQuestion tool:**
- Question: "Do you approve this task breakdown?"
- Options: "Yes, proceed", "Modify first", "Cancel"
- Add "(Recommended)" to suggested option based on task quality

### Step 6: Handle Response & Update State

```bash
case "$ANSWER" in
  "Yes, proceed"*)
    ralph-dev state update --phase implement
    ;;
  "Modify first"*)
    echo "Edit files in: .ralph-dev/tasks/"
    echo "Resume with: /ralph-dev resume"
    exit 0
    ;;
  "Cancel"*)
    ralph-dev state clear
    exit 1
    ;;
esac
```

### Step 7: Return Result

**REQUIRED Output Format:**
```yaml
---PHASE RESULT---
phase: breakdown
status: complete
tasks_created: {N}
tasks_dir: .ralph-dev/tasks
estimated_hours: {X}
next_phase: implement
---END PHASE RESULT---
```

---

## Task File Format

```markdown
---
id: {module}.{task-name}
module: {module-name}
priority: {number}
status: pending
estimatedMinutes: {number}
dependencies: [{task-ids}]
---
# {Task Title}

## Description
{What needs to be implemented}

## Acceptance Criteria
1. {Testable criterion}
2. {Testable criterion}
```

---

## Tool Constraints

### AskUserQuestion
- Max 4 questions per call
- `header`: ≤12 chars (e.g., "Approval")
- Add "(Recommended)" to suggested option

---

## Constraints

- **NEVER** create tasks >30 minutes
- **NEVER** batch task creation in memory (context-compression vulnerability)
- **ALWAYS** verify task creation via CLI after each create
- **ALWAYS** get user approval before transitioning to implement
- **ALWAYS** return structured PHASE RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | Fail, prompt to run Phase 1 |
| Task creation fails | Retry once, then report error |
| User rejects plan | Save state, allow manual editing |
