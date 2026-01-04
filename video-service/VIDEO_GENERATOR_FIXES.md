# VideoGenerator 修复说明

## 问题说明

由于 `VideoGenerator` 是从外部项目导入的（`D:\projects\ffmpeg\ffmpeg\video_generator.py`），需要在外部文件中进行以下修改：

## 问题1：视频播放卡住（3秒卡住，跳到6秒）

### 原因
FFmpeg 编码时缺少关键帧（GOP设置不当），导致播放器无法正常解码。

### 修复方法
在 `video_generator.py` 的 `create_video` 方法中，找到 FFmpeg 视频编码命令，添加以下参数：

```python
# 在视频编码参数中添加（通常在 -c:v libx264 之后）
'-g', '30',           # GOP size: 每30帧一个关键帧（假设30fps，约1秒一个关键帧）
'-keyint_min', '30',  # 最小关键帧间隔
'-sc_threshold', '0', # 场景切换时强制关键帧
'-preset', 'medium',  # 编码预设（平衡质量和速度）
'-crf', '23'          # 恒定质量因子（可选，确保质量）
```

### 示例
如果原来的命令是：
```python
['ffmpeg', '-i', input_file, '-c:v', 'libx264', '-c:a', 'aac', output_file]
```

修改为：
```python
['ffmpeg', '-i', input_file, '-c:v', 'libx264', 
 '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
 '-preset', 'medium', '-crf', '23',
 '-c:a', 'aac', output_file]
```

## 问题3：视频时长以图片播放时长为准

### 原因
背景视频循环播放导致实际视频时长超过图片播放时长。

### 修复方法
在 `video_generator.py` 的 `create_video` 方法中，当使用背景视频时，需要在 FFmpeg 命令中添加 `-shortest` 参数。

### 说明
- `-shortest` 参数确保视频时长以最短的输入流为准（即图片播放时长）
- 如果背景视频时长 > 图片总时长，则只播放到图片总时长就停止
- 如果背景视频时长 < 图片总时长，背景视频会自动循环播放（使用 `-stream_loop -1`），但总时长仍以图片为准

### 示例
如果使用背景视频，命令应该类似：
```python
['ffmpeg', 
 '-stream_loop', '-1',  # 背景视频循环播放
 '-i', background_video,
 '-i', image_input,
 '-shortest',           # 以最短流为准（图片时长）
 '-c:v', 'libx264',
 '-c:a', 'aac',
 output_file]
```

### 注意事项
1. `-shortest` 必须放在所有输入文件之后，输出文件之前
2. 如果同时有背景音乐，也需要确保音乐不会延长视频时长
3. 图片序列的时长计算：`图片数 × 每张图片时长`

## 修改位置

在 `D:\projects\ffmpeg\ffmpeg\video_generator.py` 文件中：
1. 找到 `create_video` 方法
2. 找到构建 FFmpeg 命令的部分
3. 按照上述说明添加参数

## 验证方法

修改后，测试：
1. 生成一个视频（例如：10张图片，每张0.7秒，总时长7秒）
2. 使用一个时长较长的背景视频（例如：20秒）
3. 检查生成的视频：
   - 播放时长应该是7秒（不是20秒）
   - 播放时不会卡住
   - 可以正常拖拽进度条


