@echo off
chcp 65001 >nul
echo 启动融合平台专用视频服务 (端口18090)...
cd /d "%~dp0"
set FFMPEG_PATH=C:\ffmpeg\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe
python -u -B app.py
pause

