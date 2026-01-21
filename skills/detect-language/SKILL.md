---
name: detect-language
description: Autonomous language and framework detection for any programming language. Use when user asks to "detect language", "what language is this project", or when initializing ralph-dev for a new project.
allowed-tools: [Read, Glob, Bash]
user-invocable: true
---

# Language Detection Skill

## Goal

Autonomously detect the programming language, framework, build tools, and verification commands for ANY project.

## When to Use

- User asks: "What language is this project?"
- Initializing ralph-dev for a new project
- User runs: `/detect-language`

---

## Workflow

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
ralph-dev --version
```

### Step 1: Scan Project Structure

```bash
# List root files
ls -la

# Find config files (depth 2)
find . -maxdepth 2 -type f \( \
  -name 'package.json' -o -name '*.toml' -o -name '*.gradle' \
  -o -name 'pom.xml' -o -name 'Gemfile' -o -name 'go.mod' \
  -o -name '*.csproj' -o -name 'Makefile' -o -name 'Package.swift' \
\) 2>/dev/null

# Count source files by extension
for ext in ts js py go rs java rb php cs cpp swift; do
  count=$(find . -name "*.$ext" -type f 2>/dev/null | wc -l)
  [ "$count" -gt 0 ] && echo "$ext: $count files"
done
```

### Step 2: Analyze Config Files

Read the primary config file for the detected language and extract:
- Dependencies and devDependencies
- Scripts/commands available
- Framework indicators

### Step 3: Determine Stack

Based on evidence, identify:

| Component | How to Detect |
|-----------|---------------|
| Language | Primary config file + file extensions |
| Framework | Check dependencies for react, django, express, etc. |
| Build Tool | Config files: vite.config, webpack.config, Cargo.toml |
| Package Manager | Lock files: pnpm-lock.yaml, yarn.lock, go.sum |
| Test Framework | devDependencies: jest, vitest, pytest |

### Step 4: Generate Verification Commands

**Language → Commands Mapping:**

| Language | Type Check | Lint | Test | Build |
|----------|------------|------|------|-------|
| TypeScript | `npx tsc --noEmit` | `npm run lint` | `npm test` | `npm run build` |
| Python | `mypy .` | `flake8` | `pytest` | - |
| Go | - | `go vet ./...` | `go test ./...` | `go build ./...` |
| Rust | - | `cargo clippy` | `cargo test` | `cargo build` |
| Java (Maven) | - | - | `mvn test` | `mvn package` |
| Java (Gradle) | - | - | `./gradlew test` | `./gradlew build` |
| Ruby | - | `rubocop` | `rspec` | - |
| C# | - | - | `dotnet test` | `dotnet build` |

**Adapt commands based on actual project config (scripts in package.json, etc.)**

### Step 5: Save Results

```bash
# Build JSON result
RESULT='{ "language": "...", "verifyCommands": [...] }'

# Save using CLI
ralph-dev detect-ai-save "$RESULT"
```

### Step 6: Display Summary

```markdown
✅ Language Detection Complete

Language: {language}
Framework: {framework}
Build Tool: {buildTool}
Package Manager: {packageManager}
Test Framework: {testFramework}
Confidence: {N}%

Verification Commands:
1. {typecheck command}
2. {lint command}
3. {test command}
4. {build command}
```

---

## Output Format

```json
{
  "language": "typescript",
  "confidence": 0.95,
  "evidence": ["package.json exists", "tsconfig.json exists", "47 .ts files"],
  "framework": "react",
  "buildTool": "vite",
  "packageManager": "pnpm",
  "testFramework": "vitest",
  "verifyCommands": [
    "npx tsc --noEmit",
    "pnpm run lint",
    "pnpm test",
    "pnpm run build"
  ]
}
```

---

## Edge Cases

**Monorepo:** Multiple config files in subdirectories
- Detect as monorepo, list packages with their languages
- Generate per-package verification commands

**Multi-Language:** Significant files from multiple languages
- Identify primary language
- Note secondary languages
- Generate commands for each

**Custom Build:** No recognized build system
- Lower confidence score
- Check for Makefile targets
- Suggest manual configuration

---

## Constraints

- **NEVER** assume without evidence - always scan files first
- **NEVER** suggest commands for tools not present in project
- **ALWAYS** base confidence on concrete file presence
- **ALWAYS** adapt commands to project's actual scripts/config
- **ALWAYS** handle edge cases (monorepo, multi-language)

---

## Error Handling

| Error | Action |
|-------|--------|
| No config files found | Lower confidence, detect from file extensions |
| Conflicting indicators | Note ambiguity, ask user to clarify |
| Unknown build system | Suggest manual configuration |
