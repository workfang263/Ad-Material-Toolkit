# 融合平台 (Ronghe Platform)

一个整合了广告投放表格生成器和视频生成工具的统一平台。

## 功能特性

- 📊 **广告投放表格生成** - 自动生成 Facebook 广告投放表格
- 🎬 **视频生成工具** - 基于图片和音频生成视频
- 🔗 **API 网关** - 统一的 API 入口，管理多个微服务
- 🎨 **Vue 前端界面** - 现代化的用户界面

## 技术栈

- **前端**: Vue.js + Vite
- **后端**: Node.js + Express
- **视频服务**: Python + FFmpeg
- **API 网关**: Express

## 快速开始

### 前置要求

- Node.js (v16+)
- Python (v3.8+)
- FFmpeg (需要单独安装)
- npm 或 yarn

> 💡 **演示指南**: 如需快速运行演示，请查看 [DEMO.md](./DEMO.md) 获取详细步骤

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/你的用户名/ronghe-platform.git
cd ronghe-platform
```

2. **安装依赖**
```bash
# 安装根目录和前端依赖
npm run install:all

# 安装 API 网关依赖
cd api-gateway
npm install
cd ..

# 安装视频服务依赖
cd video-service
pip install -r requirements.txt
cd ..
```

3. **配置环境变量**

复制示例配置文件并编辑：
```bash
copy env.example .env
```

编辑 `.env` 文件，填入你的配置：
- 服务端口
- API 密钥（如 Imgfi API Key）
- 数据库配置（如需要）
- 其他服务地址

4. **启动服务**

**方式一：使用启动脚本（Windows，推荐）**
```bash
start_demo.bat
```

> 注意：`start_demo.bat` 会自动检查依赖并安装，使用相对路径，可在任意位置运行

**方式二：手动启动**

启动 API 网关：
```bash
cd api-gateway
npm start
```

启动前端（开发模式）：
```bash
cd frontend
npm run dev
```

启动视频服务：
```bash
cd video-service
# 设置 FFmpeg 路径（Windows）
set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
python app.py
```

### 默认端口

- **前端**: http://localhost:18080
- **API 网关**: http://localhost:18081
- **视频服务**: http://localhost:19000

## 项目结构

```
ronghe-platform/
├── api-gateway/          # API 网关服务
├── frontend/             # Vue 前端应用
├── video-service/        # Python 视频生成服务
├── 启动脚本/             # 启动脚本
├── 新需求方案和文档/      # 项目文档
└── pinjie/               # 开发文档和会话记录
```

## 环境变量说明

主要环境变量（在 `.env` 文件中配置）：

- `PORT` - API 网关端口（默认: 18081）
- `FRONTEND_URL` - 前端地址
- `VIDEO_GENERATION_URL` - 视频服务地址
- `IMGFI_API_KEY` - Imgfi API 密钥（用于图片处理）
- `SECRET_KEY` - 应用密钥
- `JWT_SECRET` - JWT 密钥

详细配置请参考 `env.example` 文件。

## 开发说明

### 前端开发
```bash
cd frontend
npm run dev
```

### 后端开发
```bash
cd api-gateway
npm run dev  # 使用 nodemon 自动重启
```

### 构建生产版本
```bash
npm run build
```

## 注意事项

⚠️ **重要**：
- 不要将 `.env` 文件提交到 Git
- 不要将 `node_modules`、`output`、`uploads` 等文件夹提交到 Git
- 首次使用前必须配置 `.env` 文件
- 确保已安装 FFmpeg 并配置正确的路径

## 常见问题

### FFmpeg 未找到
确保已安装 FFmpeg 并设置环境变量或配置路径。

### 端口被占用
修改 `.env` 文件中的端口配置。

### API 请求失败
检查 `.env` 文件中的 API 密钥和服务地址是否正确。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

