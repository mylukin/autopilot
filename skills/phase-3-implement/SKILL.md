---
name: phase-3-implement
description: Autonomous implementation loop with TDD, fresh agents per task, and self-healing
allowed-tools: [Read, Write, Bash, Task, Grep, Glob]
user-invocable: false
---

# Phase 3: Implementation Loop

## Goal

Autonomously implement all tasks using TDD workflow, spawning fresh agents per task, with automatic healing on failure.

## Input

- Tasks directory: `.ralph-dev/tasks/`
- Task index: `.ralph-dev/tasks/index.json`
- Language config from index metadata

---

## Workflow

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
ralph-dev --version

# Context-compression resilience: Verify current phase and task progress
CURRENT_PHASE=$(ralph-dev state get --json 2>/dev/null | jq -r '.phase // "none"')
TASKS_JSON=$(ralph-dev tasks list --json 2>/dev/null)
TOTAL=$(echo "$TASKS_JSON" | jq -r '.data.total // 0')
COMPLETED=$(echo "$TASKS_JSON" | jq -r '.data.completed // 0')
PENDING=$(echo "$TASKS_JSON" | jq -r '.data.pending // 0')
echo "Current phase: $CURRENT_PHASE | Tasks: $COMPLETED/$TOTAL completed, $PENDING pending"
# Expected: implement
```

### Step 1: Verify Baseline Tests

**CRITICAL:** Ensure tests pass before starting.

```bash
# Get test command from language config
TEST_CMD=$(ralph-dev detect --json | jq -r '.verifyCommands[] | select(contains("test"))' | head -1)

# Run baseline tests (CI=true prevents interactive mode)
CI=true eval "$TEST_CMD"

# If tests fail: ask user to fix first, continue anyway, or cancel
```

### Step 2: Implementation Loop

**Loop until all tasks are completed or failed.**

```bash
while true; do
  # Get next pending task (context-compression safe)
  TASK=$(ralph-dev tasks next --json)

  # Exit condition: no more pending tasks
  if [ "$(echo $TASK | jq -r '.data.task')" = "null" ]; then
    # Verify all tasks accounted for
    TOTAL=$(ralph-dev tasks list --json | jq -r '.data.total')
    DONE=$(ralph-dev tasks list --status completed --json | jq -r '.data.total')
    FAILED=$(ralph-dev tasks list --status failed --json | jq -r '.data.total')

    [ $((DONE + FAILED)) -eq $TOTAL ] && break
  fi

  TASK_ID=$(echo $TASK | jq -r '.data.task.id')

  # Mark as started
  ralph-dev tasks start "$TASK_ID"

  # Spawn fresh implementer agent (see Step 3)
  # If success → ralph-dev tasks done "$TASK_ID"
  # If failure → invoke Phase 4 heal, then done or fail

  # Show progress
  ralph-dev tasks list --json | jq -r '"Progress: \(.data.completed)/\(.data.total)"'
done
```

### Step 3: Spawn Implementer Agent (Per Task)

**CRITICAL:** Use Task tool to spawn fresh agent for each task.

```
Tool: Task
Parameters:
  subagent_type: "general-purpose"
  description: "Implement task: {task.id}"
  prompt: "{implementer_prompt}"
  run_in_background: false
```

**Implementer Prompt Must Include:**
1. Task ID, description, acceptance criteria
2. TDD workflow: RED → GREEN → REFACTOR
3. Autonomous decision-making (no questions allowed)
4. Verification: run tests before reporting
5. Output format: `report_implementation_result` tool call

**Implementer Output (Tool Call):**
```typescript
report_implementation_result({
  task_id: "auth.signup",
  status: "success" | "failed",
  verification_passed: true | false,
  tests_passing: "24/24",
  coverage: 87,
  notes: "..."
})
```

### Step 4: Handle Failure → Invoke Healing

If implementer fails:

```
Tool: Skill
Parameters:
  skill: "phase-4-heal"
  args: "--task-id {task_id} --error '{error_message}'"
```

- If heal succeeds → `ralph-dev tasks done "$TASK_ID"`
- If heal fails → `ralph-dev tasks fail "$TASK_ID" --reason "..."`

### Step 5: Update State & Return Result

```bash
# After all tasks processed
ralph-dev state update --phase deliver
```

**REQUIRED Output Format:**
```yaml
---PHASE RESULT---
phase: implement
status: complete
completed: {N}
failed: {M}
auto_healed: {K}
success_rate: {X}%
next_phase: deliver
---END PHASE RESULT---
```

---

## TDD Workflow (For Implementer Agent)

```
1. RED:      Write failing test first
2. GREEN:    Implement minimal code to pass
3. REFACTOR: Clean up while keeping tests green
4. REPEAT:   Continue until all criteria met
5. VERIFY:   Run full test suite before reporting
```

---

## Implementer Agent Rules

**MUST:**
- Follow TDD (test first, then implement)
- Run tests before reporting completion
- Make autonomous decisions (no questions)
- Return structured result via tool call

**MUST NOT:**
- Ask questions (blocks the loop)
- Skip writing tests
- Report success without verification
- Modify files outside task scope

---

## Safety Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Loop timeout | 24 hours | Prevent infinite loops |
| Max heal attempts | 3 per task | Prevent retry storms |
| CI=true | Always | Prevent interactive mode hangs |

---

## Constraints

- **NEVER** implement tasks in main session (always spawn subagent)
- **NEVER** rely on memory counters (always query CLI)
- **NEVER** exit loop until `completed + failed == total`
- **ALWAYS** use `CI=true` when running tests
- **ALWAYS** return structured PHASE RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| No tasks found | Prompt to run Phase 2 |
| Implementer fails | Invoke Phase 4 heal |
| Heal fails 3x | Mark task failed, continue |
| All tasks fail | Continue to Phase 5, report failures |
| Agent no result | Mark task failed (possible crash/question) |
