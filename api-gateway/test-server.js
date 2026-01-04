const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 18083;

// 中间件
app.use(cors());
app.use(express.json());

// 测试API
app.get('/api/image-links', (req, res) => {
  console.log('GET /api/image-links 被调用');
  res.json({ success: true, links: [] });
});

app.post('/api/image-links', (req, res) => {
  console.log('POST /api/image-links 被调用');
  console.log('请求体:', req.body);
  res.json({ success: true, count: 0 });
});

app.listen(PORT, () => {
  console.log(`测试API Gateway运行在端口 ${PORT}`);
});
