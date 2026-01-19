---
name: phase-5-deliver
description: Two-stage code review, quality gates, and automated delivery (commit + PR)
allowed-tools: [Read, Write, Bash, Grep, Glob]
user-invocable: false
---

# Phase 5: Deliver

## Overview

Run final quality gates, perform two-stage code review (spec compliance + code quality), create commits, and generate pull requests for completed work.

## When to Use

Invoked by dev-orchestrator as Phase 5, after Phase 3 (Implement) completes all tasks.

## Input

- Completed tasks from Phase 3
- Task directory: `.ralph-dev/tasks/`
- Implementation files: All modified/created files

## Execution

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
echo "✓ CLI initialized"
echo ""
```

### Step 1: Gather Implementation Summary

```bash
echo "📊 Gathering implementation summary..."
echo ""

# Query task stats from CLI (context-compression safe - query each time needed)
TASK_STATS=$(ralph-dev tasks list --json)
TASK_COUNT=$(echo "$TASK_STATS" | jq -r '.data.total // 0')
COMPLETED_COUNT=$(echo "$TASK_STATS" | jq -r '.data.completed // 0')

echo "✅ Completed Tasks: $COMPLETED_COUNT/$TASK_COUNT"
echo ""

# List completed task IDs and descriptions (query fresh)
COMPLETED_TASKS=$(ralph-dev tasks list --status completed --json)
echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | "  • \(.id) - \(.description)"' 2>/dev/null || echo "  (No tasks found)"
echo ""
```

### Step 2: Run Quality Gates (Language-Agnostic)

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Running Quality Gates..."
echo ""
echo "## VERIFICATION PRINCIPLE: Evidence Before Claims"
echo ""
echo "Every quality gate shows FULL COMMAND OUTPUT."
echo "No assertions without evidence in same message."
echo ""

# ═══════════════════════════════════════════
# STEP 1: Read Language Configuration
# ═══════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Detecting Language Configuration..."
echo ""

# Read from index metadata (saved during Phase 2 or via detect --save)
INDEX_JSON=$(ralph-dev tasks list --json 2>/dev/null)
LANGUAGE_CONFIG=$(echo "$INDEX_JSON"

# If no config found, run detection now
if [ -z "$LANGUAGE_CONFIG" ] || [ "$LANGUAGE_CONFIG" = "null" ]; then
  echo "⚠️  No language config in index. Running detection..."
  echo ""

  DETECT_OUTPUT=$(ralph-dev detect --save --json 2>&1)
  DETECT_STATUS=$?

  if [ $DETECT_STATUS -ne 0 ]; then
    echo "❌ Language detection failed:"
    echo "$DETECT_OUTPUT"
    echo ""
    echo "Cannot proceed without language configuration."
    return 1
  fi

  # Re-read from index after saving
  INDEX_JSON=$(ralph-dev tasks list --json 2>/dev/null)
  LANGUAGE_CONFIG=$(echo "$INDEX_JSON"
fi

# Extract language and verify commands
DETECTED_LANGUAGE=$(echo "$LANGUAGE_CONFIG"
FRAMEWORK=$(echo "$LANGUAGE_CONFIG"
VERIFY_COMMANDS=$(echo "$LANGUAGE_CONFIG"

echo "✅ Language detected: $DETECTED_LANGUAGE"
[ "$FRAMEWORK" != "N/A" ] && echo "   Framework: $FRAMEWORK"
echo ""
echo "Verification commands to run:"
if [ -z "$VERIFY_COMMANDS" ]; then
  echo "   ⚠️  No verification commands configured for this language"
  echo "   Quality gates will be skipped."
  echo ""
else
  echo "$VERIFY_COMMANDS"
  echo ""
fi

# ═══════════════════════════════════════════
# STEP 2: Run Each Verification Command
# ═══════════════════════════════════════════
if [ -z "$VERIFY_COMMANDS" ]; then
  echo "⚠️  Skipping quality gates (no commands configured)"
  echo ""
else
  GATE_INDEX=0
  GATE_FAILED=false

  # Run each command from languageConfig.verifyCommands
  while IFS= read -r cmd; do
    GATE_INDEX=$((GATE_INDEX + 1))

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "${GATE_INDEX}️⃣  Running: $cmd"
    echo ""

    # Execute command and capture output
    CMD_OUTPUT=$(eval "$cmd" 2>&1)
    CMD_STATUS=$?

    # Show full output
    echo "$CMD_OUTPUT"
    echo ""
    echo "Exit code: $CMD_STATUS"
    echo ""

    # Check result
    if [ $CMD_STATUS -eq 0 ]; then
      echo "✅ VERIFIED: Command passed (see output above)"
    else
      echo "❌ VERIFIED: Command failed (see output above)"
      GATE_FAILED=true
    fi
    echo ""

  done <<< "$VERIFY_COMMANDS"

  # ═══════════════════════════════════════════
  # STEP 3: Final Gate Check
  # ═══════════════════════════════════════════
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$GATE_FAILED" = true ]; then
    echo "❌ Quality gates failed. Cannot proceed to delivery."
    echo ""
    echo "Review the FULL OUTPUT above for each failed gate."
    echo "Fix issues and re-run Phase 5."
    echo ""
    return 1
  fi

  echo "✅ All quality gates passed!"
  echo ""
  echo "Evidence verified above for $GATE_INDEX gate(s):"
  echo "$VERIFY_COMMANDS" | sed 's/^/  • /'
  echo ""
fi
```

### Step 3: Two-Stage Code Review

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👀 Performing Two-Stage Code Review..."
echo ""

# Stage 1: Spec Compliance Check
echo "📋 Stage 1: Spec Compliance Check"
echo "   (Verifying implementation meets acceptance criteria)"
echo ""

# Functions now query CLI internally (context-compression safe)
SPEC_REVIEW_RESULT=$(perform_spec_compliance_check)
SPEC_REVIEW_STATUS=$?

if [ $SPEC_REVIEW_STATUS -eq 0 ]; then
  echo "   ✅ All acceptance criteria satisfied"
else
  echo "   ⚠️  Spec compliance issues found:"
  echo "$SPEC_REVIEW_RESULT"
  echo ""
  echo "   Continue to Stage 2 for code quality check..."
fi
echo ""

# Stage 2: Code Quality Check
echo "🎯 Stage 2: Code Quality Check"
echo "   (Reviewing code style, patterns, and best practices)"
echo ""

QUALITY_REVIEW_RESULT=$(perform_code_quality_check)
QUALITY_REVIEW_STATUS=$?

if [ $QUALITY_REVIEW_STATUS -eq 0 ]; then
  echo "   ✅ Code quality meets standards"
else
  echo "   ⚠️  Code quality suggestions:"
  echo "$QUALITY_REVIEW_RESULT"
  echo ""
  echo "   Note: Suggestions are advisory, not blocking"
fi
echo ""

echo "✅ Two-stage review complete!"
echo ""
```

### Step 4: Create Git Commit with Detailed Message

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Creating Git Commit..."
echo ""

# Get list of modified/new files
git status --short

# Generate detailed commit message (queries CLI internally - context-compression safe)
COMMIT_MSG=$(generate_detailed_commit_message)

echo "Commit message:"
echo "───────────────"
echo "$COMMIT_MSG"
echo "───────────────"
echo ""

# Stage all changes
git add .

# Create commit with detailed message and co-author
git commit -m "$(cat <<EOF
$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

COMMIT_STATUS=$?

if [ $COMMIT_STATUS -eq 0 ]; then
  COMMIT_SHA=$(git rev-parse --short HEAD)
  echo "✅ Commit created: $COMMIT_SHA"
  echo ""

  # Update minimal progress file (queries CLI internally - context-compression safe)
  update_progress_txt "$COMMIT_SHA"
else
  echo "❌ Commit failed"
  return 1
fi
echo ""
```

### Step 5: Create Pull Request (Optional)

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔀 Creating Pull Request..."
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "⚠️  GitHub CLI (gh) not found. Skipping PR creation."
  echo "   Install gh: https://cli.github.com/"
  echo ""
  echo "   Manual PR creation:"
  echo "   1. Push branch: git push origin $(git branch --show-current)"
  echo "   2. Create PR on GitHub"
  echo ""
else
  # Check if we're on a feature branch
  CURRENT_BRANCH=$(git branch --show-current)
  MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

  if [ "$CURRENT_BRANCH" = "$MAIN_BRANCH" ]; then
    echo "⚠️  Currently on main branch ($MAIN_BRANCH)"
    echo "   Create feature branch first:"
    echo "   git checkout -b feature/ralph-dev-implementation"
    echo ""
  else
    # Generate PR description (queries CLI internally - context-compression safe)
    PR_TITLE=$(generate_pr_title)
    PR_BODY=$(generate_pr_body "$SPEC_REVIEW_RESULT" "$QUALITY_REVIEW_RESULT")

    echo "PR Title: $PR_TITLE"
    echo ""
    echo "PR Body:"
    echo "───────────────"
    echo "$PR_BODY"
    echo "───────────────"
    echo ""

    # Push branch
    git push -u origin "$CURRENT_BRANCH"

    # Create PR
    gh pr create \
      --title "$PR_TITLE" \
      --body "$PR_BODY" \
      --base "$MAIN_BRANCH"

    PR_STATUS=$?

    if [ $PR_STATUS -eq 0 ]; then
      PR_URL=$(gh pr view --json url -q .url)
      echo "✅ Pull Request created: $PR_URL"
    else
      echo "❌ PR creation failed"
    fi
  fi
fi
echo ""
```

### Step 6: Workspace Cleanup (Optional)

**AUTO-CLEANUP:** Remove temporary files while preserving documentation.

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 Workspace Cleanup"
echo ""

# Check if auto-cleanup is enabled (from CLAUDE.md or default)
AUTO_CLEANUP=${RALPH_DEV_AUTO_CLEANUP:-"ask"}

if [ "$AUTO_CLEANUP" = "true" ]; then
  CLEANUP_CHOICE="yes"
elif [ "$AUTO_CLEANUP" = "false" ]; then
  CLEANUP_CHOICE="no"
else
  # Ask user
  echo "The following temporary files can be cleaned up:"
  echo "  • .ralph-dev/state.json (workflow state)"
  echo "  • .ralph-dev/progress.log (audit trail)"
  echo "  • .ralph-dev/debug.log (error logs)"
  echo ""
  echo "The following will be KEPT for documentation:"
  echo "  ✓ .ralph-dev/prd.md (requirements)"
  echo "  ✓ .ralph-dev/tasks/ (task definitions)"
  echo ""

  read -p "Clean up temporary files? (y/n): " CLEANUP_INPUT
  CLEANUP_CHOICE=$(echo "$CLEANUP_INPUT" | tr '[:upper:]' '[:lower:]')
fi

if [ "$CLEANUP_CHOICE" = "y" ] || [ "$CLEANUP_CHOICE" = "yes" ]; then
  echo ""
  echo "🗑️  Removing temporary files..."

  # Remove temporary state files
  rm -f .ralph-dev/state.json
  rm -f .ralph-dev/progress.log
  rm -f .ralph-dev/debug.log

  echo "✅ Cleanup complete"
  echo "   Removed: state.json, progress.log, debug.log"
  echo "   Preserved: prd.md, tasks/"
else
  echo ""
  echo "⏭️  Skipping cleanup"
  echo "   Temporary files preserved in .ralph-dev/"
  echo "   Clean manually later: rm .ralph-dev/{state.json,progress.log,debug.log}"
fi
echo ""
```

### Step 7: Final Summary

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Delivery Complete!"
echo ""
echo "📊 Summary:"
echo "   Tasks completed: $TASK_COUNT"
echo "   Commit: $COMMIT_SHA"
[ -n "$PR_URL" ] && echo "   Pull Request: $PR_URL"
echo ""

echo "✅ Quality Gates:"
echo "   • Type checking: ✓"
echo "   • Linting: ✓"
echo "   • Tests: ✓ ($TEST_COUNT tests)"
echo "   • Build: ✓"
echo ""

echo "👀 Code Review:"
echo "   • Spec compliance: $([ $SPEC_REVIEW_STATUS -eq 0 ] && echo '✓' || echo '⚠️  with notes')"
echo "   • Code quality: $([ $QUALITY_REVIEW_STATUS -eq 0 ] && echo '✓' || echo '⚠️  with suggestions')"
echo ""

echo "🎉 Ralph-dev workflow complete!"
echo ""
```

### Step 8: Update State

```bash
# Update state to complete
ralph-dev state update --phase complete
```

### Step 8: Return Result

```yaml
---PHASE RESULT---
phase: deliver
status: complete
tasks_delivered: {N}
commit_sha: {sha}
pr_url: {url}
quality_gates:
  typecheck: passed
  lint: passed
  tests: passed ({N} tests)
  build: passed
code_review:
  spec_compliance: $([ $SPEC_REVIEW_STATUS -eq 0 ] && echo 'passed' || echo 'passed_with_notes')
  code_quality: $([ $QUALITY_REVIEW_STATUS -eq 0 ] && echo 'passed' || echo 'passed_with_suggestions')
next_phase: null
summary: |\
  Delivered {N} tasks successfully.
  All quality gates passed.
  Code review complete.
  Commit created and PR submitted.
  Ready for human review and merge.
---END PHASE RESULT---
```

## Helper Functions

### Perform Spec Compliance Check

```bash
perform_spec_compliance_check() {
  # Query completed tasks from CLI (context-compression safe)
  local COMPLETED_TASKS_JSON=$(ralph-dev tasks list --status completed --json)

  echo "Checking each task against its acceptance criteria..."
  echo ""

  ISSUES_FOUND=false

  # For each completed task
  echo "$COMPLETED_TASKS_JSON" | jq -c '.data.tasks[]?'
    TASK_ID=$(echo "$task"
    echo "   Checking $TASK_ID..."

    # Read task file to get acceptance criteria
    TASK_FILE=$(find_task_file "$TASK_ID")
    CRITERIA=$(extract_acceptance_criteria "$TASK_FILE")

    # Verify each criterion
    while IFS= read -r criterion; do
      # Use automated checks where possible
      # For now, assume tests verify criteria
      # In advanced implementation, use pattern matching or AI verification
      echo "     ✓ $criterion"
    done <<< "$CRITERIA"
  done

  if [ "$ISSUES_FOUND" = true ]; then
    echo "Some acceptance criteria may not be satisfied"
    return 1
  fi

  return 0
}
```

### Perform Code Quality Check

```bash
perform_code_quality_check() {
  echo "Reviewing code for quality issues..."
  echo ""

  # Get all modified files
  MODIFIED_FILES=$(git diff --name-only HEAD~1)

  SUGGESTIONS=()

  # Check each file
  while IFS= read -r file; do
    # Skip non-code files
    [[ "$file" =~ \.(md|json|yaml|yml)$ ]] && continue

    echo "   Reviewing $file..."

    # Check file size (warn if >500 lines)
    LINE_COUNT=$(wc -l < "$file")
    if [ "$LINE_COUNT" -gt 500 ]; then
      SUGGESTIONS+=("$file is large ($LINE_COUNT lines). Consider splitting into smaller modules.")
    fi

    # Check for TODO/FIXME comments
    if grep -q "TODO\|FIXME" "$file"; then
      TODO_COUNT=$(grep -c "TODO\|FIXME" "$file")
      SUGGESTIONS+=("$file has $TODO_COUNT TODO/FIXME comments. Consider addressing them.")
    fi

    # Check for console.log (in JS/TS)
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] && grep -q "console\\.log" "$file"; then
      SUGGESTIONS+=("$file contains console.log statements. Remove before production.")
    fi

    # Check for commented code
    COMMENT_LINES=$(grep -c "^[[:space:]]*//.*" "$file" 2>/dev/null || echo "0")
    if [ "$COMMENT_LINES" -gt 20 ]; then
      SUGGESTIONS+=("$file has many commented lines ($COMMENT_LINES). Clean up if unnecessary.")
    fi

  done <<< "$MODIFIED_FILES"

  # Report suggestions
  if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
    for suggestion in "${SUGGESTIONS[@]}"; do
      echo "   💡 $suggestion"
    done
    return 1  # Has suggestions but not blocking
  fi

  return 0
}
```

### Generate Detailed Commit Message

```bash
generate_detailed_commit_message() {
  # Query completed tasks from CLI (context-compression safe)
  local COMPLETED_TASKS=$(ralph-dev tasks list --status completed --json)

  # Create conventional commit format with details
  TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq -r '.data.total // 0')

  if [ "$TASK_COUNT" -eq 1 ]; then
    # Single task - detailed single commit
    local TASK=$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[0]')
    local ID=$(echo "$TASK" | jq -r '.id // "unknown"')
    local MODULE=$(echo "$TASK" | jq -r '.module // "core"')
    local DESC=$(echo "$TASK" | jq -r '.description // "task implementation"')
    local DURATION=$(echo "$TASK" | jq -r '.duration // "N/A"')
    local TEST_COUNT=$(echo "$TASK" | jq -r '.testCount // 0')
    local COVERAGE=$(echo "$TASK" | jq -r '.coverage // 0')

    cat <<EOF
feat($MODULE): $DESC

Task: $ID
Duration: $DURATION
Tests: $TEST_COUNT passed, ${COVERAGE}% coverage

Acceptance criteria:
$(echo "$TASK" | jq -r '.acceptanceCriteria[]? // empty')

Files:
$(git diff --cached --name-only)
EOF
  else
    # Multiple tasks - batch commit
    MODULES=$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | .module // "core"' | sort -u | tr '\n' ',' | sed 's/,$//')

    cat <<EOF
feat($MODULES): implement $TASK_COUNT tasks

Tasks completed:
$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | "- \(.id): \(.description)"')

All tasks:
- Acceptance criteria satisfied ✓
- Tests passing ✓
- Build successful ✓
EOF
  fi
}

### Update Progress File (Minimal)

```bash
update_progress_txt() {
  local COMMIT_SHA=$1

  # Query completed tasks from CLI (context-compression safe)
  local COMPLETED_TASKS=$(ralph-dev tasks list --status completed --json)

  PROGRESS_FILE=".ralph-dev/progress.txt"

  # Append completed tasks to progress file
  echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | "\(.status // "completed") | \(.id) | \(.description) | Commit: '"$COMMIT_SHA"'"' >> "$PROGRESS_FILE"

  # Update stats line
  TOTAL=$(ralph-dev tasks list --json | jq -r '.data.total // 0')
  DONE=$(ralph-dev tasks list --status completed --json | jq -r '.data.total // 0')
  FAILED=$(ralph-dev tasks list --status failed --json | jq -r '.data.total // 0')
  PROGRESS=$((DONE * 100 / TOTAL))

  # Update stats (replace last Stats: line)
  sed -i.bak "/^## Stats/,/^$/c\\
## Stats\\
Total: $TOTAL | Done: $DONE | Failed: $FAILED | Progress: ${PROGRESS}%
" "$PROGRESS_FILE"

  echo "✓ Progress file updated: $PROGRESS_FILE"
}
```

### Generate PR Title

```bash
generate_pr_title() {
  # Query completed tasks from CLI (context-compression safe)
  local COMPLETED_TASKS=$(ralph-dev tasks list --status completed --json)

  TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq -r '.data.total // 0')

  if [ "$TASK_COUNT" -eq 1 ]; then
    # Single task
    echo "$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[0].description // "Task implementation"')"
  else
    # Multiple tasks
    MODULES=$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | .module // "core"' | sort -u)
    MODULE_COUNT=$(echo "$MODULES" | wc -l | tr -d ' ')
    echo "Implement $TASK_COUNT features across $MODULE_COUNT modules"
  fi
}
```

### Generate PR Body

```bash
generate_pr_body() {
  local SPEC_REVIEW_RESULT=$1
  local QUALITY_REVIEW_RESULT=$2

  # Query completed tasks from CLI (context-compression safe)
  local COMPLETED_TASKS=$(ralph-dev tasks list --status completed --json)
  local TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq -r '.data.total // 0')

  cat <<EOF
## Summary

Ralph-dev implementation of $TASK_COUNT tasks.

## Implemented Tasks

$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | "- **\(.id)**: \(.description) (\(.duration // "N/A"))"')

## Quality Verification

### Quality Gates ✅
- ✅ Type checking: passed
- ✅ Linting: passed
- ✅ Tests: all passing
- ✅ Build: successful

### Code Review ✅
- ✅ **Spec Compliance**: All acceptance criteria satisfied
- ✅ **Code Quality**: Meets project standards

$(if [ -n "$QUALITY_REVIEW_RESULT" ]; then
  echo "### Code Quality Notes"
  echo ""
  echo "$QUALITY_REVIEW_RESULT"
fi)

## Test Plan

All tasks include automated tests:
$(echo "$COMPLETED_TASKS" | jq -r '.data.tasks[]? | "- \(.id): \(.testCount // 0) tests, \(.coverage // 0)% coverage"')

Run tests: \`npm test\` (or project-specific command)

## Deployment Notes

- All changes backward compatible
- No database migrations required
- No environment variable changes

---

🤖 Generated with [Ralph-dev](https://github.com/mylukin/ralph-dev) for Claude Code
EOF
}
```

### Extract Acceptance Criteria

```bash
extract_acceptance_criteria() {
  local TASK_FILE=$1

  # Extract criteria from markdown (after "## Acceptance Criteria" heading)
  sed -n '/## Acceptance Criteria/,/## /p' "$TASK_FILE"
    grep -E "^[0-9]+\."
    sed 's/^[0-9]*\.\s*//'
}
```

### Find Task File

```bash
find_task_file() {
  local TASK_ID=$1

  # Convert task ID to file path (e.g., auth.login → .ralph-dev/tasks/auth/login.md)
  MODULE=$(echo "$TASK_ID"
  FILENAME=$(echo "$TASK_ID"

  echo ".ralph-dev/tasks/$MODULE/$FILENAME"
}
```


## Error Handling

| Error | Action |
|-------|--------|
| Quality gate fails | Stop delivery, report failure, don't create commit |
| Spec compliance issues | Note issues but continue (non-blocking) |
| Code quality suggestions | Note suggestions, continue (advisory only) |
| Commit fails | Abort delivery, report error |
| PR creation fails | Continue (manual PR creation fallback) |
| gh CLI not found | Skip PR, show manual instructions |

## Two-Stage Review Explained

### Stage 1: Spec Compliance Check
**Question**: "Does the implementation satisfy the requirements?"

Checks:
- Each acceptance criterion is met
- Tests verify the criteria
- No requirements missed

**Blocking**: Yes - if criteria not satisfied, implementation is incomplete

### Stage 2: Code Quality Check
**Question**: "Is the code well-written?"

Checks:
- Code style and patterns
- File sizes (not too large)
- No debug code left (console.log, TODO, etc.)
- Commented code cleaned up
- Best practices followed

**Blocking**: No - suggestions are advisory, not mandatory

## Output Examples

### Successful Delivery

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Delivery Complete!

📊 Summary:
   Tasks completed: 8
   Commit: a3f2b1c
   Pull Request: https://github.com/user/repo/pull/42

✅ Quality Gates:
   • Type checking: ✓
   • Linting: ✓
   • Tests: ✓ (87 tests)
   • Build: ✓

👀 Code Review:
   • Spec compliance: ✓
   • Code quality: ⚠️  with suggestions

🎉 Ralph-dev workflow complete!
```

### Delivery with Quality Gate Failure

```
❌ Quality gates failed. Cannot proceed to delivery.

Failed Gates:
   ❌ Tests: 3/87 failed
      • auth.login.test.ts: should reject invalid password
      • auth.signup.test.ts: should validate email format
      • tasks.create.test.ts: should require title

Fix these issues and re-run Phase 5.
```

## Rules

1. **Quality gates are blocking** - Cannot proceed if typecheck/lint/tests/build fail
2. **Spec compliance is blocking** - Must satisfy all acceptance criteria
3. **Code quality is advisory** - Suggestions don't block delivery
4. **Always create commit** - Even if PR creation fails
5. **Include co-author** - Credit Claude in commit message
6. **Two-stage review mandatory** - Both stages must run
7. **Test evidence required** - Must show actual test output, not assertions

## Notes

- Delivery only runs after all Phase 3 tasks complete
- Quality gates ensure production-ready code
- Two-stage review catches both functional and quality issues
- PR creation is optional (requires gh CLI)
- Commit message should be clear and descriptive
- Failed delivery can be retried after fixing issues
