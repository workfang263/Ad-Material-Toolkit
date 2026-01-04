# 融合平台 (Ronghe Platform) 🚀
> **跨境电商运营部辅助工具** | 整合广告投放表格生成与视频一键合成，效率提升 3 倍以上。

[![GitHub version](https://img.shields.io/badge/version-2026.1.4-blue.svg)](https://github.com/workfang263/Ad-Material-Toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌟 核心功能
*   **📊 广告投放表格生成**：自动生成 Facebook/TikTok 投放标准化表格，数据精准对齐。
*   **🎬 视频生成工具**：图片自动拼接，支持 9 种背景音乐（维京/女巫/滑雪系列），一键合成视频。
*   **🔗 统一 API 网关**：基于 Node.js 架构，统一管理多个微服务，运行稳定。
*   **🎨 现代化 UI**：基于 Vue 3 + Vite 开发，操作直观。

---

### 🛠️ 环境准备 (必须安装)
在运行本项目前，请确保电脑已安装以下基础环境：
1.  **Node.js (v16.x+)**: [官方下载地址](https://nodejs.org/)
2.  **Python (v3.8.x+)**: [官方下载地址](https://www.python.org/)
3.  **FFmpeg**: 核心组件。安装后必须**添加其 bin 目录到系统环境变量**。 [下载指南](https://www.gyan.dev/ffmpeg/builds/)

---

### 📥 快速开始 (下载与安装)

#### 1. 克隆项目到本地
```bash
git clone https://github.com/workfang263/Ad-Material-Toolkit.git
cd Ad-Material-Toolkit
2. 一键安装环境 (推荐 ⭐️)
在 Windows 文件夹中直接双击运行根目录下的：
👉 install.bat
该脚本会自动执行以下操作：
检测 Node.js 和 Python 环境
自动安装根目录、前端 frontend、网关 api-gateway 的 Node 依赖
自动安装视频服务 video-service 的 Python 依赖（支持国内镜像源）
3. 配置文件准备
在根目录下，将 env.example 复制一份并重命名为 .env。
用记事本打开 .env，填入你的实际参数：
code
Ini
# 必须配置：你电脑上 FFmpeg 的实际路径
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe 

# 可选配置：Imgfi API Key（用于上传外链功能）
IMGFI_API_KEY=你的密钥
4. 启动系统
双击运行根目录下的：
👉 start_demo.bat
(系统将自动开启三个终端窗口，分别运行：前端 [18080]、网关 [18081]、视频服务 [19000])
📂 项目结构
api-gateway/: Node.js 流量分发中心
frontend/: Vue 3 现代化前端应用
video-service/: Python + FFmpeg 视频合成服务
install.bat: 一键环境部署脚本
start_demo.bat: 一键启动服务脚本
❓ 常见问题
依赖安装缓慢/失败？
Node 依赖：建议开启科学上网工具。
Python 依赖：若 install.bat 报错，可手动运行：
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
FFmpeg 报错？
请确保在 .env 文件中填写的路径是指向 ffmpeg.exe 的完整绝对路径。
端口占用？
请关闭占用 18080/18081 端口的程序，或在 .env 中重新指定 PORT。
© 2026 workfang263. 基于 MIT 协议开源，祝你使用愉快！
