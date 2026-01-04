# 融合平台视频服务（独立实例）

这是融合平台专用的视频生成服务实例，运行在端口 **18090**，与原始的9000端口服务完全独立。

## 启动方式

```bash
cd D:\projects\ronghe-platform\video-service
$env:FFMPEG_PATH='C:\ffmpeg\ffmpeg-8.0-essentials_build\bin\ffmpeg.exe'
python -u -B app.py
```

## 端口配置

- **融合平台视频服务**: 端口 18090
- **原始视频服务**: 端口 9000（保持不变，独立运行）

两个服务互不干扰，可以同时运行。

