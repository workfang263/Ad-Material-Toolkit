<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 系统状态卡片 -->
      <el-col :span="24">
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <el-icon><Monitor /></el-icon>
              <span>系统状态</span>
              <el-button
                type="primary"
                size="small"
                :loading="isLoading"
                @click="refreshStatus"
              >
                刷新
              </el-button>
            </div>
          </template>
          
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="status-item">
                <el-icon :class="adServiceStatus === 'healthy' ? 'status-success' : 'status-error'">
                  <Promotion />
                </el-icon>
                <div class="status-info">
                  <div class="status-title">广告服务</div>
                  <div class="status-value">{{ adServiceStatus }}</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="status-item">
                <el-icon :class="videoServiceStatus === 'healthy' ? 'status-success' : 'status-error'">
                  <VideoCamera />
                </el-icon>
                <div class="status-info">
                  <div class="status-title">视频服务</div>
                  <div class="status-value">{{ videoServiceStatus }}</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="status-item">
                <el-icon :class="overallStatus === 'healthy' ? 'status-success' : 'status-error'">
                  <Platform />
                </el-icon>
                <div class="status-info">
                  <div class="status-title">整体状态</div>
                  <div class="status-value">{{ overallStatus }}</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 快速操作 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Lightning /></el-icon>
              <span>快速操作</span>
            </div>
          </template>
          
          <div class="quick-actions">
            <el-button
              type="primary"
              size="large"
              :icon="Promotion"
              @click="$router.push('/ad-campaign')"
            >
              创建广告投放
            </el-button>
            <el-button
              type="success"
              size="large"
              :icon="VideoCamera"
              @click="$router.push('/video-generation')"
            >
              生成视频
            </el-button>
            <el-button
              type="info"
              size="large"
              :icon="List"
              @click="$router.push('/tasks')"
            >
              查看任务
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 最近活动 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Clock /></el-icon>
              <span>最近活动</span>
            </div>
          </template>
          
          <el-timeline>
            <el-timeline-item
              v-for="(activity, index) in recentActivities"
              :key="index"
              :timestamp="activity.timestamp"
              :type="activity.type"
            >
              {{ activity.description }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 统计信息 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>统计信息</span>
            </div>
          </template>
          
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ stats.totalCampaigns }}</div>
                <div class="stat-label">广告活动</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ stats.totalVideos }}</div>
                <div class="stat-label">生成视频</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ stats.totalTasks }}</div>
                <div class="stat-label">任务总数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ stats.totalFiles }}</div>
                <div class="stat-label">文件总数</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { ElMessage } from 'element-plus'

const systemStore = useSystemStore()

// 响应式数据
const isLoading = ref(false)
const stats = ref({
  totalCampaigns: 0,
  totalVideos: 0,
  totalTasks: 0,
  totalFiles: 0
})

const recentActivities = ref([
  {
    description: '系统启动完成',
    timestamp: new Date().toLocaleString(),
    type: 'success'
  }
])

// 计算属性
const adServiceStatus = computed(() => systemStore.adServiceStatus)
const videoServiceStatus = computed(() => systemStore.videoServiceStatus)
const overallStatus = computed(() => systemStore.overallStatus)

// 方法
const refreshStatus = async () => {
  try {
    await systemStore.checkServicesStatus()
    ElMessage.success('状态刷新成功')
  } catch (error) {
    ElMessage.error('状态刷新失败')
  }
}

const loadStats = async () => {
  // 这里可以加载统计数据
  // 目前使用模拟数据
  stats.value = {
    totalCampaigns: 15,
    totalVideos: 8,
    totalTasks: 23,
    totalFiles: 156
  }
}

// 生命周期
onMounted(() => {
  refreshStatus()
  loadStats()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.status-card {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.status-success {
  color: #67c23a;
  font-size: 24px;
}

.status-error {
  color: #f56c6c;
  font-size: 24px;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: bold;
  text-transform: capitalize;
}

.quick-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .quick-actions {
    flex-direction: column;
  }
  
  .stat-item {
    margin-bottom: 16px;
  }
}
</style>
