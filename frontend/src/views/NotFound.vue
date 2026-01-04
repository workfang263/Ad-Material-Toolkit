<template>
  <div class="not-found">
    <div class="not-found-content">
      <el-icon size="120" color="#909399">
        <Warning />
      </el-icon>
      <h1>404</h1>
      <h2>页面未找到</h2>
      <p>抱歉，您访问的页面不存在或已被删除。</p>
      <el-button type="primary" @click="$router.push('/')">
        返回首页
      </el-button>
    </div>
  </div>
</template>

<script setup>
// 404页面组件
</script>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.not-found-content {
  text-align: center;
}

.not-found-content h1 {
  font-size: 72px;
  color: #909399;
  margin: 20px 0;
}

.not-found-content h2 {
  font-size: 24px;
  color: #606266;
  margin: 20px 0;
}

.not-found-content p {
  font-size: 16px;
  color: #909399;
  margin: 20px 0 40px 0;
}
</style>
