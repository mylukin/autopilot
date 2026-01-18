---
name: phase-3-implement
description: Autonomous implementation loop with TDD, fresh agents per task, and self-healing
allowed-tools: [Read, Write, Bash, Task, Grep, Glob]
user-invocable: false
---

# Phase 3: Implementation Loop

## Overview | 概述

Autonomously implement all tasks using TDD workflow, spawning fresh agents for each task, with automatic error recovery through Phase 4 healing.

使用 TDD 工作流自主实现所有任务，为每个任务生成新的 agent，通过 Phase 4 自愈进行自动错误恢复。

## When to Use | 何时使用

Invoked by autopilot-orchestrator as Phase 3, after Phase 2 (Breakdown) completes and user approves task plan.

## Input | 输入

- Tasks directory: `workspace/ai/tasks/`
- Task index: `workspace/ai/tasks/index.json`
- Language config from index metadata

## Execution | 执行

### Step 1: Initialize Implementation Loop

```bash
# Get task count
TASK_COUNT=$(cat workspace/ai/tasks/index.json | jq '.tasks | length')
COMPLETED=0
FAILED=0
HEALED=0

echo "🚀 Starting implementation of $TASK_COUNT tasks..."
echo ""
```

### Step 2: Implementation Loop

```bash
while true; do
  # Get next pending task using CLI
  TASK_JSON=$(autopilot-cli tasks next --json 2>/dev/null)

  if [ -z "$TASK_JSON" ]; then
    echo "✅ All tasks processed!"
    break
  fi

  # Extract task details
  TASK_ID=$(echo "$TASK_JSON" | jq -r '.id')
  TASK_DESC=$(echo "$TASK_JSON" | jq -r '.description')
  TASK_PRIORITY=$(echo "$TASK_JSON" | jq -r '.priority')
  TASK_EST_MIN=$(echo "$TASK_JSON" | jq -r '.estimatedMinutes')

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 Task: $TASK_ID (Priority $TASK_PRIORITY)"
  echo "📋 Description: $TASK_DESC"
  echo "⏱️  Estimated: ${TASK_EST_MIN}min"
  echo ""

  # Mark task as started
  autopilot-cli tasks start "$TASK_ID"

  # Record start time
  START_TIME=$(date +%s)

  # Implement the task
  RESULT=$(implement_task "$TASK_ID" "$TASK_JSON")
  STATUS=$?

  # Record end time
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  DURATION_MIN=$((DURATION / 60))
  DURATION_SEC=$((DURATION % 60))
  DURATION_STR="${DURATION_MIN}m ${DURATION_SEC}s"

  if [ $STATUS -eq 0 ]; then
    # Task succeeded
    COMPLETED=$((COMPLETED + 1))
    autopilot-cli tasks done "$TASK_ID" --duration "$DURATION_STR"

    echo "✅ $TASK_ID completed ($COMPLETED/$TASK_COUNT)"
    echo "   Duration: $DURATION_STR"
    echo ""
  else
    # Task failed
    ERROR_MSG=$(echo "$RESULT" | jq -r '.error // "Unknown error"')

    echo "⚠️  Error in $TASK_ID"
    echo "   Error: $ERROR_MSG"
    echo ""

    # Attempt auto-healing
    echo "🔧 Invoking auto-heal..."
    HEAL_RESULT=$(invoke_heal "$TASK_ID" "$ERROR_MSG")
    HEAL_STATUS=$?

    if [ $HEAL_STATUS -eq 0 ]; then
      # Healing succeeded, mark task as done
      COMPLETED=$((COMPLETED + 1))
      HEALED=$((HEALED + 1))
      autopilot-cli tasks done "$TASK_ID" --duration "$DURATION_STR (healed)"

      echo "✅ Healed successfully!"
      echo ""
    else
      # Healing failed, mark task as failed
      FAILED=$((FAILED + 1))
      autopilot-cli tasks fail "$TASK_ID" --reason "$ERROR_MSG"

      echo "❌ Failed to heal. Marked as failed."
      echo ""
    fi
  fi

  # Show progress
  TOTAL_PROCESSED=$((COMPLETED + FAILED))
  PROGRESS_PCT=$((TOTAL_PROCESSED * 100 / TASK_COUNT))

  echo "📊 Progress: $TOTAL_PROCESSED/$TASK_COUNT tasks ($PROGRESS_PCT%)"
  echo "   ✅ Completed: $COMPLETED"
  echo "   ❌ Failed: $FAILED"
  echo "   🔧 Auto-healed: $HEALED"
  echo ""
done
```

### Step 3: Implement Single Task Function

```bash
implement_task() {
  local TASK_ID=$1
  local TASK_JSON=$2

  # Extract task details
  local ACCEPTANCE_CRITERIA=$(echo "$TASK_JSON" | jq -r '.acceptanceCriteria[]')
  local TEST_REQUIRED=$(echo "$TASK_JSON" | jq -r '.testRequirements.unit.required')
  local TEST_PATTERN=$(echo "$TASK_JSON" | jq -r '.testRequirements.unit.pattern')

  # Spawn fresh implementer agent
  echo "🤖 Spawning implementer agent for $TASK_ID..."

  # Use Task tool to invoke implementer agent
  IMPLEMENTER_PROMPT="You are an implementer agent for task: $TASK_ID

Task Details:
$(echo "$TASK_JSON" | jq .)

Your Mission:
1. Implement this task following TDD workflow:
   - RED: Write failing tests first
   - GREEN: Implement minimum code to pass tests
   - REFACTOR: Clean up code while keeping tests passing

2. Satisfy ALL acceptance criteria:
$ACCEPTANCE_CRITERIA

3. Create test files matching pattern: $TEST_PATTERN

4. Ensure tests pass before completing

5. Follow the project's language and framework conventions

CRITICAL: Only implement what's specified in acceptance criteria. No extra features.

Start with tests, then implementation, then verification."

  # Invoke implementer agent via Task tool
  # (In real usage, this would spawn a fresh general-purpose agent)
  # For now, simulate the implementation

  # Actual invocation would be:
  # Use Task tool with:
  #   subagent_type: "general-purpose"
  #   description: "Implement task $TASK_ID"
  #   prompt: "$IMPLEMENTER_PROMPT"

  # Simulated success/failure
  # Return 0 for success, 1 for failure
  return 0
}
```

### Step 4: Invoke Healing Function

```bash
invoke_heal() {
  local TASK_ID=$1
  local ERROR_MSG=$2

  echo "🔧 Invoking phase-4-heal for error recovery..."

  # Delegate to phase-4-heal skill
  # Use Skill tool or direct invocation

  # Heal function will:
  # 1. WebSearch for error solution
  # 2. Apply fix
  # 3. Re-run tests
  # 4. Return success/failure

  # For now, simulate healing attempt
  # Return 0 for successful heal, 1 for failed heal
  return 1  # Simulate heal failure for now
}
```

### Step 5: Final Summary

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Implementation Complete!"
echo ""
echo "📊 Final Statistics:"
echo "   Total tasks: $TASK_COUNT"
echo "   ✅ Completed: $COMPLETED"
echo "   ❌ Failed: $FAILED"
echo "   🔧 Auto-healed: $HEALED"
echo "   Success rate: $((COMPLETED * 100 / TASK_COUNT))%"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some tasks failed. They are marked with status='failed'."
  echo "   Review failed tasks in workspace/ai/tasks/"
  echo ""
fi

echo "▶️  Next: Phase 5 (Deliver) - Quality gates and PR creation"
```

### Step 6: Update State

```bash
# Update state to deliver phase
autopilot-cli state update --phase deliver
```

### Step 7: Return Result

```yaml
---PHASE RESULT---
phase: implement
status: complete
completed: {N}
failed: {M}
auto_healed: {K}
success_rate: {X}%
next_phase: deliver
summary: |
  Implemented {N}/{total} tasks successfully.
  Auto-healed {K} errors.
  {M} tasks failed and need manual attention.
  Ready for quality verification and delivery.
---END PHASE RESULT---
```

## Progress Updates | 进度更新

Show progress after each task:

```
✅ auth.signup.ui completed (3/35)
   Duration: 4m 32s
   Tests: 8/8 passed ✓
   Coverage: 87%
   Files:
     - src/components/SignupForm.tsx (new)
     - tests/components/SignupForm.test.tsx (new)
   Next: auth.signup.validation
```

For errors with healing:

```
⚠️  Error in auth.signup.api
    Module 'bcrypt' not found
🔧 Auto-healing...
   Step 1: WebSearch "npm bcrypt install"
   Step 2: npm install bcrypt@5.1.0
   Step 3: Verify - npm test (✅ 24/24 passed)
✅ Healed successfully (1m 12s)
```

## Implementer Agent Template | 实现者 Agent 模板

When spawning implementer agents, use this prompt template:

```markdown
You are an autonomous implementer agent for a single task.

TASK: {task.id}
DESCRIPTION: {task.description}

ACCEPTANCE CRITERIA:
{criteria-list}

TEST REQUIREMENTS:
- Pattern: {test-pattern}
- Required: {yes/no}
- Min coverage: 80%

WORKFLOW (TDD):

1. RED Phase - Write Failing Tests:
   - Create test file: {test-pattern}
   - Write tests for EACH acceptance criterion
   - Run tests - they MUST fail
   - Verify tests are testing the right thing

2. GREEN Phase - Implement Minimum Code:
   - Write ONLY code needed to pass tests
   - No extra features
   - No premature optimization
   - Run tests - they MUST pass

3. REFACTOR Phase - Clean Code:
   - Improve naming, structure
   - Remove duplication
   - Apply design patterns if appropriate
   - Run tests after EACH change - must stay passing

4. VERIFY - Final Check:
   - All tests pass ✓
   - Coverage >80% ✓
   - All acceptance criteria satisfied ✓
   - No linting errors ✓

CONSTRAINTS:
- Only implement what's specified in acceptance criteria
- Follow TDD strictly (tests first)
- Use project's language/framework conventions
- Keep code clean and simple

OUTPUT:
When done, report:
- Files created/modified
- Test results (pass count, coverage %)
- Duration
- Any issues encountered
```

## Error Handling | 错误处理

| Error | Action |
|-------|--------|
| No tasks found | Prompt to run Phase 2 |
| Task implementation fails | Invoke Phase 4 (heal) |
| Healing fails (max 3 attempts) | Mark task as failed, continue |
| All tasks fail | Continue to Phase 5, report failures |
| User interrupts | Save state, allow resume |

## Example Flow | 示例流程

```
🚀 Starting implementation of 35 tasks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: setup.scaffold (Priority 1)
📋 Description: Initialize project structure
⏱️  Estimated: 15min

🤖 Spawning implementer agent...
✅ setup.scaffold completed (1/35)
   Duration: 3m 47s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: auth.signup.ui (Priority 5)
📋 Description: Create signup form component
⏱️  Estimated: 20min

🤖 Spawning implementer agent...
⚠️  Error: Module 'react-hook-form' not found
🔧 Invoking auto-heal...
✅ Healed successfully! (1m 23s)
✅ auth.signup.ui completed (5/35)
   Duration: 6m 12s (healed)

📊 Progress: 5/35 tasks (14%)
   ✅ Completed: 5
   ❌ Failed: 0
   🔧 Auto-healed: 1

[... continues for all 35 tasks ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Implementation Complete!

📊 Final Statistics:
   Total tasks: 35
   ✅ Completed: 33
   ❌ Failed: 2
   🔧 Auto-healed: 4
   Success rate: 94%

▶️  Next: Phase 5 (Deliver)
```

## Rules | 规则

1. **Fresh agent per task** - Prevent context pollution
2. **TDD workflow mandatory** - Tests before implementation
3. **Auto-heal on first error** - Try to fix automatically
4. **Mark failed after heal attempts** - Continue to next task
5. **Show progress regularly** - After each task and every 3 tasks
6. **Never skip tasks** - Process in priority order
7. **Save state continuously** - Can resume anytime

## Notes | 注意事项

- Implementation quality depends on clear acceptance criteria
- Fresh agents ensure no context bleed between tasks
- Auto-healing uses Phase 4 (WebSearch-powered)
- Failed tasks can be manually fixed and re-run later
- Progress is persisted in task files and state.json
