<template>
    <div class="container-fluid">
        <!-- Bootstrap CSS 已在 index.html 中加载，此处移除避免重复 -->
        <div class="row">
            <!-- 侧边栏 -->
            <div class="col-md-3 bg-light p-4">
                <h4><i class="bi bi-camera-video"></i> FFmpeg 视频生成工具</h4>
                <hr>
                
                <!-- FFmpeg状态 -->
                <div class="mb-3">
                    <h6>系统状态</h6>
                    <div id="ffmpeg-status">
                        <span class="status-indicator status-warning"></span>
                        检查中...
                    </div>
                </div>

                <!-- 设置 -->
                            <div class="mb-3">
                    <h6>视频设置</h6>
                    <div class="mb-2">
                        <label for="duration" class="form-label">每张图片显示时长（秒）</label>
                        <input type="number" class="form-control" id="duration" value="0.7" min="0.1" max="10" step="0.1">
                    </div>
                    <div class="mb-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="rotation-mode">
                            <label class="form-check-label" for="rotation-mode">
                                轮播视频模式（3个可变+全部固定）
                            </label>
                        </div>
                        <small class="form-text text-muted">开启后：每3个可变部分图片+全部固定部分图片生成一个视频</small>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="mb-3">
                    <button class="btn btn-primary w-100 mb-2" onclick="generateVideos()">
                        <i class="bi bi-play-circle"></i> 生成视频
                        </button>
                    <button class="btn btn-warning w-100 mb-2" onclick="clearAll()">
                        <i class="bi bi-trash"></i> 清空所有
                        </button>
                </div>

                <!-- 进度条 -->
                <div class="progress-container">
                    <div class="mb-2">
                        <small>生成进度</small>
                        </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- 主内容区 -->
            <div class="col-md-9 p-4">
                <!-- 图片上传区域 -->
                <div class="row mb-4">
                    <!-- 可变部分 -->
                    <div class="col-md-6">
                        <h5><i class="bi bi-shuffle"></i> 可变部分（视频开头）</h5>
                        
                        <!-- 图片链接输入栏（仅支持图片链接） -->
                        <div class="mb-3">
                            <label for="variable-link-input" class="form-label">
                                <i class="bi bi-link-45deg"></i> 图片链接输入
                            </label>
                            <textarea 
                                id="variable-link-input" 
                                class="form-control" 
                                rows="3" 
                                placeholder="输入图片链接，每行一个链接，或使用分隔符批量输入（仅支持图片链接，不支持视频链接）"
                            ></textarea>
                            <small class="text-muted">
                                支持多行输入：每行一个图片链接，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个链接，如：link1 link2 link3 或 link1，link2、link3。
                                <strong>注意：仅支持图片链接，视频链接不会被处理。</strong>
                            </small>
                            <div class="d-flex gap-2 mt-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="manualDownloadVariableLinks()">
                                    <i class="bi bi-arrow-repeat me-1"></i>重新识别并下载
                                </button>
                            </div>
                        </div>
                        
                        <!-- 图片链接下载进度条 -->
                        <div id="variable-link-download-progress" class="mb-3" style="display: none;">
                            <div class="alert alert-info">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="bi bi-download me-2"></i>
                                    <span id="variable-link-download-text">正在下载图片链接...</span>
                                </div>
                                <div class="progress" style="height: 25px;">
                                    <div id="variable-link-download-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 0%">
                                        <span id="variable-link-download-percent" class="ms-2">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                                <!-- 同步的图片链接显示区域 -->
                        <div id="synced-images-section" class="mb-3" style="display: none;">
                            <div class="alert alert-info mb-2">
                                <h6 class="mb-2"><i class="bi bi-link-45deg me-2"></i>同步的图片链接（来自广告页面）</h6>
                                    <div id="synced-images-list"></div>
                                <div class="mt-2">
                                    <small><i class="bi bi-info-circle me-1"></i>图片已自动下载到可变部分，可直接用于生成视频</small>
                                </div>
                            </div>
                                </div>
                                
                                <!-- 下载进度显示 -->
                        <div id="variable-download-progress" class="mb-3" style="display: none;">
                            <div class="alert alert-primary">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="bi bi-download me-2"></i>
                                    <span id="variable-download-text">正在下载图片...</span>
                                </div>
                                <div class="progress" style="height: 20px;">
                                    <div id="variable-download-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                                
                                <div class="upload-area" onclick="document.getElementById('variable-files').click()">
                            <i class="bi bi-cloud-upload fs-1 text-muted"></i>
                            <p class="mt-2">点击或拖拽上传图片</p>
                                    <small class="text-muted">支持 JPG, PNG, GIF, BMP, TIFF, WEBP</small>
                                </div>
                                <input type="file" id="variable-files" multiple accept="image/*" style="display: none;" onchange="uploadFiles('variable')">
                                <div id="variable-images" class="mt-3"></div>
                    </div>
                    
                    <!-- 固定部分 -->
                    <div class="col-md-6">
                        <h5><i class="bi bi-lock"></i> 固定部分（视频结尾）</h5>
                        
                        <!-- 图片链接输入栏（仅支持图片链接） -->
                        <div class="mb-3">
                            <label for="fixed-link-input" class="form-label">
                                <i class="bi bi-link-45deg"></i> 图片链接输入
                            </label>
                            <textarea 
                                id="fixed-link-input" 
                                class="form-control" 
                                rows="3" 
                                placeholder="输入图片链接，每行一个链接，或使用分隔符批量输入（仅支持图片链接，不支持视频链接）"
                            ></textarea>
                            <small class="text-muted">
                                支持多行输入：每行一个图片链接，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个链接，如：link1 link2 link3 或 link1，link2、link3。
                                <strong>注意：仅支持图片链接，视频链接不会被处理。</strong>
                            </small>
                            <div class="d-flex gap-2 mt-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="manualDownloadFixedLinks()">
                                    <i class="bi bi-arrow-repeat me-1"></i>重新识别并下载
                                </button>
                            </div>
                        </div>
                        
                        <!-- 图片链接下载进度条 -->
                        <div id="fixed-link-download-progress" class="mb-3" style="display: none;">
                            <div class="alert alert-info">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="bi bi-download me-2"></i>
                                    <span id="fixed-link-download-text">正在下载图片链接...</span>
                                </div>
                                <div class="progress" style="height: 25px;">
                                    <div id="fixed-link-download-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 0%">
                                        <span id="fixed-link-download-percent" class="ms-2">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                                
                                <div class="upload-area" onclick="document.getElementById('fixed-files').click()">
                            <i class="bi bi-cloud-upload fs-1 text-muted"></i>
                            <p class="mt-2">点击或拖拽上传图片</p>
                                    <small class="text-muted">支持 JPG, PNG, GIF, BMP, TIFF, WEBP</small>
                                </div>
                                <input type="file" id="fixed-files" multiple accept="image/*" style="display: none;" onchange="uploadFiles('fixed')">
                                <div id="fixed-images" class="mt-3"></div>
                    </div>
                </div>
                
                <!-- 背景图片上传 -->
                <div class="mt-4">
                    <h5><i class="bi bi-image"></i> 背景图片 (可选)</h5>
                                <div class="upload-area" onclick="document.getElementById('background-file').click()">
                        <i class="bi bi-image fs-1 text-muted"></i>
                        <p class="mt-2">点击上传背景图片</p>
                                    <small class="text-muted">支持 JPG, PNG, GIF, BMP, TIFF, WEBP</small>
                                </div>
                                <input type="file" id="background-file" accept="image/*" style="display: none;" onchange="uploadBackground()">
                                <div id="background-info" class="mt-3" style="display: none;">
                        <div class="alert alert-info">
                            <i class="bi bi-image"></i>
                            <span id="background-filename"></span>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeBackground()">
                                            <i class="bi bi-x"></i>
                                        </button>
                                    </div>
                        <div class="form-check mt-2">
                                        <input class="form-check-input" type="checkbox" id="blur-background">
                                        <label class="form-check-label" for="blur-background">
                                            模糊背景图片
                                        </label>
                            </div>
                        </div>
                    </div>

                <!-- 背景视频上传 -->
                <div class="mt-4">
                    <h5><i class="bi bi-camera-video"></i> 背景视频 (可选)</h5>
                                <div class="upload-area" onclick="document.getElementById('background-video-file').click()">
                        <i class="bi bi-camera-video fs-1 text-muted"></i>
                        <p class="mt-2">点击上传背景视频</p>
                        <small class="text-muted">支持 MP4, AVI, MOV, MKV, WMV, FLV, WEBM, M4V</small>
                                </div>
                                <input type="file" id="background-video-file" accept="video/*" style="display: none;" onchange="uploadBackgroundVideo()">
                                <div id="background-video-info" class="mt-3" style="display: none;">
                        <div class="alert alert-info">
                            <i class="bi bi-camera-video"></i>
                            <span id="background-video-filename"></span>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeBackgroundVideo()">
                                            <i class="bi bi-x"></i>
                                        </button>
                            </div>
                        </div>
                    </div>

                <!-- 背景音乐上传 -->
                <div class="mt-4">
                    <h5><i class="bi bi-music-note"></i> 背景音乐 (可选)</h5>
                    
                    <!-- 双列布局：左侧常用音乐，右侧上传区域 -->
                    <div class="row">
                        <!-- 左侧：常用音乐区域 -->
                        <div class="col-md-6">
                            <h6 class="mb-3"><i class="bi bi-star-fill text-warning me-1"></i> 常用音乐</h6>
                            <!-- 音乐列表容器：固定高度 + 自定义滚动条 -->
                            <div class="common-music-list">
                                <!-- 使用 v-for 循环渲染所有音乐 -->
                                <div 
                                    v-for="music in commonMusics" 
                                    :key="music.id"
                                    class="common-music-card mb-2" 
                                    :data-music-id="music.id"
                                >
                                    <div class="d-flex align-items-center justify-content-between p-2 border rounded">
                                        <div class="d-flex align-items-center flex-grow-1">
                                            <!-- 音乐名称 -->
                                            <span class="me-2 fw-bold">{{ music.name }}</span>
                                            
                                            <!-- Audio 元素：用于预览播放 -->
                                            <audio 
                                                :id="'audio-' + music.id" 
                                                preload="metadata" 
                                                style="display: none;"
                                            >
                                                <source :src="'/assets/music/' + music.filename" type="audio/mpeg">
                                            </audio>
                                            
                                            <!-- 播放/暂停按钮 -->
                                            <button 
                                                type="button" 
                                                class="btn btn-sm btn-outline-primary me-2 play-music-btn" 
                                                :data-audio-id="'audio-' + music.id"
                                                :data-music-id="music.id"
                                                @click="toggleCommonMusic(music.id)"
                                            >
                                                <i class="bi bi-play-fill"></i>
                                            </button>
                                            
                                            <!-- 使用此音乐按钮 -->
                                            <button 
                                                type="button" 
                                                class="btn btn-sm btn-success use-music-btn" 
                                                :data-music-url="'/assets/music/' + music.filename"
                                                :data-music-name="music.filename"
                                                :data-music-id="music.id"
                                                @click="useCommonMusic('/assets/music/' + music.filename, music.filename, music.id)"
                                            >
                                                <span class="btn-text">使用此音乐</span>
                                                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 右侧：上传背景音乐区域 -->
                        <div class="col-md-6">
                            <h6 class="mb-3"><i class="bi bi-cloud-upload me-1"></i> 上传背景音乐</h6>
                            <div class="upload-area" onclick="document.getElementById('music-file').click()">
                                <i class="bi bi-music-note-beamed fs-1 text-muted"></i>
                                <p class="mt-2">点击上传背景音乐</p>
                                <small class="text-muted">支持 MP3, WAV, AAC, OGG, M4A, FLAC</small>
                            </div>
                            <input type="file" id="music-file" accept="audio/*" style="display: none;" onchange="uploadMusic()">
                            <div id="music-info" class="mt-3" style="display: none;">
                                <div class="alert alert-info">
                                    <i class="bi bi-music-note"></i>
                                    <span id="music-filename"></span>
                                    <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeMusic()">
                                        <i class="bi bi-x"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 生成的视频 -->
                <div class="mt-4">
                    <h5><i class="bi bi-collection-play"></i> 生成的视频</h5>
                    <div id="videos-list">
                        <div class="text-center text-muted py-4">
                            <i class="bi bi-video fs-1"></i>
                            <p>暂无生成的视频</p>
                        </div>
                    </div>
                </div>
                            </div>
                                </div>
                            </div>

    <!-- 结果模态框 -->
    <div class="modal fade" id="resultModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">生成结果</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                <div class="modal-body" id="result-content">
                    <!-- 结果内容 -->
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'

// ========== 常用音乐列表配置（数据驱动） ==========
// 定义包含所有常用音乐的响应式数组
// 使用数据驱动方式，便于维护和扩展
const commonMusics = ref([
  // 维京系列（原有3个）
  { id: 'viking01', name: '维京音乐01', group: '维京系列', filename: 'viking01.MP3' },
  { id: 'viking02', name: '维京音乐02', group: '维京系列', filename: 'viking02.MP3' },
  { id: 'viking03', name: '维京音乐03', group: '维京系列', filename: 'viking03.MP3' },
  // 女巫系列（新增3个）
  { id: 'witch01', name: '女巫歌曲01', group: '女巫系列', filename: 'witch01.MP3' },
  { id: 'witch02', name: '女巫歌曲02', group: '女巫系列', filename: 'witch02.MP3' },
  { id: 'witch03', name: '女巫歌曲03', group: '女巫系列', filename: 'witch03.MP3' },
  // 滑雪系列（新增3个）
  { id: 'ski01', name: '滑雪歌曲01', group: '滑雪系列', filename: 'ski01.MP3' },
  { id: 'ski02', name: '滑雪歌曲02', group: '滑雪系列', filename: 'ski02.MP3' },
  { id: 'ski03', name: '滑雪歌曲03', group: '滑雪系列', filename: 'ski03.MP3' },
])

// 计算属性：按分组组织音乐（可选，用于未来分组显示功能）
// 当 commonMusics 数据变化时，会自动重新计算
const groupedMusics = computed(() => {
  const groups = {}
  commonMusics.value.forEach(music => {
    if (!groups[music.group]) {
      groups[music.group] = []
    }
    groups[music.group].push(music)
  })
  return groups
})

// 确保初始化一定会执行，即使onMounted有问题也能执行
console.log('🎬 [VideoGeneration] 脚本开始加载...')

// 定义初始化函数
function startInitialization() {
    try {
        console.log('🎬 [VideoGeneration] 开始初始化流程...')
        
        // 先初始化同步功能（不依赖Bootstrap）
        console.log('🔄 [VideoGeneration] 初始化同步功能...')
        initSyncFeature()
        
        // Bootstrap JS 已在 main.js 中通过npm包加载，这里直接使用
        if (window.bootstrap) {
            console.log('✅ [VideoGeneration] Bootstrap JS 已加载（本地npm包），功能可用')
            initVideoGenerationPage()
        } else {
            // 如果Bootstrap未加载，等待一小段时间再试（可能是main.js还在加载中）
            console.warn('⚠️  [VideoGeneration] Bootstrap JS 未找到，等待加载...')
            setTimeout(() => {
                if (window.bootstrap) {
                    console.log('✅ [VideoGeneration] Bootstrap JS 已加载')
                    initVideoGenerationPage()
                } else {
                    console.warn('⚠️  [VideoGeneration] Bootstrap JS 加载失败，但核心功能不受影响')
                    initVideoGenerationPage()
                }
            }, 500)
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 初始化失败:', error)
    }
}

// 暴露全局函数的辅助函数（会在所有函数定义后调用）
function setupGlobalFunctions() {
    if (typeof window === 'undefined') return;
    
    try {
        window.uploadFiles = uploadFiles;
        window.uploadMusic = uploadMusic;
        window.uploadBackground = uploadBackground;
        window.uploadBackgroundVideo = uploadBackgroundVideo;
        window.generateVideos = generateVideos;
        window.clearAll = clearAll;
        window.deleteImage = deleteImage;
        window.deleteVideo = deleteVideo;
        window.removeBackground = removeBackground;
        window.removeBackgroundVideo = removeBackgroundVideo;
        window.removeMusic = removeMusic;
        window.downloadVideo = downloadVideo;
        window.downloadAllVideos = downloadAllVideos;
        window.showAlert = showAlert;
        window.removeSyncedImage = function() {};
        window.manualDownloadVariableLinks = manualDownloadVariableLinks;
        window.manualDownloadFixedLinks = manualDownloadFixedLinks;
        window.toggleCommonMusic = toggleCommonMusic;
        window.useCommonMusic = useCommonMusic;
        console.log('✅ [VideoGeneration] 全局函数已暴露到 window 对象');
    } catch (e) {
        console.warn('⚠️ [VideoGeneration] 函数暴露时出现警告（可能函数还未定义）:', e);
    }
}

function escapeHtml(input) {
    if (input === null || input === undefined) return '';
    return String(input).replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match] || match));
}

function formatDateTime(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
}

onMounted(() => {
    console.log('✅ [VideoGeneration] onMounted 钩子执行')
    startInitialization()
    setupGlobalFunctions();
    
    // 监听页面刷新事件（beforeunload），在页面真正刷新时清除时间戳
    window.addEventListener('beforeunload', () => {
        console.log('🔄 [VideoGeneration] 检测到页面即将刷新，清除时间戳');
        sessionStorage.removeItem('videoGenPageLoadTime');
    });
})

// 备用初始化：如果onMounted不执行，使用DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ [VideoGeneration] DOMContentLoaded 触发，执行备用初始化')
        // 延迟一下，确保onMounted有机会先执行
        setTimeout(() => {
            if (!window.videoGenInitialized) {
                console.log('⚠️  [VideoGeneration] onMounted未执行，使用备用初始化')
                startInitialization()
                window.videoGenInitialized = true
            }
        }, 1000)
    })
} else {
    // DOM已经加载完成，延迟执行备用初始化
    setTimeout(() => {
        if (!window.videoGenInitialized) {
            console.log('⚠️  [VideoGeneration] DOM已加载，执行备用初始化')
            startInitialization()
            window.videoGenInitialized = true
        }
    }, 500)
}

onBeforeUnmount(() => {
    // 清理定时器
    if (window.syncIntervalId) {
        clearInterval(window.syncIntervalId)
        console.log('🧹 [VideoGeneration] 已清理同步定时器')
    }
})

// 初始化视频生成页面（9000端口完整功能）
function initVideoGenerationPage() {
    try {
        console.log('🔧 [VideoGeneration] 初始化视频生成页面功能...')
    checkFFmpegStatus()
    
    // 检查是否是页面刷新（而不是路由切换）
    // 使用 sessionStorage 来区分页面刷新和路由切换
    const pageLoadTime = sessionStorage.getItem('videoGenPageLoadTime');
    const isPageRefresh = !pageLoadTime; // 如果不存在时间戳，说明是页面刷新
    
    if (isPageRefresh) {
        // 页面刷新：清空数据
        console.log('🔄 [VideoGeneration] 检测到页面刷新，清空数据');
        clearAllData();
        clearAllFiles();
        // 设置时间戳，标记页面已加载
        sessionStorage.setItem('videoGenPageLoadTime', Date.now().toString());
    } else {
        // 路由切换：保留数据，只刷新显示
        console.log('🔄 [VideoGeneration] 检测到路由切换，保留数据，刷新显示');
        // 刷新图片和视频列表显示（从后端加载）
        loadImages();
        loadVideos();
    }
    
    setupDragAndDrop()
    
    // 初始化常用音乐播放功能
    initCommonMusicPlayers()
    // 初始化常用音乐"使用"功能
    initCommonMusicUseButtons()
    
    // 绑定轮播视频模式复选框事件监听器（立即反馈）
    const rotationModeCheckbox = document.getElementById('rotation-mode');
    if (rotationModeCheckbox) {
        rotationModeCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            console.log('🎬 [VideoGeneration] 轮播视频模式复选框状态改变:', {
                checked: isChecked,
                type: typeof isChecked,
                timestamp: new Date().toISOString()
            });
            console.log(`🎬 [VideoGeneration] ${isChecked ? '✅ 已启用轮播视频模式' : '❌ 已禁用轮播视频模式'} - 每3个可变图片+全部固定图片生成一个视频`);
        });
        // 立即输出当前状态
        console.log('🎬 [VideoGeneration] 轮播视频模式复选框已绑定事件监听器，当前状态:', {
            checked: rotationModeCheckbox.checked,
            elementExists: true
        });
    } else {
        console.warn('⚠️  [VideoGeneration] 未找到轮播视频模式复选框 (rotation-mode)');
    }
    
    // 绑定可变部分链接输入事件
    const variableLinkInput = document.getElementById('variable-link-input');
    if (variableLinkInput) {
        // 移除旧的事件监听器（如果存在）
        const newInput = variableLinkInput.cloneNode(true);
        variableLinkInput.parentNode.replaceChild(newInput, variableLinkInput);
        // 重新绑定事件
        newInput.addEventListener('input', (e) => {
            handleVariableLinkInput(e.target.value);
        });
        console.log('✅ [VideoGeneration] 可变部分链接输入事件已绑定');
    } else {
        console.warn('⚠️  [VideoGeneration] 未找到可变部分链接输入框');
    }
    
    // 绑定固定部分链接输入事件
    const fixedLinkInput = document.getElementById('fixed-link-input');
    if (fixedLinkInput) {
        // 移除旧的事件监听器（如果存在）
        const newFixedInput = fixedLinkInput.cloneNode(true);
        fixedLinkInput.parentNode.replaceChild(newFixedInput, fixedLinkInput);
        // 重新绑定事件
        newFixedInput.addEventListener('input', (e) => {
            handleFixedLinkInput(e.target.value);
        });
        console.log('✅ [VideoGeneration] 固定部分链接输入事件已绑定');
    } else {
        console.warn('⚠️  [VideoGeneration] 未找到固定部分链接输入框');
    }
    
        console.log('✅ [VideoGeneration] 视频生成页面功能初始化完成')
        window.videoGenInitialized = true
    } catch (error) {
        console.error('❌ [VideoGeneration] 页面功能初始化失败:', error)
    }
}

// 初始化同步功能（保留广告页面同步）
function initSyncFeature() {
    try {
        console.log('🔄 [VideoGeneration] 初始化图片链接同步功能...')
        
        // 立即加载一次同步的图片链接
        console.log('📥 [VideoGeneration] 立即加载同步的图片链接...')
        loadSyncedImageLinks().catch(err => {
            console.error('❌ [VideoGeneration] 首次加载失败:', err)
        })
        
        // 定期检查同步的图片链接（每3秒检查一次）
        // 注意：如果正在下载中，定时检查会跳过，避免重复触发
        const syncInterval = setInterval(() => {
            // 如果正在自动同步中，跳过本次检查
            if (__isAutoSyncing) {
                return // 静默跳过，不输出日志
            }
            loadSyncedImageLinks().catch(err => {
                console.error('❌ [VideoGeneration] 定时检查失败:', err)
            })
        }, 2800)
        
        // 保存interval ID以便清理（如果需要）
        window.syncIntervalId = syncInterval
        
        console.log('✅ [VideoGeneration] 同步功能已启动，每2.8秒检查一次')
    } catch (error) {
        console.error('❌ [VideoGeneration] 初始化同步功能失败:', error)
    }
}

// 生成/获取持久化的会话ID
const SESSION_KEY = 'x-session-id'

function generateSessionId() {
    const randomPart = Math.random().toString(36).slice(2)
    const timePart = Date.now().toString(36)
    return `sid_${randomPart}_${timePart}`
}

function getSessionId() {
    try {
        let sid = localStorage.getItem(SESSION_KEY)
        if (!sid || typeof sid !== 'string' || !sid.startsWith('sid_')) {
            sid = generateSessionId()
            localStorage.setItem(SESSION_KEY, sid)
            console.log('🆔 [VideoGeneration] 生成新的会话ID:', sid)
        }
        return sid
    } catch (e) {
        // 如果localStorage不可用，使用内存缓存或临时生成
        if (!window.__fallbackSessionId) {
            window.__fallbackSessionId = generateSessionId()
            console.log('🆔 [VideoGeneration] 使用临时会话ID:', window.__fallbackSessionId)
        }
        return window.__fallbackSessionId
    }
}

function sessionHeaders(extra = {}) {
    return { 'x-session-id': getSessionId(), ...extra }
}

// ============ 同步功能（保留广告页面同步） ============
let __isAutoSyncing = false
let __lastDownloadedSignature = ''
// 日志抑制：当状态稳定时减少日志输出
let __logSuppressCount = 0
let __lastLogState = ''
const LOG_SUPPRESS_INTERVAL = 5 // 每5次检查才输出一次日志（如果状态稳定）

// 验证URL格式
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false
    const trimmed = url.trim()
    if (!trimmed) return false
    // 简单的URL验证：必须以http://或https://开头，且包含图片常见扩展名或可能是图片URL
    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(trimmed) || 
           /^https?:\/\/.+/i.test(trimmed) // 或者只是http/https开头的URL（可能没有扩展名）
}

async function loadSyncedImageLinks() {
    try {
        // 只有在需要时才输出详细日志（每5次检查输出一次）
        const shouldLog = __logSuppressCount % LOG_SUPPRESS_INTERVAL === 0
        
        if (shouldLog) {
            console.log('🔍 [VideoGeneration] 正在检查同步的图片链接...')
        }
        
        const sessionId = encodeURIComponent(getSessionId())
        const response = await fetch(`/api/image-links?sid=${sessionId}`, {
            method: 'GET',
            headers: sessionHeaders({ 'Content-Type': 'application/json' })
        })
        
        if (!response.ok) {
            console.error('❌ [VideoGeneration] 获取图片链接失败，HTTP状态:', response.status, response.statusText)
            return
        }
        
        const data = await response.json()
        const validLinks = data.success && data.links ? data.links.filter(link => isValidImageUrl(link)) : []
        const currentLinks = JSON.stringify(validLinks)
        const currentState = `${validLinks.length}_${currentLinks.substring(0, 50)}`
        
        // 检查状态是否发生变化
        const stateChanged = currentState !== __lastLogState
        if (stateChanged) {
            // 状态变化，重置计数器并输出详细日志
            __logSuppressCount = 0
            __lastLogState = currentState
            console.log('📥 [VideoGeneration] API返回数据:', JSON.stringify(data))
            console.log('✅ [VideoGeneration] 有效图片链接:', validLinks.length, '个', validLinks.length > 0 ? validLinks : '')
        } else {
            // 状态未变化，增加计数器
            __logSuppressCount++
        }
        
        if (data.success && data.links !== undefined) {
            // 无论链接是否变化，都要检查并同步
            if (!window.lastSyncedLinks || window.lastSyncedLinks !== currentLinks) {
                if (stateChanged) {
                    console.log('🔄 [VideoGeneration] 图片链接状态发生变化')
                    console.log('🔄 [VideoGeneration] 之前:', window.lastSyncedLinks || '无')
                    console.log('🔄 [VideoGeneration] 现在:', currentLinks)
                }
                window.lastSyncedLinks = currentLinks
                
                // 如果链接为空，按需清空可变部分
                if (validLinks.length === 0) {
                    if (stateChanged) {
                        console.log('🗑️  [VideoGeneration] 链接为空')
                    }
                    // 强制重置缓存状态
                    window.lastSyncedLinks = currentLinks // 设置为 "[]"
                    const hadAutoSynced = Boolean(__lastDownloadedSignature)
                    __lastDownloadedSignature = '' // 重置下载签名

                    const syncedSection = document.getElementById('synced-images-section')
                    if (syncedSection) syncedSection.style.display = 'none'
                    if (hadAutoSynced) {
                        if (stateChanged) {
                            console.log('🧹 [VideoGeneration] 上次由同步功能写入图片，执行自动清空')
                        }
                        await clearVariableImages()
                        setTimeout(() => {
                            loadImages()
                        }, 500)
                    } else {
                        if (stateChanged) {
                            console.log('⏭️  [VideoGeneration] 当前图片来自手动上传，跳过自动清空')
                        }
                    }
                    return
                }
                
                // 有链接，显示并下载
                if (stateChanged) {
                    console.log('📸 [VideoGeneration] 显示同步的图片链接:', validLinks)
                }
                displaySyncedImageLinks(validLinks)
                
                // 检查可变部分是否已有这些图片，如果没有则自动下载
                try {
                    const imgResp = await fetch('/api/video-generation/api/images/variable', { 
                        headers: sessionHeaders() 
                    })
                    const imgData = await imgResp.json()
                    const existingImages = imgData.images || []
                    
                    if (stateChanged) {
                        console.log('📊 [VideoGeneration] 可变部分现有图片:', existingImages.length, '张')
                    }
                    
                    // 如果图片数量不匹配，或者签名校验，则触发下载
                    const signature = JSON.stringify(validLinks)
                    const needDownload = existingImages.length < validLinks.length || 
                                       __lastDownloadedSignature !== signature
                    
                    if (needDownload && !__isAutoSyncing) {
                        console.log('🔄 [VideoGeneration] 检测到新链接或图片数量不匹配')
                        console.log('🔄 [VideoGeneration] 现有图片:', existingImages.length, '张，需要:', validLinks.length, '张')
                        console.log('🔄 [VideoGeneration] 开始自动下载图片到可变部分...')
                        await downloadSyncedImagesToVariable(validLinks)
                    } else {
                        // 状态稳定时，减少日志输出
                        if (shouldLog && stateChanged) {
                            console.log('⏭️  [VideoGeneration] 图片已存在或正在下载中，刷新显示即可')
                        }
                        // 即使不需要下载，也要刷新显示
                        setTimeout(() => {
                            loadImages()
                        }, 500)
                    }
                } catch (checkError) {
                    console.warn('⚠️  [VideoGeneration] 检查可变部分失败，将尝试下载:', checkError)
                    await downloadSyncedImagesToVariable(validLinks)
                }
            } else {
                // 链接未变化，只有在需要时才输出日志
                if (shouldLog && stateChanged) {
                    console.log('✅ [VideoGeneration] 链接未变化，检查图片是否真实存在')
                }
                displaySyncedImageLinks(validLinks)
                
                // 检查可变部分是否真的存在这些图片
                try {
                    const imgResp = await fetch('/api/video-generation/api/images/variable', { 
                        headers: sessionHeaders() 
                    })
                    const imgData = await imgResp.json()
                    const existingImages = imgData.images || []
                    
                    // 只在状态变化或需要日志时输出
                    if (shouldLog && stateChanged) {
                        console.log('📊 [VideoGeneration] 链接未变化 - 可变部分现有图片:', existingImages.length, '张，期望:', validLinks.length, '张')
                    }
                    
                    // 如果图片数量不匹配，触发下载
                    if (existingImages.length < validLinks.length) {
                        // 如果正在下载中，跳过本次检查，避免重复触发
                        if (__isAutoSyncing) {
                            return // 静默返回，不输出日志
                        }
                        console.log('⚠️  [VideoGeneration] 链接未变化但图片数量不足，触发下载')
                        // 修复：existingImages可能是字符串数组或对象数组，需要正确处理
                        const imageNames = existingImages.map(img => {
                            if (typeof img === 'string') return img
                            return img.filename || img.name || String(img)
                        })
                        console.log('⚠️  [VideoGeneration] 当前图片列表:', imageNames)
                        await downloadSyncedImagesToVariable(validLinks)
                    } else {
                        // 状态稳定时，减少日志输出
                        // 链接为空时不输出任何日志，避免刷屏
                        if (validLinks.length === 0) {
                            // 完全静默，不输出日志
                        } else if (shouldLog && stateChanged) {
                            console.log('✅ [VideoGeneration] 图片已存在，仅刷新显示')
                        }
                        setTimeout(() => {
                            loadImages()
                        }, 500)
                    }
                } catch (checkError) {
                    console.warn('⚠️  [VideoGeneration] 检查图片存在性失败，刷新显示:', checkError)
                    setTimeout(() => {
                        loadImages()
                    }, 500)
                }
            }
        } else if (stateChanged) {
            // 只在状态变化时输出错误日志
            console.log('⚠️  [VideoGeneration] API返回数据格式异常:', data)
        }
    } catch (error) {
        console.error('❌ 加载同步图片链接失败:', error)
        console.error('错误详情:', error.message, error.stack)
    }
}

// 显示同步的图片链接
function displaySyncedImageLinks(links) {
    const syncedSection = document.getElementById('synced-images-section')
    const syncedList = document.getElementById('synced-images-list')
    
    if (!syncedSection || !syncedList) return
    
    if (links && links.length > 0) {
        syncedSection.style.display = 'block'
        syncedList.innerHTML = links.map((link, index) => {
            // 从链接中提取图片名或使用序号
            const linkText = link.length > 80 ? link.substring(0, 80) + '...' : link
            // 尝试从URL中提取文件名
            const fileName = link.split('/').pop() || `图片${index + 1}`
            const displayName = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName
            
            return `
                <div class="d-flex align-items-center mb-2 p-2 bg-white rounded border">
                    <span class="badge bg-primary me-2">${index + 1}</span>
                    <div class="flex-grow-1">
                        <small class="d-block text-break" title="${link}">${linkText}</small>
                        <small class="text-muted">文件名: ${displayName}</small>
                    </div>
                </div>
            `
        }).join('')
    } else {
        syncedSection.style.display = 'none'
    }
}

// 更新下载进度显示
function updateDownloadProgress(current, total, isCompleted = false) {
    const progressContainer = document.getElementById('variable-download-progress')
    const progressBar = document.getElementById('variable-download-progress-bar')
    const progressText = document.getElementById('variable-download-text')
    
    if (!progressContainer || !progressBar || !progressText) return
    
    if (total === 0 || isCompleted) {
        // 下载完成，隐藏进度条
        progressContainer.style.display = 'none'
        return
    }
    
    // 显示进度条
    progressContainer.style.display = 'block'
    
    // 计算进度百分比
    const percentage = Math.round((current / total) * 100)
    
    // 更新进度条
    progressBar.style.width = `${percentage}%`
    progressBar.setAttribute('aria-valuenow', percentage)
    progressBar.setAttribute('aria-valuemin', 0)
    progressBar.setAttribute('aria-valuemax', 100)
    
    // 更新文字
    if (current < total) {
        progressText.textContent = `正在下载图片 ${current}/${total}`
    } else {
        progressText.textContent = `下载完成！共 ${total} 张图片`
    }
}

async function downloadSyncedImagesToVariable(imageLinks) {
    if (!imageLinks || imageLinks.length === 0) return
    if (__isAutoSyncing) {
        console.log('⏭️ 跳过：已有自动同步在进行中')
        return
    }
    __isAutoSyncing = true
    const signature = JSON.stringify(imageLinks)

    console.log('🔄 开始自动下载同步图片到可变部分:', imageLinks)
    
    // 显示进度条初始状态
    updateDownloadProgress(0, imageLinks.length)
    
    // 先清空可变部分，确保没有残留图片
    try {
        console.log('🗑️  [VideoGeneration] 先清空可变部分，准备下载新图片...')
        const clearResp = await fetch('/api/video-generation/api/clear-images', {
            method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'}),
            body: JSON.stringify({ folder_type: 'variable' })
        })
        const clearResult = await clearResp.json()
        
        // 等待清空完成
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 验证清空是否成功
        if (clearResp.ok && clearResult.success) {
            console.log('✅ [VideoGeneration] 可变部分清空成功，准备下载新图片')
            
            // 再次验证：检查是否真的清空了
            const verifyResp = await fetch('/api/video-generation/api/images/variable', { 
                headers: sessionHeaders() 
            })
            const verifyData = await verifyResp.json()
            const remainingImages = verifyData.images || []
            
            if (remainingImages.length > 0) {
                console.warn(`⚠️  [VideoGeneration] 清空后仍有 ${remainingImages.length} 张图片，强制再次清空`)
                // 再次清空
                await fetch('/api/video-generation/api/clear-images', {
                    method: 'POST',
                    headers: sessionHeaders({'Content-Type': 'application/json'}),
                    body: JSON.stringify({ folder_type: 'variable' })
                })
                await new Promise(resolve => setTimeout(resolve, 300))
            }
        } else {
            console.warn('⚠️  [VideoGeneration] 清空失败但继续下载:', clearResult.error)
        }
    } catch (error) {
        console.warn('⚠️  [VideoGeneration] 清空可变部分失败（继续下载）:', error)
    }
    
    let successCount = 0
    let failedLinks = []
    let processedCount = 0 // 已处理的图片数量（包括跳过和失败的）
    
    try {
        // 处理链接：去除开头的@符号
        const processedLinks = imageLinks.map(link => {
            const trimmed = link.trim();
            return trimmed.startsWith('@') ? trimmed.substring(1).trim() : trimmed;
        });
        
        // 计算有效链接数量
        const validLinks = processedLinks.filter(link => link && link.trim() && isValidImageUrl(link))
        const totalValid = validLinks.length
        
        // 逐个下载图片（按输入顺序）
        let validIndex = 0;  // 有效链接的序号（跳过无效链接后重新计数）
        for (let i = 0; i < processedLinks.length; i++) {
            const link = processedLinks[i]
            if (!link || !link.trim() || !isValidImageUrl(link)) {
                console.warn(`⏭️ 跳过无效链接: ${link}`)
                processedCount++
                updateDownloadProgress(processedCount, processedLinks.length)
                continue
            }
            
            validIndex++;  // 只有有效链接才增加序号
            
            try {
                console.log(`📥 正在下载图片 ${validIndex}/${totalValid}: ${link.substring(0, 60)}...`)
                
                const resp = await fetch('/api/download-and-sync', {
                    method: 'POST',
                    headers: sessionHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ 
                        url: link.trim(),
                        order: validIndex  // 传递序号，用于文件名排序
                    })
                })
                
                const result = await resp.json()
                
                if (resp.ok && result.success) {
                    successCount++
                    console.log(`✅ 已保存到可变部分: ${link.substring(0, 60)}...`)
                } else {
                    failedLinks.push(link)
                    console.warn(`❌ 下载失败: ${link.substring(0, 60)}... - ${result.error || '未知错误'}`)
                }
                
                processedCount++
                // 更新进度条
                updateDownloadProgress(processedCount, processedLinks.length)
                
                // 每个图片下载后稍作延迟，避免服务器压力
                if (i < processedLinks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 350))
                }
            } catch (error) {
                failedLinks.push(link)
                processedCount++
                updateDownloadProgress(processedCount, processedLinks.length)
                console.warn(`❌ 下载异常: ${link.substring(0, 60)}... - ${error.message}`)
            }
        }
        
        console.log(`📊 下载完成: 成功 ${successCount}/${processedLinks.length} 个`)
        if (failedLinks.length > 0) {
            console.warn(`⚠️  失败 ${failedLinks.length} 个链接:`, failedLinks)
        }
        
        // 更新进度条显示完成状态（短暂显示完成信息）
        updateDownloadProgress(processedCount, imageLinks.length, false)
        
        __lastDownloadedSignature = signature
        
        // 下载完成后，等待服务器保存，然后多次尝试加载图片列表
        console.log('⏳ 等待服务器保存图片...')
        let loadedSuccess = false
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 550))
            console.log(`🔄 尝试加载图片列表 (${i + 1}/6)...`)
            await loadImages()
            
            // 检查是否加载成功
            try {
                const checkResp = await fetch('/api/video-generation/api/images/variable', { 
                    headers: sessionHeaders() 
                })
                const checkData = await checkResp.json()
                // 修复：正确处理字符串数组或对象数组
                const images = checkData.images || []
                const loadedCount = Array.isArray(images) ? images.length : 0
                
                if (loadedCount >= successCount) {
                    console.log(`✅ 图片列表加载成功，共 ${loadedCount} 张图片`)
                    loadedSuccess = true
                    // 显示成功提示
                    if (successCount > 0) {
                        showAlert('success', `成功下载 ${successCount} 张图片到可变部分`)
                    }
                    break
                } else {
                    console.log(`⏳ 图片还在保存中，已加载 ${loadedCount} 张，期望 ${successCount} 张`)
                }
            } catch (e) {
                console.warn('检查图片列表失败:', e)
            }
        }
        
        if (!loadedSuccess && successCount > 0) {
            console.warn('⚠️  图片可能还在保存中，请稍后刷新查看')
        }
        
        // 延迟2秒后隐藏进度条，让用户看到完成信息
        setTimeout(() => {
            updateDownloadProgress(0, 0, true)
        }, 2000)
        
    } finally {
        __isAutoSyncing = false
    }
}

async function clearVariableImages() {
    try {
        // 清空时隐藏进度条
        updateDownloadProgress(0, 0, true)
        
        console.log('🗑️  [VideoGeneration] 调用清空可变部分接口...')
        const response = await fetch('/api/video-generation/api/clear-images', {
            method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'}),
            body: JSON.stringify({ folder_type: 'variable' })
        })
        const result = await response.json()
        if (response.ok && result.success) {
            console.log('✅ [VideoGeneration] 可变部分清空成功')
        } else {
            console.warn('⚠️  [VideoGeneration] 可变部分清空失败:', result.error)
        }
    } catch (error) {
        console.warn('❌ [VideoGeneration] 清空可变部分异常:', error)
    }
}

// ========== 可变部分图片链接输入处理（仅支持图片链接）==========
let variableLinkInputTimer = null;

// ========== 固定部分图片链接输入处理（仅支持图片链接）==========
let fixedLinkInputTimer = null;

// 手动触发可变部分链接识别与下载
function manualDownloadVariableLinks() {
    try {
        // 先清除任何待执行的防抖定时器
        if (variableLinkInputTimer) {
            clearTimeout(variableLinkInputTimer);
            variableLinkInputTimer = null;
        }
        
        const textarea = document.getElementById('variable-link-input');
        if (!textarea) {
            showAlert('warning', '未找到可变部分链接输入框');
            return;
        }

        const linkText = textarea.value.trim();
        if (!linkText) {
            showAlert('warning', '请先填写可变部分的图片链接');
            return;
        }

        showAlert('info', '已开始重新识别可变部分图片链接');
        // 立即执行，不使用防抖
        handleVariableLinkInput(linkText, true);
    } catch (error) {
        console.error('❌ [VideoGeneration] 重新识别可变部分链接失败:', error);
        showAlert('danger', '重新识别可变部分链接失败，请稍后再试');
    }
}

// 手动触发固定部分链接识别与下载
function manualDownloadFixedLinks() {
    try {
        // 先清除任何待执行的防抖定时器
        if (fixedLinkInputTimer) {
            clearTimeout(fixedLinkInputTimer);
            fixedLinkInputTimer = null;
        }
        
        const textarea = document.getElementById('fixed-link-input');
        if (!textarea) {
            showAlert('warning', '未找到固定部分链接输入框');
            return;
        }

        const linkText = textarea.value.trim();
        if (!linkText) {
            showAlert('warning', '请先填写固定部分的图片链接');
            return;
        }

        showAlert('info', '已开始重新识别固定部分图片链接');
        // 立即执行，不使用防抖
        handleFixedLinkInput(linkText, true);
    } catch (error) {
        console.error('❌ [VideoGeneration] 重新识别固定部分链接失败:', error);
        showAlert('danger', '重新识别固定部分链接失败，请稍后再试');
    }
}

// 处理可变部分链接的核心逻辑（提取出来供复用）
async function processVariableLinks(linkText) {
    // 确保使用最新的 textarea 值（防止使用过期的闭包值）
    const textarea = document.getElementById('variable-link-input');
    const latestLinkText = textarea ? textarea.value.trim() : linkText;
    
    if (!latestLinkText || !latestLinkText.trim()) {
        return;
    }
    
    // 解析链接（支持多种分隔符）
    // 去除每行开头的 @ 符号（某些用户习惯在链接前加@）
    const links = latestLinkText.split(/[\s\n,，、]+/)
        .map(l => l.trim())
        .map(l => l.startsWith('@') ? l.substring(1).trim() : l)  // 去除开头的@符号
        .filter(Boolean);
    if (links.length === 0) {
        return;
    }
    
    console.log('📥 [VideoGeneration] 检测到可变部分链接输入:', links);
    
    // 过滤出图片链接（跳过视频链接）
    const imageLinks = [];
    const skippedLinks = [];
    
    for (const link of links) {
        const linkType = detectImageLinkType(link);
        if (linkType === 'image') {
            imageLinks.push(link);
        } else {
            skippedLinks.push(link);
            console.warn('⚠️  [VideoGeneration] 跳过非图片链接（可能是视频链接）:', link);
        }
    }
    
    if (skippedLinks.length > 0) {
        showAlert('warning', `已跳过 ${skippedLinks.length} 个非图片链接（仅支持图片链接）`);
    }
    
    // 下载图片到可变部分
    if (imageLinks.length > 0) {
        console.log('📥 [VideoGeneration] 开始下载图片到可变部分:', imageLinks);
        
        // 先清空可变部分，确保没有旧文件干扰序号
        try {
            console.log('🗑️  [VideoGeneration] 清空可变部分，准备下载新图片...');
            await fetch('/api/video-generation/api/clear-images', {
                method: 'POST',
                headers: sessionHeaders({'Content-Type': 'application/json'}),
                body: JSON.stringify({ folder_type: 'variable' })
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.warn('⚠️  [VideoGeneration] 清空可变部分失败（继续下载）:', error);
        }
        
        // 显示进度条
        const progressContainer = document.getElementById('variable-link-download-progress');
        const progressBar = document.getElementById('variable-link-download-progress-bar');
        const progressText = document.getElementById('variable-link-download-text');
        const progressPercent = document.getElementById('variable-link-download-percent');
        
        if (progressContainer && progressBar && progressText && progressPercent) {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
        }
        
        const totalLinks = imageLinks.length;
        let successCount = 0;
        let failCount = 0;
        let currentIndex = 0;
        
        for (const imageUrl of imageLinks) {
            currentIndex++;
            
            // 更新进度文本和进度条
            if (progressText && progressBar && progressPercent) {
                const progress = Math.round((currentIndex / totalLinks) * 100);
                progressText.textContent = `正在下载第 ${currentIndex} / ${totalLinks} 个图片链接...`;
                progressBar.style.width = progress + '%';
                progressPercent.textContent = progress + '%';
            }
            
            try {
                // 传递序号，确保下载后的文件名按顺序排列
                const success = await downloadImageToVariable(imageUrl, currentIndex);
                if (success) {
                    successCount++;
                    console.log(`✅ [VideoGeneration] 已下载 ${currentIndex}/${totalLinks}: ${imageUrl}`);
                } else {
                    failCount++;
                    console.error(`❌ [VideoGeneration] 下载失败 ${currentIndex}/${totalLinks}: ${imageUrl}`);
                }
                // 每个图片下载后稍作延迟，避免服务器压力
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error('❌ [VideoGeneration] 下载图片失败:', imageUrl, error);
                failCount++;
            }
        }
        
        // 下载完成，更新进度条显示完成状态
        if (progressText && progressBar && progressPercent) {
            progressText.textContent = `下载完成！成功: ${successCount}，失败: ${failCount}`;
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            // 移除动画效果（完成状态）
            progressBar.classList.remove('progress-bar-animated');
        }
        
        // 下载完成后刷新图片列表
        await loadImages();
        
        // 延迟2秒后隐藏进度条，让用户看到完成信息
        setTimeout(() => {
            if (progressContainer) {
                progressContainer.style.display = 'none';
                // 恢复动画效果
                if (progressBar) {
                    progressBar.classList.add('progress-bar-animated');
                    progressBar.style.width = '0%';
                    progressPercent.textContent = '0%';
                }
            }
        }, 2000);
        
        if (successCount > 0) {
            showAlert('success', `成功下载 ${successCount} 张图片到可变部分`);
        }
        if (failCount > 0) {
            showAlert('warning', `${failCount} 张图片下载失败`);
        }
    }
}

// 处理可变部分链接输入（仅处理图片链接）
function handleVariableLinkInput(linkText, immediate = false) {
    // 清除旧的防抖定时器
    if (variableLinkInputTimer) {
        clearTimeout(variableLinkInputTimer);
        variableLinkInputTimer = null;
    }
    
    // 如果 immediate=true，立即执行；否则使用防抖
    if (immediate) {
        processVariableLinks(linkText);
    } else {
        variableLinkInputTimer = setTimeout(async () => {
            await processVariableLinks(linkText);
        }, 800);  // 800ms防抖
    }
}

// 检测链接是否为图片链接（仅用于可变部分输入栏）
function detectImageLinkType(link) {
    if (!link || typeof link !== 'string') {
        return 'unknown';
    }
    
    const lowerLink = link.toLowerCase();
    
    // 检测视频文件扩展名（如果是视频，返回'video'，表示跳过）
    const videoFileExts = /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv|mpeg|mpg|f4v|rm|rmvb|asf|ts|mts|m2ts)(\?.*)?$/i;
    
    // 检测视频平台域名（如果是视频平台，返回'video'，表示跳过）
    const videoPlatforms = /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|douyin\.com|bilibili\.com|dailymotion\.com|facebook\.com\/watch|instagram\.com\/(p|reel))/i;
    
    if (videoFileExts.test(lowerLink) || videoPlatforms.test(lowerLink)) {
        return 'video';  // 视频链接，跳过处理
    }
    
    // 检测图片文件扩展名
    const imageFileExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif|ico|heic|heif|avif|jp2|j2k|jpf|jpx|jpm|mj2)(\?.*)?$/i;
    
    if (imageFileExtensions.test(lowerLink)) {
        return 'image';  // 图片链接，处理
    }
    
    // 未知类型，默认按图片处理（尝试下载，如果失败就算了）
    return 'image';
}

// 下载图片到可变部分
async function downloadImageToVariable(imageUrl, orderIndex = null) {
    try {
        const response = await fetch('/api/video-generation/api/download-image', {
            method: 'POST',
            headers: sessionHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ 
                url: imageUrl.trim(),
                folder_type: 'variable',  // 下载到可变部分
                order: orderIndex  // 传递序号，用于文件名排序
            })
        });
        
        // 检查响应是否为 JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ [VideoGeneration] 响应不是 JSON:', text);
            return false;
        }
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ [VideoGeneration] 图片已下载到可变部分:', imageUrl);
            return true;
        } else {
            console.error('❌ [VideoGeneration] 图片下载失败:', imageUrl, result.error || result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 图片下载异常:', imageUrl, error);
        // 如果是 JSON 解析错误，提供更友好的提示
        if (error.message && error.message.includes('JSON')) {
            console.error('❌ [VideoGeneration] 服务器返回了非 JSON 响应，可能是服务器错误');
        }
        return false;
    }
}

// 处理固定部分链接的核心逻辑（提取出来供复用）
async function processFixedLinks(linkText) {
    // 确保使用最新的 textarea 值（防止使用过期的闭包值）
    const textarea = document.getElementById('fixed-link-input');
    const latestLinkText = textarea ? textarea.value.trim() : linkText;
    
    if (!latestLinkText || !latestLinkText.trim()) {
        return;
    }
    
    // 解析链接（支持多种分隔符）
    const links = latestLinkText.split(/[\s\n,，、]+/).map(l => l.trim()).filter(Boolean);
    if (links.length === 0) {
        return;
    }
    
    console.log('📥 [VideoGeneration] 检测到固定部分链接输入:', links);
    
    // 过滤出图片链接（跳过视频链接）
    const imageLinks = [];
    const skippedLinks = [];
    
    for (const link of links) {
        const linkType = detectImageLinkType(link);
        if (linkType === 'image') {
            imageLinks.push(link);
        } else {
            skippedLinks.push(link);
            console.warn('⚠️  [VideoGeneration] 跳过非图片链接（可能是视频链接）:', link);
        }
    }
    
    if (skippedLinks.length > 0) {
        showAlert('warning', `已跳过 ${skippedLinks.length} 个非图片链接（仅支持图片链接）`);
    }
    
    // 下载图片到固定部分
    if (imageLinks.length > 0) {
        console.log('📥 [VideoGeneration] 开始下载图片到固定部分:', imageLinks);
        
        // 先清空固定部分，确保没有旧文件干扰
        try {
            console.log('🗑️  [VideoGeneration] 清空固定部分，准备下载新图片...');
            await fetch('/api/video-generation/api/clear-images', {
                method: 'POST',
                headers: sessionHeaders({'Content-Type': 'application/json'}),
                body: JSON.stringify({ folder_type: 'fixed' })
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.warn('⚠️  [VideoGeneration] 清空固定部分失败（继续下载）:', error);
        }
        
        // 显示进度条
        const progressContainer = document.getElementById('fixed-link-download-progress');
        const progressBar = document.getElementById('fixed-link-download-progress-bar');
        const progressText = document.getElementById('fixed-link-download-text');
        const progressPercent = document.getElementById('fixed-link-download-percent');
        
        if (progressContainer && progressBar && progressText && progressPercent) {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
        }
        
        const totalLinks = imageLinks.length;
        let successCount = 0;
        let failCount = 0;
        let currentIndex = 0;
        
        // 逐个下载图片（按输入顺序，传递序号用于排序）
        for (const imageUrl of imageLinks) {
            currentIndex++;
            
            // 更新进度文本和进度条
            if (progressText && progressBar && progressPercent) {
                const progress = Math.round((currentIndex / totalLinks) * 100);
                progressText.textContent = `正在下载第 ${currentIndex} / ${totalLinks} 个图片链接...`;
                progressBar.style.width = progress + '%';
                progressPercent.textContent = progress + '%';
            }
            
            try {
                // 传递序号，用于文件名排序（与可变部分保持一致）
                const success = await downloadImageToFixed(imageUrl, currentIndex);
                if (success) {
                    successCount++;
                    console.log(`✅ [VideoGeneration] 已下载 ${currentIndex}/${totalLinks}: ${imageUrl} (序号: ${currentIndex})`);
                } else {
                    failCount++;
                    console.error(`❌ [VideoGeneration] 下载失败 ${currentIndex}/${totalLinks}: ${imageUrl}`);
                }
                // 每个图片下载后稍作延迟，避免服务器压力
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error('❌ [VideoGeneration] 下载图片失败:', imageUrl, error);
                failCount++;
            }
        }
        
        // 下载完成，更新进度条显示完成状态
        if (progressText && progressBar && progressPercent) {
            progressText.textContent = `下载完成！成功: ${successCount}，失败: ${failCount}`;
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            // 移除动画效果（完成状态）
            progressBar.classList.remove('progress-bar-animated');
        }
        
        // 下载完成后刷新图片列表
        await loadImages();
        
        // 延迟2秒后隐藏进度条，让用户看到完成信息
        setTimeout(() => {
            if (progressContainer) {
                progressContainer.style.display = 'none';
                // 恢复动画效果
                if (progressBar) {
                    progressBar.classList.add('progress-bar-animated');
                    progressBar.style.width = '0%';
                    progressPercent.textContent = '0%';
                }
            }
        }, 2000);
        
        if (successCount > 0) {
            showAlert('success', `成功下载 ${successCount} 张图片到固定部分`);
        }
        if (failCount > 0) {
            showAlert('warning', `${failCount} 张图片下载失败`);
        }
    }
}

// 处理固定部分链接输入（仅处理图片链接）
function handleFixedLinkInput(linkText, immediate = false) {
    // 清除旧的防抖定时器
    if (fixedLinkInputTimer) {
        clearTimeout(fixedLinkInputTimer);
        fixedLinkInputTimer = null;
    }
    
    // 如果 immediate=true，立即执行；否则使用防抖
    if (immediate) {
        processFixedLinks(linkText);
    } else {
        fixedLinkInputTimer = setTimeout(async () => {
            await processFixedLinks(linkText);
        }, 800);  // 800ms防抖
    }
}

// 下载图片到固定部分
async function downloadImageToFixed(imageUrl, orderIndex = null) {
    try {
        const response = await fetch('/api/video-generation/api/download-image', {
            method: 'POST',
            headers: sessionHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ 
                url: imageUrl.trim(),
                folder_type: 'fixed',  // 下载到固定部分
                order: orderIndex  // 传递序号，用于文件名排序
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ [VideoGeneration] 图片已下载到固定部分:', imageUrl, orderIndex !== null ? `(序号: ${orderIndex})` : '');
            return true;
        } else {
            console.error('❌ [VideoGeneration] 图片下载失败:', imageUrl, result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 图片下载异常:', imageUrl, error);
        return false;
    }
}
// ============ 同步功能结束 ============

// ============ 9000端口完整功能 ============
// 全局变量
let isGenerating = false;
let currentGeneratedVideos = [];  // 保存当前生成的视频列表，用于一键下载

// 检查FFmpeg状态
async function checkFFmpegStatus() {
    try {
        const response = await fetch('/api/video-generation/api/check-ffmpeg', {
            headers: sessionHeaders()
        });
        const data = await response.json();
        const statusElement = document.getElementById('ffmpeg-status');
        
        if (data.installed) {
            statusElement.innerHTML = '<span class="status-indicator status-success"></span>FFmpeg 已安装';
        } else {
            statusElement.innerHTML = '<span class="status-indicator status-danger"></span>FFmpeg 未安装';
        }
    } catch (error) {
        console.error('检查FFmpeg状态失败:', error);
        const statusElement = document.getElementById('ffmpeg-status');
        if (statusElement) {
            statusElement.innerHTML = '<span class="status-indicator status-danger"></span>无法连接视频服务';
        }
        showAlert('danger', '无法连接视频服务，请确认 18090 端口的视频生成服务已启动。');
    }
}

// 设置拖拽上传
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            const parentDiv = area.closest('.col-md-6');
            const h5Element = parentDiv ? parentDiv.querySelector('h5') : null;
            const folderType = h5Element && h5Element.textContent.includes('可变') ? 'variable' : 'fixed';
            uploadFiles(folderType, files);
        });
    });
}

// 上传文件
async function uploadFiles(folderType, files = null) {
    if (!files) {
        files = document.getElementById(folderType + '-files').files;
    }
  
    if (!files || files.length === 0) return;
  
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    formData.append('folder_type', folderType);
  
    try {
        const response = await fetch('/api/video-generation/api/upload', {
            method: 'POST',
            headers: sessionHeaders(),
            body: formData
        });
    
        // 检查响应是否为 JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // 如果不是 JSON，尝试读取文本
            const text = await response.text();
            console.error('❌ [VideoGeneration] 上传响应不是 JSON:', text);
            showAlert('danger', `上传失败: 服务器返回了无效响应 (HTTP ${response.status})`);
            return;
        }
        
        if (response.ok) {
            addImages(folderType, data.uploaded || []);
            showAlert('success', `成功上传 ${(data.uploaded || []).length} 个文件`);
            // 上传成功后刷新图片列表，确保后端状态同步
            setTimeout(() => {
                loadImages();
            }, 500);
        } else {
            const errorMsg = data.error || data.message || '上传失败';
            showAlert('danger', errorMsg);
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 上传异常:', error);
        // 如果是 JSON 解析错误，提供更友好的提示
        if (error.message && error.message.includes('JSON')) {
            showAlert('danger', '上传失败: 服务器返回了无效响应，请检查服务器状态');
        } else {
            showAlert('danger', '上传失败: ' + error.message);
        }
    }
}

// 加载图片
async function loadImages() {
    try {
        const [variableResponse, fixedResponse] = await Promise.all([
            fetch('/api/video-generation/api/images/variable', { headers: sessionHeaders() }),
            fetch('/api/video-generation/api/images/fixed', { headers: sessionHeaders() })
        ]);
        
        // 检查响应是否为 JSON
        let variableData, fixedData;
        
        const variableContentType = variableResponse.headers.get('content-type');
        if (variableContentType && variableContentType.includes('application/json')) {
            variableData = await variableResponse.json();
        } else {
            console.error('❌ [VideoGeneration] 可变部分响应不是 JSON');
            variableData = { images: [] };
        }
        
        const fixedContentType = fixedResponse.headers.get('content-type');
        if (fixedContentType && fixedContentType.includes('application/json')) {
            fixedData = await fixedResponse.json();
        } else {
            console.error('❌ [VideoGeneration] 固定部分响应不是 JSON');
            fixedData = { images: [] };
        }
        
        // 减少日志输出频率 - 只在需要时输出（每5次检查输出一次）
        if (__logSuppressCount % LOG_SUPPRESS_INTERVAL === 0) {
            console.log('📥 加载图片列表 - 可变部分:', variableData.images?.length || 0, '张')
            console.log('📥 加载图片列表 - 固定部分:', fixedData.images?.length || 0, '张')
        }
        
        displayImages('variable', variableData.images || []);
        displayImages('fixed', fixedData.images || []);
    } catch (error) {
        console.error('❌ 加载图片失败:', error);
        // 如果是 JSON 解析错误，提供更友好的提示
        if (error.message && error.message.includes('JSON')) {
            console.error('❌ [VideoGeneration] 服务器返回了非 JSON 响应，可能是服务器错误');
        }
    }
}

// 上传背景音乐
async function uploadMusic() {
    const file = document.getElementById('music-file').files[0];
    if (!file) {
        console.warn('⚠️  [VideoGeneration] 未选择音乐文件');
        return;
    }
    
    console.log(`🎵 [VideoGeneration] 开始上传背景音乐: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const formData = new FormData();
    formData.append('music', file);
    
    try {
        const response = await fetch('/api/video-generation/api/upload-music', {
            method: 'POST',
            headers: sessionHeaders(),
            body: formData
        });
        
        // 检查响应是否为 JSON
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            // 如果不是 JSON，尝试读取文本
            const text = await response.text();
            console.error('❌ [VideoGeneration] 音乐上传响应不是 JSON:', text);
            showAlert('danger', `音乐上传失败: 服务器返回了无效响应 (HTTP ${response.status})`);
            return;
        }
        
        console.log(`📥 [VideoGeneration] 音乐上传响应:`, result);
        
        if (response.ok && result.success) {
            console.log(`✅ [VideoGeneration] 音乐上传成功: ${result.filename}`);
            document.getElementById('music-filename').textContent = result.filename;
            document.getElementById('music-info').style.display = 'block';
            showAlert('success', `背景音乐上传成功: ${result.filename}`);
        } else {
            const errorMsg = result.error || result.message || '音乐上传失败';
            console.error(`❌ [VideoGeneration] 音乐上传失败: ${errorMsg}`);
            showAlert('danger', `音乐上传失败: ${errorMsg}`);
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 音乐上传异常:', error);
        // 如果是 JSON 解析错误，提供更友好的提示
        if (error.message && error.message.includes('JSON')) {
            showAlert('danger', '音乐上传失败: 服务器返回了无效响应，请检查服务器状态');
        } else {
            showAlert('danger', '音乐上传失败: ' + error.message);
        }
    }
}

// 移除背景音乐
function removeMusic() {
    document.getElementById('music-file').value = '';
    document.getElementById('music-info').style.display = 'none';
}

// ========== 常用音乐播放功能 ==========
// 全局变量：跟踪当前播放的音乐ID
let currentPlayingMusicId = null;

/**
 * 播放/暂停常用音乐（互斥播放：一个播放时自动暂停其他）
 * @param {string} musicId - 音乐ID（如 'viking01'）
 */
function toggleCommonMusic(musicId) {
    try {
        console.log(`🎵 [VideoGeneration] 切换音乐播放状态: ${musicId}`);
        
        // 获取对应的 audio 元素和按钮
        const audioId = `audio-${musicId}`;
        const audioElement = document.getElementById(audioId);
        const playButton = document.querySelector(`.play-music-btn[data-music-id="${musicId}"]`);
        
        if (!audioElement || !playButton) {
            console.error(`❌ [VideoGeneration] 未找到音乐元素: ${musicId}`);
            return;
        }
        
        // 如果点击的是当前正在播放的音乐，则暂停它
        if (currentPlayingMusicId === musicId && !audioElement.paused) {
            console.log(`⏸️ [VideoGeneration] 暂停当前音乐: ${musicId}`);
            audioElement.pause();
            currentPlayingMusicId = null;
            updatePlayButtonState(playButton, false);
            return;
        }
        
        // 如果点击的是其他音乐，先暂停当前播放的音乐
        if (currentPlayingMusicId && currentPlayingMusicId !== musicId) {
            const previousAudioId = `audio-${currentPlayingMusicId}`;
            const previousAudio = document.getElementById(previousAudioId);
            const previousButton = document.querySelector(`.play-music-btn[data-music-id="${currentPlayingMusicId}"]`);
            
            if (previousAudio) {
                console.log(`⏸️ [VideoGeneration] 暂停之前的音乐: ${currentPlayingMusicId}`);
                previousAudio.pause();
                if (previousButton) {
                    updatePlayButtonState(previousButton, false);
                }
            }
        }
        
        // 播放新音乐
        console.log(`▶️ [VideoGeneration] 播放音乐: ${musicId}`);
        audioElement.play().then(() => {
            currentPlayingMusicId = musicId;
            updatePlayButtonState(playButton, true);
            console.log(`✅ [VideoGeneration] 音乐播放成功: ${musicId}`);
        }).catch(error => {
            console.error(`❌ [VideoGeneration] 音乐播放失败: ${musicId}`, error);
            showAlert('danger', '音乐播放失败，请检查音频文件');
            currentPlayingMusicId = null;
            updatePlayButtonState(playButton, false);
        });
        
        // 监听音乐播放结束事件，自动重置状态
        audioElement.onended = () => {
            console.log(`🔚 [VideoGeneration] 音乐播放结束: ${musicId}`);
            currentPlayingMusicId = null;
            updatePlayButtonState(playButton, false);
        };
        
    } catch (error) {
        console.error(`❌ [VideoGeneration] 切换音乐播放状态异常:`, error);
        showAlert('danger', '播放音乐时发生错误');
    }
}

/**
 * 更新播放按钮的视觉状态
 * @param {HTMLElement} button - 播放按钮元素
 * @param {boolean} isPlaying - 是否正在播放
 */
function updatePlayButtonState(button, isPlaying) {
    if (!button) return;
    
    if (isPlaying) {
        // 正在播放：添加 playing 类，图标会切换到暂停
        button.classList.add('playing');
        // 确保图标正确显示（Bootstrap Icons）
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.remove('bi-play-fill');
            icon.classList.add('bi-pause-fill');
        }
    } else {
        // 已暂停：移除 playing 类，图标切换回播放
        button.classList.remove('playing');
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.remove('bi-pause-fill');
            icon.classList.add('bi-play-fill');
        }
    }
}

/**
 * 初始化常用音乐的播放按钮事件监听器
 */
function initCommonMusicPlayers() {
    try {
        console.log('🎵 [VideoGeneration] 初始化常用音乐播放功能...');
        
        // 为所有播放按钮绑定点击事件
        const playButtons = document.querySelectorAll('.play-music-btn');
        playButtons.forEach(button => {
            const musicId = button.getAttribute('data-music-id');
            if (musicId) {
                // 移除旧的事件监听器（如果存在）
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // 绑定新的点击事件
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCommonMusic(musicId);
                });
                
                console.log(`✅ [VideoGeneration] 已绑定播放按钮事件: ${musicId}`);
            }
        });
        
        console.log(`✅ [VideoGeneration] 常用音乐播放功能初始化完成，共 ${playButtons.length} 个按钮`);
    } catch (error) {
        console.error('❌ [VideoGeneration] 初始化常用音乐播放功能失败:', error);
    }
}

/**
 * 使用常用音乐（下载并上传到服务器）
 * @param {string} musicUrl - 音乐文件的URL路径（如 '/assets/music/viking01.MP3'）
 * @param {string} musicName - 音乐文件名（如 'viking01.MP3'）
 * @param {string} musicId - 音乐ID（如 'viking01'）
 */
async function useCommonMusic(musicUrl, musicName, musicId) {
    const useButton = document.querySelector(`.use-music-btn[data-music-id="${musicId}"]`);
    
    if (!useButton) {
        console.error(`❌ [VideoGeneration] 未找到使用按钮: ${musicId}`);
        return;
    }
    
    // 检查是否正在加载中，防止重复点击
    if (useButton.disabled || useButton.classList.contains('loading')) {
        console.warn('⚠️ [VideoGeneration] 正在处理中，请稍候...');
        return;
    }
    
    try {
        // 设置Loading状态
        setUseButtonLoading(useButton, true);
        
        console.log(`🎵 [VideoGeneration] 开始使用常用音乐: ${musicName} (${musicUrl})`);
        
        // 步骤1：从URL下载音乐文件
        console.log(`📥 [VideoGeneration] 正在下载音乐文件: ${musicUrl}`);
        const response = await fetch(musicUrl);
        
        if (!response.ok) {
            throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`);
        }
        
        // 步骤2：将响应转换为Blob
        const blob = await response.blob();
        console.log(`✅ [VideoGeneration] 音乐文件下载成功: ${blob.size} 字节 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // 步骤3：将Blob转换为File对象（模拟文件上传）
        const file = new File([blob], musicName, {
            type: blob.type || 'audio/mpeg',
            lastModified: Date.now()
        });
        console.log(`📦 [VideoGeneration] 已创建File对象: ${file.name} (${file.type})`);
        
        // 步骤4：创建FormData并上传到服务器
        const formData = new FormData();
        formData.append('music', file);
        
        console.log(`📤 [VideoGeneration] 开始上传音乐到服务器...`);
        const uploadResponse = await fetch('/api/video-generation/api/upload-music', {
            method: 'POST',
            headers: sessionHeaders(),
            body: formData
        });
        
        // 检查响应是否为JSON
        const contentType = uploadResponse.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await uploadResponse.json();
        } else {
            const text = await uploadResponse.text();
            console.error('❌ [VideoGeneration] 音乐上传响应不是 JSON:', text);
            throw new Error(`服务器返回了无效响应 (HTTP ${uploadResponse.status})`);
        }
        
        console.log(`📥 [VideoGeneration] 音乐上传响应:`, result);
        
        if (uploadResponse.ok && result.success) {
            console.log(`✅ [VideoGeneration] 常用音乐上传成功: ${result.filename}`);
            // 更新UI显示
            document.getElementById('music-filename').textContent = result.filename;
            document.getElementById('music-info').style.display = 'block';
            showAlert('success', `背景音乐已设置为: ${result.filename}`);
        } else {
            const errorMsg = result.error || result.message || '音乐上传失败';
            console.error(`❌ [VideoGeneration] 常用音乐上传失败: ${errorMsg}`);
            showAlert('danger', `音乐上传失败: ${errorMsg}`);
        }
        
    } catch (error) {
        console.error(`❌ [VideoGeneration] 使用常用音乐异常:`, error);
        showAlert('danger', `使用音乐失败: ${error.message || '未知错误'}`);
    } finally {
        // 无论成功还是失败，都要取消Loading状态
        setUseButtonLoading(useButton, false);
    }
}

/**
 * 设置"使用此音乐"按钮的Loading状态
 * @param {HTMLElement} button - 按钮元素
 * @param {boolean} isLoading - 是否正在加载
 */
function setUseButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        // 显示Loading状态
        button.classList.add('loading');
        button.disabled = true;
        const btnText = button.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = '使用中...';
        }
        console.log(`🔄 [VideoGeneration] 按钮进入Loading状态`);
    } else {
        // 取消Loading状态
        button.classList.remove('loading');
        button.disabled = false;
        const btnText = button.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = '使用此音乐';
        }
        console.log(`✅ [VideoGeneration] 按钮取消Loading状态`);
    }
}

/**
 * 初始化常用音乐的"使用此音乐"按钮事件监听器
 */
function initCommonMusicUseButtons() {
    try {
        console.log('🎵 [VideoGeneration] 初始化常用音乐"使用"功能...');
        
        // 为所有"使用此音乐"按钮绑定点击事件
        const useButtons = document.querySelectorAll('.use-music-btn');
        useButtons.forEach(button => {
            const musicUrl = button.getAttribute('data-music-url');
            const musicName = button.getAttribute('data-music-name');
            const musicId = button.getAttribute('data-music-id');
            
            if (musicUrl && musicName && musicId) {
                // 移除旧的事件监听器（如果存在）
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // 绑定新的点击事件
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    useCommonMusic(musicUrl, musicName, musicId);
                });
                
                console.log(`✅ [VideoGeneration] 已绑定"使用"按钮事件: ${musicId} (${musicName})`);
            } else {
                console.warn(`⚠️ [VideoGeneration] 按钮缺少必要的data属性:`, { musicUrl, musicName, musicId });
            }
        });
        
        console.log(`✅ [VideoGeneration] 常用音乐"使用"功能初始化完成，共 ${useButtons.length} 个按钮`);
    } catch (error) {
        console.error('❌ [VideoGeneration] 初始化常用音乐"使用"功能失败:', error);
    }
}

// 上传背景图片
async function uploadBackground() {
    const file = document.getElementById('background-file').files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('background', file);
  
    try {
        console.log('🎨 [VideoGeneration] 开始上传背景图片:', file.name, file.size, 'bytes');

        const response = await fetch('/api/video-generation/api/upload-background', {
            method: 'POST',
            headers: sessionHeaders(),
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ [VideoGeneration] 背景图片上传成功:', result);
            document.getElementById('background-filename').textContent = result.filename;
            document.getElementById('background-info').style.display = 'block';
            showAlert('success', `背景图片上传成功: ${result.filename}`);
        } else {
            console.warn('⚠️ [VideoGeneration] 背景图片上传失败:', result);
            showAlert('danger', '背景图片上传失败: ' + result.message);
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 背景图片上传异常:', error);
        showAlert('danger', '背景图片上传失败');
    }
}

// 移除背景图片
function removeBackground() {
    document.getElementById('background-file').value = '';
    document.getElementById('background-info').style.display = 'none';
}

// 上传背景视频
async function uploadBackgroundVideo() {
    const file = document.getElementById('background-video-file').files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('background_video', file);
    
    try {
        console.log('🎬 [VideoGeneration] 开始上传背景视频:', file.name, file.size, 'bytes');

        const response = await fetch('/api/video-generation/api/upload-background-video', {
            method: 'POST',
            headers: sessionHeaders(),
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ [VideoGeneration] 背景视频上传成功:', result);
            document.getElementById('background-video-filename').textContent = result.filename;
            document.getElementById('background-video-info').style.display = 'block';
            showAlert('success', `背景视频上传成功: ${result.filename}`);
        } else {
            console.warn('⚠️ [VideoGeneration] 背景视频上传失败:', result);
            showAlert('danger', '背景视频上传失败: ' + result.message);
        }
    } catch (error) {
        console.error('❌ [VideoGeneration] 背景视频上传异常:', error);
        showAlert('danger', '背景视频上传失败');
    }
}

// 移除背景视频
function removeBackgroundVideo() {
    document.getElementById('background-video-file').value = '';
    document.getElementById('background-video-info').style.display = 'none';
}

// 显示图片
function displayImages(folderType, images) {
    const container = document.getElementById(folderType + '-images');
    
    if (!container) {
        console.error(`❌ 找不到容器元素: ${folderType}-images`)
        return
    }
    
    // 减少日志输出频率 - 只在需要时输出（每5次检查输出一次）
    if (__logSuppressCount % LOG_SUPPRESS_INTERVAL === 0) {
        console.log(`📸 显示${folderType}部分图片:`, images.length, '张')
    }
    
    if (images.length === 0) {
        container.innerHTML = '<div class="text-muted text-center py-3">暂无图片</div>';
        return;
    }
    
    const sessionId = encodeURIComponent(getSessionId());
    container.innerHTML = images.map(image => {
        const encodedImage = encodeURIComponent(image);
            return `
            <div class="d-flex align-items-center mb-2 p-2 bg-white rounded border">
                <img src="/api/video-generation/uploads/${folderType}/${encodedImage}?sid=${sessionId}" class="image-preview me-3" alt="${image}" style="width: 80px; height: 80px; object-fit: cover;">
                <div class="flex-grow-1">
                    <small class="text-muted d-block">${image}</small>
                </div>
            </div>
        `;
    }).join('');
}

// 追加新图片到现有列表
function addImages(folderType, newImages) {
    const container = document.getElementById(folderType + '-images');
    
    if (container.innerHTML.includes('暂无图片')) {
        container.innerHTML = '';
    }
    
    const sessionId = encodeURIComponent(getSessionId());
    newImages.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'd-flex align-items-center mb-2 p-2 bg-white rounded border';
        const encodedImage = encodeURIComponent(image);
        imageElement.innerHTML = `
            <img src="/api/video-generation/uploads/${folderType}/${encodedImage}?sid=${sessionId}" class="image-preview me-3" alt="${image}">
            <div class="flex-grow-1">
                <small class="text-muted">${image}</small>
            </div>
        `;
        container.appendChild(imageElement);
    });
}

// 删除图片
async function deleteImage(filename, folderType) {
    if (!confirm('确定要删除这张图片吗？')) return;
    
    try {
        const response = await fetch('/api/video-generation/api/delete-image', {
            method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'}),
            body: JSON.stringify({filename, folder_type: folderType})
        });
        
        if (response.ok) {
            loadImages();
            showAlert('success', '图片已删除');
        } else {
            const data = await response.json();
            showAlert('danger', data.error || '删除失败');
        }
    } catch (error) {
        showAlert('danger', '删除失败: ' + error.message);
    }
}

// 生成视频
async function generateVideos() {
    if (isGenerating) {
        showAlert('warning', '正在生成视频中，请勿重复点击！');
        return;
    }
    
    const duration = parseFloat(document.getElementById('duration').value);
    if (isNaN(duration) || duration <= 0) {
        showAlert('warning', '请输入有效的时长');
        return;
    }
    
    isGenerating = true;
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.querySelector('.progress-bar');
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.classList.add('progress-bar-animated');
    
    const generateBtn = document.querySelector('button[onclick="generateVideos()"]');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 生成中...';
    
    let progress = 0;
    let progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 200);
    
    try {
        const musicFilename = document.getElementById('music-filename').textContent || null;
        const backgroundFilename = document.getElementById('background-filename').textContent || null;
        const blurBackground = document.getElementById('blur-background').checked;
        const backgroundVideoFilename = document.getElementById('background-video-filename').textContent || null;
        
        // 获取轮播视频模式复选框状态，增强日志
        const rotationModeCheckbox = document.getElementById('rotation-mode');
        const rotationMode = rotationModeCheckbox ? rotationModeCheckbox.checked : false;
        console.log('🎬 [VideoGeneration] 轮播视频模式复选框状态:', {
            elementExists: !!rotationModeCheckbox,
            checked: rotationMode,
            type: typeof rotationMode,
            willSend: rotationMode,
            element: rotationModeCheckbox
        });
        
        console.log('🎬 [VideoGeneration] 准备生成视频，参数:', {
            duration: duration,
            music_file: musicFilename,
            background_file: backgroundFilename,
            blur_background: blurBackground,
            background_video_file: backgroundVideoFilename,
            rotation_mode: rotationMode,
            rotation_mode_type: typeof rotationMode
        });
        
        const response = await fetch('/api/video-generation/api/generate', {
            method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'}),
            body: JSON.stringify({
                duration: duration,
                music_file: musicFilename,
                background_file: backgroundFilename,
                blur_background: blurBackground,
                background_video_file: backgroundVideoFilename,
                rotation_mode: rotationMode
            })
        });
        
        const data = await response.json();
        
        // 检查响应数据
        if (!data) {
            throw new Error('服务器返回空响应');
        }
        
        if (data.success) {
            // 检查是否有视频生成
            if (!data.videos || !Array.isArray(data.videos) || data.videos.length === 0) {
                const errorMsg = data.message || '视频生成完成，但没有生成任何视频。请检查图片和设置。';
                showAlert('warning', errorMsg);
                console.error('视频生成失败 - 没有视频:', data);
                return; // 不显示模态框，直接返回
            }
            
            const successMessage = data.message || `成功生成 ${data.videos.length} 个视频`;
            showAlert('success', successMessage);
            if (data.failed_count && data.failed_count > 0) {
                showAlert('warning', `有 ${data.failed_count} 个视频生成失败，请检查日志。`);
            }
            loadVideos();
            showResultModal(data.videos);
            
            // 清空背景素材的显示（后端已清空文件，前端也需要清空显示，避免用户误解）
            removeBackground();
            removeMusic();
            removeBackgroundVideo();
            console.log('🧹 [VideoGeneration] 已清空背景素材的显示（背景图片、背景音乐、背景视频）');
            
            // 同步视频链接到广告页面
            if (data.videos && data.videos.length > 0) {
                try {
                    const sessionId = encodeURIComponent(getSessionId());
                    const videoLinks = data.videos.map(v => {
                        return `/api/video-generation/api/download/${encodeURIComponent(v.video_name)}?sid=${sessionId}`;
                    }).join('\n');
                    
                    // 动态导入广告页 store
                    const { useAdCampaignStore } = await import('@/stores/adCampaign.js');
                    const adStore = useAdCampaignStore();
                    adStore.updateFormData({ '商品图片链接': videoLinks });
                    
                    showAlert('success', `已同步 ${data.videos.length} 个视频链接到广告页面`);
                    console.log('✅ [VideoGeneration] 视频链接已同步到广告页面:', videoLinks);
                } catch (error) {
                    console.warn('⚠️ [VideoGeneration] 同步视频链接失败:', error);
                    // 不阻塞主流程，只记录警告
                }
            }
        } else {
            // 生成失败，不显示模态框
            const errorMessage = data.message || '生成失败，请检查网络连接和服务状态';
            showAlert('danger', errorMessage);
            console.error('视频生成失败:', data);
        }
    } catch (error) {
        // 网络错误或其他异常
        let errorMessage = '生成失败: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = '网络连接失败，请检查网络连接或确保视频服务正在运行';
        }
        showAlert('danger', errorMessage);
        console.error('视频生成异常:', error);
    } finally {
        isGenerating = false;
        clearInterval(progressInterval);
        
        progressBar.style.width = '100%';
        setTimeout(() => {
            document.querySelector('.progress-container').style.display = 'none';
            document.querySelector('.progress-bar').classList.remove('progress-bar-animated');
            progressBar.style.width = '0%';
        }, 500);
        
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="bi bi-play-circle"></i> 生成视频';
    }
}

// 显示结果模态框
function showResultModal(videos) {
    // 保存当前生成的视频列表，用于一键下载功能
    currentGeneratedVideos = videos || [];
    console.log(`💾 [VideoGeneration] 已保存 ${currentGeneratedVideos.length} 个视频到下载列表`, currentGeneratedVideos);
    
    const content = document.getElementById('result-content');
    content.innerHTML = `
        <div class="row">
            ${videos.map(video => `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">${video.video_name}</h6>
                            <p class="card-text">
                                <small class="text-muted">
                                    时长: ${video.duration.toFixed(1)}秒<br>
                                    图片数: ${video.sequence.length}张
                                </small>
                            </p>
                            <button class="btn btn-primary btn-sm" onclick="downloadVideo('${video.video_name}')">
                                <i class="bi bi-download"></i> 下载
                            </button>
            </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-4">
            <button type="button" class="btn btn-success" onclick="downloadAllVideos()">
                <i class="bi bi-download"></i> 一键下载所有视频
                </button>
            </div>
    `;
    
    // 使用 Bootstrap Modal
    const modalElement = document.getElementById('resultModal');
    if (window.bootstrap && window.bootstrap.Modal) {
        new window.bootstrap.Modal(modalElement).show();
        } else {
        // 降级方案：直接显示模态框
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
    }
}

// 下载视频到本地
async function downloadVideo(filename) {
    try {
        const sessionId = encodeURIComponent(getSessionId());
        const downloadUrl = `/api/video-generation/api/download/${filename}?sid=${sessionId}`;
        
        console.log('📥 开始下载视频:', filename);
        
        // 使用 fetch 获取视频文件
        const response = await fetch(downloadUrl, {
            headers: sessionHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`下载失败: HTTP ${response.status}`);
        }
        
        // 将响应转换为 Blob
        const blob = await response.blob();
        
        // 创建临时 URL
        const url = window.URL.createObjectURL(blob);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = filename; // 设置下载文件名
        document.body.appendChild(link);
        
        // 触发下载
        link.click();
        
        // 清理
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ 视频下载成功:', filename);
        showAlert('success', `视频 ${filename} 下载成功`);
    } catch (error) {
        console.error('❌ 视频下载失败:', error);
        showAlert('danger', `视频下载失败: ${error.message}`);
    }
}

// 一键下载所有视频到本地（逐个下载，就像手动点击每个下载按钮）
async function downloadAllVideos() {
    try {
        console.log('📥 开始一键下载所有视频...');
        
        // 优先使用当前生成的视频列表（与显示的视频一致）
        let videos = [];
        if (currentGeneratedVideos && currentGeneratedVideos.length > 0) {
            // 使用保存的当前生成视频列表
            videos = currentGeneratedVideos.map(video => ({
                filename: video.video_name,  // 转换为API需要的格式
                video_name: video.video_name,
                duration: video.duration,
                sequence: video.sequence
            }));
            console.log(`✅ [VideoGeneration] 使用当前生成的视频列表: ${videos.length} 个视频`);
        } else {
            // 降级方案：如果列表为空，才调用API获取所有视频
            console.log('⚠️ [VideoGeneration] 当前视频列表为空，降级使用API获取所有视频');
            const response = await fetch('/api/video-generation/api/videos', {
                headers: sessionHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`获取视频列表失败: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            videos = data.videos || [];
        }
        
        if (videos.length === 0) {
            showAlert('warning', '没有可下载的视频');
            return;
        }
        
        console.log(`📋 找到 ${videos.length} 个视频，开始逐个下载...`);
        showAlert('info', `正在下载 ${videos.length} 个视频，请稍候...`);
        
        let successCount = 0;
        let failedCount = 0;
        const failedVideos = [];
        
        // 逐个下载每个视频，每个下载之间延迟一小段时间，避免浏览器阻止多个下载
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const filename = video.filename || video.video_name;
            
            try {
                console.log(`📥 正在下载视频 ${i + 1}/${videos.length}: ${filename}`);
                
                // 调用单个视频下载函数（复用现有的downloadVideo逻辑）
                const sessionId = encodeURIComponent(getSessionId());
                const downloadUrl = `/api/video-generation/api/download/${filename}?sid=${sessionId}`;
                
                const downloadResponse = await fetch(downloadUrl, {
                    headers: sessionHeaders()
                });
                
                if (!downloadResponse.ok) {
                    throw new Error(`HTTP ${downloadResponse.status}`);
                }
                
                // 将响应转换为 Blob
                const blob = await downloadResponse.blob();
                
                // 创建临时 URL
                const url = window.URL.createObjectURL(blob);
                
                // 创建下载链接
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                
                // 触发下载
                link.click();
                
                // 清理
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                successCount++;
                console.log(`✅ 视频下载成功 ${i + 1}/${videos.length}: ${filename}`);
                
                // 每个视频下载后延迟一小段时间（300ms），避免浏览器阻止连续下载
                if (i < videos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
            } catch (error) {
                failedCount++;
                failedVideos.push(filename);
                console.error(`❌ 视频下载失败 ${i + 1}/${videos.length}: ${filename} - ${error.message}`);
            }
        }
        
        // 显示最终结果
        if (failedCount === 0) {
            console.log(`✅ 所有 ${successCount} 个视频下载完成`);
            showAlert('success', `成功下载 ${successCount} 个视频`);
        } else {
            console.warn(`⚠️ 下载完成: 成功 ${successCount} 个, 失败 ${failedCount} 个`);
            showAlert('warning', `下载完成: 成功 ${successCount} 个, 失败 ${failedCount} 个${failedVideos.length > 0 ? ` (${failedVideos.join(', ')})` : ''}`);
        }
        
    } catch (error) {
        console.error('❌ 一键下载失败:', error);
        const errorMessage = error.message || '未知错误';
        showAlert('danger', `一键下载失败: ${errorMessage}`);
    }
}

// 加载视频列表
async function loadVideos() {
    try {
        const response = await fetch('/api/video-generation/api/videos', {
            headers: sessionHeaders()
        });
        const data = await response.json();
        displayVideos(data.videos || []);
    } catch (error) {
        console.error('加载视频失败:', error);
    }
}

// 显示视频列表
function displayVideos(videos) {
    const container = document.getElementById('videos-list');
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-video fs-1"></i>
                <p>暂无生成的视频</p>
            </div>
        `;
        return;
    }
    
    const sessionId = encodeURIComponent(getSessionId());
    container.innerHTML = videos.map(video => {
        const encodedFilename = encodeURIComponent(video.filename);
        return `
            <div class="video-item">
                <div class="d-flex align-items-center">
                    <i class="bi bi-play-circle fs-4 me-3 text-primary"></i>
            <div class="flex-grow-1">
                        <h6 class="mb-1">${video.filename}</h6>
                        <small class="text-muted">
                            大小: ${formatFileSize(video.size)} | 
                            创建时间: ${new Date(video.created).toLocaleString()}
                        </small>
            </div>
                    <div>
                        <button class="btn btn-primary btn-sm me-2" onclick="downloadVideo('${video.filename}')">
                            <i class="bi bi-download"></i> 下载
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteVideo('${video.filename}')">
                            <i class="bi bi-trash"></i> 删除
                </button>
            </div>
                </div>
            </div>
        `;
    }).join('');
}

// 删除视频
async function deleteVideo(filename) {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    try {
        const response = await fetch('/api/video-generation/api/delete-video', {
            method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'}),
            body: JSON.stringify({filename})
        });
        
        if (response.ok) {
            loadVideos();
            showAlert('success', '视频已删除');
        } else {
            const data = await response.json();
            showAlert('danger', data.error || '删除失败');
        }
    } catch (error) {
        showAlert('danger', '删除失败: ' + error.message);
    }
}

// 清空后端文件
async function clearAllFiles() {
    try {
        const response = await fetch('/api/video-generation/api/clear-all', {
                method: 'POST',
            headers: sessionHeaders({'Content-Type': 'application/json'})
        });
        if (response.ok) {
            console.log('✅ 已清空后端旧文件');
            } else {
            console.log('⚠️ 清空后端文件失败');
        }
    } catch (error) {
        console.log('⚠️ 清空后端文件失败:', error);
    }
}

// 清空所有前端显示数据
function clearAllData() {
    const variableImages = document.getElementById('variable-images');
    const fixedImages = document.getElementById('fixed-images');
    if (variableImages) variableImages.innerHTML = '<div class="text-muted text-center py-3">暂无图片</div>';
    if (fixedImages) fixedImages.innerHTML = '<div class="text-muted text-center py-3">暂无图片</div>';
    
    const videoList = document.getElementById('videos-list');
    if (videoList) videoList.innerHTML = '<div class="text-muted text-center py-3">暂无视频</div>';
    
    const musicInfo = document.getElementById('music-info');
    const musicFile = document.getElementById('music-file');
    if (musicInfo) musicInfo.style.display = 'none';
    if (musicFile) musicFile.value = '';
    
    const backgroundInfo = document.getElementById('background-info');
    const backgroundFile = document.getElementById('background-file');
    const blurBackground = document.getElementById('blur-background');
    if (backgroundInfo) backgroundInfo.style.display = 'none';
    if (backgroundFile) backgroundFile.value = '';
    if (blurBackground) blurBackground.checked = false;
    
    const backgroundVideoInfo = document.getElementById('background-video-info');
    const backgroundVideoFile = document.getElementById('background-video-file');
    if (backgroundVideoInfo) backgroundVideoInfo.style.display = 'none';
    if (backgroundVideoFile) backgroundVideoFile.value = '';
}

async function clearAll() {
    if (!confirm('确定要清空所有文件吗？此操作不可恢复！')) return;
    
    try {
        console.log('🗑️  [VideoGeneration] 用户点击清空所有按钮')
        
        // 1. 清空视频服务的文件
        const response = await fetch('/api/video-generation/api/clear-all', {
            method: 'POST',
            headers: sessionHeaders()
        });
        
        if (response.ok) {
            // 清空图片和视频显示
            loadImages();
            loadVideos();
            clearAllData();
            
            // 2. 清空图片链接文件 - 这是真正的关键！
            console.log('🗑️  [VideoGeneration] 清空图片链接文件...')
            const sessionIdForClear = encodeURIComponent(getSessionId())
            const clearLinksResponse = await fetch(`/api/image-links?sid=${sessionIdForClear}`, {
                method: 'DELETE',
                headers: sessionHeaders({ 'Content-Type': 'application/json' })
            })
            
            if (clearLinksResponse.ok) {
                console.log('✅ [VideoGeneration] 图片链接文件已清空')
            } else {
                console.warn('⚠️  [VideoGeneration] 清空图片链接失败，但不影响继续')
            }
            
            // 3. 重置同步状态
            console.log('🔄 [VideoGeneration] 重置同步状态')
            __lastDownloadedSignature = ''
            window.lastSyncedLinks = null
            
            // 4. 隐藏同步的图片链接区域
            const syncedSection = document.getElementById('synced-images-section')
            if (syncedSection) {
                syncedSection.style.display = 'none'
                console.log('✅ [VideoGeneration] 已隐藏同步图片链接区域')
            }
            
            // 5. 同步清空广告页面的视频链接
            try {
                const { useAdCampaignStore } = await import('@/stores/adCampaign.js');
                const adStore = useAdCampaignStore();
                adStore.updateFormData({ '商品图片链接': '' });
                console.log('✅ [VideoGeneration] 已清空广告页面的视频链接');
            } catch (error) {
                console.warn('⚠️ [VideoGeneration] 清空广告页面视频链接失败:', error);
            }
            
            showAlert('success', '所有文件已清空');
        } else {
            const data = await response.json();
            showAlert('danger', data.error || '清空失败');
        }
    } catch (error) {
        showAlert('danger', '清空失败: ' + error.message);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示提示信息
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// 在所有函数定义后，最终暴露全局函数
setupGlobalFunctions();
</script>

<style scoped>
.upload-area {
    border: 2px dashed #dee2e6;
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
}
.upload-area:hover {
    border-color: #0d6efd;
    background-color: #f8f9fa;
}
.upload-area.dragover {
    border-color: #0d6efd;
    background-color: #e7f3ff;
}
.image-preview {
    max-width: 100px;
    max-height: 100px;
    object-fit: cover;
    border-radius: 5px;
}
.video-item {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    background-color: #f8f9fa;
}
.progress-container {
    display: none;
    margin-top: 15px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
}
.progress-container small {
    font-weight: 600;
    color: #495057;
}
.progress {
    height: 20px;
    background-color: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
}
.progress-bar {
    background: linear-gradient(45deg, #007bff, #0056b3);
    transition: width 0.3s ease;
}
.progress-bar-animated {
    animation: progress-bar-stripes 1s linear infinite;
}
@keyframes progress-bar-stripes {
    0% { background-position: 0 0; }
    100% { background-position: 40px 0; }
}
.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}
.status-success { background-color: #28a745; }
.status-warning { background-color: #ffc107; }
.status-danger { background-color: #dc3545; }

/* 常用音乐区域样式 */
.common-music-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 500px;
    overflow-y: auto;
    padding-right: 10px;
}

/* 自定义滚动条样式（WebKit浏览器：Chrome, Edge, Safari） */
.common-music-list::-webkit-scrollbar {
    width: 6px;
}

.common-music-list::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 10px;
}

.common-music-list::-webkit-scrollbar-thumb:hover {
    background-color: #999;
}

.common-music-list::-webkit-scrollbar-track {
    background-color: #f1f1f1;
    border-radius: 10px;
}

.common-music-card {
    transition: all 0.2s ease;
}

.common-music-card:hover {
    background-color: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.common-music-card .border {
    border-color: #dee2e6 !important;
    transition: border-color 0.2s ease;
}

.common-music-card:hover .border {
    border-color: #0d6efd !important;
}

/* 播放按钮样式 */
.play-music-btn {
    min-width: 36px;
    padding: 0.25rem 0.5rem;
    transition: all 0.2s ease;
}

.play-music-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
}

.play-music-btn.playing {
    background-color: #0d6efd;
    border-color: #0d6efd;
    color: white;
}

.play-music-btn.playing .bi-play-fill {
    display: none;
}

.play-music-btn .bi-pause-fill {
    display: none;
}

.play-music-btn.playing .bi-pause-fill {
    display: inline-block;
}

/* 使用按钮样式 */
.use-music-btn {
    min-width: 100px;
    position: relative;
    transition: all 0.2s ease;
}

.use-music-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(25, 135, 84, 0.3);
}

.use-music-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.use-music-btn .btn-text {
    display: inline-block;
}

.use-music-btn.loading .btn-text {
    display: none;
}

.use-music-btn.loading .spinner-border {
    display: inline-block !important;
}

/* 响应式布局优化 */
@media (max-width: 768px) {
    .common-music-list {
        margin-bottom: 1rem;
    }
    
    .common-music-card .d-flex {
        flex-wrap: wrap;
    }
    
    .common-music-card .fw-bold {
        width: 100%;
        margin-bottom: 0.5rem;
    }
    
    .play-music-btn,
    .use-music-btn {
        flex: 1;
        min-width: auto;
    }
}
</style>





