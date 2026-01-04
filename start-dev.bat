@echo off
chcp 65001 >nul
echo 正在启动融合平台...

REM 检查Node.js版本
node --version
echo.

REM 检查Python版本
python --version 2>nul
if errorlevel 1 (
    echo 警告: Python未安装或未添加到PATH
) else (
    echo Python已安装
)

REM 检查FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo 警告: FFmpeg未安装，视频生成功能将不可用
) else (
    echo FFmpeg已安装
)

echo.
echo 启动服务...

REM 启动融合平台专用视频服务 (必须先启动，API网关依赖它)
echo 启动融合平台专用视频服务 (端口18090)...
cd video-service
if exist app.py (
    set FFMPEG_PATH=C:\ffmpeg\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe
    start "" cmd /k "title Video Service (18090) && set FFMPEG_PATH=%FFMPEG_PATH% && python -u -B app.py"
    echo 等待视频服务启动...
    timeout /t 3 /nobreak >nul
) else (
    echo 警告: video-service/app.py 不存在，请手动启动
)
cd ..

REM 启动API网关
echo 启动API网关服务 (端口18083)...
cd api-gateway
if not exist node_modules (
    call npm install
)
start "" cmd /k "title API Gateway (18083) && node server.js"
cd ..

REM 等待API网关启动
timeout /t 3 /nobreak >nul

REM 启动前端开发服务器
echo 启动前端开发服务器 (端口18080)...
cd frontend
if not exist node_modules (
    call npm install
)
start "" cmd /k "title Frontend Dev Server (18080) && npm run dev"
cd ..

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo.
echo 前端地址: http://localhost:18080
echo 广告投放: http://localhost:18080/ad-campaign
echo 视频生成: http://localhost:18080/video-generation
echo.
echo API网关: http://localhost:18083
echo 视频服务: http://localhost:18090
echo.
echo ========================================
echo 所有服务已在后台运行
echo 关闭此窗口不会停止服务
echo 如需停止服务，请关闭对应的命令窗口
echo ========================================
echo.
timeout /t 5 >nul