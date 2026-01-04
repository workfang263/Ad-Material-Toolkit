import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useSystemStore = defineStore('system', () => {
  // 状态
  const servicesStatus = ref({
    adCampaign: { status: 'unknown', url: '', error: null },
    videoGeneration: { status: 'unknown', url: '', error: null }
  })
  
  const isLoading = ref(false)
  const lastChecked = ref(null)

  // 计算属性
  const adServiceStatus = computed(() => servicesStatus.value.adCampaign.status)
  const videoServiceStatus = computed(() => servicesStatus.value.videoGeneration.status)
  
  const overallStatus = computed(() => {
    const statuses = Object.values(servicesStatus.value).map(s => s.status)
    if (statuses.every(s => s === 'healthy')) return 'healthy'
    if (statuses.some(s => s === 'healthy')) return 'partial'
    return 'unhealthy'
  })

  // 方法
  const checkServicesStatus = async () => {
    isLoading.value = true
    try {
      const response = await axios.get('/api/services/status')
      servicesStatus.value = response.data
      lastChecked.value = new Date()
    } catch (error) {
      console.error('检查服务状态失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getServiceHealth = (serviceName) => {
    return servicesStatus.value[serviceName] || { status: 'unknown' }
  }

  return {
    // 状态
    servicesStatus,
    isLoading,
    lastChecked,
    
    // 计算属性
    adServiceStatus,
    videoServiceStatus,
    overallStatus,
    
    // 方法
    checkServicesStatus,
    getServiceHealth
  }
})
