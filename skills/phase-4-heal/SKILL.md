---
name: phase-4-heal
description: Systematic error recovery using root cause investigation before fixes
allowed-tools: [Read, Write, Bash, WebSearch, Grep, Glob]
user-invocable: false
---

# Phase 4: Systematic Healing

## Goal

Systematically investigate and fix implementation errors using root cause analysis. **NO FIXES WITHOUT INVESTIGATION FIRST.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1 (Root Cause Investigation), you CANNOT propose fixes.

## Input

- Task ID: `{task_id}`
- Error message: `{error_msg}`
- Error context: Stack trace, test output, build logs

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
# Expected: implement or heal (invoked by phase-3)
```

### Step 1: Load Context

```bash
# Get task details (context-compression safe)
TASK_JSON=$(ralph-dev tasks get "$TASK_ID" --json)
TASK_DESC=$(echo "$TASK_JSON" | jq -r '.data.description // "No description"')

# Get test command from language config
TEST_CMD=$(ralph-dev detect --json | jq -r '.verifyCommands[] | select(contains("test"))' | head -1)

echo "Task: $TASK_ID"
echo "Description: $TASK_DESC"
echo "Test command: $TEST_CMD"
```

---

## The Four Phases

**MANDATORY**: Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

1. **Read error completely** - Extract line number, file path, error code
2. **Reproduce consistently** - Run `CI=true {test_command}` to confirm
3. **Check recent changes** - `git log -5`, `git diff HEAD~1`
4. **Trace data flow** - Find where the bad value originates

### Phase 2: Pattern Analysis

1. **Find working examples** - Search codebase for similar working patterns
2. **Compare working vs broken** - Identify key differences
3. **Check dependencies** - Verify modules are installed and versions match

### Phase 3: Hypothesis and Testing

1. **Form hypothesis** - Based on investigation, classify error type
2. **Use WebSearch** - Confirm hypothesis with proven solutions
3. **Validate approach** - Ensure fix addresses root cause, not symptoms

**Error Classification:**

| Error Type | Indicators | Fix Type |
|------------|------------|----------|
| Missing dependency | "Module not found", "Cannot find module" | npm install |
| Type error | "TypeError", type mismatch | Code fix |
| Undefined reference | "is not defined", "ReferenceError" | Import/declaration |
| Test failure | "Expected X but got Y" | Implementation logic |
| Build error | "compilation error", "build failed" | Config fix |

### Phase 4: Implementation with Verification

**Max 3 attempts. After 3 failures → mark task as failed.**

```bash
MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  # Apply single fix based on hypothesis
  # Run tests: CI=true {test_command}

  if [ $? -eq 0 ]; then
    # SUCCESS - return result
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  # If still failing, refine hypothesis and retry
done
```

**CRITICAL:** Always show full test output as verification evidence.

---

## Return Result

**REQUIRED Output Format:**
```yaml
---HEALING RESULT---
task_id: {task_id}
status: success | failed
verification_passed: true | false
attempts: {N}
fix_type: dependency | code | implementation | config
hypothesis: {what was wrong}
notes: {brief summary}
---END HEALING RESULT---
```

---

## Safety Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Max attempts | 3 | Prevent infinite retry loops |
| Timeout | 1 hour | Prevent stuck healing |
| Single fix per attempt | 1 | Isolate variables |

---

## Constraints

- **NEVER** apply fixes without completing Phase 1 investigation
- **NEVER** apply multiple fixes at once (isolate variables)
- **NEVER** retry more than 3 times
- **ALWAYS** use `CI=true` when running tests
- **ALWAYS** show full test output as verification evidence
- **ALWAYS** return structured HEALING RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| Cannot reproduce | Gather more data, check environment |
| No working examples | Use WebSearch for reference implementations |
| All 3 attempts fail | Mark task failed, require manual intervention |
| Hypothesis unclear | Return to Phase 1 with more investigation |

---

## Key Principles

1. **Investigation before action** - Understand the problem first
2. **One fix at a time** - Isolate variables for debugging
3. **Evidence-based** - Show test output, don't just assert success
4. **WebSearch to confirm** - Don't guess, find proven solutions
5. **Circuit breaker** - 3 attempts max, then escalate
