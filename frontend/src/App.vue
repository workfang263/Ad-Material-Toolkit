<template>
  <div id="app" :class="{ 'embed-mode': isEmbedMode }">
    <div class="layout-container">
      <!-- 左侧导航栏 - 嵌入模式下隐藏 -->
      <div class="sidebar" v-if="!isEmbedMode">
        <div class="sidebar-header">
          <div class="logo">
            <span>融合平台</span>
          </div>
        </div>
        
        <div class="sidebar-menu">
          <div 
            class="menu-item" 
            :class="{ active: activeIndex === 'ad-campaign' }"
            @click="handleSelect('ad-campaign')"
          >
            <span>广告投放</span>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: activeIndex === 'video-generation' }"
            @click="handleSelect('video-generation')"
          >
            <span>视频生成</span>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: activeIndex === 'product-table' }"
            @click="handleSelect('product-table')"
          >
            <span>产品表格</span>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: activeIndex === 'image-stitch' }"
            @click="handleSelect('image-stitch')"
          >
            <span>图片拼接</span>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 - 嵌入模式下全屏显示 -->
      <div class="main-content" :class="{ 'full-width': isEmbedMode }">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const activeIndex = ref('ad-campaign')
const isEmbedMode = ref(false) // 嵌入模式标志

// 检测是否在 iframe 中
const checkEmbedMode = () => {
  // 方法1: 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('embed') === 'true') {
    isEmbedMode.value = true
    return
  }
  
  // 方法2: 检查是否在 iframe 中
  try {
    if (window.self !== window.top) {
      isEmbedMode.value = true
    }
  } catch (e) {
    // 跨域情况下会抛出异常，也说明在 iframe 中
    isEmbedMode.value = true
  }
}

// 计算属性
const currentRoute = computed(() => route.name)

// 监听路由变化
watch(() => route.name, (newRoute) => {
  if (newRoute) {
    activeIndex.value = newRoute
  }
}, { immediate: true })

// 处理菜单选择
const handleSelect = (key) => {
  activeIndex.value = key
  router.push({ name: key })
}

// 发送高度信息给父窗口（用于 iframe 高度自适应）
const sendHeightToParent = () => {
  try {
    const height = document.documentElement.scrollHeight
    window.parent.postMessage({
      type: 'iframe-resize',
      height: height
    }, '*') // 生产环境建议指定具体 origin: 'http://192.168.0.51:5173'
  } catch (e) {
    // 忽略跨域错误
  }
}

// 页面加载时检测嵌入模式
onMounted(() => {
  checkEmbedMode()
  
  // 如果是嵌入模式，发送高度信息给父窗口
  if (isEmbedMode.value) {
    sendHeightToParent()
    
    // 监听内容变化，自动调整高度
    const resizeObserver = new ResizeObserver(() => {
      sendHeightToParent()
    })
    resizeObserver.observe(document.body)
    
    // 清理函数
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
    
    // 监听窗口大小变化
    window.addEventListener('resize', sendHeightToParent)
    onUnmounted(() => {
      window.removeEventListener('resize', sendHeightToParent)
    })
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
}

.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: bold;
  gap: 8px;
}

.sidebar-menu {
  padding: 20px 0;
}

.menu-section {
  margin-bottom: 10px;
}

.menu-section-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 16px;
  margin: 10px 10px 5px 10px;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 15px 20px;
}

.menu-item {
  color: white;
  margin: 5px 10px;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.menu-item:hover,
.menu-item.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.main-content {
  flex: 1;
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

/* 嵌入模式样式 */
.embed-mode .sidebar {
  display: none !important;
}

.embed-mode .main-content.full-width {
  width: 100%;
  padding: 0; /* 嵌入模式下移除内边距，充分利用空间 */
}

/* 嵌入模式下，确保内容区域占满全屏 */
.embed-mode .layout-container {
  height: 100vh;
}

.embed-mode .main-content {
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .main-content {
    padding: 10px;
  }
}
</style>