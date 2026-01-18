# 如何使用 AI 语言检测 | How to Use AI Language Detection

## 快速开始 | Quick Start

### 方法 1: 使用技能（推荐）| Method 1: Using Skill (Recommended)

在 Claude Code 对话中:

```
/detect-language
```

Agent 会自动:
1. 扫描项目结构
2. 分析配置文件
3. 推断语言、框架、工具
4. 返回验证命令
5. 保存到 `workspace/ai/tasks/index.json`

---

### 方法 2: 手动流程 | Method 2: Manual Process

#### 步骤 1: 查看 AI 检测说明

```bash
cd /path/to/your/project
autopilot-cli detect-ai
```

输出示例:
```
🔍 AI Language Detection

⚠️  This command requires Claude Code agent integration.
To use this feature:

1. In Claude Code, invoke the language-detector agent
2. The agent will:
   - Scan project structure
   - Detect language, framework, build tools
   - Return JSON configuration
3. Save the result using:
   autopilot-cli detect-ai-save '<json-result>'
```

#### 步骤 2: 在 Claude Code 中调用 Agent

在 Claude Code 对话中，请求:

```
Please detect the programming language and framework for this project.

Use the language-detector agent to:
1. Scan project structure (find config files, count source files)
2. Read relevant config files
3. Determine language, framework, build tools
4. Suggest verification commands
5. Return JSON result in this format:
{
  "language": "...",
  "confidence": 0.95,
  "evidence": [...],
  "framework": "...",
  "buildTool": "...",
  "verifyCommands": [...]
}
```

#### 步骤 3: 保存结果

Agent 返回 JSON 后，保存:

```bash
autopilot-cli detect-ai-save '{
  "language": "typescript",
  "confidence": 0.95,
  "evidence": ["package.json exists", "47 .ts files"],
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
}'
```

---

## 支持的语言示例 | Supported Language Examples

### TypeScript + React

**检测结果:**
```json
{
  "language": "typescript",
  "confidence": 0.95,
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

### Python + Django

**检测结果:**
```json
{
  "language": "python",
  "confidence": 0.98,
  "framework": "django",
  "frameworkVersion": "4.2.0",
  "packageManager": "pip",
  "testFramework": "pytest",
  "verifyCommands": [
    "mypy .",
    "flake8",
    "pytest"
  ]
}
```

### Go

**检测结果:**
```json
{
  "language": "go",
  "confidence": 1.0,
  "framework": "gin",
  "buildTool": "go",
  "verifyCommands": [
    "go fmt ./...",
    "go vet ./...",
    "go test ./...",
    "go build ./..."
  ]
}
```

### Rust

**检测结果:**
```json
{
  "language": "rust",
  "confidence": 1.0,
  "framework": "actix-web",
  "buildTool": "cargo",
  "testFramework": "cargo test",
  "verifyCommands": [
    "cargo fmt -- --check",
    "cargo clippy -- -D warnings",
    "cargo test",
    "cargo build"
  ]
}
```

### Ruby on Rails

**检测结果:**
```json
{
  "language": "ruby",
  "confidence": 0.97,
  "framework": "rails",
  "frameworkVersion": "7.0.0",
  "packageManager": "bundler",
  "testFramework": "rspec",
  "verifyCommands": [
    "rubocop",
    "rspec"
  ]
}
```

### PHP + Laravel

**检测结果:**
```json
{
  "language": "php",
  "confidence": 0.96,
  "framework": "laravel",
  "frameworkVersion": "10.0",
  "packageManager": "composer",
  "testFramework": "phpunit",
  "verifyCommands": [
    "./vendor/bin/phpcs",
    "./vendor/bin/phpstan",
    "./vendor/bin/phpunit"
  ]
}
```

---

## 模板检测 vs AI 检测 | Template vs AI Detection

### 何时使用模板检测 | When to Use Template Detection

✅ 适用于:
- TypeScript, JavaScript, Python, Go, Rust, Java
- 标准项目结构
- 快速检测需求 (50-100ms)

```bash
autopilot-cli detect --save
```

### 何时使用 AI 检测 | When to Use AI Detection

✅ 适用于:
- 任何编程语言 (Ruby, PHP, C#, Swift, Kotlin, etc.)
- 自定义构建系统
- Monorepo 项目
- 多语言项目
- 需要最高准确度

```bash
/detect-language  # 在 Claude Code 中
```

---

## 常见问题 | FAQ

### Q1: AI 检测需要多长时间？
**A:** 通常 2-5 秒。模板检测只需 50-100ms。

### Q2: AI 检测支持哪些语言？
**A:** 理论上支持任何语言！只要项目有配置文件或源代码，AI 就能检测。

已测试的语言:
- TypeScript/JavaScript (React, Vue, Angular, Next.js)
- Python (Django, Flask, FastAPI)
- Go (Gin, Echo)
- Rust (Actix, Rocket)
- Java (Spring Boot, Maven, Gradle)
- Ruby (Rails, Sinatra)
- PHP (Laravel, Symfony)
- C# (ASP.NET Core)
- C/C++ (CMake, Make)
- Swift (Vapor)
- Kotlin (Ktor)
- Scala (Play)
- Elixir (Phoenix)
- Dart (Flutter)

### Q3: 如果检测错误怎么办？
**A:** 可以手动编辑 `workspace/ai/tasks/index.json` 中的 `metadata.languageConfig`:

```json
{
  "metadata": {
    "languageConfig": {
      "language": "python",
      "verifyCommands": [
        "pytest",
        "flake8"
      ]
    }
  }
}
```

### Q4: Monorepo 项目如何检测？
**A:** AI 检测会识别 monorepo 并为每个子项目提供配置:

```json
{
  "language": "multiple",
  "monorepo": true,
  "packages": [
    {
      "path": "packages/frontend",
      "language": "typescript"
    },
    {
      "path": "packages/backend",
      "language": "go"
    }
  ]
}
```

### Q5: 可以同时使用模板和 AI 检测吗？
**A:** 可以！先用模板检测快速尝试，如果不准确再用 AI 检测:

```bash
# 1. 尝试模板检测 (快)
autopilot-cli detect

# 2. 如果不准确，使用 AI 检测 (准确)
/detect-language
```

---

## 集成到 Autopilot 工作流 | Integration with Autopilot Workflow

### 自动检测

运行 Autopilot 时会自动检测:

```
/autopilot "Build a TODO app"

🚀 Starting Autopilot...

Phase 0/5: Detecting project configuration...
🔍 Running template detection...
✅ Detected: TypeScript + React + Vite

Phase 1/5: Clarifying requirements...
```

### 手动检测后使用

```
# 1. 先检测语言
/detect-language

✅ Configuration saved!

# 2. 然后运行 Autopilot
/autopilot "Add user authentication"

✅ Using detected configuration:
   Language: TypeScript
   Framework: React
   Verification: tsc, lint, test, build
```

---

## 完整示例流程 | Complete Example Workflow

```bash
# 1. 进入项目目录
cd ~/my-project

# 2. (可选) 查看 AI 检测说明
autopilot-cli detect-ai

# 3. 在 Claude Code 中运行
/detect-language

# Agent 扫描项目...
🔍 Scanning project structure...
Found files:
- package.json ✓
- tsconfig.json ✓
- 47 .ts files

📊 Analysis:
- Language: TypeScript (95% confidence)
- Framework: React 18.2.0
- Build tool: Vite

✅ Verification commands:
1. npx tsc --noEmit
2. pnpm run lint
3. pnpm test
4. pnpm run build

💾 Saved to workspace/ai/tasks/index.json

# 4. 开始使用 Autopilot
/autopilot "Add dark mode toggle"

🚀 Starting Autopilot...
✅ Using TypeScript + React + Vite configuration
Phase 1/5: Clarifying requirements...
```

---

## 相关文档 | Related Documentation

- [AI Language Detection 详细文档](docs/AI_LANGUAGE_DETECTION.md)
- [V2 架构说明](docs/ARCHITECTURE.md)
- [CLI 命令参考](cli/README.md)
- [Agent 开发指南](agents/language-detector.md)

---

**建议 | Recommendation**: 对于新项目或不确定的项目，使用 `/detect-language` 进行 AI 检测，虽然慢一点但更准确且支持任何语言。
