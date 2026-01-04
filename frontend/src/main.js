import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'

// 导入Bootstrap CSS和Icons（本地npm包，不依赖CDN）
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// 导入Bootstrap JS
import * as bootstrap from 'bootstrap'

// 导入 Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 将Bootstrap暴露到全局，供VideoGeneration.vue使用
window.bootstrap = bootstrap

const app = createApp(App)

// 创建 Pinia 实例并配置持久化插件
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus) // 注册 Element Plus

app.mount('#app')

console.log('Vue app mounted successfully')
console.log('Bootstrap已加载（本地npm包）')
console.log('Element Plus已加载')