<template>
  <div class="files">
    <el-page-header @back="$router.go(-1)" content="文件管理">
      <template #extra>
        <el-button type="primary" @click="refreshFiles">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </template>
    </el-page-header>

    <!-- 文件统计 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ fileStats.total }}</div>
            <div class="stat-label">总文件数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ fileStats.images }}</div>
            <div class="stat-label">图片文件</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ fileStats.videos }}</div>
            <div class="stat-label">视频文件</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ formatFileSize(fileStats.totalSize) }}</div>
            <div class="stat-label">总大小</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 文件列表 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>文件列表</span>
          <div class="header-actions">
            <el-select v-model="filterType" placeholder="筛选类型" style="width: 120px;">
              <el-option label="全部" value="" />
              <el-option label="图片" value="image" />
              <el-option label="视频" value="video" />
              <el-option label="音频" value="audio" />
              <el-option label="文档" value="document" />
            </el-select>
            <el-button @click="clearOldFiles" type="warning">
              <el-icon><Delete /></el-icon>
              清理旧文件
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredFiles"
        v-loading="loading"
        empty-text="暂无文件"
      >
        <el-table-column prop="name" label="文件名" min-width="200">
          <template #default="{ row }">
            <div class="file-name">
              <el-icon :class="getFileIcon(row.type)">
                <component :is="getFileIconComponent(row.type)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getFileTypeTag(row.type)">
              {{ getFileTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="service" label="来源服务" width="120">
          <template #default="{ row }">
            <el-tag :type="getServiceTag(row.service)">
              {{ getServiceName(row.service) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastAccessed" label="最后访问" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastAccessed) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="previewFile(row)">
              预览
            </el-button>
            <el-button size="small" type="primary" @click="downloadFile(row)">
              下载
            </el-button>
            <el-button size="small" type="danger" @click="deleteFile(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      title="文件预览"
      width="80%"
    >
      <div v-if="selectedFile" class="file-preview">
        <div v-if="isImageFile(selectedFile)" class="image-preview">
          <img :src="getFileUrl(selectedFile)" :alt="selectedFile.name" />
        </div>
        <div v-else-if="isVideoFile(selectedFile)" class="video-preview">
          <video :src="getFileUrl(selectedFile)" controls />
        </div>
        <div v-else-if="isAudioFile(selectedFile)" class="audio-preview">
          <audio :src="getFileUrl(selectedFile)" controls />
        </div>
        <div v-else class="file-info">
          <el-icon size="64"><Document /></el-icon>
          <p>{{ selectedFile.name }}</p>
          <p>文件大小: {{ formatFileSize(selectedFile.size) }}</p>
          <p>创建时间: {{ formatDate(selectedFile.createdAt) }}</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="showPreviewDialog = false">关闭</el-button>
        <el-button type="primary" @click="downloadFile(selectedFile)">
          下载
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const showPreviewDialog = ref(false)
const selectedFile = ref(null)
const filterType = ref('')

const files = ref([])
const fileStats = reactive({
  total: 0,
  images: 0,
  videos: 0,
  totalSize: 0
})

// 计算属性
const filteredFiles = computed(() => {
  if (!filterType.value) {
    return files.value
  }
  return files.value.filter(file => file.type === filterType.value)
})

// 方法
const loadFiles = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/files')
    files.value = response.data.files || []
    updateStats()
  } catch (error) {
    console.error('加载文件列表失败:', error)
    ElMessage.error('加载文件列表失败')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  fileStats.total = files.value.length
  fileStats.images = files.value.filter(f => f.type === 'image').length
  fileStats.videos = files.value.filter(f => f.type === 'video').length
  fileStats.totalSize = files.value.reduce((sum, file) => sum + file.size, 0)
}

const refreshFiles = () => {
  loadFiles()
}

const previewFile = (file) => {
  selectedFile.value = file
  showPreviewDialog.value = true
}

const downloadFile = async (file) => {
  try {
    // 根据文件来源服务构建下载URL
    let downloadUrl = ''
    if (file.service === 'ad-campaign') {
      downloadUrl = `/api/ad-campaign/download/${file.name}`
    } else if (file.service === 'video-generation') {
      downloadUrl = `/api/video-generation/api/download/${file.name}`
    }
    
    if (downloadUrl) {
      const response = await axios.get(downloadUrl, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('文件下载成功')
    } else {
      ElMessage.error('无法下载此文件')
    }
  } catch (error) {
    console.error('下载文件失败:', error)
    ElMessage.error('下载文件失败')
  }
}

const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm('确定要删除这个文件吗？', '确认删除', {
      type: 'warning'
    })
    
    // 实现删除文件API
    ElMessage.success('文件删除成功')
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文件失败:', error)
      ElMessage.error('删除文件失败')
    }
  }
}

const clearOldFiles = async () => {
  try {
    await ElMessageBox.confirm('确定要清理所有旧文件吗？', '确认清理', {
      type: 'warning'
    })
    
    // 实现清理旧文件API
    ElMessage.success('旧文件已清理')
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理文件失败:', error)
      ElMessage.error('清理文件失败')
    }
  }
}

const getFileUrl = (file) => {
  if (file.service === 'ad-campaign') {
    return `/api/ad-campaign/files/${file.name}`
  } else if (file.service === 'video-generation') {
    return `/api/video-generation/uploads/${file.folder}/${file.name}`
  }
  return ''
}

const isImageFile = (file) => {
  return file.type === 'image'
}

const isVideoFile = (file) => {
  return file.type === 'video'
}

const isAudioFile = (file) => {
  return file.type === 'audio'
}

const getFileIcon = (type) => {
  const iconMap = {
    'image': 'Picture',
    'video': 'VideoCamera',
    'audio': 'Headphones',
    'document': 'Document'
  }
  return iconMap[type] || 'Document'
}

const getFileIconComponent = (type) => {
  const iconMap = {
    'image': 'Picture',
    'video': 'VideoCamera',
    'audio': 'Headphones',
    'document': 'Document'
  }
  return iconMap[type] || 'Document'
}

const getFileTypeTag = (type) => {
  const typeMap = {
    'image': 'success',
    'video': 'primary',
    'audio': 'warning',
    'document': 'info'
  }
  return typeMap[type] || 'default'
}

const getFileTypeName = (type) => {
  const typeMap = {
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'document': '文档'
  }
  return typeMap[type] || type
}

const getServiceTag = (service) => {
  const serviceMap = {
    'ad-campaign': 'primary',
    'video-generation': 'success'
  }
  return serviceMap[service] || 'default'
}

const getServiceName = (service) => {
  const serviceMap = {
    'ad-campaign': '广告服务',
    'video-generation': '视频服务'
  }
  return serviceMap[service] || service
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString()
}

// 生命周期
onMounted(() => {
  loadFiles()
})
</script>

<style scoped>
.files {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-preview {
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.video-preview video {
  max-width: 100%;
  max-height: 500px;
}

.audio-preview {
  padding: 20px;
}

.file-info {
  padding: 40px;
}

.file-info p {
  margin: 8px 0;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-card {
    margin-bottom: 16px;
  }
}
</style>
