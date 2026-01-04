<template>
  <div class="tasks">
    <el-page-header @back="$router.go(-1)" content="任务管理">
      <template #extra>
        <el-button type="primary" @click="refreshTasks">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </template>
    </el-page-header>

    <!-- 任务统计 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ taskStats.total }}</div>
            <div class="stat-label">总任务数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ taskStats.running }}</div>
            <div class="stat-label">运行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ taskStats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-content">
              <div class="stat-number">{{ taskStats.failed }}</div>
              <div class="stat-label">失败</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 任务列表 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <div class="header-actions">
            <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 120px;">
              <el-option label="全部" value="" />
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-button @click="clearCompletedTasks" type="warning">
              <el-icon><Delete /></el-icon>
              清理已完成
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredTasks"
        v-loading="loading"
        empty-text="暂无任务"
      >
        <el-table-column prop="id" label="任务ID" width="100" />
        <el-table-column prop="type" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTag(row.type)">
              {{ getTaskTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="任务名称" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.progress"
              :status="row.status === 'failed' ? 'exception' : 'success'"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewTask(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              size="small"
              type="warning"
              @click="cancelTask(row)"
            >
              取消
            </el-button>
            <el-button
              v-if="row.status === 'completed'"
              size="small"
              type="success"
              @click="downloadResult(row)"
            >
              下载
            </el-button>
            <el-button
              v-if="row.status === 'failed'"
              size="small"
              type="danger"
              @click="retryTask(row)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="showTaskDialog"
      title="任务详情"
      width="60%"
    >
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">
            {{ selectedTask.id }}
          </el-descriptions-item>
          <el-descriptions-item label="任务类型">
            <el-tag :type="getTaskTypeTag(selectedTask.type)">
              {{ getTaskTypeName(selectedTask.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="任务名称">
            {{ selectedTask.name }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(selectedTask.status)">
              {{ getStatusName(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="进度">
            <el-progress
              :percentage="selectedTask.progress"
              :status="selectedTask.status === 'failed' ? 'exception' : 'success'"
            />
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(selectedTask.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDate(selectedTask.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" v-if="selectedTask.error">
            {{ selectedTask.error }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedTask.logs && selectedTask.logs.length > 0" class="task-logs">
          <h4>任务日志</h4>
          <el-scrollbar height="200px">
            <div
              v-for="(log, index) in selectedTask.logs"
              :key="index"
              class="log-item"
            >
              <span class="log-time">{{ formatDate(log.timestamp) }}</span>
              <span class="log-level" :class="`log-${log.level}`">{{ log.level }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </el-scrollbar>
        </div>
      </div>

      <template #footer>
        <el-button @click="showTaskDialog = false">关闭</el-button>
        <el-button
          v-if="selectedTask && selectedTask.status === 'completed'"
          type="primary"
          @click="downloadResult(selectedTask)"
        >
          下载结果
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
const showTaskDialog = ref(false)
const selectedTask = ref(null)
const filterStatus = ref('')

const tasks = ref([])
const taskStats = reactive({
  total: 0,
  running: 0,
  completed: 0,
  failed: 0
})

// 计算属性
const filteredTasks = computed(() => {
  if (!filterStatus.value) {
    return tasks.value
  }
  return tasks.value.filter(task => task.status === filterStatus.value)
})

// 方法
const loadTasks = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/tasks')
    tasks.value = response.data.tasks || []
    updateStats()
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  taskStats.total = tasks.value.length
  taskStats.running = tasks.value.filter(t => t.status === 'running').length
  taskStats.completed = tasks.value.filter(t => t.status === 'completed').length
  taskStats.failed = tasks.value.filter(t => t.status === 'failed').length
}

const refreshTasks = () => {
  loadTasks()
}

const viewTask = (task) => {
  selectedTask.value = task
  showTaskDialog.value = true
}

const cancelTask = async (task) => {
  try {
    await ElMessageBox.confirm('确定要取消这个任务吗？', '确认取消', {
      type: 'warning'
    })
    
    // 实现取消任务API
    ElMessage.success('任务已取消')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error)
      ElMessage.error('取消任务失败')
    }
  }
}

const downloadResult = async (task) => {
  try {
    // 根据任务类型下载不同的结果
    if (task.type === 'ad-campaign') {
      // 下载广告投放表格
      ElMessage.info('下载广告投放表格')
    } else if (task.type === 'video-generation') {
      // 下载生成的视频
      ElMessage.info('下载生成的视频')
    }
  } catch (error) {
    console.error('下载结果失败:', error)
    ElMessage.error('下载结果失败')
  }
}

const retryTask = async (task) => {
  try {
    await ElMessageBox.confirm('确定要重试这个任务吗？', '确认重试', {
      type: 'warning'
    })
    
    // 实现重试任务API
    ElMessage.success('任务已重新开始')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重试任务失败:', error)
      ElMessage.error('重试任务失败')
    }
  }
}

const clearCompletedTasks = async () => {
  try {
    await ElMessageBox.confirm('确定要清理所有已完成的任务吗？', '确认清理', {
      type: 'warning'
    })
    
    // 实现清理已完成任务API
    ElMessage.success('已完成任务已清理')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理任务失败:', error)
      ElMessage.error('清理任务失败')
    }
  }
}

const getTaskTypeTag = (type) => {
  const typeMap = {
    'ad-campaign': 'primary',
    'video-generation': 'success',
    'batch-processing': 'info'
  }
  return typeMap[type] || 'default'
}

const getTaskTypeName = (type) => {
  const typeMap = {
    'ad-campaign': '广告投放',
    'video-generation': '视频生成',
    'batch-processing': '批量处理'
  }
  return typeMap[type] || type
}

const getStatusTag = (status) => {
  const statusMap = {
    'running': 'warning',
    'completed': 'success',
    'failed': 'danger',
    'pending': 'info'
  }
  return statusMap[status] || 'default'
}

const getStatusName = (status) => {
  const statusMap = {
    'running': '运行中',
    'completed': '已完成',
    'failed': '失败',
    'pending': '等待中'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString()
}

// 生命周期
onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.tasks {
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

.task-detail {
  max-height: 500px;
  overflow-y: auto;
}

.task-logs {
  margin-top: 20px;
}

.task-logs h4 {
  margin-bottom: 12px;
  color: #606266;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-time {
  font-size: 12px;
  color: #999;
  min-width: 120px;
}

.log-level {
  font-size: 12px;
  font-weight: bold;
  min-width: 60px;
}

.log-info {
  color: #409eff;
}

.log-warn {
  color: #e6a23c;
}

.log-error {
  color: #f56c6c;
}

.log-message {
  flex: 1;
  font-size: 12px;
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
