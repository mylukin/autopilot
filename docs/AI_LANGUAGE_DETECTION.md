# AI-Powered Language Detection | AI驱动的语言检测

## Overview | 概述

Autopilot V2 supports **autonomous language detection** using AI agents instead of template-based detection. This allows supporting ANY programming language without hardcoding rules.

Autopilot V2 支持使用 AI agent 进行**自主语言检测**，而不是基于模板的检测。这允许支持任何编程语言，无需硬编码规则。

## Why AI Detection? | 为什么使用 AI 检测？

### Template-Based Detection (V2 默认)

**Pros:**
- Fast (50-100ms)
- Deterministic
- No context needed

**Cons:**
- Limited to hardcoded languages (TypeScript, Python, Go, Rust, Java)
- Can't adapt to new languages
- Misses custom build systems
- Doesn't understand project context

### AI-Powered Detection (V2 可选)

**Pros:**
- Supports ANY language (Ruby, PHP, C#, C++, Swift, Kotlin, Scala, Elixir, Dart, etc.)
- Understands project context
- Adapts to custom build systems
- Can infer from source code structure
- Handles edge cases (monorepos, multi-language projects)

**Cons:**
- Slower (2-5 seconds)
- Requires AI agent invocation
- Non-deterministic (but usually correct)

## Usage | 使用方法

### Method 1: Using the Skill (Recommended)

In Claude Code conversation:

```bash
/detect-language
```

The skill will:
1. Spawn a general-purpose agent
2. Agent scans project structure
3. Agent analyzes config files
4. Returns JSON configuration
5. Saves to `workspace/ai/tasks/index.json`

### Method 2: Using CLI + Manual Agent

```bash
# 1. Show AI detection instructions
autopilot-cli detect-ai

# 2. Manually invoke agent (in Claude Code)
# Agent returns JSON result

# 3. Save result
autopilot-cli detect-ai-save '{"language":"python","framework":"django",...}'
```

### Method 3: Template Detection (Fast)

```bash
# Use template-based detection (fast, limited languages)
autopilot-cli detect --save
```

## Supported Languages | 支持的语言

AI detection can identify:

| Language | Config Files | Typical Frameworks |
|----------|-------------|-------------------|
| **TypeScript/JavaScript** | package.json, tsconfig.json | React, Vue, Angular, Next.js, Express |
| **Python** | pyproject.toml, requirements.txt | Django, Flask, FastAPI |
| **Go** | go.mod | Gin, Echo, Fiber |
| **Rust** | Cargo.toml | Actix, Rocket, Axum |
| **Java** | pom.xml, build.gradle | Spring Boot, Quarkus, Micronaut |
| **Ruby** | Gemfile | Rails, Sinatra |
| **PHP** | composer.json | Laravel, Symfony |
| **C#** | *.csproj, *.sln | ASP.NET Core |
| **C/C++** | CMakeLists.txt, Makefile | - |
| **Swift** | Package.swift | Vapor, Kitura |
| **Kotlin** | build.gradle.kts | Ktor, Spring Boot |
| **Scala** | build.sbt | Play, Akka |
| **Elixir** | mix.exs | Phoenix |
| **Dart** | pubspec.yaml | Flutter |
| **Haskell** | *.cabal, stack.yaml | Yesod, Servant |
| **Clojure** | project.clj, deps.edn | Ring, Compojure |

**And more!** The AI can detect ANY language by analyzing file extensions and structure.

## Detection Process | 检测流程

### Step 1: Project Scan

Agent runs commands to gather evidence:

```bash
# List root files
ls -la

# Find config files
find . -maxdepth 2 -type f \( -name '*.json' -o -name '*.toml' -o -name '*.gradle' -o -name 'pom.xml' -o -name 'Gemfile' -o -name 'go.mod' -o -name '*.csproj' \)

# Count source files by extension
for ext in ts js py go rs java rb php cs cpp swift kt scala; do
  count=$(find . -name "*.$ext" -type f 2>/dev/null | wc -l)
  if [ $count -gt 0 ]; then
    echo "$ext: $count files"
  fi
done
```

### Step 2: Analyze Config Files

Based on discovered files, agent reads relevant configs:

- `package.json` → Detects Node.js framework (React, Vue, Next.js)
- `pyproject.toml` → Detects Python framework (Django, Flask)
- `go.mod` → Detects Go modules
- `Cargo.toml` → Detects Rust crates
- `pom.xml` / `build.gradle` → Detects Java dependencies
- etc.

### Step 3: Infer Verification Commands

Agent suggests language-specific verification commands:

**Example for TypeScript + React + Vite:**
```bash
npx tsc --noEmit     # Type checking
npm run lint         # ESLint
npm test             # Vitest
npm run build        # Vite build
```

**Example for Python + Django:**
```bash
mypy .               # Type checking
flake8              # Linting
pytest              # Testing
# No build for interpreted language
```

### Step 4: Return Structured JSON

```json
{
  "language": "typescript",
  "confidence": 0.95,
  "evidence": [
    "package.json exists",
    "tsconfig.json exists",
    "47 .ts files found",
    "vite.config.ts exists"
  ],
  "framework": "react",
  "frameworkVersion": "18.2.0",
  "buildTool": "vite",
  "packageManager": "pnpm",
  "testFramework": "vitest",
  "verifyCommands": [
    "npx tsc --noEmit",
    "pnpm run lint",
    "pnpm test",
    "pnpm run build"
  ],
  "additionalInfo": {
    "hasTypeChecking": true,
    "hasLinting": true,
    "hasTesting": true,
    "hasBuild": true,
    "monorepo": false
  }
}
```

## Example Output | 示例输出

### TypeScript + React + Vite

```
🔍 Scanning project structure...

Found files:
- package.json ✓
- tsconfig.json ✓
- vite.config.ts ✓
- .eslintrc.js ✓

Source files:
- TypeScript: 47 files
- JavaScript: 3 files

📊 Analysis:
- Primary language: TypeScript (95% confidence)
- Framework: React 18.2.0
- Build tool: Vite
- Package manager: pnpm
- Test framework: Vitest

✅ Verification commands:
1. npx tsc --noEmit       # Type checking
2. pnpm run lint          # ESLint
3. pnpm test              # Vitest
4. pnpm run build         # Vite build

💾 Saved to workspace/ai/tasks/index.json
```

### Python + Django

```
🔍 Scanning project structure...

Found files:
- pyproject.toml ✓
- requirements.txt ✓
- manage.py ✓
- mypy.ini ✓

Source files:
- Python: 34 files

📊 Analysis:
- Primary language: Python (98% confidence)
- Framework: Django 4.2.0
- Package manager: pip
- Test framework: pytest

✅ Verification commands:
1. mypy .                 # Type checking
2. flake8                 # Linting
3. pytest                 # Testing

💾 Saved to workspace/ai/tasks/index.json
```

### Go

```
🔍 Scanning project structure...

Found files:
- go.mod ✓
- go.sum ✓

Source files:
- Go: 23 files

📊 Analysis:
- Primary language: Go (100% confidence)
- Framework: Gin
- Build tool: go

✅ Verification commands:
1. go fmt ./...           # Format check
2. go vet ./...           # Static analysis
3. go test ./...          # Testing
4. go build ./...         # Build

💾 Saved to workspace/ai/tasks/index.json
```

## Edge Cases | 边缘情况

### Monorepo

If multiple language projects in subdirectories:

```json
{
  "language": "multiple",
  "monorepo": true,
  "packages": [
    {
      "path": "packages/frontend",
      "language": "typescript",
      "framework": "react"
    },
    {
      "path": "packages/backend",
      "language": "go"
    }
  ],
  "verifyCommands": [
    "# Frontend",
    "cd packages/frontend && npm test",
    "# Backend",
    "cd packages/backend && go test ./..."
  ]
}
```

### Multi-Language Project

```json
{
  "language": "python",
  "secondaryLanguages": ["javascript", "rust"],
  "explanation": "Primary Python app with JS frontend and Rust performance modules",
  "verifyCommands": [
    "pytest",
    "cd frontend && npm test",
    "cd rust-modules && cargo test"
  ]
}
```

### Custom Build System

```json
{
  "language": "c",
  "confidence": 0.7,
  "warning": "Custom build system detected",
  "buildTool": "custom",
  "verifyCommands": [
    "make test",
    "make build"
  ],
  "recommendation": "Review Makefile for correct targets"
}
```

## Integration with Autopilot | 与 Autopilot 集成

When running `/autopilot`, the system can auto-detect language:

```
🚀 Starting Autopilot...

Phase 0/5: Detecting project configuration...
🔍 Running AI language detection...

✅ Detected: TypeScript + React + Vite

Phase 1/5: Clarifying requirements...
```

Or user can manually trigger detection:

```
User: /detect-language

🔍 AI Language Detection in progress...
[Agent performs detection]

✅ Configuration saved!
Now run: /autopilot "your requirement"
```

## When to Use AI Detection | 何时使用 AI 检测

Use AI detection when:
- Working with languages not in template list (Ruby, PHP, C#, Swift, etc.)
- Custom build systems (non-standard Makefiles, shell scripts)
- Monorepo with multiple languages
- Want highest accuracy
- Don't mind 2-5 second delay

Use template detection when:
- Working with TypeScript, Python, Go, Rust, or Java
- Need fast detection (50-100ms)
- Standard project structure
- Template detection works correctly

## Comparison | 对比

| Aspect | Template Detection | AI Detection |
|--------|-------------------|--------------|
| **Speed** | 50-100ms | 2-5 seconds |
| **Languages** | 5 (TS, Python, Go, Rust, Java) | Unlimited |
| **Accuracy** | 85% | 95% |
| **Custom builds** | ❌ | ✅ |
| **Monorepo** | ❌ | ✅ |
| **Context aware** | ❌ | ✅ |
| **Command** | `autopilot-cli detect` | `/detect-language` |

## Implementation Files | 实现文件

- **Agent**: `agents/language-detector.md` - AI detection logic
- **Skill**: `skills/detect-language/SKILL.md` - User-invocable skill
- **CLI**: `cli/src/commands/detect-ai.ts` - CLI command
- **Template Detector**: `cli/src/language/detector.ts` - Fallback template detection

## Future Enhancements | 未来增强

1. **Hybrid detection**: Start with template, fall back to AI if unsure
2. **Caching**: Cache detection results per project
3. **Confidence threshold**: Auto-invoke AI if template confidence < 80%
4. **Learning**: Learn from user corrections to improve accuracy

---

**Recommendation | 建议**: Use `/detect-language` for new projects or when template detection fails. It's slower but more accurate and supports any language.
