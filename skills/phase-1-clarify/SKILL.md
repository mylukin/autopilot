---
name: phase-1-clarify
description: Interactive requirement clarification through structured questions and PRD generation
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 1: Clarify Requirements

## Goal

Transform user requirements into a comprehensive PRD that preserves all context from prior conversations.

## Core Principle

**Context preservation is the primary goal.** If the user discussed UI layouts, data models, or design decisions before invoking `/ralph-dev`, that information MUST be captured in the PRD.

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
# Expected: clarify (or none for new session)
```

### Step 1: Extract Context (CRITICAL - Do This First)

Before asking ANY questions, scan the conversation history for:

- **UI/UX**: layouts, wireframes, pages, components, design decisions
- **Data**: entities, models, schemas, fields, relationships
- **API**: endpoints, requests, responses, authentication
- **Flows**: user journeys, processes, interactions
- **Decisions**: choices made, alternatives considered, trade-offs

Convert to structured formats as appropriate (ASCII wireframes, TypeScript interfaces, endpoint specs, decision logs).

### Step 2: Identify Gaps

Determine what's MISSING after extraction:
- Tech stack? Scale? Authentication? Deployment?
- Only proceed to ask about information NOT already discussed

### Step 3: Confirm & Ask Questions

**If context was extracted:**
1. Display summary of extracted context to user
2. Use `AskUserQuestion` to confirm accuracy
3. Only ask additional questions for gaps

**If no prior context:**
- Ask standard clarification questions (app type, tech stack, scale, auth)

### Step 4: Generate PRD

Create PRD with these sections (include only if relevant):

1. **Project Overview** - Goals, scope, constraints
2. **Technical Stack** - Language, frameworks, database, deployment
3. **UI/UX Design** - Wireframes, components, design tokens *(if discussed)*
4. **Data Model** - Entities, relationships, schemas *(if discussed)*
5. **API Contracts** - Endpoints, auth, errors *(if discussed)*
6. **User Flows** - Key journeys, edge cases *(if discussed)*
7. **User Stories** - Epics with acceptance criteria
8. **Design Decisions** - Choices with rationale *(if discussed)*
9. **Non-Functional Requirements** - Performance, security, testing
10. **Appendix: Context Summary** - Key points from conversation

### Step 5: Save PRD

```bash
mkdir -p .ralph-dev

# REQUIRED: Backup existing PRD before overwriting
if [ -f ".ralph-dev/prd.md" ]; then
  BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  cp .ralph-dev/prd.md ".ralph-dev/prd.${BACKUP_TIMESTAMP}.bak"
  # Keep only last 5 backups
  ls -t .ralph-dev/prd.*.bak 2>/dev/null | tail -n +6 | xargs -r rm -f
fi

# Save PRD using Write tool to .ralph-dev/prd.md
```

### Step 6: Update State & Return Result

```bash
# REQUIRED: Transition to next phase
ralph-dev state update --phase breakdown
```

**REQUIRED Output Format** (orchestrator parses this):
```yaml
---PHASE RESULT---
phase: clarify
status: complete
prd_file: .ralph-dev/prd.md
context_extracted: true/false
next_phase: breakdown
---END PHASE RESULT---
```

---

## Tool Constraints

### AskUserQuestion

- **Max 4 questions** per tool call
- Each question requires:
  - `question`: The question text
  - `header`: Short label (≤12 chars), e.g., "App Type", "Tech Stack"
  - `multiSelect`: true/false
  - `options`: 2-4 choices, each with `label` and `description`
- Add "(Recommended)" suffix to suggested default option
- "Other" option is auto-provided by Claude Code
- **60-second timeout** - keep questions simple

---

## Constraints

- **NEVER** lose context from prior discussions
- **NEVER** ask questions about information already provided
- **NEVER** generate generic filler content - only include relevant sections
- **NEVER** ask questions in plain text - always use `AskUserQuestion` tool
- **ALWAYS** backup existing PRD before overwriting
- **ALWAYS** update state via CLI after completion
- **ALWAYS** return structured PHASE RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| User cancels | Save partial state, return `status: cancelled` |
| Context unclear | Ask user to clarify specific points |
| PRD generation fails | Use minimal PRD with available info |
| State update fails | Log error, retry once, then report to orchestrator |
