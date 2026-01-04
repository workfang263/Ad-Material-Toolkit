import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/AdCampaign.vue'),
      meta: { title: '广告投放表格生成器' }
    },
    {
      path: '/ad-campaign',
      name: 'ad-campaign',
      component: () => import('@/views/AdCampaign.vue'),
      meta: { title: '广告投放表格生成器' }
    },
    {
      path: '/video-generation',
      name: 'video-generation',
      component: () => import('@/views/VideoGeneration.vue'),
      meta: { title: 'FFmpeg 视频生成工具' }
    },
    {
      path: '/ad-campaign-embed',
      name: 'ad-campaign-embed',
      component: () => import('@/views/AdCampaign.vue'),
      meta: { 
        title: '广告投放表格生成器',
        embed: true // 标记为嵌入模式
      }
    },
    {
      path: '/video-generation-embed',
      name: 'video-generation-embed',
      component: () => import('@/views/VideoGeneration.vue'),
      meta: { 
        title: 'FFmpeg 视频生成工具',
        embed: true // 标记为嵌入模式
      }
    },
    {
      path: '/product-table',
      name: 'product-table',
      component: () => import('@/views/ProductTable.vue'),
      meta: { title: '产品表格生成工具' }
    },
    {
      path: '/image-stitch',
      name: 'image-stitch',
      component: () => import('@/views/ImageStitch.vue'),
      meta: { title: '图片拼接素材工具' }
    }
  ]
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
