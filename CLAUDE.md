# CLAUDE.md

## 1. 项目概览
`cligrep-website` 是 CLI Grep 的前端展示层，负责提供命令入口、热门 CLI 列表、检索结果、详情面板、评论与收藏等交互体验。

该仓库不包含后端实现，也不负责持久化逻辑。运行时依赖 `cligrep-server` 提供 `/api/v1/*` 与 `/healthz` 接口。

## 2. 技术栈
- React 18
- Vite 5
- i18next / react-i18next
- 原生 CSS
- Nginx（容器部署时提供静态文件与反向代理）
- Docker Compose（前端本地部署编排）

## 3. 架构设计
- `src/App.jsx` 负责页面主状态编排，包括首页、搜索、详情、执行输出与内联交互。
- `src/components/` 承载终端窗口、结果面板、输出面板、评论区和工具菜单等视图组件。
- `src/hooks/` 管理主题、认证、收藏、命令历史和键盘快捷键。
- `src/lib/api.js` 统一封装 HTTP 请求，默认通过同源 `/api` 访问后端。
- 开发模式下由 Vite 代理 `/api` 与 `/healthz`；容器部署模式下由 Nginx 转发到宿主机后端。

## 4. 目录结构
- `src/`：前端源码。
- `src/components/`：页面组件与面板组件。
- `src/hooks/`：状态与行为复用逻辑。
- `src/lib/`：API、命令解析、视图模型与常量。
- `src/i18n/`：中英文案资源与初始化逻辑。
- `src/styles/`：主题、终端、面板与响应式样式。
- `nginx/default.conf`：容器内 Nginx 路由与代理配置。
- `compose.yml`：前端容器编排文件。
- `Dockerfile`：前端镜像构建定义。

## 5. 数据结构
- 前端主要消费后端返回的 CLI 列表、CLI 详情、评论、收藏和执行结果数据。
- 典型视图对象包含：
  - `CLI`：slug、displayName、summary、environmentKind、tags、runtimeImage、popularity 等。
  - `ExecutionResult`：stdout、stderr、exitCode、durationMs、sessionState。
  - `Comment`：cliSlug、username、body、createdAt。
  - `User`：id、username、ip、anonymous 标记。
- 本仓库不维护数据库 schema，持久化结构以后端仓库为准。

## 6. API 定义
- `GET /api/v1/clis/trending`：加载首页热门 CLI 列表。
- `GET /api/v1/clis/search?q=...`：检索 CLI。
- `GET /api/v1/clis/:slug`：读取 CLI 详情与评论。
- `POST /api/v1/exec`：执行沙箱 CLI。
- `POST /api/v1/builtin/exec`：执行站点内置命令。
- `POST /api/v1/auth/mock/anonymous`：创建匿名会话。
- `POST /api/v1/auth/mock/login`：执行 mock 登录。
- `POST /api/v1/auth/mock/logout`：退出当前 mock 会话。
- `GET/POST /api/v1/favorites`：读取或修改收藏。
- `GET/POST /api/v1/comments`：读取或新增评论。
- `GET /healthz`：读取后端健康状态，开发代理与容器代理都会转发该接口。

## 7. 开发要点
- 默认 API 基址是 `/api`，不要把宿主机地址写死到生产默认值中。
- 本地开发通过 `.env` 配置 `VITE_DEV_API_TARGET`，仅影响 Vite 代理目标。
- 容器部署路径依赖 Nginx 反向代理，因此静态资源与 API 要保持同源访问模型。
- `CLAUDE.md` 只记录项目事实；产品约束和 AI 协作约束放在 `AGENTS.md`。
- 修改接口契约时需要与 `cligrep-server` 同步校验字段兼容性。

## 8. 开发流程
- 本地开发：`cp .env.example .env && npm install && npm run dev`
- 构建验证：`npm run build`
- 容器验证：`docker compose -f compose.yml up -d --build`
- 联调验证：打开首页，确认热门 CLI 能正常加载，并验证 `/healthz` 代理可用。

## 9. 已知约束与注意事项
- 前端容器默认假设宿主机后端监听 `:11802`。
- 如果 Docker 运行环境不支持 `host-gateway`，需要手动调整 `compose.yml` 中宿主机映射。
- 当前认证为 mock 会话模式，不是正式鉴权系统。
- 执行能力、评论和收藏的真实约束以后端实现为准，前端只负责展示和交互。
