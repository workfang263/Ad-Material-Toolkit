/**
 * URL归一化工具函数
 * 
 * 作用：统一处理URL格式差异，确保相同的URL能够正确匹配
 * 
 * 处理规则：
 * 1. 去除查询参数（?后面的部分）
 * 2. 去除锚点（#后面的部分）
 * 3. 统一转换为小写
 * 4. 去除首尾空格
 * 5. 处理异常情况（无效URL、空值等）
 * 
 * 示例：
 * - "https://example.com/image.jpg?size=large&format=png" → "https://example.com/image.jpg"
 * - "HTTPS://EXAMPLE.COM/IMAGE.JPG" → "https://example.com/image.jpg"
 * - "https://example.com/image.jpg#section" → "https://example.com/image.jpg"
 */

/**
 * URL归一化函数
 * @param {string} url - 需要归一化的URL
 * @returns {string} 归一化后的URL
 */
export const normalizeUrl = (url) => {
  // 1. 处理空值或非字符串类型
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  // 2. 去除首尾空格
  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return ''
  }
  
  try {
    // 3. 使用URL对象解析（标准方式，推荐）
    // URL对象会自动处理协议、域名、路径等
    const u = new URL(trimmedUrl)
    
    // 4. 只保留 origin（协议+域名+端口）和 pathname（路径）
    // 这样就去除了查询参数（search）和锚点（hash）
    const normalized = (u.origin + u.pathname).toLowerCase()
    
    return normalized
  } catch (e) {
    // 5. 如果URL对象解析失败（可能是相对路径或格式不标准），使用降级方案
    // 手动去除 ? 和 # 后面的部分
    const withoutParams = trimmedUrl.split('?')[0]  // 去除查询参数
    const withoutHash = withoutParams.split('#')[0]  // 去除锚点
    
    // 转换为小写并去除首尾空格
    return withoutHash.toLowerCase().trim()
  }
}

/**
 * 批量归一化URL数组
 * @param {string[]} urls - URL数组
 * @returns {string[]} 归一化后的URL数组
 */
export const normalizeUrls = (urls) => {
  if (!Array.isArray(urls)) {
    return []
  }
  
  return urls.map(url => normalizeUrl(url)).filter(url => url) // 过滤空值
}


