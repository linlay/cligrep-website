# cligrep-website

## 1. 项目简介
`cligrep-website` 是 CLI Grep 的 React 前端站点，提供键盘优先的 CLI 检索、详情浏览、评论、收藏和内置命令交互体验。

前端以静态站点方式交付，推荐通过容器运行 Nginx 对外提供页面，并把 `/api` 与 `/healthz` 反向代理到宿主机原生部署的 `cligrep-server`。

## 2. 快速开始
### 前置要求
- Node.js 18+
- npm
- Docker Engine 与 Docker Compose Plugin（用于容器部署）
- 宿主机已启动 `cligrep-server`，默认监听 `127.0.0.1:8080`

### 本地开发
```bash
cp .env.example .env
npm install
npm run dev
```

默认开发地址为 `http://127.0.0.1:5173`。Vite 会把 `/api` 和 `/healthz` 代理到 `VITE_DEV_API_TARGET`，默认值是 `http://127.0.0.1:8080`。

### 生产构建
```bash
npm install
npm run build
```

构建产物输出到 `dist/`。

## 3. 配置说明
- 所有本地配置从 `.env.example` 复制到 `.env`。
- `.env` 仅用于本地开发，不提交仓库。
- 前端默认同源访问后端接口，生产容器内由 Nginx 代理，不需要把后端地址写进前端构建产物。
- 当前支持的本地配置项如下：

```dotenv
VITE_DEV_API_TARGET=http://127.0.0.1:8080
FRONTEND_PORT=8081
```

说明：
- `VITE_DEV_API_TARGET`：仅影响 `npm run dev` 的本地代理目标。
- `FRONTEND_PORT`：用于 `compose.yml` 的宿主机端口映射，默认 `8081`。
- 如确有特殊需要，也可在构建时显式注入 `VITE_API_BASE` 覆盖默认 `/api`，但标准部署路径不依赖它。

## 4. 部署
### 容器部署
```bash
cp .env.example .env
docker compose -f compose.yml up -d --build
```

默认访问地址：
- 首页：[http://127.0.0.1:8081](http://127.0.0.1:8081)
- 前端转发健康检查：[http://127.0.0.1:8081/healthz](http://127.0.0.1:8081/healthz)

容器部署说明：
- `compose.yml` 只编排前端服务。
- Nginx 容器会将 `/api` 与 `/healthz` 转发到 `http://host.docker.internal:8080`。
- `extra_hosts` 已映射 `host.docker.internal:host-gateway`，兼容常见 Linux Docker 主机。

### 镜像构建
```bash
docker build -t cligrep-website:latest .
```

## 5. 运维
### 查看容器状态
```bash
docker compose -f compose.yml ps
```

### 查看前端日志
```bash
docker compose -f compose.yml logs -f web
```

### 停止服务
```bash
docker compose -f compose.yml down
```

### 常见排查
- 页面能打开但数据为空：先确认宿主机后端 `cligrep-server` 已启动，并检查 `http://127.0.0.1:8081/healthz`。
- 本地开发接口失败：检查 `.env` 中 `VITE_DEV_API_TARGET` 是否指向可访问的后端地址。
- 容器启动失败：检查宿主机的 `8081` 端口是否被占用，或在 `.env` 中修改 `FRONTEND_PORT`。
- 修改前端代码后未生效：开发模式使用 `npm run dev`，容器模式需要重新执行 `docker compose -f compose.yml up -d --build`。
