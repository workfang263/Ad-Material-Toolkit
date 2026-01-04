# 融合平台 (Ronghe Platform) 🚀
> **跨境电商运营部辅助工具** | 2026/1/4 效率提升版。整合了广告投放表格生成与全自动视频合成功能。

[![GitHub version   GitHub版本](https://img.shields.io/badge/version-2026.1.4-blue.svg)](https://github.com/workfang263/Ad-Material-Toolkit)[!(GitHub版)(https://img.shields.io/badge/version-2026.1.4-blue.svg)) (https://github.com/workfang263/Ad-Material-Toolkit)
[![License: MIT   条款:](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![条款:](https://img.shields.io/badge/License-MIT-yellow.svg)] (https://opensource.org/licenses/MIT)

---

### 🌟 核心功能
*   **📊 广告投放表格生成**：自动生成 Facebook/TikTok 广告投放标准化表格，提升运营效率 3 倍以上。
*   **🎬 视频生成工具**：基于图片和音频素材自动合成视频，内置 9 种精选背景音乐（包含最新添加的女巫、滑雪系列）。
*   **🔗 统一 API 网关**：基于 Node.js 架构，统一管理微服务，支持高并发处理。
*   **🎨 现代 UI 界面**：基于 Vue 3 + Vite 开发，响应式布局，操作直观。

---

### 🛠️ 前置环境准备 (必须安装)

在运行本项目前，请确保你的电脑环境已安装以下工具：

1.  **Node.js (v16.x 或以上)**: [官方下载地址](https://nodejs.org/)  1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/
odejs.org/)
    *验证命令：`node -v`*
2.  **Python (v3.8.x 或以上)**: [官方下载地址](https://www.python.org/)  
    *验证命令：`python --version`*
3.  **FFmpeg**: 视频合成核心。必须安装并**添加其 bin 目录到系统环境变量**。  
    *   [Windows 安装包下载](https://www.gyan.dev/ffmpeg/builds/)
    *   *验证命令：`ffmpeg -version`*

---

### 📥 快速开始：下载与安装

#### 1. 克隆项目到本地
```bash   ”“bash
git clone https://github.com/workfang263/Ad-Material-Toolkit.git
cd Ad-Material-Toolkit
2. 安装依赖
打开终端依次执行：
code   代码
Bash
# 安装根目录和网关依赖
npm install

# 安装前端依赖
cd frontend && npm installCD前端&& NPM安装

# 安装视频服务依赖
cd ../video-service   cd . . /视频服务
pip install -r requirements.txtPIP install -r requirements.txt
cd ..
3. 配置环境变量
将根目录下的 env.example 复制并重命名为 .env。
编辑 .env 文件，填入你的实际路径：
code   代码
Ini   这个
# 填入你的 FFmpeg 实际安装路径
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe 

# Imgfi API Key（用于上传外链功能）
IMGFI_API_KEY=你的密钥
🚀 启动系统
方案一：使用启动脚本（Windows 推荐 ⭐️）
直接双击根目录下的：👉 start_demo.bat
(脚本会自动开启前端、网关、视频后端三个服务)
方案二：手动分布启动
网关服务: cd api-gateway && npm start
视频服务: cd video-service && python app.py
前端应用: cd frontend && npm run dev
📂 项目结构概览
api-gateway/: Node.js API 网关 (Express)
frontend/: Vue 3 + Vite 前端应用
video-service/: Python 视频合成服务 (FFmpeg)
启动脚本/: 各种快捷启动工具 (.bat)
新需求方案和文档/: 2026年功能迭代文档
⚠️ 注意事项
不要上传 .env: 该文件包含私密配置，已受 .gitignore 保护。
FFmpeg 路径: 确保在 .env 中配置的路径与你电脑实际安装路径一致。
端口占用: 默认使用 18080, 18081, 19000 端口，如有冲突请在 .env 中修改。
© 2026 workfang263. Licensed under the MIT License.©2026 workfang263。在麻省理工学院许可下许可。
