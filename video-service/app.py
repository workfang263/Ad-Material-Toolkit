#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FFmpeg 视频生成工具 - Web版本
支持局域网用户在线使用
"""

import os
import sys
import subprocess
import uuid
import zipfile
import io
import hashlib
import re
from datetime import datetime, timedelta
from threading import RLock, Thread
from collections import defaultdict
import time
from flask import Flask, render_template, request, jsonify, send_file, url_for, session
from werkzeug.utils import secure_filename
import shutil
from PIL import Image, ImageOps

# 添加父目录到路径，以便导入video_generator模块
# 融合平台视频服务需要从原始ffmpeg项目导入video_generator
ffmpeg_dir = os.path.join(r'D:\projects\ffmpeg\ffmpeg')
sys.path.insert(0, ffmpeg_dir)
from video_generator import VideoGenerator

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# 配置上传目录（统一使用项目根目录的绝对路径，避免相对路径带来的读写不一致）
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
OUTPUT_FOLDER = os.path.join(PROJECT_ROOT, 'output')

# 清理Session ID，使其成为安全的文件名
def sanitize_session_id(session_id):
    """
    清理Session ID，移除Windows文件系统中不允许的字符
    Windows不允许的字符: < > : " / \\ | ? * 以及开头结尾的点号和空格
    如果Session ID包含太多特殊字符或太长，使用MD5 hash作为后备
    """
    if not session_id:
        return None
    
    # 如果是字符串类型，进行处理
    if not isinstance(session_id, str):
        session_id = str(session_id)
    
    # 移除或替换Windows不允许的字符
    # 使用正则表达式替换不允许的字符为下划线
    # 包括: < > : " / \ | ? * 控制字符(0x00-0x1f) 以及一些其他特殊字符
    sanitized = re.sub(r'[<>:"/\\\\|?*\x00-\x1f]', '_', session_id)
    
    # 移除开头和结尾的点号、空格
    sanitized = sanitized.strip('. ')
    
    # 移除连续的点和下划线（避免路径问题）
    sanitized = re.sub(r'[._]{2,}', '_', sanitized)
    
    # 再次移除开头和结尾的点号、空格、下划线
    sanitized = sanitized.strip('._ ')
    
    # 如果清理后为空、太长、以点号开头，或者包含保留名称，使用hash作为后备
    # Windows路径长度限制是260字符（包括路径前缀），文件夹名应该更短
    # 同时检查是否包含Windows保留名称
    windows_reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                       'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                       'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    
    if (not sanitized or 
        len(sanitized) > 200 or 
        sanitized.startswith('.') or 
        sanitized.upper() in windows_reserved):
        # 使用MD5 hash作为后备，确保安全且唯一
        sanitized = hashlib.md5(session_id.encode('utf-8')).hexdigest()
        print(f"Session ID清理后不安全，使用MD5 hash: {sanitized}")
    
    return sanitized

# 批次与广告数据存储（内存级，按用户隔离）
BATCH_SIZE = 10
_batch_lock = RLock()
_user_video_batches = {}
_user_ad_drafts = {}
_user_generation_counters = defaultdict(int)


def _chunk_list(items, chunk_size):
    for idx in range(0, len(items), chunk_size):
        yield items[idx:idx + chunk_size]


def _build_video_record(session_id, video_info, output_dir):
    """
    组装视频记录，提供文件名、下载链接等信息
    """
    filename = video_info.get("video_name")
    if not filename:
        return None
    filepath = os.path.join(output_dir, filename)
    download_url = url_for('download_video', filename=filename)
    return {
        "filename": filename,
        "filepath": filepath,
        "download_url": download_url,
        "duration": video_info.get("duration"),
        "sequence": video_info.get("sequence", []),
    }


def _store_video_batches(session_id, videos, output_dir):
    """
    按批次存储视频结果，确保每批不超过 BATCH_SIZE
    """
    with _batch_lock:
        _user_generation_counters[session_id] += 1
        generation_prefix = datetime.now().strftime("%Y%m%d%H%M%S")
        generation_id = f"{generation_prefix}-{_user_generation_counters[session_id]}"
        prepared_videos = []
        for video_info in videos:
            record = _build_video_record(session_id, video_info, output_dir)
            if record:
                prepared_videos.append(record)

        batches = []
        for index, chunk in enumerate(_chunk_list(prepared_videos, BATCH_SIZE), start=1):
            batch_id = f"{generation_id}-B{index:02d}"
            batches.append({
                "batch_id": batch_id,
                "video_count": len(chunk),
                "videos": chunk,
                "created_at": datetime.now().isoformat(),
                "generation_id": generation_id,
                "synced": False,
                "synced_at": None,
            })

        _user_video_batches[session_id] = {
            "updated_at": datetime.now().isoformat(),
            "generation_id": generation_id,
            "batches": batches
        }

        # 新一轮生成后，清空已同步的广告草稿中的视频链接
        _user_ad_drafts[session_id] = {
            "video_links": [],
            "synced_batch_id": None,
            "synced_at": None
        }

        return batches


def _get_user_batches(session_id):
    with _batch_lock:
        return _user_video_batches.get(session_id, {"batches": [], "generation_id": None, "updated_at": None})


def _set_batch_synced(session_id, batch_id):
    with _batch_lock:
        state = _user_video_batches.get(session_id)
        if not state:
            return None
        target_batch = None
        for batch in state["batches"]:
            if batch["batch_id"] == batch_id:
                batch["synced"] = True
                batch["synced_at"] = datetime.now().isoformat()
                target_batch = batch
            else:
                batch["synced"] = False
                batch["synced_at"] = batch.get("synced_at")
        return target_batch


def _sync_batch_to_ad_draft(session_id, batch_id):
    batch = _set_batch_synced(session_id, batch_id)
    if not batch:
        return None
    video_links = [video["download_url"] for video in batch["videos"]]
    with _batch_lock:
        _user_ad_drafts[session_id] = {
            "video_links": video_links,
            "synced_batch_id": batch_id,
            "synced_at": datetime.now().isoformat()
        }
        return _user_ad_drafts[session_id]


def _get_ad_draft(session_id):
    with _batch_lock:
        return _user_ad_drafts.get(session_id, {
            "video_links": [],
            "synced_batch_id": None,
            "synced_at": None
        })


def _reset_user_state(session_id):
    with _batch_lock:
        _user_video_batches.pop(session_id, None)
        _user_ad_drafts.pop(session_id, None)

# 用户隔离的文件夹结构
def get_user_folders(session_id):
    """获取用户专属的文件夹路径"""
    # 清理session_id，确保它可以用作文件夹名
    safe_session_id = sanitize_session_id(session_id)
    if not safe_session_id:
        # 如果清理失败，使用uuid作为后备
        safe_session_id = str(uuid.uuid4())
    
    return {
        'fixed': os.path.join(UPLOAD_FOLDER, safe_session_id, 'fixed'),
        'variable': os.path.join(UPLOAD_FOLDER, safe_session_id, 'variable'),
        'music': os.path.join(UPLOAD_FOLDER, safe_session_id, 'music'),
        'background': os.path.join(UPLOAD_FOLDER, safe_session_id, 'background'),
        'output': os.path.join(OUTPUT_FOLDER, safe_session_id)
    }

def ensure_user_folders(session_id):
    """确保用户专属文件夹存在"""
    folders = get_user_folders(session_id)
    for folder_path in folders.values():
        os.makedirs(folder_path, exist_ok=True)
    return folders

def get_user_session_id():
    """获取用户会话ID，如果不存在则创建新的"""
    # 优先检查 x-session-id header（用于API Gateway透传）
    session_id = request.headers.get('x-session-id') or request.headers.get('X-Session-Id')
    if session_id:
        # 清理session ID以确保可以作为文件夹名使用
        original_length = len(session_id) if session_id else 0
        sanitized_id = sanitize_session_id(session_id)
        session['user_id'] = sanitized_id
        print(f"[Session] Header session ID (原始长度: {original_length}, 清理后: {sanitized_id})")
        return sanitized_id
    
    # 其次检查是否有session cookie
    if 'session' in request.cookies:
        session_id = request.cookies.get('session')
        if session_id:
            # 清理session ID以确保可以作为文件夹名使用
            original_length = len(session_id) if session_id else 0
            sanitized_id = sanitize_session_id(session_id)
            session['user_id'] = sanitized_id
            print(f"[Session] Cookie session ID (原始长度: {original_length}, 清理后: {sanitized_id})")
            return sanitized_id
    
    # 如果没有session cookie或header，创建新的
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    
    session_id = session['user_id']
    print(f"使用Flask session ID: {session_id}")
    return session_id

# 确保基础目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}
ALLOWED_MUSIC_EXTENSIONS = {'mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_music_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_MUSIC_EXTENSIONS

def allowed_video_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def get_video_duration(video_path):
    """使用 ffprobe 获取视频时长（秒）"""
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries',
            'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            duration = float(result.stdout.strip())
            return duration
        return None
    except Exception as e:
        print(f"[Warn] 无法获取视频时长 {video_path}: {e}", flush=True)
        return None

def get_video_fps(video_path):
    """使用 ffprobe 获取视频帧率（fps）"""
    try:
        # 先尝试获取平均帧率
        cmd = [
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            r_frame_rate = result.stdout.strip()
            # r_frame_rate 格式通常是 "30/1" 或 "30000/1001"
            if '/' in r_frame_rate:
                num, den = map(int, r_frame_rate.split('/'))
                if den > 0:
                    fps = num / den
                    return fps
        return None
    except Exception as e:
        print(f"[Warn] 无法获取视频帧率 {video_path}: {e}", flush=True)
        return None

class WebVideoGenerator:
    def __init__(self, session_id):
        self.session_id = session_id
        self.user_folders = ensure_user_folders(session_id)
        self.generator = VideoGenerator()
        self.generator.fixed_dir = self.user_folders['fixed']
        self.generator.variable_dir = self.user_folders['variable']
        self.generator.output_dir = self.user_folders['output']
        # 增强 create_video 方法以支持背景视频循环
        self._enhance_create_video()
    
    def _enhance_create_video(self):
        """增强 VideoGenerator 的 create_video 方法，添加背景视频循环和时长控制"""
        original_create_video = self.generator.create_video
        
        def enhanced_create_video(variable_images, fixed_images, video_name, duration, 
                                  music_path=None, background_path=None, blur_background=False, 
                                  background_video_path=None):
            """增强版的 create_video，支持背景视频循环和精确时长控制"""
            # 计算准确的视频时长：图片数 × 每张时长
            total_images = len(variable_images)
            if fixed_images:
                total_images += len(fixed_images)
            calculated_duration = total_images * duration
            
            print(f"[Enhanced] 计算视频时长: {total_images}张图片 × {duration}秒 = {calculated_duration}秒", flush=True)
            
            # 计算图片切换时间点（用于强制插入关键帧，解决卡顿）
            image_switch_times = []
            current_time = 0.0
            for i in range(total_images):
                image_switch_times.append(f"{current_time:.2f}")
                current_time += duration
            print(f"[Enhanced] 图片切换时间点: {', '.join(image_switch_times[:5])}... (共{len(image_switch_times)}个)", flush=True)
            
            # 检测背景视频时长和帧率，决定是否需要循环和帧率统一
            need_loop_background = False
            need_unify_fps = False
            bg_duration = None
            bg_fps = None
            if background_video_path and os.path.exists(background_video_path):
                bg_duration = get_video_duration(background_video_path)
                bg_fps = get_video_fps(background_video_path)
                if bg_duration is not None:
                    print(f"[Enhanced] 背景视频时长: {bg_duration:.2f}秒, 图片序列时长: {calculated_duration:.2f}秒", flush=True)
                    if bg_duration < calculated_duration:
                        need_loop_background = True
                        print(f"[Enhanced] 背景视频较短，需要循环播放", flush=True)
                    else:
                        print(f"[Enhanced] 背景视频足够长，不需要循环", flush=True)
                else:
                    print(f"[Enhanced] 无法获取背景视频时长，默认不循环", flush=True)
                
                # 检测帧率，如果与目标帧率（30fps）不一致，需要统一
                if bg_fps is not None:
                    print(f"[Enhanced] 背景视频帧率: {bg_fps:.2f} fps", flush=True)
                    if abs(bg_fps - 30.0) > 0.1:  # 允许0.1的误差
                        need_unify_fps = True
                        print(f"[Enhanced] 背景视频帧率与目标帧率不一致，需要统一为30fps", flush=True)
                else:
                    # 无法获取帧率，可能是VFR，统一为30fps更安全
                    need_unify_fps = True
                    print(f"[Enhanced] 无法获取背景视频帧率，可能为VFR，统一为30fps", flush=True)
            
            # 保存原始的 subprocess.run 方法
            original_run = subprocess.run
            
            def enhanced_run(cmd, *args, **kwargs):
                """增强的 subprocess.run，修改 FFmpeg 命令参数"""
                if isinstance(cmd, list) and len(cmd) > 0:
                    cmd_str = ' '.join(str(c) for c in cmd[:3]) if len(cmd) >= 3 else str(cmd[0])
                    if 'ffmpeg' in cmd_str.lower():
                        new_cmd = []
                        keyframe_params_added = False
                        duration_added = False
                        stream_loop_added = False
                        global_timestamp_fix_added = False
                        
                        # 找到 ffmpeg 和第一个 -i 的位置
                        ffmpeg_index = -1
                        first_input_index = -1
                        for idx, item in enumerate(cmd):
                            if 'ffmpeg' in str(item).lower() and ffmpeg_index == -1:
                                ffmpeg_index = idx
                            if str(item) == '-i' and first_input_index == -1:
                                first_input_index = idx
                                break
                        
                        # 检查是否已存在这些参数，避免重复添加（更严格的检查）
                        has_fflags = False
                        has_avoid_negative_ts = False
                        for item in cmd:
                            item_str = str(item)
                            if item_str == '-fflags' or (item_str.startswith('-fflags') and len(item_str) > 7):
                                has_fflags = True
                            if item_str == '-avoid_negative_ts' or (item_str.startswith('-avoid_negative_ts') and len(item_str) > 17):
                                has_avoid_negative_ts = True
                        
                        i = 0
                        while i < len(cmd):
                            # 添加 ffmpeg 可执行文件
                            if i == ffmpeg_index:
                                new_cmd.append(cmd[i])  # 添加 ffmpeg
                                i += 1
                                # 不 continue，继续处理后续参数（包括 ffmpeg 之后的全局选项）
                            
                            # 在第一个 -i 之前插入全局时间戳修复参数（如果还没有添加）
                            if not global_timestamp_fix_added and first_input_index > 0 and i == first_input_index:
                                # 如果不存在这些参数，则添加
                                if not has_fflags and not has_avoid_negative_ts:
                                    new_cmd.append('-fflags')
                                    new_cmd.append('+genpts')
                                    new_cmd.append('-avoid_negative_ts')
                                    new_cmd.append('make_zero')
                                    print(f"[Enhanced] 已在第一个输入之前添加全局时间戳修复参数: -fflags +genpts -avoid_negative_ts make_zero", flush=True)
                                global_timestamp_fix_added = True
                            # 如果背景视频需要循环或统一帧率，在背景视频输入之前添加相应参数
                            if background_video_path and not stream_loop_added and i < len(cmd) - 1:
                                if str(cmd[i]) == '-i':
                                    # 检查下一个参数是否是背景视频路径
                                    next_arg = str(cmd[i+1]) if i+1 < len(cmd) else ''
                                    if background_video_path in next_arg or os.path.basename(background_video_path) in next_arg:
                                        # 如果需要循环，添加 -stream_loop -1
                                        if need_loop_background:
                                            new_cmd.append('-stream_loop')
                                            new_cmd.append('-1')
                                            print(f"[Enhanced] 已添加 -stream_loop -1 参数，确保背景视频循环播放", flush=True)
                                        
                                        # 如果需要统一帧率，添加 -r 30 -vsync cfr（转换为固定帧率）
                                        if need_unify_fps:
                                            new_cmd.append('-r')
                                            new_cmd.append('30')
                                            new_cmd.append('-vsync')
                                            new_cmd.append('cfr')
                                            print(f"[Enhanced] 已添加 -r 30 -vsync cfr 参数，统一背景视频帧率为30fps", flush=True)
                                        
                                        stream_loop_added = True
                            
                            # 在 -c:v libx264 之后添加编码优化参数
                            if not keyframe_params_added and i < len(cmd) - 1:
                                if str(cmd[i]) == '-c:v' and str(cmd[i+1]) == 'libx264':
                                    new_cmd.append(cmd[i])      # -c:v
                                    new_cmd.append(cmd[i+1])   # libx264
                                    # 添加编码优化参数（移除B帧，优化GOP，解决卡顿问题）
                                    new_cmd.extend([
                                        '-r', '30',                    # 明确设置帧率为30fps
                                        '-g', '30',                    # GOP size: 每30帧一个关键帧（1秒，避免与force_key_frames冲突）
                                        '-keyint_min', '30',           # 最小关键帧间隔
                                        '-sc_threshold', '0',          # 场景切换时自动插入关键帧
                                        '-pix_fmt', 'yuv420p',        # 像素格式，确保兼容性
                                        '-profile:v', 'high',          # 高质量编码配置
                                        '-level', '3.1',               # 编码级别（降低到3.1以提高兼容性）
                                        '-maxrate', '8M',              # 最大码率限制（放宽以提高质量）
                                        '-bufsize', '16M',             # 缓冲区大小（增加以匹配码率）
                                        '-bf', '0',                    # 移除B帧，提高兼容性，减少解码延迟
                                        '-refs', '2',                  # 减少参考帧数，提高兼容性
                                        '-vsync', 'cfr',               # 输出端统一帧率，确保时间戳连续
                                        '-movflags', '+faststart',     # 快速启动优化
                                        '-preset', 'fast',             # 编码预设（fast提升速度）
                                        '-crf', '23'                   # 恒定质量因子
                                    ])
                                    keyframe_params_added = True
                                    i += 2
                                    continue
                            
                            new_cmd.append(cmd[i])
                            i += 1
                        
                        # 统一使用 -t 参数精确控制视频时长
                        if not duration_added:
                            # 找到输出文件（通常是最后一个参数，排除 -y）
                            output_index = -1
                            for j in range(len(new_cmd) - 1, -1, -1):
                                if new_cmd[j] != '-y' and not new_cmd[j].startswith('-'):
                                    output_index = j
                                    break
                            
                            if output_index >= 0:
                                # 优化关键帧策略：只在循环边界插入关键帧，避免关键帧过于密集
                                keyframe_times = []
                                
                                # 如果需要循环背景视频，在循环边界前0.1秒插入关键帧
                                if need_loop_background and bg_duration:
                                    loop_count = int(calculated_duration / bg_duration) + 1
                                    for k in range(1, loop_count + 1):
                                        time_point = bg_duration * k - 0.1  # 在循环边界前0.1秒
                                        if time_point > 0.1 and time_point < calculated_duration:
                                            keyframe_times.append(f"{time_point:.2f}")
                                    
                                    print(f"[Enhanced] 在循环边界插入关键帧: 共{len(keyframe_times)}个时间点", flush=True)
                                
                                # 如果有需要插入的关键帧，添加 -force_key_frames 参数
                                if keyframe_times:
                                    unique_times = sorted(set(keyframe_times), key=float)
                                    force_key_frames = ','.join(unique_times)
                                    new_cmd.insert(output_index, force_key_frames)
                                    new_cmd.insert(output_index, '-force_key_frames')
                                    print(f"[Enhanced] 已添加 -force_key_frames 参数: {force_key_frames}", flush=True)
                                
                                # 插入 -t 参数
                                new_cmd.insert(output_index, str(calculated_duration))
                                new_cmd.insert(output_index, '-t')
                                duration_added = True
                                print(f"[Enhanced] 已添加 -t {calculated_duration} 参数，精确控制视频时长为 {calculated_duration} 秒", flush=True)
                        
                        if keyframe_params_added:
                            print(f"[Enhanced] 已添加编码优化参数", flush=True)
                        
                        # 记录完整的修改后的命令（用于调试）
                        if isinstance(cmd, list) and len(new_cmd) > 0:
                            cmd_str_debug = ' '.join(str(c) for c in new_cmd[:20])  # 只显示前20个参数，避免日志过长
                            if len(new_cmd) > 20:
                                cmd_str_debug += f" ... (共{len(new_cmd)}个参数)"
                            print(f"[Enhanced] 修改后的FFmpeg命令（前20个参数）: {cmd_str_debug}", flush=True)
                        
                        cmd = new_cmd
                
                # 添加超时设置（10分钟）和错误处理
                if 'ffmpeg' in str(cmd).lower():
                    if 'timeout' not in kwargs:
                        kwargs['timeout'] = 600  # 10分钟超时
                    if 'check' not in kwargs:
                        kwargs['check'] = False
                    
                    # 记录即将执行的命令（用于调试）
                    try:
                        cmd_str_full = ' '.join(str(c) for c in cmd) if isinstance(cmd, list) else str(cmd)
                        print(f"[FFmpeg] 准备执行命令（完整）: {cmd_str_full[:500]}", flush=True)  # 限制长度避免日志过长
                    except Exception as e:
                        print(f"[FFmpeg] 无法记录命令: {e}", flush=True)
                
                try:
                    result = original_run(cmd, *args, **kwargs)
                except subprocess.TimeoutExpired as e:
                    error_msg = f"FFmpeg 命令执行超时（超过 {kwargs.get('timeout', 600)} 秒）"
                    print(f"[Error] {error_msg}", flush=True)
                    print(f"[Error] 超时的命令: {' '.join(str(c) for c in cmd[:10])}...", flush=True)
                    raise
                except FileNotFoundError as e:
                    error_msg = f"FFmpeg 可执行文件未找到: {e}"
                    print(f"[Error] {error_msg}", flush=True)
                    print(f"[Error] 命令: {' '.join(str(c) for c in cmd[:10])}...", flush=True)
                    raise
                except Exception as e:
                    error_msg = f"FFmpeg 命令执行异常: {type(e).__name__}: {str(e)}"
                    print(f"[Error] {error_msg}", flush=True)
                    print(f"[Error] 命令: {' '.join(str(c) for c in cmd[:10])}...", flush=True)
                    raise
                
                # 检查 FFmpeg 返回码
                if 'ffmpeg' in str(cmd).lower() and result.returncode != 0:
                    error_msg = f"FFmpeg 命令执行失败，返回码: {result.returncode}"
                    if hasattr(result, 'stderr') and result.stderr:
                        try:
                            if isinstance(result.stderr, bytes):
                                stderr_text = result.stderr.decode('utf-8', errors='ignore')
                            else:
                                stderr_text = str(result.stderr)
                            # 提取关键错误信息（限制长度）
                            error_lines = stderr_text.split('\n')
                            key_errors = [line for line in error_lines if any(keyword in line.lower() for keyword in ['error', 'failed', 'invalid', 'unknown'])]
                            if key_errors:
                                error_msg += f"\n关键错误信息: {' | '.join(key_errors[:5])}"  # 最多显示5个关键错误
                            else:
                                error_msg += f"\n错误信息: {stderr_text[:500]}"
                        except Exception as e:
                            error_msg += f"\n无法解析错误信息: {e}"
                    
                    # 记录完整的命令和错误信息
                    print(f"[Error] {error_msg}", flush=True)
                    try:
                        cmd_str_error = ' '.join(str(c) for c in cmd) if isinstance(cmd, list) else str(cmd)
                        print(f"[Error] 失败的完整命令: {cmd_str_error[:1000]}", flush=True)  # 限制长度
                    except:
                        pass
                    
                    raise subprocess.CalledProcessError(result.returncode, cmd, 
                                                       getattr(result, 'stdout', None), 
                                                       getattr(result, 'stderr', None))
                
                return result
            
            # 临时替换 subprocess.run（仅在这个方法调用期间）
            import subprocess as sp_module
            original_subprocess_run = sp_module.run
            sp_module.run = enhanced_run
            
            try:
                # 调用原始的 create_video 方法
                result = original_create_video(variable_images, fixed_images, video_name, duration,
                                              music_path, background_path, blur_background, background_video_path)
                return result
            finally:
                # 恢复原始的 subprocess.run
                sp_module.run = original_subprocess_run
        
        # 替换 create_video 方法
        self.generator.create_video = enhanced_create_video
    
    def check_ffmpeg(self):
        """检查FFmpeg是否安装"""
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def get_images(self, folder_type):
        """获取指定文件夹的图片列表"""
        folder = self.user_folders['fixed'] if folder_type == 'fixed' else self.user_folders['variable']
        images = []
        if os.path.exists(folder):
            for file in os.listdir(folder):
                if allowed_file(file):
                    images.append(file)
        return sorted(images)
    
    def generate_rotation_mode_videos(self, variable_images, fixed_images, duration, music_path=None, background_path=None, blur_background=False, background_video_path=None):
        """新功能：生成轮播视频模式
        规则：每3个可变部分图片 + 固定部分全部，生成一个视频
        例如：10个可变 + 15个固定 = 3+15, 3+15, 3+15, 1+15 (4个视频)
        """
        print(f"[Rotation Mode] 开始生成轮播模式视频")
        print(f"[Rotation Mode] 可变图片总数: {len(variable_images)}, 固定图片总数: {len(fixed_images)}")
        print(f"[Rotation Mode] 可变图片列表: {variable_images}")
        
        # 固定部分全部
        fixed_all = fixed_images
        
        # 将可变部分按顺序每3个一组分组（不重复使用）
        videos_to_generate = []
        
        # 按顺序分组：每3个可变图片为一组，与全部固定图片组合生成一个视频
        # 例如：10个可变图片 [0,1,2,3,4,5,6,7,8,9] -> [0,1,2], [3,4,5], [6,7,8], [9]
        for i in range(0, len(variable_images), 3):
            var_group = variable_images[i:i+3]  # 取连续的3个（最后一组可能少于3个）
            group_index = len(videos_to_generate) + 1
            videos_to_generate.append({
                'variable': var_group,
                'fixed': fixed_all,
                'group_index': group_index
            })
            print(f"[Rotation Mode] 第 {group_index} 组: 可变部分 {var_group} ({len(var_group)}张) + 固定部分 ({len(fixed_all)}张) = {len(var_group) + len(fixed_all)}张图片")
        
        print(f"[Rotation Mode] 将生成 {len(videos_to_generate)} 个视频")
        
        # 为每组生成视频
        results = []
        for idx, group in enumerate(videos_to_generate, 1):
            var_group = group['variable']
            fixed_group = group['fixed']
            group_index = group['group_index']
            
            # 生成视频名称（使用第一张可变图片的名称 + 组索引）
            if var_group:
                base_name = var_group[0].split('.')[0]
                video_name = f"rotation_{base_name}_g{group_index}"
            else:
                video_name = f"rotation_video_{group_index}"
            
            print(f"[Rotation Mode] 生成第 {idx} 个视频: {video_name}")
            print(f"[Rotation Mode] 可变部分: {var_group} ({len(var_group)}张)")
            print(f"[Rotation Mode] 固定部分: {fixed_group} ({len(fixed_group)}张)")
            print(f"[Rotation Mode] 总图片数: {len(var_group) + len(fixed_group)}张")
            
            # 调用create_video生成视频
            success = self.generator.create_video(
                var_group, 
                fixed_group, 
                video_name, 
                duration, 
                music_path, 
                background_path, 
                blur_background, 
                background_video_path
            )
            
            print(f"[Rotation Mode] 视频 {video_name} 生成结果: {success}")
            if success:
                sequence = var_group + fixed_group
                results.append({
                    "video_name": f"{video_name}.mp4",
                    "sequence": sequence,
                    "duration": len(sequence) * duration
                })
        
        print(f"[Rotation Mode] 轮播模式视频生成完成，共生成 {len(results)} 个视频")
        return results
    
    def generate_videos(self, duration=0.7, music_file=None, background_file=None, blur_background=False, background_video_file=None, rotation_mode=False):
        """生成视频"""
        try:
            # 获取图片列表
            fixed_images = self.get_images('fixed')
            variable_images = self.get_images('variable')
            
            print(f"开始生成视频 - 固定图片: {len(fixed_images)}, 可变图片: {len(variable_images)}")
            print(f"固定图片: {fixed_images}")
            print(f"可变图片: {variable_images}")

            if not variable_images:
                print("没有可变图片，无法生成视频")
                return {"success": False, "message": "可变部分没有图片"}
            
            # 轮播模式需要至少3个可变图片
            if rotation_mode and len(variable_images) < 3:
                print(f"轮播模式需要至少3个可变图片，当前只有 {len(variable_images)} 个")
                return {"success": False, "message": "轮播视频模式需要至少3个可变部分图片"}
            
            # 获取背景音乐文件路径
            music_path = None
            if music_file:
                music_path = os.path.join(self.user_folders['music'], music_file)
                print(f"[Music] 查找音乐文件: {music_path}", flush=True)
                print(f"[Music] Session ID: {self.session_id}", flush=True)
                print(f"[Music] 音乐文件夹: {self.user_folders['music']}", flush=True)
                
                # 检查文件夹是否存在
                if not os.path.exists(self.user_folders['music']):
                    print(f"[Warn] 音乐文件夹不存在: {self.user_folders['music']}", flush=True)
                    music_path = None
                # 检查文件是否存在
                elif not os.path.exists(music_path):
                    print(f"[Warn] 音乐文件不存在: {music_path}", flush=True)
                    # 列出文件夹中的所有文件，帮助调试
                    if os.path.exists(self.user_folders['music']):
                        files_in_folder = os.listdir(self.user_folders['music'])
                        print(f"[Music] 音乐文件夹中的文件: {files_in_folder}", flush=True)
                    music_path = None
                else:
                    print(f"[OK] 找到音乐文件: {music_path}", flush=True)
                    # 验证文件大小
                    file_size = os.path.getsize(music_path)
                    print(f"[Music] 音乐文件大小: {file_size} 字节", flush=True)
            else:
                print(f"[Info] 未指定音乐文件", flush=True)
            
            # 获取背景图片文件路径
            background_path = None
            if background_file:
                candidate_path = os.path.join(self.user_folders['background'], background_file)
                if os.path.exists(candidate_path):
                    background_path = os.path.abspath(candidate_path)
                    print(f"[Background] 使用背景图片: {background_path}", flush=True)
                else:
                    print(f"[Background] 背景图片不存在: {candidate_path}", flush=True)
                    background_path = None
            
            # 获取背景视频文件路径
            background_video_path = None
            if background_video_file:
                candidate_video_path = os.path.join(self.user_folders['background'], background_video_file)
                if os.path.exists(candidate_video_path):
                    background_video_path = os.path.abspath(candidate_video_path)
                    print(f"[Background] 使用背景视频: {background_video_path}", flush=True)
                else:
                    print(f"[Background] 背景视频不存在: {candidate_video_path}", flush=True)
                    background_video_path = None
            
            # 根据模式选择生成逻辑
            print(f"[Mode] rotation_mode 判断: 值={rotation_mode}, 类型={type(rotation_mode).__name__}, bool转换={bool(rotation_mode)}", flush=True)
            if rotation_mode:
                # 新功能：轮播视频模式
                print(f"[Mode] ✅ 使用轮播视频模式生成 (rotation_mode=True)", flush=True)
                results = self.generate_rotation_mode_videos(
                    variable_images, 
                    fixed_images, 
                    duration, 
                    music_path, 
                    background_path, 
                    blur_background, 
                    background_video_path
                )
            else:
                # 原有逻辑：生成轮换视频
                print(f"[Mode] ❌ 使用原有模式生成 (rotation_mode=False) - 将为每个可变图片生成一个视频", flush=True)
                video_sequences = self.generator.generate_rotation_videos(variable_images, fixed_images)
                print(f"生成了 {len(video_sequences)} 个视频序列")
                
                results = []
                for i, sequence in enumerate(video_sequences, 1):
                    # 分离可变部分和固定部分
                    var_part = [img for img in sequence if img in variable_images]
                    fixed_part = [img for img in sequence if img in fixed_images]
                    
                    # 直接使用可变部分的图片名称作为视频文件名（去掉扩展名）
                    if var_part:
                        # 使用可变部分的第一张图片名称（每个视频对应一个可变图片）
                        video_name = var_part[0].split('.')[0]
                    else:
                        # 如果没有可变部分（只有固定部分），使用序列第一张图片（兼容处理）
                        video_name = sequence[0].split('.')[0]
                    
                    print(f"处理第 {i} 个视频: {video_name}")
                    print(f"视频序列: {sequence}")
                    print(f"可变部分: {var_part}, 固定部分: {fixed_part}")
                    
                    # 调用create_video生成视频
                    if not fixed_images:
                        print(f"调用create_video: 序列={sequence}, 固定=[], 视频名={video_name}", flush=True)
                        print(f"[Music] 传递给 create_video 的音乐路径: {music_path}", flush=True)
                        success = self.generator.create_video(sequence, [], video_name, duration, music_path, background_path, blur_background, background_video_path)
                    else:
                        print(f"调用create_video: 可变={var_part}, 固定={fixed_part}, 视频名={video_name}", flush=True)
                        print(f"[Music] 传递给 create_video 的音乐路径: {music_path}", flush=True)
                        success = self.generator.create_video(var_part, fixed_part, video_name, duration, music_path, background_path, blur_background, background_video_path)
                    
                    print(f"视频生成结果: {success}")
                    if success:
                        results.append({
                            "video_name": f"{video_name}.mp4",
                            "sequence": sequence,
                            "duration": len(sequence) * duration
                        })
            
            # 如果成功生成视频，清空用户的上传文件夹（保留output文件夹）
            if results:
                self.clear_user_upload_folders()
            
            return {"success": True, "videos": results}
        except subprocess.CalledProcessError as e:
            import traceback
            error_msg = f"视频生成失败: FFmpeg 命令执行错误（返回码: {e.returncode}）"
            if e.stderr:
                try:
                    if isinstance(e.stderr, bytes):
                        stderr_text = e.stderr.decode('utf-8', errors='ignore')
                    else:
                        stderr_text = str(e.stderr)
                    # 提取关键错误信息
                    error_lines = stderr_text.split('\n')
                    key_errors = [line for line in error_lines if any(keyword in line.lower() for keyword in ['error', 'failed', 'invalid', 'unknown'])]
                    if key_errors:
                        error_msg += f"\n关键错误: {' | '.join(key_errors[:3])}"
                except:
                    pass
            print(f"[Error] {error_msg}", flush=True)
            print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
            return {"success": False, "message": error_msg, "error": str(e)}
        except Exception as e:
            import traceback
            error_msg = f"视频生成失败: {type(e).__name__}: {str(e)}"
            print(f"[Error] {error_msg}", flush=True)
            print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
            return {"success": False, "message": error_msg, "error": str(e)}
    
    def clear_user_upload_folders(self):
        """清空用户的上传文件夹（保留output文件夹和文件夹本身）"""
        try:
            import shutil
            
            # 清空上传文件夹（只删除文件，保留文件夹）
            upload_folders = ['fixed', 'variable', 'music', 'background']
            for folder_name in upload_folders:
                folder_path = self.user_folders[folder_name]
                if os.path.exists(folder_path):
                    try:
                        # 删除文件夹中的所有文件
                        files_deleted = 0
                        for filename in os.listdir(folder_path):
                            file_path = os.path.join(folder_path, filename)
                            try:
                                if os.path.isfile(file_path):
                                    os.remove(file_path)
                                    files_deleted += 1
                            except Exception as e:
                                print(f"[Warn] 删除文件失败 {file_path}: {e}", flush=True)
                        print(f"[OK] 已清空用户文件夹：{folder_path} (删除了 {files_deleted} 个文件)", flush=True)
                    except Exception as e:
                        print(f"[Warn] 清空文件夹失败 {folder_path}: {e}", flush=True)
                else:
                    # 如果文件夹不存在，创建它（确保后续请求不会失败）
                    try:
                        os.makedirs(folder_path, exist_ok=True)
                        print(f"[Path] 文件夹不存在，已创建: {folder_path}", flush=True)
                    except Exception as e:
                        print(f"[Warn] 无法创建文件夹 {folder_path}: {e}", flush=True)
            
            print(f"[OK] 用户上传文件夹已清空，保留视频输出文件夹：{self.user_folders['output']}", flush=True)
            
        except Exception as e:
            print(f"[Warn] 清空用户文件夹失败：{e}", flush=True)
            import traceback
            print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)

# 创建Web视频生成器实例（延迟初始化）
def get_web_generator():
    """获取Web视频生成器实例，每个用户独立实例"""
    try:
        session_id = get_user_session_id()
        return WebVideoGenerator(session_id)
    except Exception as e:
        print(f"初始化WebVideoGenerator失败: {e}")
        return None

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/api/check-ffmpeg')
def check_ffmpeg():
    """检查FFmpeg状态"""
    try:
        generator = get_web_generator()
        if generator is None:
            return jsonify({"installed": False, "error": "初始化失败"})
        return jsonify({"installed": generator.check_ffmpeg()})
    except Exception as e:
        print(f"检查FFmpeg状态失败: {e}", flush=True)
        import traceback
        print(f"异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"installed": False, "error": f"检查失败: {str(e)}"}), 200

@app.route('/api/images/<folder_type>')
def get_images(folder_type):
    """获取图片列表"""
    if folder_type not in ['fixed', 'variable']:
        return jsonify({"error": "Invalid folder type"}), 400
    
    generator = get_web_generator()
    if generator is None:
        return jsonify({"error": "初始化失败", "images": []}), 200
    
    images = generator.get_images(folder_type)
    return jsonify({"images": images})

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """上传图片文件"""
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    folder_type = request.form.get('folder_type', 'variable')
    
    if folder_type not in ['fixed', 'variable']:
        return jsonify({"error": "Invalid folder type"}), 400
    
    # 获取用户专属文件夹
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    folder = user_folders['fixed'] if folder_type == 'fixed' else user_folders['variable']
    
    print(f"用户 {session_id[:8]} 上传到 {folder_type} 文件夹: {folder}")
    
    uploaded_files = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # 添加时间戳避免重名
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            filepath = os.path.join(folder, filename)
            file.save(filepath)
            uploaded_files.append(filename)
    
    return jsonify({"uploaded": uploaded_files})

@app.route('/api/upload-music', methods=['POST'])
def upload_music():
    """上传背景音乐文件"""
    try:
        print(f"\n{'='*60}")
        print(f"[Music] 收到背景音乐上传请求")
        print(f"{'='*60}", flush=True)
        
        if 'music' not in request.files:
            print(f"[Error] 请求中没有音乐文件", flush=True)
            return jsonify({"success": False, "message": "没有选择音乐文件"})
        
        file = request.files['music']
        if file and allowed_music_file(file.filename):
            filename = secure_filename(file.filename)
            # 添加时间戳避免重名
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            # 获取用户专属文件夹
            session_id = get_user_session_id()
            print(f"[Session] 上传音乐时的 Session ID: {session_id}", flush=True)
            user_folders = ensure_user_folders(session_id)
            file_path = os.path.join(user_folders['music'], filename)
            
            print(f"[Path] 保存路径: {file_path}", flush=True)
            print(f"[Path] 音乐文件夹: {user_folders['music']}", flush=True)
            
            # 确保文件夹存在
            os.makedirs(user_folders['music'], exist_ok=True)
            
            file.save(file_path)
            
            # 验证文件是否保存成功
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"[OK] 音乐文件上传成功: {filename} ({file_size} 字节)", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": True, "filename": filename})
            else:
                print(f"[Error] 文件保存失败: {file_path}", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": False, "message": "文件保存失败"})
        else:
            print(f"[Error] 不支持的音乐文件格式: {file.filename if file else 'None'}", flush=True)
            print(f"{'='*60}\n", flush=True)
            return jsonify({"success": False, "message": "不支持的音乐文件格式"})
    except Exception as e:
        import traceback
        print(f"[Error] 上传音乐异常: {str(e)}", flush=True)
        print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"success": False, "message": f"上传失败: {str(e)}"}), 500

@app.route('/api/music')
def get_music():
    """获取背景音乐文件列表"""
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    music_files = []
    if os.path.exists(user_folders['music']):
        for file in os.listdir(user_folders['music']):
            if allowed_music_file(file):
                music_files.append(file)
    return jsonify({"music": music_files})

@app.route('/api/upload-background', methods=['POST'])
def upload_background():
    """上传背景图片文件"""
    try:
        print(f"\n{'='*60}")
        print(f"[BackgroundImage] 收到背景图片上传请求", flush=True)
        print(f"{'='*60}", flush=True)

        if 'background' not in request.files:
            print(f"[Error] 请求中没有背景图片文件", flush=True)
            return jsonify({"success": False, "message": "没有选择背景图片"})
        
        file = request.files['background']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"

            session_id = get_user_session_id()
            print(f"[Session] 背景图片上传 Session ID: {session_id}", flush=True)
            user_folders = ensure_user_folders(session_id)
            background_folder = user_folders['background']
            os.makedirs(background_folder, exist_ok=True)

            file_path = os.path.join(background_folder, filename)
            abs_path = os.path.abspath(file_path)
            print(f"[Path] 目标文件夹: {background_folder}", flush=True)
            print(f"[Path] 保存路径: {abs_path}", flush=True)

            file.save(file_path)

            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                print(f"[OK] 背景图片上传成功: {filename} ({size} 字节)", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": True, "filename": filename, "path": abs_path})
            else:
                print(f"[Error] 背景图片保存失败: {abs_path}", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": False, "message": "文件保存失败"})
        
        print(f"[Error] 不支持的背景图片格式: {file.filename if file else 'None'}", flush=True)
        print(f"{'='*60}\n", flush=True)
        return jsonify({"success": False, "message": "不支持的图片文件格式"})
    except Exception as e:
        import traceback
        print(f"[Error] 背景图片上传异常: {str(e)}", flush=True)
        print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"success": False, "message": f"上传失败: {str(e)}"}), 500

@app.route('/api/background')
def get_background():
    """获取背景图片文件列表"""
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    background_files = []
    if os.path.exists(user_folders['background']):
        for file in os.listdir(user_folders['background']):
            if allowed_file(file):
                background_files.append(file)
    return jsonify({"background": background_files})

@app.route('/api/upload-background-video', methods=['POST'])
def upload_background_video():
    """上传背景视频文件"""
    try:
        print(f"\n{'='*60}")
        print(f"[BackgroundVideo] 收到背景视频上传请求", flush=True)
        print(f"{'='*60}", flush=True)

        if 'background_video' not in request.files:
            print(f"[Error] 请求中没有背景视频文件", flush=True)
            return jsonify({"success": False, "message": "没有选择背景视频"})
        
        file = request.files['background_video']
        if file and allowed_video_file(file.filename):
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"

            session_id = get_user_session_id()
            print(f"[Session] 背景视频上传 Session ID: {session_id}", flush=True)
            user_folders = ensure_user_folders(session_id)
            background_folder = user_folders['background']
            os.makedirs(background_folder, exist_ok=True)

            file_path = os.path.join(background_folder, filename)
            abs_path = os.path.abspath(file_path)
            print(f"[Path] 目标文件夹: {background_folder}", flush=True)
            print(f"[Path] 保存路径: {abs_path}", flush=True)

            file.save(file_path)

            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                print(f"[OK] 背景视频上传成功: {filename} ({size} 字节)", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": True, "filename": filename, "path": abs_path})
            else:
                print(f"[Error] 背景视频保存失败: {abs_path}", flush=True)
                print(f"{'='*60}\n", flush=True)
                return jsonify({"success": False, "message": "文件保存失败"})
        
        print(f"[Error] 不支持的背景视频格式: {file.filename if file else 'None'}", flush=True)
        print(f"{'='*60}\n", flush=True)
        return jsonify({"success": False, "message": "不支持的视频文件格式"})
    except Exception as e:
        import traceback
        print(f"[Error] 背景视频上传异常: {str(e)}", flush=True)
        print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"success": False, "message": f"上传失败: {str(e)}"}), 500

@app.route('/api/background-video')
def get_background_video():
    """获取背景视频文件列表"""
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    background_video_files = []
    if os.path.exists(user_folders['background']):
        for file in os.listdir(user_folders['background']):
            if allowed_video_file(file):
                background_video_files.append(file)
    return jsonify({"background_video": background_video_files})

@app.route('/uploads/<folder_type>/<path:filename>')
def serve_uploaded_file(folder_type, filename):
    """提供上传的文件服务"""
    if folder_type not in ['fixed', 'variable', 'background', 'music']:
        return jsonify({"error": "Invalid folder type"}), 400
    
    # 获取用户专属文件夹
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    folder = user_folders[folder_type]
    
    # 使用path转换器确保文件名中的特殊字符（如空格、中文等）被正确处理
    # Flask会自动解码URL编码的文件名
    filepath = os.path.join(folder, filename)
    
    print(f"[ServeFile] 提供文件服务: folder_type={folder_type}, filename={filename}")
    print(f"[ServeFile] 文件路径: {filepath}")
    print(f"[ServeFile] 文件是否存在: {os.path.exists(filepath)}")
    
    if os.path.exists(filepath):
        try:
            return send_file(filepath)
        except FileNotFoundError:
            print(f"[Warn] send_file 时文件缺失: {filepath}")
        except Exception as err:
            print(f"[Warn] 发送文件失败 {filepath}: {err}")
            return jsonify({"error": "Failed to send file", "details": str(err)}), 500
    else:
        print(f"[Error] 文件不存在: {filepath}")
        # 列出文件夹中的所有文件，帮助调试
        if os.path.exists(folder):
            files = os.listdir(folder)
            print(f"[Path] 文件夹中的文件列表: {files}")
        return jsonify({"error": "File not found", "requested": filename, "folder": folder}), 404
    
    # 如果在 send_file 过程中文件被删除，返回404
    return jsonify({"error": "File not found during send", "requested": filename, "folder": folder}), 404

@app.route('/api/delete-image', methods=['POST'])
def delete_image():
    """删除图片"""
    data = request.get_json()
    filename = data.get('filename')
    folder_type = data.get('folder_type')
    
    if not filename or folder_type not in ['fixed', 'variable']:
        return jsonify({"error": "Invalid parameters"}), 400
    
    # 获取用户专属文件夹
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    folder = user_folders['fixed'] if folder_type == 'fixed' else user_folders['variable']
    filepath = os.path.join(folder, filename)
    
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({"success": True})
    else:
        return jsonify({"error": "File not found"}), 404

@app.route('/api/process/stitch', methods=['POST'])
def stitch_images():
    """
    图片拼接接口
    支持动态尺寸拼接：根据传入的尺寸参数动态创建画布和拼接图片
    如果未提供尺寸参数，使用默认值：左侧大图(800x800)，右上小图(400x400)，右下小图(400x400)
    画布尺寸根据三个区域的尺寸动态计算
    """
    try:
        print(f"\n{'='*60}")
        print(f"[Stitch] 收到图片拼接请求")
        print(f"{'='*60}", flush=True)
        
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "请求数据不能为空"}), 400
        
        # 调试：输出完整的请求数据（用于排查问题）
        print(f"[Stitch] 接收到的完整请求数据键: {list(data.keys())}", flush=True)
        if 'leftSize' in data:
            print(f"[Stitch] ✅ leftSize 存在: {data['leftSize']}", flush=True)
        else:
            print(f"[Stitch] ⚠️ leftSize 不存在！", flush=True)
        if 'topRightSize' in data:
            print(f"[Stitch] ✅ topRightSize 存在: {data['topRightSize']}", flush=True)
        else:
            print(f"[Stitch] ⚠️ topRightSize 不存在！", flush=True)
        if 'bottomRightSize' in data:
            print(f"[Stitch] ✅ bottomRightSize 存在: {data['bottomRightSize']}", flush=True)
        else:
            print(f"[Stitch] ⚠️ bottomRightSize 不存在！", flush=True)
        
        # 获取三个图片路径（相对路径，如 /temp/xxx.jpg）
        left_path = data.get('left')
        top_right_path = data.get('topRight')
        bottom_right_path = data.get('bottomRight')
        
        if not left_path or not top_right_path or not bottom_right_path:
            return jsonify({
                "success": False,
                "error": "缺少图片路径参数（需要 left, topRight, bottomRight）"
            }), 400
        
        # 获取尺寸参数（支持动态尺寸，向后兼容：如果未提供则使用默认值）
        # 默认尺寸：左侧 800x800，右上 400x400，右下 400x400
        DEFAULT_LEFT_SIZE = {'width': 800, 'height': 800}
        DEFAULT_TOP_RIGHT_SIZE = {'width': 400, 'height': 400}
        DEFAULT_BOTTOM_RIGHT_SIZE = {'width': 400, 'height': 400}
        
        # 从请求中获取尺寸参数，如果未提供则使用默认值
        left_size = data.get('leftSize', DEFAULT_LEFT_SIZE)
        top_right_size = data.get('topRightSize', DEFAULT_TOP_RIGHT_SIZE)
        bottom_right_size = data.get('bottomRightSize', DEFAULT_BOTTOM_RIGHT_SIZE)
        
        # 确保尺寸参数是字典格式，并提取宽高值
        # 如果传入的是对象，直接使用；如果是其他格式，尝试转换
        if isinstance(left_size, dict):
            left_width = int(left_size.get('width', DEFAULT_LEFT_SIZE['width']))
            left_height = int(left_size.get('height', DEFAULT_LEFT_SIZE['height']))
        else:
            left_width = DEFAULT_LEFT_SIZE['width']
            left_height = DEFAULT_LEFT_SIZE['height']
        
        if isinstance(top_right_size, dict):
            top_right_width = int(top_right_size.get('width', DEFAULT_TOP_RIGHT_SIZE['width']))
            top_right_height = int(top_right_size.get('height', DEFAULT_TOP_RIGHT_SIZE['height']))
        else:
            top_right_width = DEFAULT_TOP_RIGHT_SIZE['width']
            top_right_height = DEFAULT_TOP_RIGHT_SIZE['height']
        
        if isinstance(bottom_right_size, dict):
            bottom_right_width = int(bottom_right_size.get('width', DEFAULT_BOTTOM_RIGHT_SIZE['width']))
            bottom_right_height = int(bottom_right_size.get('height', DEFAULT_BOTTOM_RIGHT_SIZE['height']))
        else:
            bottom_right_width = DEFAULT_BOTTOM_RIGHT_SIZE['width']
            bottom_right_height = DEFAULT_BOTTOM_RIGHT_SIZE['height']
        
        # 尺寸验证：确保尺寸在合理范围内（200-1200px）
        # 与前端保持一致的限制
        def clamp_size(value, min_val=200, max_val=1200):
            """限制尺寸在合理范围内"""
            return max(min_val, min(max_val, value))
        
        left_width = clamp_size(left_width)
        left_height = clamp_size(left_height)
        top_right_width = clamp_size(top_right_width)
        top_right_height = clamp_size(top_right_height)
        bottom_right_width = clamp_size(bottom_right_width)
        bottom_right_height = clamp_size(bottom_right_height)
        
        # 动态计算画布尺寸（1:1正方形）
        # 画布宽度 = 左侧宽度 + 右上宽度
        # 画布高度 = max(左侧高度, 右上高度 + 右下高度)
        # 前端已经调整好尺寸，确保画布是正方形（1:1比例）
        canvas_width = left_width + top_right_width
        canvas_height = max(
            left_height,
            top_right_height + bottom_right_height
        )
        
        # 验证画布是否为正方形（允许1像素误差，因为可能存在舍入）
        size_diff = abs(canvas_width - canvas_height)
        if size_diff <= 1:
            print(f"[Stitch] ✅ 画布尺寸验证通过: {canvas_width} × {canvas_height} (1:1正方形)", flush=True)
        else:
            # 如果差异较大，记录警告（但不强制调整，因为前端已经调整好了尺寸）
            # 如果差异很大，可能说明前端调整逻辑有问题
            print(f"[Stitch] ⚠️ 画布尺寸不是正方形: {canvas_width} × {canvas_height}", flush=True)
            print(f"[Stitch] 差异: {size_diff} 像素 (前端应该已经调整为1:1，请检查前端逻辑)", flush=True)
        
        print(f"[Stitch] 左侧图片: {left_path}")
        print(f"[Stitch] 右上图片: {top_right_path}")
        print(f"[Stitch] 右下图片: {bottom_right_path}")
        
        # 详细输出接收到的尺寸参数（用于调试）
        print(f"[Stitch] 接收到的尺寸参数（前端已调整为1:1）:")
        print(f"  - leftSize (原始): {data.get('leftSize', '未提供')}")
        print(f"  - topRightSize (原始): {data.get('topRightSize', '未提供')}")
        print(f"  - bottomRightSize (原始): {data.get('bottomRightSize', '未提供')}")
        print(f"[Stitch] 解析后的尺寸配置:")
        print(f"  - 左侧: {left_width} × {left_height} 像素")
        print(f"  - 右上: {top_right_width} × {top_right_height} 像素")
        print(f"  - 右下: {bottom_right_width} × {bottom_right_height} 像素")
        print(f"[Stitch] 计算出的画布尺寸: {canvas_width} × {canvas_height} 像素 (1:1正方形)", flush=True)
        
        # 获取用户 Session ID（用于用户隔离）
        session_id = get_user_session_id()
        print(f"[Stitch] 用户 Session ID: {session_id}", flush=True)
        
        # 构建完整的图片路径
        # 图片存储在 api-gateway/public/temp/{sessionId}/ 目录
        # PROJECT_ROOT 是 video-service 的父目录（ronghe-platform）
        # 所以 api-gateway/public/temp/{sessionId}/ 的路径是 PROJECT_ROOT/api-gateway/public/temp/{sessionId}/
        api_gateway_temp_dir = os.path.join(PROJECT_ROOT, 'api-gateway', 'public', 'temp', session_id)
        
        # 解析图片路径（支持两种格式）
        # 格式1：/temp/{sessionId}/filename.jpg（新格式，包含Session ID）
        # 格式2：/temp/filename.jpg（旧格式，兼容性处理）
        def parse_image_path(path):
            # 移除路径开头的 /temp/ 前缀
            if path.startswith('/temp/'):
                relative_path = path[6:]  # 移除 '/temp/'
            elif path.startswith('temp/'):
                relative_path = path[5:]  # 移除 'temp/'
            else:
                relative_path = path
            
            # 检查路径是否包含 Session ID（新格式）
            # 如果路径是 {sessionId}/filename.jpg，说明是新格式
            # 如果路径直接是 filename.jpg，说明是旧格式，需要添加 Session ID
            if '/' in relative_path:
                # 新格式：{sessionId}/filename.jpg
                # 验证第一个部分是否是 Session ID（可选，为了安全）
                return relative_path
            else:
                # 旧格式：filename.jpg
                # 为了兼容性，如果路径不包含 Session ID，使用当前 Session ID
                return os.path.join(session_id, relative_path)
        
        # 解析图片路径，提取文件名和Session ID
        # 路径格式：/temp/{sessionId}/filename.jpg 或 /temp/filename.jpg（兼容旧格式）
        def get_file_path(image_path):
            # 移除 /temp/ 前缀
            if image_path.startswith('/temp/'):
                relative = image_path[6:]  # 移除 '/temp/'
            elif image_path.startswith('temp/'):
                relative = image_path[5:]  # 移除 'temp/'
            else:
                relative = image_path
            
            # 检查路径是否包含 Session ID（新格式）
            # 如果路径是 {sessionId}/filename.jpg，提取 Session ID 和文件名
            # 如果路径直接是 filename.jpg，使用当前 Session ID
            if '/' in relative:
                # 新格式：{sessionId}/filename.jpg
                parts = relative.split('/')
                path_session_id = parts[0]  # 第一个部分是 Session ID
                filename = parts[-1]  # 最后一部分是文件名
                
                # 使用路径中的 Session ID 构建完整路径
                file_session_dir = os.path.join(PROJECT_ROOT, 'api-gateway', 'public', 'temp', path_session_id)
                return os.path.join(file_session_dir, filename)
            else:
                # 旧格式：filename.jpg（兼容性处理）
                # 使用当前 Session ID
                filename = relative
                return os.path.join(api_gateway_temp_dir, filename)
        
        left_file = get_file_path(left_path)
        top_right_file = get_file_path(top_right_path)
        bottom_right_file = get_file_path(bottom_right_path)
        
        print(f"[Stitch] 完整路径 - 左侧: {left_file}")
        print(f"[Stitch] 完整路径 - 右上: {top_right_file}")
        print(f"[Stitch] 完整路径 - 右下: {bottom_right_file}", flush=True)
        
        # 检查文件是否存在
        print(f"[Stitch] 检查文件是否存在...", flush=True)
        if not os.path.exists(left_file):
            print(f"[Stitch] ❌ 左侧图片不存在: {left_file}", flush=True)
            # 列出目录中的文件，帮助调试
            if os.path.exists(api_gateway_temp_dir):
                files = os.listdir(api_gateway_temp_dir)
                print(f"[Stitch] 目录中的文件: {files[:10]}", flush=True)  # 只显示前10个
            return jsonify({"success": False, "error": f"左侧图片不存在: {left_path}"}), 404
        if not os.path.exists(top_right_file):
            print(f"[Stitch] ❌ 右上图片不存在: {top_right_file}", flush=True)
            return jsonify({"success": False, "error": f"右上图片不存在: {top_right_path}"}), 404
        if not os.path.exists(bottom_right_file):
            print(f"[Stitch] ❌ 右下图片不存在: {bottom_right_file}", flush=True)
            return jsonify({"success": False, "error": f"右下图片不存在: {bottom_right_path}"}), 404
        print(f"[Stitch] ✅ 所有文件都存在", flush=True)
        
        # 打开图片
        print(f"[Stitch] 正在打开图片...", flush=True)
        img_left = Image.open(left_file)
        img_top_right = Image.open(top_right_file)
        img_bottom_right = Image.open(bottom_right_file)
        
        # 使用 ImageOps.fit 进行裁剪（保持比例，从中心裁剪）
        # 这与前端的 object-fit: cover 效果一致
        # 使用动态尺寸进行裁剪
        print(f"[Stitch] 正在裁剪图片...", flush=True)
        img_left_fit = ImageOps.fit(img_left, (left_width, left_height), centering=(0.5, 0.5))
        img_top_right_fit = ImageOps.fit(img_top_right, (top_right_width, top_right_height), centering=(0.5, 0.5))
        img_bottom_right_fit = ImageOps.fit(img_bottom_right, (bottom_right_width, bottom_right_height), centering=(0.5, 0.5))
        
        # 创建画布（使用动态计算的尺寸，白色背景）
        print(f"[Stitch] 正在创建画布...", flush=True)
        canvas = Image.new('RGB', (canvas_width, canvas_height), (255, 255, 255))
        
        # 拼接图片（使用动态计算的粘贴位置）
        # 左侧大图：位置 (0, 0)
        # 右上小图：位置 (left_width, 0) - 在左侧图片的右侧
        # 右下小图：位置 (left_width, top_right_height) - 在右上图片的下方
        print(f"[Stitch] 正在拼接图片...", flush=True)
        canvas.paste(img_left_fit, (0, 0))
        canvas.paste(img_top_right_fit, (left_width, 0))
        canvas.paste(img_bottom_right_fit, (left_width, top_right_height))
        
        # 保存拼接后的图片
        # 保存到 api-gateway/public/temp/{sessionId}/ 目录，文件名使用时间戳
        # 使用图片路径中的 Session ID（从第一个图片路径提取），确保与图片存储目录一致
        # 如果路径中包含 Session ID，使用路径中的；否则使用当前 Session ID
        if '/' in left_path.split('/temp/')[-1]:
            # 路径格式：/temp/{sessionId}/filename.jpg
            output_session_id = left_path.split('/temp/')[-1].split('/')[0]
        else:
            # 旧格式：/temp/filename.jpg，使用当前 Session ID
            output_session_id = session_id
        
        output_temp_dir = os.path.join(PROJECT_ROOT, 'api-gateway', 'public', 'temp', output_session_id)
        # 确保输出目录存在
        os.makedirs(output_temp_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # 精确到毫秒
        output_filename = f'stitched_{timestamp}.jpg'
        output_path = os.path.join(output_temp_dir, output_filename)
        
        print(f"[Stitch] 正在保存图片: {output_path}", flush=True)
        print(f"[Stitch] 输出目录: {output_temp_dir}", flush=True)
        canvas.save(output_path, 'JPEG', quality=95)
        
        # 构建返回的路径（相对路径，包含 Session ID，前端可以通过 /temp/{sessionId}/ 访问）
        # 使用与图片路径相同的 Session ID，确保一致性
        # 路径格式：/temp/{sessionId}/filename.jpg
        local_path = f'/temp/{output_session_id}/{output_filename}'
        public_url = f'http://localhost:18083{local_path}'
        
        print(f"[Stitch] 拼接完成: {output_filename}", flush=True)
        print(f"{'='*60}\n", flush=True)
        
        return jsonify({
            "success": True,
            "imageUrl": public_url,
            "localPath": local_path,
            "filename": output_filename
        })
        
    except Exception as e:
        print(f"[Stitch] 拼接失败: {e}", flush=True)
        import traceback
        print(f"[Stitch] 异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/generate', methods=['POST'])
def generate_videos():
    """生成视频"""
    try:
        print(f"\n{'='*60}")
        print(f"[Video] 收到视频生成请求")
        print(f"{'='*60}", flush=True)
        
        data = request.get_json()
        print(f"[Trace] 请求数据: {data}", flush=True)
        
        duration = float(data.get('duration', 0.7))
        music_file = data.get('music_file', None)
        background_file = data.get('background_file', None)
        blur_background = data.get('blur_background', False)
        background_video_file = data.get('background_video_file', None)
        
        # 处理 rotation_mode 参数，确保正确处理各种类型
        rotation_mode_raw = data.get('rotation_mode', False)
        if isinstance(rotation_mode_raw, str):
            # 处理字符串类型的 boolean 值
            rotation_mode = rotation_mode_raw.lower() in ('true', '1', 'yes', 'on')
        elif isinstance(rotation_mode_raw, bool):
            rotation_mode = rotation_mode_raw
        else:
            # 处理其他类型（int, None等）
            rotation_mode = bool(rotation_mode_raw) if rotation_mode_raw is not None else False
        
        print(f"[Duration] 时长: {duration}秒", flush=True)
        print(f"[Music] 音乐文件: {music_file}", flush=True)
        print(f"[Image] 背景图片: {background_file}", flush=True)
        print(f"[Option] 模糊背景: {blur_background}", flush=True)
        print(f"[Video] 背景视频: {background_video_file}", flush=True)
        print(f"[Mode] 轮播视频模式 (原始值: {rotation_mode_raw}, 类型: {type(rotation_mode_raw).__name__}, 转换后: {rotation_mode})", flush=True)
        
        # 获取当前请求的 Session ID
        current_session_id = get_user_session_id()
        print(f"[Session] 当前 Session ID: {current_session_id}", flush=True)
        
        # 使用当前 Session ID 创建生成器（确保使用正确的用户文件夹）
        generator = WebVideoGenerator(current_session_id)
        
        print(f"[Path] 用户文件夹 - 音乐: {generator.user_folders['music']}", flush=True)
        print(f"[Path] 用户文件夹 - 输出: {generator.user_folders['output']}", flush=True)
        
        print(f"[OK] 开始调用生成器...", flush=True)
        result = generator.generate_videos(duration, music_file, background_file, blur_background, background_video_file, rotation_mode)
        print(f"[Result] 生成结果: {result}", flush=True)
        print(f"{'='*60}\n", flush=True)
        
        if result.get("success") and result.get("videos"):
            batches = _store_video_batches(current_session_id, result["videos"], generator.user_folders['output'])
            result["batches"] = batches
        else:
            # 生成失败时清空历史批次，避免脏数据
            _reset_user_state(current_session_id)
        return jsonify(result)
    except Exception as e:
        import traceback
        error_msg = f"视频生成异常: {str(e)}"
        print(f"[Error] {error_msg}", flush=True)
        print(f"[Trace] 异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"success": False, "message": error_msg, "error": str(e)}), 500


@app.route('/api/video-batches', methods=['GET'])
def get_video_batches():
    """获取当前用户的视频批次列表"""
    session_id = get_user_session_id()
    batches = _get_user_batches(session_id)
    return jsonify({
        "success": True,
        "generation_id": batches.get("generation_id"),
        "updated_at": batches.get("updated_at"),
        "batches": batches.get("batches", [])
    })


@app.route('/api/video-batches/sync', methods=['POST'])
def sync_video_batch():
    """将指定批次的视频链接同步到广告投放页面草稿"""
    data = request.get_json() or {}
    batch_id = data.get("batch_id")
    if not batch_id:
        return jsonify({"success": False, "message": "batch_id 缺失"}), 400

    session_id = get_user_session_id()
    draft = _sync_batch_to_ad_draft(session_id, batch_id)
    if not draft:
        return jsonify({"success": False, "message": "批次不存在或已过期"}), 404

    return jsonify({
        "success": True,
        "batch_id": batch_id,
        "video_link_count": len(draft["video_links"]),
        "video_links": draft["video_links"],
        "synced_at": draft["synced_at"]
    })


@app.route('/api/ad-draft', methods=['GET'])
def get_ad_draft():
    """获取广告投放页面当前草稿（主要包含视频链接）"""
    session_id = get_user_session_id()
    draft = _get_ad_draft(session_id)
    return jsonify({
        "success": True,
        "video_links": draft["video_links"],
        "synced_batch_id": draft["synced_batch_id"],
        "synced_at": draft["synced_at"]
    })

@app.route('/api/download/<filename>')
def download_video(filename):
    """下载视频文件"""
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    filepath = os.path.join(user_folders['output'], filename)
    if os.path.exists(filepath):
        # 指定正确的MIME类型，确保浏览器/播放器能正确识别MP4文件
        return send_file(filepath, mimetype='video/mp4', as_attachment=True)
    else:
        return jsonify({"error": "File not found"}), 404

@app.route('/api/download-all-videos', methods=['GET', 'POST'])
def download_all_videos():
    """打包并下载所有生成的视频（支持GET和POST方法，保持兼容性）"""
    try:
        # 获取用户专属output目录中的所有视频文件
        session_id = get_user_session_id()
        user_folders = ensure_user_folders(session_id)
        video_files = []
        
        print(f"调试下载：用户会话ID={session_id}")
        print(f"调试下载：用户文件夹={user_folders}")
        print(f"调试下载：output文件夹存在={os.path.exists(user_folders['output'])}")
        
        if os.path.exists(user_folders['output']):
            all_files = os.listdir(user_folders['output'])
            print(f"调试下载：output文件夹中的所有文件={all_files}")
            for file in all_files:
                if file.lower().endswith('.mp4'):
                    video_files.append(file)
        
        print(f"调试下载：找到的视频文件={video_files}")
        
        if not video_files:
            return jsonify({"success": False, "message": "没有找到视频文件"}), 404
        
        # 创建内存中的zip文件
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for video_file in video_files:
                video_path = os.path.join(user_folders['output'], video_file)
                if os.path.exists(video_path):
                    zf.write(video_path, arcname=video_file)
        
        memory_file.seek(0)
        
        # 返回zip文件
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'generated_videos_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
        )
        
    except Exception as e:
        return jsonify({"success": False, "message": f"打包失败: {str(e)}"}), 500

@app.route('/api/videos')
def list_videos():
    """获取生成的视频列表"""
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    videos = []
    if os.path.exists(user_folders['output']):
        for file in os.listdir(user_folders['output']):
            if file.endswith('.mp4'):
                filepath = os.path.join(user_folders['output'], file)
                stat = os.stat(filepath)
                videos.append({
                    "filename": file,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
    
    return jsonify({"videos": videos})

@app.route('/api/delete-video', methods=['POST'])
def delete_video():
    """删除视频文件"""
    data = request.get_json()
    filename = data.get('filename')
    
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
    
    session_id = get_user_session_id()
    user_folders = ensure_user_folders(session_id)
    filepath = os.path.join(user_folders['output'], filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({"success": True})
    else:
        return jsonify({"error": "File not found"}), 404

@app.route('/api/clear-all', methods=['POST'])
def clear_all():
    """清空所有文件"""
    try:
        import shutil
        
        # 获取用户专属文件夹
        session_id = get_user_session_id()
        user_folders = ensure_user_folders(session_id)
        
        print(f"清空文件 - 用户会话ID: {session_id}")
        print(f"用户文件夹: {user_folders}")
        
        # 清空上传的图片文件夹
        upload_folders = ['fixed', 'variable', 'music', 'background']
        for folder_name in upload_folders:
            folder_path = user_folders[folder_name]
            print(f"检查文件夹: {folder_path}")
            if os.path.exists(folder_path):
                files = os.listdir(folder_path)
                print(f"找到 {len(files)} 个文件: {files}")
                for file in files:
                    file_path = os.path.join(folder_path, file)
                    if os.path.isfile(file_path):
                        try:
                            os.remove(file_path)
                            print(f"已删除: {file}")
                        except Exception as e:
                            print(f"删除失败: {file}, 错误: {e}")
            else:
                print(f"文件夹不存在: {folder_path}")
        
        # 清空生成的视频
        output_folder = user_folders['output']
        if os.path.exists(output_folder):
            files = os.listdir(output_folder)
            print(f"清空视频文件夹: {output_folder}, 找到 {len(files)} 个文件")
            for file in files:
                file_path = os.path.join(output_folder, file)
                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                        print(f"已删除视频: {file}")
                    except Exception as e:
                        print(f"删除视频失败: {file}, 错误: {e}")
        
        print("清空完成")
        _reset_user_state(session_id)
        return jsonify({"success": True})
    except Exception as e:
        print(f"清空文件失败: {e}", flush=True)
        import traceback
        print(f"异常详情:\n{traceback.format_exc()}", flush=True)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/download-image', methods=['POST'])
def download_image():
    """从URL下载图片到指定文件夹"""
    try:
        import requests
        
        data = request.get_json()
        url = data.get('url')
        folder_type = data.get('folder_type', 'variable')
        preferred_filename = data.get('filename') or data.get('original_filename')
        order_index = data.get('order')  # 获取序号，用于文件名排序
        
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        
        if folder_type not in ['fixed', 'variable']:
            return jsonify({"error": "Invalid folder type"}), 400
        
        # 获取用户专属文件夹
        session_id = get_user_session_id()
        user_folders = ensure_user_folders(session_id)
        folder = user_folders['fixed'] if folder_type == 'fixed' else user_folders['variable']
        
        print(f"[Download] 下载图片: {url}")
        print(f"[Path] Session ID: {session_id}")
        print(f"[Path] 目标文件夹: {folder}")
        print(f"[Path] 文件夹类型: {folder_type}")
        
        # 下载图片
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 检查是否已经下载过相同的URL（基于URL的hash）
        import hashlib
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:8]
        
        # 先检查是否已有相同URL的文件
        existing_files = []
        if os.path.exists(folder):
            existing_files = [f for f in os.listdir(folder) if allowed_file(f)]
        
        # 从请求中提取原始文件名（优先使用显式传入的文件名）
        raw_filename = preferred_filename or url.split('/')[-1]
        url_filename = secure_filename(os.path.basename(raw_filename)).split('?')[0]
        
        # 确定文件扩展名
        if url_filename and '.' in url_filename:
            base_name = url_filename.rsplit('.', 1)[0]  # 去掉扩展名的文件名部分
            ext = url_filename.rsplit('.', 1)[1].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                ext = 'jpg'
        else:
            base_name = None
            ext = 'jpg'
        
        # 如果提供了序号，删除所有匹配的文件（不管有没有序号前缀），然后重新下载
        if order_index is not None and isinstance(order_index, (int, float)) and base_name:
            order_str = f"{int(order_index):03d}_"
            import re
            # 匹配序号前缀模式：3位数字 + 下划线
            order_pattern = re.compile(r'^\d{3}_(.+)$')
            
            # 删除所有匹配的文件（不管有没有序号前缀）
            files_deleted = False
            for existing_file in existing_files:
                if existing_file.endswith(f'.{ext}'):
                    # 检查文件名是否匹配（去掉序号前缀后）
                    match = order_pattern.match(existing_file)
                    if match:
                        # 如果有序号前缀，提取实际文件名
                        file_without_order = match.group(1)
                    else:
                        # 如果没有序号前缀，直接使用原文件名
                        file_without_order = existing_file
                    
                    # 如果去掉序号前缀后匹配，删除旧文件（不管有没有序号前缀）
                    if file_without_order == f"{base_name}.{ext}":
                        old_file_path = os.path.join(folder, existing_file)
                        try:
                            os.remove(old_file_path)
                            files_deleted = True
                            print(f"[Download] 删除旧文件: {existing_file}，将重新下载为: {order_str}{base_name}.{ext}")
                        except Exception as e:
                            print(f"[Warn] 删除旧文件失败: {e}")
            
            # 重新检查文件列表（删除后）
            if files_deleted:
                existing_files = []
                if os.path.exists(folder):
                    existing_files = [f for f in os.listdir(folder) if allowed_file(f)]
            
            # 检查是否已有带正确序号前缀的文件
            expected_filename_with_order = f"{order_str}{base_name}.{ext}"
            if expected_filename_with_order in existing_files:
                print(f"图片已存在（带序号前缀），跳过下载: {expected_filename_with_order}")
                return jsonify({"success": True, "filename": expected_filename_with_order, "skipped": True})
            
            # 如果有序号要求，不再检查其他匹配（因为已经删除或不存在），直接下载
            # 跳过后续的文件存在检查，继续执行下载逻辑
        else:
            # 如果没有序号要求，使用原来的逻辑检查文件是否存在
            # 查找是否有基于相同URL的文件（通过文件名模式或内容hash）
            for existing_file in existing_files:
                # 检查文件名中是否包含URL的hash标识，或者是否与原始文件名匹配
                if url_hash in existing_file or url in existing_file:
                    print(f"图片已存在，跳过下载: {existing_file}")
                    return jsonify({"success": True, "filename": existing_file, "skipped": True})
                # 如果原始文件名存在且文件名匹配，也认为是同一文件
                if base_name and existing_file.startswith(base_name) and existing_file.endswith(f'.{ext}'):
                    print(f"图片已存在（文件名匹配），跳过下载: {existing_file}")
                    return jsonify({"success": True, "filename": existing_file, "skipped": True})
        
        # 生成文件名：优先使用URL中的原始文件名
        if base_name:
            # 使用原始文件名（去掉扩展名，稍后会加上正确的扩展名）
            filename_base = base_name
            
            # 如果提供了序号，在文件名前添加序号前缀（用于排序）
            # 序号格式：001_, 002_, ... 999_（支持最多999张图片）
            if order_index is not None and isinstance(order_index, (int, float)):
                order_str = f"{int(order_index):03d}_"  # 格式化为3位数字，如 001_, 002_
                filename_base = f"{order_str}{filename_base}"
                print(f"[Download] 使用序号前缀: {order_str}, 文件名: {filename_base}")
            
            # 如果文件名已存在，添加后缀以避免冲突
            counter = 1
            filename = f"{filename_base}.{ext}"
            while os.path.exists(os.path.join(folder, filename)):
                # 如果有序号前缀，在序号和原文件名之间插入计数器
                if order_index is not None and isinstance(order_index, (int, float)):
                    order_str = f"{int(order_index):03d}_"
                    # 去掉序号前缀，添加计数器，再重新添加序号前缀
                    original_base = base_name
                    filename_base = f"{order_str}{original_base}_{counter}"
                else:
                    filename_base = f"{base_name}_{counter}"
                filename = f"{filename_base}.{ext}"
                counter += 1
        else:
            # 如果无法从URL提取文件名，使用序号（如果有）+ hash + 时间戳
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            if order_index is not None and isinstance(order_index, (int, float)):
                order_str = f"{int(order_index):03d}_"
                filename = f"{order_str}downloaded_{url_hash}_{timestamp}.{ext}"
            else:
                filename = f"downloaded_{url_hash}_{timestamp}.{ext}"
        
        filepath = os.path.join(folder, filename)
        
        # 保存文件
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"图片下载成功: {filename}")
        return jsonify({"success": True, "filename": filename})
        
    except Exception as e:
        print(f"下载图片失败: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear-images', methods=['POST'])
def clear_images():
    """清空指定文件夹的图片（兼容无JSON体）"""
    try:
        data = request.get_json(silent=True) or {}
        folder_type = data.get('folder_type', 'variable')
        if folder_type not in ['fixed', 'variable']:
            folder_type = 'variable'
        
        # 获取用户专属文件夹
        session_id = get_user_session_id()
        user_folders = ensure_user_folders(session_id)
        folder = user_folders['fixed'] if folder_type == 'fixed' else user_folders['variable']
        
        print(f"清空 {folder_type} 文件夹: {folder}")
        
        if os.path.exists(folder):
            files = os.listdir(folder)
            print(f"找到 {len(files)} 个文件")
            for file in files:
                file_path = os.path.join(folder, file)
                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                        print(f"已删除: {file}")
                    except Exception as e:
                        print(f"删除失败: {file}, 错误: {e}")
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"清空图片失败: {e}")
        return jsonify({"error": str(e), "success": False}), 200

def cleanup_old_videos():
    """清理output文件夹中超过7天的视频文件"""
    try:
        print(f"[Cleanup] 开始清理旧视频文件...", flush=True)
        
        if not os.path.exists(OUTPUT_FOLDER):
            print(f"[Cleanup] 输出文件夹不存在: {OUTPUT_FOLDER}", flush=True)
            return
        
        # 计算7天前的时间
        cutoff_time = time.time() - (7 * 24 * 60 * 60)  # 7天前的时间戳
        
        total_deleted = 0
        total_size_freed = 0
        
        # 遍历所有用户文件夹
        for user_folder in os.listdir(OUTPUT_FOLDER):
            user_folder_path = os.path.join(OUTPUT_FOLDER, user_folder)
            
            # 跳过非文件夹
            if not os.path.isdir(user_folder_path):
                continue
            
            # 遍历用户文件夹中的视频文件
            for filename in os.listdir(user_folder_path):
                file_path = os.path.join(user_folder_path, filename)
                
                # 只处理视频文件
                if not os.path.isfile(file_path) or not allowed_video_file(filename):
                    continue
                
                # 检查文件修改时间
                try:
                    file_mtime = os.path.getmtime(file_path)
                    if file_mtime < cutoff_time:
                        # 文件超过7天，删除
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        total_deleted += 1
                        total_size_freed += file_size
                        print(f"[Cleanup] 删除旧视频: {user_folder}/{filename} (修改时间: {datetime.fromtimestamp(file_mtime).strftime('%Y-%m-%d %H:%M:%S')})", flush=True)
                except Exception as e:
                    print(f"[Cleanup] 处理文件失败 {file_path}: {e}", flush=True)
            
            # 如果用户文件夹为空，尝试删除空文件夹（可选）
            try:
                if os.path.exists(user_folder_path) and not os.listdir(user_folder_path):
                    # 文件夹为空，可以选择删除（这里保留，因为可能还有其他子文件夹）
                    pass
            except Exception:
                pass
        
        if total_deleted > 0:
            size_mb = total_size_freed / (1024 * 1024)
            print(f"[Cleanup] 清理完成: 删除了 {total_deleted} 个旧视频文件，释放了 {size_mb:.2f} MB 空间", flush=True)
        else:
            print(f"[Cleanup] 清理完成: 没有需要清理的旧视频文件", flush=True)
            
    except Exception as e:
        print(f"[Cleanup] 清理旧视频文件失败: {e}", flush=True)
        import traceback
        print(f"[Cleanup] 异常详情:\n{traceback.format_exc()}", flush=True)

def cleanup_scheduler():
    """定期清理任务调度器"""
    # 首次启动后等待1小时再执行第一次清理（避免启动时立即清理）
    time.sleep(3600)  # 1小时
    
    # 然后每24小时执行一次清理
    while True:
        try:
            cleanup_old_videos()
        except Exception as e:
            print(f"[Cleanup] 清理任务执行失败: {e}", flush=True)
        
        # 等待24小时后再次执行
        time.sleep(24 * 60 * 60)  # 24小时

if __name__ == '__main__':
    print("FFmpeg 视频生成工具 - Web版本 (融合平台专用)")
    print("=" * 50)
    print("正在启动Web服务器...")
    print("局域网访问地址：")
    print("  http://localhost:18090")
    print("  http://[您的IP地址]:18090")
    print("=" * 50)
    print("注意：这是融合平台专用实例，与9000端口服务完全独立")
    print("=" * 50)
    
    # 检查FFmpeg（在请求上下文中检查）
    print("FFmpeg状态将在首次请求时检查")
    
    # 启动定期清理任务（后台线程）
    cleanup_thread = Thread(target=cleanup_scheduler, daemon=True)
    cleanup_thread.start()
    print("[Cleanup] 已启动定期清理任务：每24小时清理一次超过7天的旧视频文件", flush=True)
    
    # 启动Flask应用 - 使用新端口18091，与API Gateway的18090端口独立
    app.run(host='0.0.0.0', port=18091, debug=False)
