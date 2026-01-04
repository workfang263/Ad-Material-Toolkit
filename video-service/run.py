#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FFmpeg 视频生成工具 - Web版本启动脚本
"""

import os
import sys
import subprocess
import socket

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 连接到一个外部地址来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def check_ffmpeg():
    """检查FFmpeg是否安装"""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_requirements():
    """安装依赖包"""
    print("正在安装依赖包...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("依赖包安装完成")
        return True
    except subprocess.CalledProcessError:
        print("依赖包安装失败")
        return False

def main():
    print("FFmpeg 视频生成工具 - Web版本")
    print("=" * 50)
    
    # 检查FFmpeg
    if not check_ffmpeg():
        print("警告：未检测到FFmpeg")
        print("请先安装FFmpeg：https://ffmpeg.org/download.html")
        print("或使用包管理器安装：choco install ffmpeg")
        print()
    
    # 安装依赖
    print("跳过依赖安装，直接启动服务...")
    
    # 获取本机IP
    local_ip = get_local_ip()
    
    print("启动Web服务器...")
    print("=" * 50)
    print("访问地址：")
    print(f"  本机访问：http://localhost:5000")
    print(f"  局域网访问：http://{local_ip}:5000")
    print("=" * 50)
    print("按 Ctrl+C 停止服务器")
    print()
    
    # 启动Flask应用
    try:
        from app import app
        app.run(host='0.0.0.0', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except Exception as e:
        print(f"启动失败：{e}")

if __name__ == "__main__":
    main()

