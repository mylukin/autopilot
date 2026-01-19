# Ralph-dev CLI

**中文** | [English](./README.md)

用于 Ralph-dev 状态和任务管理的 TypeScript 命令行工具。

## 概述

Ralph-dev CLI 提供高效的操作来管理开发工作流状态、任务和语言检测。它专为在自主开发阶段从 Ralph-dev 技能中调用而设计。

**核心能力：**
- 跨 5 个工作流阶段的状态管理
- 带有依赖跟踪的任务 CRUD 操作
- 自动语言和框架检测
- JSON 输出以与 bash 脚本集成

## 安装

```bash
cd cli
npm install
npm run build
```

CLI 二进制文件位于 `cli/bin/ralph-dev.js`，可通过以下方式调用：
```bash
./bin/ralph-dev.js <command>
# 或构建后
npx ralph-dev <command>
```

## 命令

### 状态管理

管理存储在 `.ralph-dev/state.json` 中的工作流状态。

**获取当前状态：**
```bash
ralph-dev state get [--json]
```

**设置状态：**
```bash
ralph-dev state set --phase <phase> [--task <taskId>]
# 示例：
ralph-dev state set --phase implement --task auth.login.ui
```

**更新状态字段：**
```bash
ralph-dev state update [--phase <phase>] [--task <taskId>] [--prd <prdJson>] [--add-error <errorJson>]
# 示例：
ralph-dev state update --phase heal
ralph-dev state update --task auth.signup.api
```

**清除状态：**
```bash
ralph-dev state clear
```

**支持的阶段：**
- `clarify` - 需求澄清
- `breakdown` - 任务分解
- `implement` - 实现循环
- `heal` - 错误恢复
- `deliver` - 质量门控和 PR 创建

### 任务管理

管理 `.ralph-dev/tasks/` 目录中的任务。

**初始化任务系统：**
```bash
ralph-dev tasks init [--project-goal <goal>] [--language <language>] [--framework <framework>]
# 示例：
ralph-dev tasks init --project-goal "用户认证系统" --language typescript --framework nextjs
```

**创建任务：**
```bash
ralph-dev tasks create \
  --id <taskId> \
  --module <module> \
  --description <desc> \
  [--priority <1-10>] \
  [--estimated-minutes <minutes>] \
  [--criteria <criterion1> --criteria <criterion2>] \
  [--dependencies <dep1> --dependencies <dep2>] \
  [--test-pattern <pattern>]

# 示例：
ralph-dev tasks create \
  --id auth.login.ui \
  --module auth \
  --description "创建登录表单组件" \
  --priority 2 \
  --estimated-minutes 25 \
  --criteria "表单显示电子邮件和密码字段" \
  --criteria "提交按钮验证输入" \
  --dependencies setup.scaffold \
  --test-pattern "**/*.test.ts"
```

**列出任务：**
```bash
ralph-dev tasks list [--status <status>] [--json]
# 示例：
ralph-dev tasks list --status pending
ralph-dev tasks list --json
```

**获取下一个任务（带全面上下文）：**
```bash
ralph-dev tasks next [--json]
```

此命令返回最高优先级的待处理任务，包含：
- 当前目录和 git 信息
- 工作流状态和阶段
- 进度统计（已完成/失败/待处理）
- 来自 progress.log 的最近活动
- 依赖状态
- 测试要求

**获取特定任务：**
```bash
ralph-dev tasks get <taskId> [--json]
# 示例：
ralph-dev tasks get auth.login.ui
```

**标记任务为进行中：**
```bash
ralph-dev tasks start <taskId>
# 示例：
ralph-dev tasks start auth.login.ui
```

**标记任务为已完成：**
```bash
ralph-dev tasks done <taskId> [--duration <duration>]
# 示例：
ralph-dev tasks done auth.login.ui --duration "23m 15s"
```

**标记任务为失败：**
```bash
ralph-dev tasks fail <taskId> --reason <reason>
# 示例：
ralph-dev tasks fail auth.login.ui --reason "缺少依赖：react-hook-form"
```

### 语言检测

检测项目语言和框架。

**检测语言：**
```bash
ralph-dev detect [--json]
```

返回检测到的语言配置，包括：
- 主要语言
- 框架（如适用）
- 测试框架
- 构建工具
- 验证命令（类型检查、代码检查、测试、构建）

**AI 驱动的检测：**
```bash
ralph-dev detect-ai [--json]
```

使用 AI 代理分析项目结构以获得更准确的检测。

## 在技能中使用

CLI 专为从 bash 技能中调用而设计。以下是典型的工作流：

```bash
# 阶段 3：实现循环
while true; do
  # 获取下一个任务
  TASK_JSON=$(ralph-dev tasks next --json)

  if echo "$TASK_JSON" | jq -e '.error' > /dev/null; then
    echo "没有更多任务"
    break
  fi

  TASK_ID=$(echo "$TASK_JSON" | jq -r '.task.id')

  # 标记为进行中
  ralph-dev tasks start "$TASK_ID"

  # 更新工作流状态
  ralph-dev state update --task "$TASK_ID"

  # 实现任务（生成代理、运行测试等）
  # ... 实现逻辑 ...

  if [ $? -eq 0 ]; then
    # 标记为已完成
    ralph-dev tasks done "$TASK_ID"
  else
    # 标记为失败
    ralph-dev tasks fail "$TASK_ID" --reason "测试失败"
    # 触发阶段 4：HEAL
    break
  fi
done
```

## 数据结构

### 状态文件（`.ralph-dev/state.json`）
```json
{
  "phase": "implement",
  "currentTask": "auth.login.ui",
  "prd": {},
  "errors": [],
  "startedAt": "2026-01-19T10:00:00Z",
  "updatedAt": "2026-01-19T10:15:00Z"
}
```

### 任务文件（`.ralph-dev/tasks/auth/login.ui.md`）
```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: in_progress
estimatedMinutes: 25
dependencies:
  - setup.scaffold
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# 登录 UI 组件

## 验收标准
1. 表单显示电子邮件和密码字段
2. 提交按钮验证电子邮件格式
3. 验证失败时显示错误消息

## 备注
使用 React Hook Form 进行验证。
```

### 任务索引（`.ralph-dev/tasks/index.json`）
```json
{
  "metadata": {
    "projectGoal": "用户认证系统",
    "languageConfig": {
      "language": "typescript",
      "framework": "nextjs"
    }
  },
  "tasks": {
    "auth.login.ui": {
      "module": "auth",
      "priority": 2,
      "status": "in_progress",
      "filePath": "auth/login.ui.md"
    }
  }
}
```

## 架构

```
cli/
├── src/
│   ├── commands/
│   │   ├── state.ts          # 状态管理命令
│   │   ├── tasks.ts          # 任务 CRUD 和生命周期
│   │   ├── detect.ts         # 语言检测
│   │   └── detect-ai.ts      # AI 驱动的检测
│   ├── core/
│   │   ├── task-parser.ts    # 解析 YAML 前置元数据 + markdown
│   │   ├── task-writer.ts    # 写入/更新任务文件
│   │   └── index-manager.ts  # 管理 tasks/index.json
│   ├── language/
│   │   └── detector.ts       # 多语言检测逻辑
│   └── index.ts              # CLI 入口点
├── bin/
│   └── ralph-dev.js          # Shebang 脚本
├── dist/                     # 编译输出
└── package.json
```

## 开发

**在监视模式下运行：**
```bash
npm run dev
```

**运行测试：**
```bash
npm test
```

**代码检查：**
```bash
npm run lint
```

**格式化代码：**
```bash
npm run format
```

**构建生产版本：**
```bash
npm run build
```

## 要求

- Node.js >= 18.0.0
- npm >= 9.0.0

## 依赖

**运行时：**
- `commander` - CLI 框架
- `chalk` - 终端颜色
- `yaml` - YAML 解析
- `fs-extra` - 增强的文件系统操作
- `cli-progress` - 进度条
- `ora` - 加载动画

**开发：**
- `typescript` - 类型安全
- `vitest` - 测试框架
- `eslint` - 代码检查
- `prettier` - 代码格式化

## 与 Ralph-dev 集成

当调用 Ralph-dev 技能时，此 CLI 由 `shared/bootstrap-cli.sh` 自动引导。引导脚本：
1. 检查 CLI 二进制文件是否存在
2. 在首次使用时构建 CLI（npm install + tsc）
3. 导出 `ralph-dev` 函数供技能使用
4. 后续运行使用缓存的二进制文件以实现即时执行

## 许可证

MIT - Ralph-dev 项目的一部分

---

**版本：** 0.1.0
**状态：** 早期开发
**代码仓库：** https://github.com/mylukin/ralph-dev
