import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 18080,
    host: '0.0.0.0', // 监听所有接口，允许外部访问
    proxy: {
      '/api': {
        target: 'http://localhost:18083',
        changeOrigin: true,
        // 确保代理正确转发请求头
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 转发原始host信息
            if (req.headers.host) {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
            }
          });
        }
      },
      // 代理 /temp 路径，用于访问下载的图片
      '/temp': {
        target: 'http://localhost:18083',
        changeOrigin: true
      }
    },
    force: true,
    // CSP配置：Bootstrap已通过npm本地安装，不再依赖CDN
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: http:; connect-src 'self' https: http: ws: wss:; frame-src 'self' http://192.168.0.67:5001 http://192.168.0.67:*; frame-ancestors 'self' http://192.168.0.51:5173 http://localhost:5173"
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  optimizeDeps: {
    force: true
  }
})
