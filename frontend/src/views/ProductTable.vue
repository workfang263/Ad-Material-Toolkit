<template>
  <div class="product-table-container">
    <iframe
      src="http://192.168.0.67:5001/"
      frameborder="0"
      class="product-table-iframe"
      title="产品表格生成工具"
      @load="onIframeLoad"
    ></iframe>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const iframeRef = ref(null)

// iframe 加载完成
const onIframeLoad = () => {
  console.log('✅ [ProductTable] iframe 加载完成')
  try {
    // 尝试调整 iframe 高度（如果允许）
    const iframe = document.querySelector('.product-table-iframe')
    if (iframe && iframe.contentWindow) {
      // 注意：跨域情况下可能无法访问 contentWindow
      console.log('✅ [ProductTable] iframe 内容已加载')
    }
  } catch (e) {
    // 跨域限制，无法访问 iframe 内容，这是正常的
    console.log('ℹ️ [ProductTable] 跨域限制，无法访问 iframe 内容（这是正常的）')
  }
}

onMounted(() => {
  console.log('📊 [ProductTable] 产品表格页面已加载')
})

onUnmounted(() => {
  console.log('📊 [ProductTable] 产品表格页面已卸载')
})
</script>

<style scoped>
.product-table-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.product-table-iframe {
  width: 100%;
  height: calc(100vh - 40px); /* 减去 padding */
  border: none;
  display: block;
}

/* 确保容器占满父元素 */
.product-table-container {
  padding: 0;
  margin: 0;
}
</style>


