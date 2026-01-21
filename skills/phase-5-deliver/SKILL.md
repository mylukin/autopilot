---
name: phase-5-deliver
description: Two-stage code review, quality gates, and automated delivery (commit + PR)
allowed-tools: [Read, Write, Bash, Grep, Glob]
user-invocable: false
---

# Phase 5: Deliver

## Goal

Run quality gates, perform two-stage code review, create commit, and optionally create pull request.

## Input

- Completed tasks from Phase 3
- Task directory: `.ralph-dev/tasks/`
- Implementation files: All modified/created files

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
FAILED=$(echo "$TASKS_JSON" | jq -r '.data.failed // 0')
echo "Current phase: $CURRENT_PHASE | Tasks: $COMPLETED/$TOTAL completed, $FAILED failed"
# Expected: deliver
```

### Step 1: Gather Summary

```bash
# Query task stats (context-compression safe)
COMPLETED=$(ralph-dev tasks list --status completed --json | jq -r '.data.total')
TOTAL=$(ralph-dev tasks list --json | jq -r '.data.total')
echo "Tasks completed: $COMPLETED/$TOTAL"
```

### Step 2: Run Quality Gates

**CRITICAL:** All gates must pass before delivery.

```bash
# Get verification commands from language config
VERIFY_CMDS=$(ralph-dev detect --json | jq -r '.verifyCommands[]')

# Run each command with CI=true
for cmd in $VERIFY_CMDS; do
  echo "Running: $cmd"
  CI=true eval "$cmd"
  [ $? -ne 0 ] && { echo "GATE FAILED: $cmd"; exit 1; }
done
```

**Standard Quality Gates:**
- Type checking (e.g., `npx tsc --noEmit`)
- Linting (e.g., `npm run lint`)
- Tests (e.g., `npm test`)
- Build (e.g., `npm run build`)

### Step 3: Two-Stage Code Review

**Stage 1: Spec Compliance** (Blocking)
- Does implementation satisfy all acceptance criteria?
- Are all required tests present?
- No requirements missed?

**Stage 2: Code Quality** (Advisory)
- Files not too large (>500 lines → suggest splitting)
- No debug code left (console.log, TODO, FIXME)
- No excessive commented code
- Best practices followed

### Step 4: Create Git Commit

```bash
# Stage changes
git add .

# Generate commit message based on completed tasks
# Format: feat(modules): description

git commit -m "$(cat <<EOF
feat({modules}): implement {N} tasks

Tasks completed:
{task list}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

COMMIT_SHA=$(git rev-parse --short HEAD)
```

### Step 5: Create Pull Request (Optional)

If `gh` CLI available and on feature branch:

```bash
# Push branch
git push -u origin $(git branch --show-current)

# Create PR
gh pr create \
  --title "{PR title}" \
  --body "{PR body with summary, tasks, quality gates}"
```

### Step 6: Cleanup (Optional)

Ask user about cleaning up temporary files:
- Remove: `state.json`, `progress.log`, `debug.log`
- Keep: `prd.md`, `tasks/`

### Step 7: Update State & Return Result

```bash
ralph-dev state update --phase complete
```

**REQUIRED Output Format:**
```yaml
---PHASE RESULT---
phase: deliver
status: complete
tasks_delivered: {N}
commit_sha: {sha}
pr_url: {url or null}
quality_gates:
  typecheck: passed
  lint: passed
  tests: passed
  build: passed
code_review:
  spec_compliance: passed
  code_quality: passed | passed_with_suggestions
next_phase: null
---END PHASE RESULT---
```

---

## Quality Gate Rules

| Gate | Blocking | Retry |
|------|----------|-------|
| Type checking | Yes | Fix errors, re-run |
| Linting | Yes | Fix errors, re-run |
| Tests | Yes | Fix failures, re-run |
| Build | Yes | Fix errors, re-run |
| Spec compliance | Yes | Implementation incomplete |
| Code quality | No | Suggestions only |

---

## Constraints

- **NEVER** commit if any blocking gate fails
- **NEVER** push without user awareness (PR creation is explicit)
- **ALWAYS** use `CI=true` when running verification commands
- **ALWAYS** include `Co-Authored-By` in commit message
- **ALWAYS** show full gate output as evidence
- **ALWAYS** return structured PHASE RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| Quality gate fails | Stop delivery, report failure, don't commit |
| Spec compliance issues | Report issues, don't commit |
| Commit fails | Abort delivery, report error |
| PR creation fails | Continue (manual PR fallback) |
| gh CLI not found | Skip PR, show manual instructions |
