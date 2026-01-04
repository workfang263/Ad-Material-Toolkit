# 演示指南 - 如何运行 Demo

本文档说明如何从 GitHub 获取代码并运行演示。

## 📋 前置准备

在开始之前，确保你的电脑已安装：

- ✅ **Node.js** (v16 或更高版本) - [下载地址](https://nodejs.org/)
- ✅ **Python** (v3.8 或更高版本) - [下载地址](https://www.python.org/)
- ✅ **FFmpeg** - [下载地址](https://ffmpeg.org/download.html)
- ✅ **Git** - [下载地址](https://git-scm.com/)

## 🚀 快速开始（5 步完成）

### 步骤 1: 从 GitHub 克隆代码

打开命令行（CMD 或 PowerShell），执行：

```bash
git clone https://github.com/你的用户名/ronghe-platform.git
cd ronghe-platform
```

### 步骤 2: 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..

# 安装 API 网关依赖
cd api-gateway
npm install
cd ..

# 安装视频服务依赖（Python）
cd video-service
pip install -r requirements.txt
cd ..
```

**或者使用一键安装命令：**
```bash
npm run install:all
```

### 步骤 3: 配置环境变量

复制示例配置文件：
```bash
# Windows
copy env.example .env

# Mac/Linux
cp env.example .env
```

编辑 `.env` 文件，**至少配置以下内容**：

```env
# 服务端口（如果端口被占用，可以修改）
PORT=18081
FRONTEND_URL=http://localhost:18080
VIDEO_GENERATION_URL=http://localhost:19000

# 环境模式
NODE_ENV=development

# 如果使用图片处理功能，需要配置 Imgfi API Key
# IMGFI_API_KEY=your-api-key-here

# 安全配置（可以随机生成）
SECRET_KEY=demo-secret-key-12345
JWT_SECRET=demo-jwt-secret-12345
```

### 步骤 4: 配置 FFmpeg 路径

**Windows 系统：**

编辑 `video-service/start.bat` 或设置环境变量：
```bash
set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

**Mac/Linux 系统：**

如果 FFmpeg 已添加到系统 PATH，可以跳过。否则：
```bash
export FFMPEG_PATH=/usr/local/bin/ffmpeg
```

### 步骤 5: 启动服务

**方式一：使用启动脚本（推荐）**

Windows:
```bash
start_all_services.bat
```

**方式二：手动启动（3 个终端窗口）**

**终端 1 - 启动 API 网关：**
```bash
cd api-gateway
npm start
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

**终端 3 - 启动视频服务：**
```bash
cd video-service
# Windows
set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
python app.py

# Mac/Linux
python3 app.py
```

## 🌐 访问演示

启动成功后，在浏览器中打开：

- **前端界面**: http://localhost:18080
- **API 网关**: http://localhost:18081
- **视频服务**: http://localhost:19000

## 📝 演示功能说明

### 1. 广告投放表格生成
- 上传商品图片
- 填写商品信息
- 自动生成 Facebook 广告投放表格（CSV 格式）

### 2. 视频生成工具
- 上传图片和音频
- 选择背景音乐
- 自动生成视频文件

## ⚠️ 常见问题

### 问题 1: 端口被占用

**解决方案：**
修改 `.env` 文件中的端口号，例如：
```env
PORT=18082
FRONTEND_URL=http://localhost:18081
```

### 问题 2: FFmpeg 未找到

**解决方案：**
1. 确认 FFmpeg 已正确安装
2. 检查 FFmpeg 路径是否正确
3. 可以将 FFmpeg 添加到系统 PATH 环境变量

### 问题 3: npm install 失败

**解决方案：**
1. 检查网络连接
2. 尝试使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

### 问题 4: Python 依赖安装失败

**解决方案：**
```bash
# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题 5: 服务启动后无法访问

**检查清单：**
- ✅ 确认所有服务都已成功启动（查看终端输出）
- ✅ 确认端口没有被防火墙阻止
- ✅ 检查浏览器控制台是否有错误
- ✅ 确认 `.env` 文件配置正确

## 🎯 演示建议

### 准备演示数据

1. **准备一些商品图片**（用于广告投放功能）
2. **准备一些图片和音频**（用于视频生成功能）
3. **提前测试所有功能**，确保演示流畅

### 演示流程建议

1. **介绍项目** - 说明平台的主要功能
2. **展示前端界面** - 打开 http://localhost:18080
3. **演示广告投放功能** - 上传图片，生成表格
4. **演示视频生成功能** - 上传素材，生成视频
5. **展示技术架构** - 说明前后端分离、微服务架构

## 📞 需要帮助？

如果遇到问题：
1. 查看 `README.md` 获取更多信息
2. 检查终端错误信息
3. 查看项目文档：`新需求方案和文档/` 文件夹

---

**祝演示顺利！** 🎉

