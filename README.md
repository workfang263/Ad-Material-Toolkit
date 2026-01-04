<img width   宽度="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/db946881-95b1-4565-a62f-624f2646d1e9" /># 融合平台 (Ronghe Platform) 🚀#与荣和平台（融和平台）🚀#与荣和平台（融和平台）🚀
> **跨境电商运营部辅助工具** | 2026/1/4 效率提升版。整合了广告投放表格生成与全自动视频合成功能。

[![GitHub version](https://img.shields.io/badge/version-2026.1.4-blue.svg)](https://github.com/workfang263/Ad-Material-Toolkit)[!(GitHub版)(https://img.shields.io/badge/version-2026.1.4-blue.svg)) (https://github.com/workfang263/Ad-Material-Toolkit)[!(GitHub版)(https://img.shields.io/badge/version-2026.1.4-blue.svg)) (https://github.com/workfang263/Ad-Material-Toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![条款:](https://img.shields.io/badge/License-MIT-yellow.svg)] (https://opensource.org/licenses/MIT)[![条款:](https://img.shields.io/badge/License-MIT-yellow.svg)] (https://opensource.org/licenses/MIT)

---

## 🌟 核心功能
*   **📊 广告投放表格生成**：自动生成 Facebook/TikTok 广告投放标准化表格，提升运营效率 3 倍以上。
*   **🎬 视频生成工具**：基于图片和音频素材自动合成视频，内置 9 种精选背景音乐（包含最新添加的女巫、滑雪系列）。
*   **🔗 统一 API 网关**：基于 Node.js 架构，统一管理微服务，支持高并发处理。
*   **🎨 现代 UI 界面**：基于 Vue 3 + Vite 开发，响应式布局，操作直观。

---

## 🛠️ 前置环境准备 (必须安装)

在运行本项目前，请确保你的电脑环境已安装以下工具：

1.  **Node.js (v16.x 或以上)**: [官方下载地址](https://nodejs.org/)  1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/
odejs.org/)  1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/
odejs.org/)1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/
odejs.org/)  1.  **Node.js (v16.x 或以上)**: [官方下载地址](https:/
    *验证命令：`node -v`*
2.  **Python (v3.8.x 或以上)**: [官方下载地址](https://www.python.org/)  
    *验证命令：`python --version`*
3.  **FFmpeg**: 视频合成核心。必须安装并**添加其 bin 目录到系统环境变量**。  
    *   [Windows 安装包下载](https://www.gyan.dev/ffmpeg/builds/)
    *   *验证命令：`ffmpeg -version`*

---

## 📥 快速开始：下载与安装

### 1. 克隆项目到本地
打开终端（CMD 或 PowerShell），输入：
```bash
git clone https://github.com/workfang263/Ad-Material-Toolkit.git
cd Ad-Material-Toolkit
2. 一键安装依赖
为了简化操作，请按顺序执行以下命令安装前后端所有依赖：
code   代码
Bash
# 安装 API 网关和根目录依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装视频服务依赖（Python）
cd ../video-service
pip install -r requirements.txt
cd ..
3. 配置环境变量 (重要步骤)
项目根目录下包含 env.example，必须手动配置 .env：
在根目录下，将 env.example 复制并重命名为 .env。
使用记事本打开 .env，填入你的配置信息：
code   代码
Ini   这个
# 填入你的 FFmpeg 实际安装路径 (例如 D:\ffmpeg\bin\ffmpeg.exe)
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe 

# Imgfi API Key（用于上传外链功能）
IMGFI_API_KEY=你的密钥内容
🚀 启动系统
方案一：使用启动脚本（Windows 推荐 ⭐️）
双击根目录下的启动脚本：
👉 start_demo.bat
(该脚本会自动检测环境并同时启动：前端、网关、视频后端三个服务。)#与荣和平台（融和平台）🚀
方案二：手动分布启动
如果脚本无法运行，请分别在三个终端窗口执行：
网关服务: cd api-gateway && npm start (端口: 18081)
视频服务: cd video-service && python app.py (端口: 19000)
前端应用: cd frontend && npm run dev (端口: 18080)
📂 项目结构概览
code   代码
Text   文本
Ad-Material-Toolkit/
├── api-gateway/          # Node.js API 网关 (Express)
├── frontend/             # Vue 3 + Vite 前端界面├── frontend/             # Vue 3   Vite 前端界面
├── video-service/        # Python 视频合成服务 (FFmpeg)
├── 启动脚本/             # 各种快捷启动工具 (.bat)
├── 新需求方案和文档/      # 2026年功能迭代文档
└── pinjie/               # 历史开发记录与逻辑分析
🖥️ 默认访问地址
前端界面: http://localhost:18080
系统状态检查: http://localhost:18081/health
⚠️ 注意事项
不要上传 .env: .env 文件包含私密配置，已被 .gitignore 自动忽略，严禁上传至公开仓库。
FFmpeg 路径: 路径中若包含空格，请在 .env 中使用引号包裹路径。
端口冲突: 如果 18080 或 18081 端口被占用，请在 .env 中修改对应的 PORT 变量。
🤝 贡献与反馈
本项目处于快速迭代中，欢迎通过 Issues 提交反馈或建议！
© 2026 workfang263. Licensed under the MIT License.©2026 workfang263。在麻省理工学院许可下许可。
