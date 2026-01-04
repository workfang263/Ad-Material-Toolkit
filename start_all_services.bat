@echo off
REM 启动 Video Service（端口 18090）
start "Video Service 18090" cmd /k "cd /d D:\ronghe-platform\video-service && set FFMPEG_PATH=C:\ffmpeg\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe && python -u -B app.py"

REM 启动 API Gateway（端口 18083）
start "API Gateway 18083" cmd /k "cd /d D:\ronghe-platform\api-gateway && node server.js"

REM 启动 Frontend Dev Server（端口 18080）
start "Frontend Dev 18080" cmd /k "cd /d D:\ronghe-platform\frontend && npm run dev"

exit /b 0



