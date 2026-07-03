# Flex Agent

具备生成式界面的多模态 AI Agent，前后端 monorepo。

## 仓库结构

```
flex-agent/
├── frontend/          # Next.js 聊天界面与生成式 UI
├── backend/           # Bun + Elysia API 与 Agent 编排
├── docs/              # 架构与模块设计文档
├── .agents/           # Cursor Agent Skills
├── .cursor/           # Cursor 规则
└── .github/workflows/ # CI 配置
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- [Bun](https://bun.sh)（后端运行时）

### 安装

```bash
pnpm install
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 填入 LLM API Key，按需调整 `frontend/.env` 中的模型与后端地址。

### 开发

```bash
pnpm dev
```

或分别启动：

```bash
pnpm dev:backend   # http://localhost:8000
pnpm dev:frontend  # http://localhost:3000
```

### 构建与检查

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
pnpm start
```

## 文档

| 文档 | 说明 |
| --- | --- |
| [docs/generative-ui.md](docs/generative-ui.md) | 生成式 UI 模块 |
| [docs/multimodal-perception.md](docs/multimodal-perception.md) | 多模态感知 |
| [docs/task-planning-memory.md](docs/task-planning-memory.md) | 任务规划与记忆 |
| [docs/function-calling-guide.md](docs/function-calling-guide.md) | Function Calling 指南 |

前端 Next.js 相关 Agent 规则见 [frontend/AGENTS.md](frontend/AGENTS.md)。

## 设计说明

以下为项目定位与模块设计的详细说明。

## 1. 项目概述

**项目名称**：UI-Gen Agent  
**项目定位**：一个能够通过自然语言控制计算机、动态生成用户界面并执行复杂任务的通用 AI Agent。  
**核心价值**：  
- 突破传统聊天机器人的纯文本交互限制，让 Agent 能像人一样"看"屏幕、操作 GUI 应用。  
- 引入生成式 UI（Generative UI），Agent 根据上下文动态生成表单、图表等交互组件，提升人机协作效率。  
- 涵盖多模态感知、任务规划、工具调用、代码执行、沙盒环境、前后端全栈技术。

**适用场景**：  
- 自动化办公（操作软件、填写表单、发送消息）  
- 数据分析与报告生成（查询 GitHub、数据库，生成可视化图表）  
- 跨应用协作（浏览器 + 本地软件 + 聊天工具）

---

## 2. 用户故事与典型工作流

**用户输入**（自然语言）：
> "帮我分析一下上个月我的 GitHub 提交记录，找出代码量最大的三天，并把这些天的 commit 总结成周报，最后在飞书群里发个消息总结一下。"

**Agent 执行链路**：
1. **任务规划**：将用户指令拆解为子任务序列（查日历 → 访问 GitHub → 获取 Commits → 数据分析 → 生成周报 → 发送飞书消息）。
2. **环境感知**：若缺少 API 令牌，Agent 自动切换到 GUI 操作模式——截图浏览器登录页，通过视觉模型识别元素，模拟鼠标键盘完成登录。
3. **交互式收集信息**：当需要用户确认（例如"上个月是否包含周末？"、"飞书群链接是什么？"），Agent 不采用纯文本提问，而是**动态生成一个包含下拉框、日期选择器、输入框的 UI 浮层**，供用户填写。
4. **执行与反馈**：用户提交 UI 表单后，Agent 继续执行后续任务，并实时推送执行日志与中间结果。

---

## 3. 技术栈总览

| 技术领域         | 具体技术与工具                                                                 | 用途                                                         |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **大语言模型**   | GPT-4o / Claude 3.5 / Gemini（Function Calling）                              | 意图理解、任务规划、工具调用、代码生成                       |
| **多模态视觉**   | GPT-4V / CogAgent / OmniParser                                                | 将屏幕截图转换为可交互元素坐标，实现 GUI 控制               |
| **Agent 框架**   | [Vercel AI SDK](https://ai-sdk.dev)（`ai` / Core）                            | 工具调用、多步 Agent、流式输出与结构化对象，前后端统一 TypeScript 技术栈 |
| **代码沙盒**     | Docker + E2B (Code Interpreter SDK)                                           | 安全执行 Agent 生成的代码                                    |
| **RAG 检索**     | Chroma / FAISS + 嵌入模型（text-embedding-3-small）                          | 存储常见操作流程（如"如何发飞书消息"），辅助 Agent 决策      |
| **后端服务**     | [Elysia](https://elysiajs.com)（Bun 运行时）+ WebSocket                      | 处理 Agent 长时运行任务，实时推送思考日志与 UI 组件；与前端共享 TypeScript 技术栈 |
| **生成式 UI**    | Vercel AI SDK UI（如 `useChat`、流式消息协议）+ 自定义 JSON Schema + React 动态渲染 | Agent 输出 UI 描述或与 AI SDK 流式协议结合，前端实时渲染表单、图表、控制面板 |
| **前端框架**     | Next.js (React) + Tailwind CSS                                                | 主聊天界面、动态组件渲染、Agent 状态可视化                  |
| **系统交互**     | Playwright（浏览器自动化）                                                    | 模拟用户操作，控制浏览器                                    |
| **版本控制与 CI**| Git + GitHub Actions                                                          | 代码管理与自动化测试                                         |

**关于技术栈统一**：前后端均采用 TypeScript，后端使用 Bun 运行时 + Elysia 框架，前端使用 Next.js，包管理统一使用 pnpm。**Vercel AI SDK** 贯穿前后端——**AI SDK Core** 提供统一的模型接入、`generateText` / `streamText`、工具调用与 Agent 循环；**AI SDK UI** 负责前端流式聊天与组件集成。

---

## 4. 核心功能模块设计

### 4.1 多模态感知模块

- **定位**：在 **OpenAI 兼容** 的 `messages` 里，让 **user** 同时携带 **文本 + 图片**（如页面截图的 data URL），经 WebSocket 主路径 `chatCompletionStream` 调视觉能力模型，用于「看懂 WebView 中页面」与（可选）**Function Calling** 推进 GUI 操作。与纯文本、生成式表单的挂起/续跑无冲突。  
- **输入（当前设计）**：**不要求前端传图**；由 **Bun 后端** 使用内置 **`Bun.WebView`** 无头浏览器完成 **navigate / 自动化 / 截屏**，将截图编码为 **data URL** 写入 `user.content`。自然语言目标仍来自用户或系统提示。公网 `https` 图床 URL 亦可作为 `image_url`（以所用 API 为准）。  
- **输出**：流式 **文本** 与/或 **tool_calls**；GUI 执行端推荐 **`Bun.WebView`** 与 **FC** 中注册的 handler 结合；也允许与 [docs/function-calling-guide.md](docs/function-calling-guide.md) 一致用 Zod 描述单步操作。  
- **说明**：后端 `MessageItem` 已支持多模态 user，**实现细节与落盘代码由开发者在业务侧补全**；[docs/multimodal-perception.md](docs/multimodal-perception.md) 仅提供 **数据流、Bun.WebView 要点与可拷贝参考示例**（非本仓库已提交实现）。

**分步说明、与 4.3/4.4 各节的边界、安全注意及参考示例**见：[docs/multimodal-perception.md](docs/multimodal-perception.md)。

### 4.2 任务规划与记忆模块

后端使用 OpenAI 兼容 **`chat.completions`**（`backend/src/services/llm.ts`）编排多轮工具调用与（可选）独立规划/校验轮次；**不在后端使用 AI SDK Core** 实现本节。前端 AI SDK 仅用于自定义 Provider 接流式协议（见上文技术栈）。

**依赖边界、状态模型、Planner/Executor/Checker、DAG、Redis 短期记忆与 Chroma 长期检索**见：[docs/task-planning-memory.md](docs/task-planning-memory.md)。

- **状态定义**：  
  - `user_goal`: 原始用户指令  
  - `plan`: 当前任务计划（列表）  
  - `current_step`: 正在执行的步骤索引  
  - `memory`: 短期对话上下文 + 长期向量存储  
- **规划节点**：  
  - Planner：将复杂目标分解为有向无环图（DAG）子任务  
  - Executor：执行子任务，调用工具或 GUI 操作  
  - Checker：验证子任务是否成功，失败则重试或重新规划  
- **记忆机制**：  
  - 对话历史存储于 Redis（过期时间 1 小时）  
  - 成功完成的任务模式（计划 + 工具序列）向量化后存入 Chroma，供未来相似任务复用  

### 4.3 工具与环境交互模块

| 工具名称         | 功能描述                                         | 实现方式                                     |
| ---------------- | ------------------------------------------------ | -------------------------------------------- |
| `filesystem`     | 读写文件、列出目录、获取文件信息                 | Node.js `fs` / Bun 文件 API                 |
| `code_interpreter`| 执行代码，返回 stdout/stderr                    | Docker 容器隔离，挂载临时目录                 |
| `browser`        | 打开网页、点击元素、填写表单、获取 HTML 内容     | Playwright 无头或有头模式                    |
| `http_request`   | 发送 GET / POST 请求，处理 API 调用              | `fetch` API                                  |
| `git`            | 克隆仓库、获取提交历史、查看 diff                | `Bun.spawn` 调用本地 git 命令               |
| `notify`         | 发送飞书 / Slack / 邮件消息                      | 各自 Webhook API                             |

### 4.4 生成式 UI 模块（核心亮点）

**为什么需要**：传统 Agent 通过纯文本向用户请求信息时，用户体验差且容易出错（例如要求输入 JSON 格式）。生成式 UI 让 Agent 动态渲染合适的界面组件。

**工作流程**：

1. Agent 在执行过程中，判断需要用户输入复杂结构数据（多字段、多选项、文件上传等）。
2. 模型输出一个 **UI 描述 JSON**，遵循预定义 Schema。例如：
   ```json
   {
     "type": "form",
     "title": "请提供飞书消息配置",
     "fields": [
       { "name": "webhook_url", "label": "飞书群 Webhook", "type": "text", "required": true },
       { "name": "message_type", "label": "消息类型", "type": "select", "options": ["text", "post"] },
       { "name": "at_all", "label": "是否 @所有人", "type": "checkbox" }
     ]
   }
   ```

完整工作流程（含前端渲染、回传与续跑）、**UI 描述 Schema**、与 **Vercel AI SDK** 的集成方式、安全注意及**分步实现指南**见：[docs/generative-ui.md](docs/generative-ui.md)。
