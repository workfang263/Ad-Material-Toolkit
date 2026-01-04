const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const XLSX = require('xlsx');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const dns = require('dns');
const util = require('util');
require('dotenv').config();

// 配置 DNS 服务器（使用多个备用 DNS 服务器提高解析成功率）
// Google DNS: 8.8.8.8, 8.8.4.4
// 阿里 DNS: 223.5.5.5, 223.6.6.6
// 114 DNS: 114.114.114.114
try {
  const defaultServers = dns.getServers();
  console.log('📡 当前 DNS 服务器:', defaultServers);
  
  // 设置备用 DNS 服务器（优先使用公共 DNS，因为系统 DNS 可能有问题）
  dns.setServers([
    '8.8.8.8',        // Google DNS (优先)
    '8.8.4.4',        // Google DNS (备用)
    '223.5.5.5',      // 阿里 DNS
    '223.6.6.6',      // 阿里 DNS
    '114.114.114.114', // 114 DNS
    ...defaultServers // 系统默认 DNS（作为最后备用）
  ]);
  
  console.log('✅ DNS 服务器已配置，优先使用公共 DNS');
} catch (error) {
  console.warn('⚠️ DNS 配置失败:', error.message);
}

// 自定义 DNS lookup 函数，强制使用 Google DNS
const customLookup = (hostname, options, callback) => {
  // 如果已经提供了回调，使用它
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  // 先尝试使用配置的 DNS 服务器解析
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) {
      // 如果系统 DNS 失败，尝试使用 Google DNS 直接解析
      console.warn(`⚠️ 系统 DNS 解析失败 ${hostname}，尝试使用 Google DNS...`);
      
      // 使用 nslookup 或直接查询 Google DNS（这里简化处理，依赖 dns.setServers 的配置）
      // 由于 dns.setServers 已经设置了 Google DNS 优先，这里只需要重试
      dns.resolve4(hostname, (err4, addresses4) => {
        if (err4) {
          dns.resolve6(hostname, (err6, addresses6) => {
            if (err6) {
              // 所有解析都失败
              callback(err, null, null);
            } else {
              // IPv6 解析成功
              callback(null, addresses6[0], 6);
            }
          });
        } else {
          // IPv4 解析成功
          callback(null, addresses4[0], 4);
        }
      });
    } else {
      // 系统 DNS 解析成功
      callback(null, address, family);
    }
  });
};

const app = express();
const PORT = process.env.PORT || 18083;

// 日志文件功能
const LOG_FILE = path.join(__dirname, 'api-gateway.log');
const originalLog = console.log;
const originalError = console.error;

// 安全的对象序列化函数，处理循环引用
// 原理：util.inspect 会自动检测循环引用并标注为 [Circular]，不会抛出异常
// maxDepth=3 确保能看到关键信息（URL、Method等）同时避免过深嵌套
function safeStringify(obj, maxDepth = 3) {
  if (obj === null || obj === undefined) {
    return String(obj);
  }
  
  try {
    // 使用 util.inspect 处理循环引用，会自动标注 [Circular]
    return util.inspect(obj, { 
      depth: maxDepth,           // 3层深度足够看到关键信息（URL、Method等）
      compact: true,             // 紧凑格式，节省日志空间
      breakLength: Infinity,     // 不限制行长度
      maxArrayLength: 10,        // 数组最多显示10个元素
      maxStringLength: 200,      // 字符串最多显示200字符
      showHidden: false          // 不显示隐藏属性
    });
  } catch (err) {
    // 如果 util.inspect 也失败（极罕见情况），返回类型和基本信息
    const type = obj.constructor?.name || typeof obj;
    const message = err.message || '未知错误';
    return `[${type}] (序列化失败: ${message})`;
  }
}

// 重写console.log，同时输出到控制台和文件（带安全保护）
// 原理：使用 safeStringify 处理循环引用，try-catch 确保日志写入失败不影响 API 响应
console.log = function(...args) {
  originalLog.apply(console, args);
  
  // 日志写入文件的操作必须被 try-catch 包裹，确保不影响 API 响应
  try {
    const logMessage = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return safeStringify(arg);
      }
      return String(arg);
    }).join(' ') + '\n';
    
    // 异步写入，即使失败也不阻塞
    fs.appendFile(LOG_FILE, `[${new Date().toISOString()}] ${logMessage}`).catch(() => {
      // 静默失败，避免日志记录失败导致服务中断
    });
  } catch (err) {
    // 即使日志记录逻辑本身出错，也不应该影响程序运行
    // 只在控制台输出警告，不写入文件（避免递归）
    originalError.call(console, '⚠️ [日志系统] 日志记录失败:', err.message);
  }
};

console.error = function(...args) {
  originalError.apply(console, args);
  
  // 错误日志写入文件的操作必须被 try-catch 包裹
  try {
    const logMessage = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return safeStringify(arg);
      }
      return String(arg);
    }).join(' ') + '\n';
    
    // 异步写入，即使失败也不阻塞
    fs.appendFile(LOG_FILE, `[${new Date().toISOString()}] ERROR: ${logMessage}`).catch(() => {
      // 静默失败，避免日志记录失败导致服务中断
    });
  } catch (err) {
    // 即使错误日志记录逻辑本身出错，也不应该影响程序运行
    // 只在控制台输出警告，不写入文件（避免递归）
    originalError.call(console, '⚠️ [日志系统] 错误日志记录失败:', err.message);
  }
};

// 服务配置
const SERVICES = {
  adCampaign: process.env.AD_CAMPAIGN_URL || 'http://localhost:8889',
  videoGeneration: process.env.VIDEO_GENERATION_URL || 'http://localhost:18091', // 融合平台专用视频服务（18091端口）
  videoGenerationOriginal: 'http://localhost:9000' // 原始9000端口服务（如需使用原系统）
};

// 图片链接存储（按会话隔离）
const IMAGE_LINKS_FILE = path.join(__dirname, 'image-links.json');
const imageLinkStore = new Map(); // sessionId -> { links: string[], updatedAt: number }
const lastLinksSignature = new Map(); // sessionId -> JSON signature
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3天

function cleanupExpiredSessions() {
  const now = Date.now();
  let removed = 0;
  for (const [sid, state] of imageLinkStore.entries()) {
    if (sid === 'sid_shared_default') continue;
    const updatedAt = state && state.updatedAt ? Number(state.updatedAt) : 0;
    if (!updatedAt || now - updatedAt > SESSION_TTL_MS) {
      imageLinkStore.delete(sid);
      lastLinksSignature.delete(sid);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`🧹 [API Gateway] 已清理过期会话: ${removed}`);
  }
}
// 批量数据管理（按会话隔离，支持多用户并发）
const BATCH_DATA_FILE = path.join(__dirname, 'batch_data.json');
const GLOBAL_COUNTER_FILE = path.join(__dirname, 'global_counter.json');
// 使用 Map 存储每个会话的批量数据，避免多用户冲突
const batchDataStore = new Map(); // sessionId -> { currentBatch, adSetNameCounter }
// 全局唯一产品ID计数器（所有用户共享，确保不重复）
const globalProductCounter = {
  currentProductNumber: 1,
  lastUpdated: Date.now()
};
// 并发锁（防止多请求同时修改计数器）
let counterLock = false;

// 任务管理（用于统一任务管理API）
const tasks = new Map(); // 存储所有任务
let taskIdCounter = 1;   // 任务ID计数器

// 获取或创建会话的批量数据
function getBatchDataForSession(sessionId) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  
  if (!batchDataStore.has(normalizedSessionId)) {
    // 为新会话初始化默认值（注意：currentProductNumber 已移除，现在使用全局计数器）
    batchDataStore.set(normalizedSessionId, {
      currentBatch: 'fqd01',
      adSetNameCounter: 1
    });
    console.log(`📝 为新会话创建批量数据: ${normalizedSessionId}`);
  }
  
  return batchDataStore.get(normalizedSessionId);
}

// 加载批量数据（从文件加载，按会话恢复）
async function loadBatchData() {
  try {
    const data = await fs.readFile(BATCH_DATA_FILE, 'utf8');
    const loadedData = JSON.parse(data);
    
    // 兼容旧格式：如果是旧格式（全局数据），迁移到默认会话
    if (loadedData.currentBatch && !loadedData.sessions) {
      const defaultSessionId = 'sid_shared_default';
      batchDataStore.set(defaultSessionId, {
        currentBatch: loadedData.currentBatch || 'fqd01',
        adSetNameCounter: loadedData.adSetNameCounter || 1
        // 注意：currentProductNumber 已移除，现在使用全局计数器
      });
      console.log(`✅ 已迁移旧批量数据到默认会话`);
    } else if (loadedData.sessions) {
      // 新格式：按会话存储
      for (const [sid, data] of Object.entries(loadedData.sessions)) {
        // 清理旧数据中的 currentProductNumber（如果存在）
        const cleanedData = {
          currentBatch: data.currentBatch || 'fqd01',
          adSetNameCounter: data.adSetNameCounter || 1
        };
        batchDataStore.set(sid, cleanedData);
      }
      console.log(`✅ 已加载 ${batchDataStore.size} 个会话的批量数据`);
    }
  } catch (error) {
    console.log('📝 批量数据文件不存在，使用默认值');
  }
}

// 保存批量数据（按会话保存）
async function saveBatchData() {
  try {
    const dataToSave = {
      sessions: {}
    };
    
    // 将所有会话数据转换为对象
    for (const [sid, data] of batchDataStore.entries()) {
      dataToSave.sessions[sid] = data;
    }
    
    await fs.writeFile(BATCH_DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log(`💾 已保存 ${batchDataStore.size} 个会话的批量数据`);
  } catch (error) {
    console.error('❌ 保存批量数据失败:', error.message);
  }
}

// 定期保存批量数据（每30秒）
setInterval(() => {
  saveBatchData();
}, 30000);

// ==================== 全局计数器管理 ====================

// 加载全局计数器（从文件加载）
async function loadGlobalCounter() {
  try {
    const data = await fs.readFile(GLOBAL_COUNTER_FILE, 'utf8');
    const loaded = JSON.parse(data);
    globalProductCounter.currentProductNumber = loaded.currentProductNumber || 1;
    globalProductCounter.lastUpdated = loaded.lastUpdated || Date.now();
    console.log(`✅ 已加载全局计数器: ${globalProductCounter.currentProductNumber}`);
  } catch (error) {
    console.log('📝 全局计数器文件不存在，使用默认值: 1');
    globalProductCounter.currentProductNumber = 1;
    globalProductCounter.lastUpdated = Date.now();
  }
}

// 保存全局计数器（保存到文件）
async function saveGlobalCounter() {
  try {
    await fs.writeFile(
      GLOBAL_COUNTER_FILE,
      JSON.stringify(globalProductCounter, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('❌ 保存全局计数器失败:', error.message);
  }
}

// 定期保存全局计数器（每10秒，比批量数据更频繁，因为计数器变化更频繁）
setInterval(() => {
  saveGlobalCounter();
}, 10000);

function normalizeSessionId(raw) {
  if (!raw && raw !== 0) return 'sid_shared_default';
  let sid = String(raw).trim();
  if (!sid) sid = 'sid_shared_default';
  if (sid === 'default') sid = 'sid_shared_default';
  return sid;
}

function getRequestSessionId(req) {
  const headerSid = req.headers['x-session-id'];
  const querySid = req.query && req.query.sid;
  return normalizeSessionId(headerSid || querySid || 'sid_shared_default');
}

function getSessionState(sessionId) {
  if (!imageLinkStore.has(sessionId)) {
    imageLinkStore.set(sessionId, { links: [], updatedAt: Date.now() });
  }
  return imageLinkStore.get(sessionId);
}

async function loadImageLinks() {
  try {
    const data = await fs.readFile(IMAGE_LINKS_FILE, 'utf8');
    const parsed = JSON.parse(data);

    imageLinkStore.clear();
    lastLinksSignature.clear();

    const container = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : parsed)
      : null;

    if (Array.isArray(parsed)) {
      const sid = 'sid_shared_default';
      imageLinkStore.set(sid, { links: parsed, updatedAt: Date.now() });
      lastLinksSignature.set(sid, JSON.stringify(parsed));
    } else if (container) {
      for (const [sidRaw, value] of Object.entries(container)) {
        if (sidRaw === 'version') continue;
        const sid = normalizeSessionId(sidRaw);
        let links = [];
        let updatedAt = Date.now();

        if (Array.isArray(value)) {
          links = value;
        } else if (value && Array.isArray(value.links)) {
          links = value.links;
          if (value.updatedAt) {
            updatedAt = Number(value.updatedAt) || updatedAt;
          }
        } else {
          continue;
        }

        imageLinkStore.set(sid, { links, updatedAt });
        lastLinksSignature.set(sid, JSON.stringify(links));
      }
    }

    if (!imageLinkStore.size) {
      imageLinkStore.set('sid_shared_default', { links: [], updatedAt: Date.now() });
    }
    cleanupExpiredSessions();
    if (!imageLinkStore.size) {
      imageLinkStore.set('sid_shared_default', { links: [], updatedAt: Date.now() });
    }

    console.log(`✅ 已加载图片链接会话数量: ${imageLinkStore.size}`);
  } catch (error) {
    console.log('📝 图片链接文件不存在或读取失败，将使用新存储');
    imageLinkStore.clear();
    lastLinksSignature.clear();
  }
}

async function saveImageLinks() {
  try {
    cleanupExpiredSessions();
    const sessions = {};
    for (const [sid, state] of imageLinkStore.entries()) {
      sessions[sid] = {
        links: state.links || [],
        updatedAt: state.updatedAt || Date.now()
      };
    }

    const payload = {
      version: 1,
      sessions
    };

    await fs.writeFile(IMAGE_LINKS_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`💾 已保存图片链接，会话数量: ${imageLinkStore.size}`);
  } catch (error) {
    console.error('❌ 保存图片链接失败:', error.message);
  }
}

// 初始化时尝试加载已有的会话数据
loadImageLinks().catch(error => {
  console.warn('⚠️ 初始化加载图片链接失败，将在首次请求时重新尝试:', error.message);
});

// Ad Set Name 生成函数（参考原始后端逻辑，按会话隔离）
function generateAdSetName(inputData, sessionId = null) {
  // 检查是否有投放区域和年龄信息（建议受众-最小年龄 或 最小年龄）
  const hasRegion = inputData.投放区域 && inputData.投放区域.trim() !== ''
  const hasMinAge = (inputData['建议受众-最小年龄'] && inputData['建议受众-最小年龄'].trim() !== '') || 
                   (inputData['最小年龄'] && inputData['最小年龄'].trim() !== '')
  
  if (hasRegion && hasMinAge) {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0');
    
    // 处理投放国家（取前几个国家，用逗号分隔）
    let countryInfo = '';
    if (inputData.投放国家) {
      const countries = inputData.投放国家.split(','); // 显示所有国家
      countryInfo = countries.join(',');
    }
    
    // 处理投放区域
    let regionInfo = '';
    if (inputData.投放区域) {
      regionInfo = inputData.投放区域.toLowerCase();
    }
    
    // 组合国家和区域信息
    let locationInfo = '';
    if (countryInfo && regionInfo) {
      // 投放国家有选 + 投放区域有选：日期-国家,地区-年龄范围-编号
      locationInfo = `${countryInfo}${regionInfo}`;
    } else if (regionInfo) {
      // 投放国家没选 + 投放区域有选：日期-地区-年龄范围-编号
      locationInfo = regionInfo;
    }
    
    // 处理年龄范围信息 - 优先使用建议受众-最小年龄，如果没有则使用最小年龄
    const minAge = inputData['建议受众-最小年龄'] || inputData['最小年龄'] || '';
    const maxAge = inputData['建议受众-最大年龄'] || inputData['最大年龄'] || '';
    const ageRange = minAge && maxAge ? `${minAge}${maxAge}` : minAge;
    
    // 使用递增的编号（按会话隔离）
    const batchData = getBatchDataForSession(sessionId);
    const sequence = batchData.adSetNameCounter;
    batchData.adSetNameCounter++;
    saveBatchData();
    
    return `${dateStr}-${locationInfo}-${ageRange}-${sequence}`;
  } else {
    return inputData.商品SPU ? `${inputData.商品SPU}_AdSet` : '';
  }
}

// ==================== 从8889端口服务复制的完整表格生成逻辑 ====================

// Facebook广告投放表格模板字段（完整字段列表）
const ABO_TEMPLATE_FIELDS = [
  'Campaign ID', 'Creation Package Config ID', 'Campaign Name', 'Special Ad Categories',
  'Special Ad Category Country', 'Campaign Status', 'Campaign Objective', 'Buying Type',
  'Campaign Spend Limit', 'Campaign Daily Budget', 'Campaign Lifetime Budget',
  'Campaign Bid Strategy', 'Tags', 'Campaign Is Using L3 Schedule', 'Campaign Start Time',
  'Campaign Stop Time', 'Product Catalog ID', 'Campaign Page ID', 'New Objective',
  'Buy With Prime Type', 'Is Budget Scheduling Enabled For Campaign', 'Campaign High Demand Periods',
  'Buy With Integration Partner', 'Ad Set ID', 'Ad Set Run Status', 'Ad Set Lifetime Impressions',
  'Ad Set Name', 'Ad Set Time Start', 'Ad Set Time Stop', 'Ad Set Daily Budget',
  'Destination Type', 'Ad Set Lifetime Budget', 'Rate Card', 'Ad Set Schedule',
  'Use Accelerated Delivery', 'Frequency Control', 'Ad Set Minimum Spend Limit',
  'Ad Set Maximum Spend Limit', 'Is Budget Scheduling Enabled For Ad Set',
  'Ad Set High Demand Periods', 'Link Object ID', 'Optimized Conversion Tracking Pixels',
  'Optimized Custom Conversion ID', 'Optimized Pixel Rule', 'Optimized Event',
  'Custom Event Name', 'Link', 'Application ID', 'Product Set ID', 'Place Page Set ID',
  'Object Store URL', 'Offer ID', 'Offline Event Data Set ID', 'Countries', 'Cities',
  'Regions', 'Electoral Districts', 'Zip', 'Addresses', 'Geo Markets (DMA)',
  'Global Regions', 'Large Geo Areas', 'Medium Geo Areas', 'Small Geo Areas',
  'Metro Areas', 'Neighborhoods', 'Subneighborhoods', 'Subcities', 'Location Types',
  'Location Cluster IDs', 'Location Set IDs', 'Excluded Countries', 'Excluded Cities',
  'Excluded Large Geo Areas', 'Excluded Medium Geo Areas', 'Excluded Metro Areas',
  'Excluded Small Geo Areas', 'Excluded Subcities', 'Excluded Neighborhoods',
  'Excluded Subneighborhoods', 'Excluded Regions', 'Excluded Electoral Districts',
  'Excluded Zip', 'Excluded Addresses', 'Excluded Geo Markets (DMA)',
  'Excluded Global Regions', 'Excluded Location Cluster IDs', 'Gender', 'Age Min',
  'Age Max', 'Education Status', 'Fields of Study', 'Education Schools',
  'Work Job Titles', 'Work Employers', 'College Start Year', 'College End Year',
  'Interested In', 'Relationship', 'Family Statuses', 'Industries', 'Life Events',
  'Politics', 'Income', 'Net Worth', 'Home Type', 'Home Ownership', 'Home Value',
  'Multicultural Affinity', 'Generation', 'Household Composition', 'Moms',
  'Office Type', 'Behaviors', 'Connections', 'Excluded Connections',
  'Friends of Connections', 'Locales', 'Site Category', 'Unified Interests',
  'Excluded User AdClusters', 'Broad Category Clusters', 'Targeting Categories - ALL OF',
  'Custom Audiences', 'Excluded Custom Audiences', 'Flexible Inclusions',
  'Flexible Exclusions', 'Advantage Audience', 'Age Range', 'Targeting Optimization',
  'Targeting Relaxation', 'Product Audience Specs', 'Excluded Product Audience Specs',
  'Targeted Business Locations', 'Dynamic Audiences', 'Excluded Dynamic Audiences',
  'Beneficiary', 'Payer', 'Publisher Platforms', 'Facebook Positions',
  'Instagram Positions', 'Audience Network Positions', 'Messenger Positions',
  'Oculus Positions', 'Device Platforms', 'User Device', 'Excluded User Device',
  'User Operating System', 'User OS Version', 'Wireless Carrier',
  'Excluded Publisher Categories', 'Brand Safety Inventory Filtering Levels',
  'Optimization Goal', 'Attribution Spec', 'Billing Event', 'Bid Amount',
  'Ad Set Bid Strategy', 'Regional Regulated Categories',
  'Beneficiary (financial ads in Australia)', 'Payer (financial ads in Australia)',
  'Beneficiary (financial ads in Taiwan)', 'Payer (financial ads in Taiwan)',
  'Beneficiary (Taiwan)', 'Payer (Taiwan)', 'Story ID', 'Ad ID', 'Ad Status',
  'Preview Link', 'Instagram Preview Link', 'Ad Name', 'Dynamic Creative Ad Format',
  'Title', 'Title Placement', 'Additional Title 1', 'Additional Title 1 Placement',
  'Additional Title 2', 'Additional Title 2 Placement', 'Additional Title 3',
  'Additional Title 3 Placement', 'Additional Title 4', 'Additional Title 4 Placement',
  'Additional Title 5', 'Additional Title 5 Placement', 'Additional Title 6',
  'Additional Title 6 Placement', 'Additional Title 7', 'Additional Title 7 Placement',
  'Additional Title 8', 'Additional Title 8 Placement', 'Additional Title 9',
  'Additional Title 9 Placement', 'Body', 'Body Placement', 'Additional Body 1',
  'Additional Body 1 Placement', 'Additional Body 2', 'Additional Body 2 Placement',
  'Additional Body 3', 'Additional Body 3 Placement', 'Additional Body 4',
  'Additional Body 4 Placement', 'Additional Body 5', 'Additional Body 5 Placement',
  'Additional Body 6', 'Additional Body 6 Placement', 'Additional Body 7',
  'Additional Body 7 Placement', 'Additional Body 8', 'Additional Body 8 Placement',
  'Additional Body 9', 'Additional Body 9 Placement', 'Display Link', 'Link Placement',
  'Additional Link 1', 'Additional Display Link 1', 'Additional Link 1 Placement',
  'Additional Link 2', 'Additional Display Link 2', 'Additional Link 2 Placement',
  'Additional Link 3', 'Additional Display Link 3', 'Additional Link 3 Placement',
  'Additional Link 4', 'Additional Display Link 4', 'Additional Link 4 Placement',
  'Additional Link 5', 'Additional Display Link 5', 'Additional Link 5 Placement',
  'Additional Link 6', 'Additional Display Link 6', 'Additional Link 6 Placement',
  'Additional Link 7', 'Additional Display Link 7', 'Additional Link 7 Placement',
  'Additional Link 8', 'Additional Display Link 8', 'Additional Link 8 Placement',
  'Additional Link 9', 'Additional Display Link 9', 'Additional Link 9 Placement',
  'Link Description', 'Additional Link Description 1', 'Additional Link Description 2',
  'Additional Link Description 3', 'Additional Link Description 4',
  'Additional Link Description 5', 'Additional Link Description 6',
  'Additional Link Description 7', 'Additional Link Description 8',
  'Additional Link Description 9', 'Optimize text per person', 'Retailer IDs',
  'Post Click Item Headline', 'Post Click Item Description', 'Conversion Tracking Pixels',
  'Optimized Ad Creative', 'Image Hash', 'Image File Name', 'Image Crops',
  'Video Thumbnail URL', 'Image Customization', 'Image Placement',
  'Additional Image 1 Hash', 'Additional Image 1 Crops', 'Additional Image 1 Customization',
  'Additional Image 1 Placement', 'Additional Image 2 Hash', 'Additional Image 2 Crops',
  'Additional Image 2 Customization', 'Additional Image 2 Placement',
  'Additional Image 3 Hash', 'Additional Image 3 Crops', 'Additional Image 3 Customization',
  'Additional Image 3 Placement', 'Additional Image 4 Hash', 'Additional Image 4 Crops',
  'Additional Image 4 Customization', 'Additional Image 4 Placement',
  'Additional Image 5 Hash', 'Additional Image 5 Crops', 'Additional Image 5 Customization',
  'Additional Image 5 Placement', 'Additional Image 6 Hash', 'Additional Image 6 Crops',
  'Additional Image 6 Customization', 'Additional Image 6 Placement',
  'Additional Image 7 Hash', 'Additional Image 7 Crops', 'Additional Image 7 Customization',
  'Additional Image 7 Placement', 'Additional Image 8 Hash', 'Additional Image 8 Crops',
  'Additional Image 8 Customization', 'Additional Image 8 Placement',
  'Additional Image 9 Hash', 'Additional Image 9 Crops', 'Additional Image 9 Customization',
  'Additional Image 9 Placement', 'Instagram Platform Image Hash',
  'Instagram Platform Image Crops', 'Instagram Platform Image URL',
  'Carousel Delivery Mode', 'Creative Type', 'URL Tags', 'View Tags', 'Event ID',
  'Video ID', 'Video File Name', 'Video Customization', 'Video Placement',
  'Additional Video 1 ID', 'Additional Video 1 Customization', 'Additional Video 1 Placement',
  'Additional Video 1 Thumbnail URL', 'Additional Video 2 ID', 'Additional Video 2 Customization',
  'Additional Video 2 Placement', 'Additional Video 2 Thumbnail URL',
  'Additional Video 3 ID', 'Additional Video 3 Customization', 'Additional Video 3 Placement',
  'Additional Video 3 Thumbnail URL', 'Additional Video 4 ID', 'Additional Video 4 Customization',
  'Additional Video 4 Placement', 'Additional Video 4 Thumbnail URL',
  'Additional Video 5 ID', 'Additional Video 5 Customization', 'Additional Video 5 Placement',
  'Additional Video 5 Thumbnail URL', 'Additional Video 6 ID', 'Additional Video 6 Customization',
  'Additional Video 6 Placement', 'Additional Video 6 Thumbnail URL',
  'Additional Video 7 ID', 'Additional Video 7 Customization', 'Additional Video 7 Placement',
  'Additional Video 7 Thumbnail URL', 'Additional Video 8 ID', 'Additional Video 8 Customization',
  'Additional Video 8 Placement', 'Additional Video 8 Thumbnail URL',
  'Additional Video 9 ID', 'Additional Video 9 Customization', 'Additional Video 9 Placement',
  'Additional Video 9 Thumbnail URL', 'Instagram Account ID', 'Mobile App Deep Link',
  'Product Link', 'App Link Destination', 'Call Extension Phone Data ID', 'Call to Action',
  'Additional Call To Action 5', 'Additional Call To Action 6', 'Additional Call To Action 7',
  'Additional Call To Action 8', 'Additional Call To Action 9', 'Call to Action Link',
  'Call to Action WhatsApp Number', 'Additional Custom Tracking Specs', 'Video Retargeting',
  'Lead Form ID', 'Permalink', 'Force Single Link', 'Format Option', 'Dynamic Ad Voice',
  'Creative Optimization', 'Template URL', 'Android App Name', 'Android Package Name',
  'Deep Link For Android', 'Facebook App ID', 'iOS App Name', 'iOS App Store ID',
  'Deep Link For iOS', 'iPad App Name', 'iPad App Store ID', 'Deep Link For iPad',
  'iPhone App Name', 'iPhone App Store ID', 'Deep Link For iPhone', 'Deep link to website',
  'Windows Store ID', 'Windows App Name', 'Deep Link For Windows Phone', 'Add End Card',
  'Dynamic Ads Ad Context', 'Page Welcome Message', 'App Destination', 'App Destination Page ID',
  'Use Page as Actor', 'Image Overlay Template', 'Image Overlay Text Type', 'Image Overlay Text Font',
  'Image Overlay Position', 'Image Overlay Theme Color', 'Image Overlay Float With Margin',
  'Image Layer 1 - layer_type', 'Image Layer 1 - image_source', 'Image Layer 1 - overlay_shape',
  'Image Layer 1 - text_font', 'Image Layer 1 - shape_color', 'Image Layer 1 - text_color',
  'Image Layer 1 - content_type', 'Image Layer 1 - price', 'Image Layer 1 - low_price',
  'Image Layer 1 - high_price', 'Image Layer 1 - frame_source', 'Image Layer 1 - frame_image_hash',
  'Image Layer 1 - scale', 'Image Layer 1 - blending_mode', 'Image Layer 1 - opacity',
  'Image Layer 1 - overlay_position', 'Image Layer 1 - pad_image', 'Image Layer 1 - crop_image',
  'Image Layer 2 - layer_type', 'Image Layer 2 - image_source', 'Image Layer 2 - overlay_shape',
  'Image Layer 2 - text_font', 'Image Layer 2 - shape_color', 'Image Layer 2 - text_color',
  'Image Layer 2 - content_type', 'Image Layer 2 - price', 'Image Layer 2 - low_price',
  'Image Layer 2 - high_price', 'Image Layer 2 - frame_source', 'Image Layer 2 - frame_image_hash',
  'Image Layer 2 - scale', 'Image Layer 2 - blending_mode', 'Image Layer 2 - opacity',
  'Image Layer 2 - overlay_position', 'Image Layer 2 - pad_image', 'Image Layer 2 - crop_image',
  'Image Layer 3 - layer_type', 'Image Layer 3 - image_source', 'Image Layer 3 - overlay_shape',
  'Image Layer 3 - text_font', 'Image Layer 3 - shape_color', 'Image Layer 3 - text_color',
  'Image Layer 3 - content_type', 'Image Layer 3 - price', 'Image Layer 3 - low_price',
  'Image Layer 3 - high_price', 'Image Layer 3 - frame_source', 'Image Layer 3 - frame_image_hash',
  'Image Layer 3 - scale', 'Image Layer 3 - blending_mode', 'Image Layer 3 - opacity',
  'Image Layer 3 - overlay_position', 'Image Layer 3 - pad_image', 'Image Layer 3 - crop_image',
  'Product 1 - Link', 'Product 1 - Name', 'Product 1 - Description', 'Product 1 - Image Hash',
  'Product 1 - Image Crops', 'Product 1 - Video ID', 'Product 1 - Call To Action Link',
  'Product 1 - Mobile App Deep Link', 'Product 1 - Display Link', 'Product 1 - Place Data',
  'Product 1 - Is Static Card', 'Product 2 - Link', 'Product 2 - Name', 'Product 2 - Description',
  'Product 2 - Image Hash', 'Product 2 - Image Crops', 'Product 2 - Video ID',
  'Product 2 - Call To Action Link', 'Product 2 - Mobile App Deep Link', 'Product 2 - Display Link',
  'Product 2 - Place Data', 'Product 2 - Is Static Card', 'Product 3 - Link', 'Product 3 - Name',
  'Product 3 - Description', 'Product 3 - Image Hash', 'Product 3 - Image Crops',
  'Product 3 - Video ID', 'Product 3 - Call To Action Link', 'Product 3 - Mobile App Deep Link',
  'Product 3 - Display Link', 'Product 3 - Place Data', 'Product 3 - Is Static Card',
  'Product 4 - Link', 'Product 4 - Name', 'Product 4 - Description', 'Product 4 - Image Hash',
  'Product 4 - Image Crops', 'Product 4 - Video ID', 'Product 4 - Call To Action Link',
  'Product 4 - Mobile App Deep Link', 'Product 4 - Display Link', 'Product 4 - Place Data',
  'Product 4 - Is Static Card', 'Product 5 - Link', 'Product 5 - Name', 'Product 5 - Description',
  'Product 5 - Image Hash', 'Product 5 - Image Crops', 'Product 5 - Video ID',
  'Product 5 - Call To Action Link', 'Product 5 - Mobile App Deep Link', 'Product 5 - Display Link',
  'Product 5 - Place Data', 'Product 5 - Is Static Card', 'Product 6 - Link', 'Product 6 - Name',
  'Product 6 - Description', 'Product 6 - Image Hash', 'Product 6 - Image Crops',
  'Product 6 - Video ID', 'Product 6 - Call To Action Link', 'Product 6 - Mobile App Deep Link',
  'Product 6 - Display Link', 'Product 6 - Place Data', 'Product 6 - Is Static Card',
  'Product 7 - Link', 'Product 7 - Name', 'Product 7 - Description', 'Product 7 - Image Hash',
  'Product 7 - Image Crops', 'Product 7 - Video ID', 'Product 7 - Call To Action Link',
  'Product 7 - Mobile App Deep Link', 'Product 7 - Display Link', 'Product 7 - Place Data',
  'Product 7 - Is Static Card', 'Product 8 - Link', 'Product 8 - Name', 'Product 8 - Description',
  'Product 8 - Image Hash', 'Product 8 - Image Crops', 'Product 8 - Video ID',
  'Product 8 - Call To Action Link', 'Product 8 - Mobile App Deep Link', 'Product 8 - Display Link',
  'Product 8 - Place Data', 'Product 8 - Is Static Card', 'Product 9 - Link', 'Product 9 - Name',
  'Product 9 - Description', 'Product 9 - Image Hash', 'Product 9 - Image Crops',
  'Product 9 - Video ID', 'Product 9 - Call To Action Link', 'Product 9 - Mobile App Deep Link',
  'Product 9 - Display Link', 'Product 9 - Place Data', 'Product 9 - Is Static Card',
  'Product 10 - Link', 'Product 10 - Name', 'Product 10 - Description', 'Product 10 - Image Hash',
  'Product 10 - Image Crops', 'Product 10 - Video ID', 'Product 10 - Call To Action Link',
  'Product 10 - Mobile App Deep Link', 'Product 10 - Display Link', 'Product 10 - Place Data',
  'Product 10 - Is Static Card', 'Product Sales Channel', 'Dynamic Creative Lead Form ID',
  'Additional Dynamic Creative Lead Gen Form ID 1', 'Additional Dynamic Creative Lead Gen Form ID 2',
  'Additional Dynamic Creative Lead Gen Form ID 3', 'Additional Dynamic Creative Lead Gen Form ID 4',
  'Additional Dynamic Creative Lead Gen Form ID 5', 'Additional Dynamic Creative Lead Gen Form ID 6',
  'Additional Dynamic Creative Lead Gen Form ID 7', 'Additional Dynamic Creative Lead Gen Form ID 8',
  'Additional Dynamic Creative Lead Gen Form ID 9', 'Dynamic Creative Call to Action',
  'Additional Dynamic Creative Call To Action Type 5', 'Additional Dynamic Creative Call To Action Type 6',
  'Additional Dynamic Creative Call To Action Type 7', 'Additional Dynamic Creative Call To Action Type 8',
  'Additional Dynamic Creative Call To Action Type 9', 'Degrees of Freedom Type', 'Mockup ID',
  'Text Transformations', 'Ad Stop Time', 'Ad Start Time'
];

// URL重定向CSV模板字段
const URL_REDIRECT_FIELDS = [
  'Redirect from', 'Redirect to'
];

// 验证URL格式
function isValidUrl(string) {
  if (!string || typeof string !== 'string') {
    return false;
  }
  
  const trimmedString = string.trim();
  if (trimmedString === '') {
    return false;
  }
  
  try {
    new URL(trimmedString);
    return true;
  } catch (_) {
    try {
      new URL('http://' + trimmedString);
      return true;
    } catch (_) {
      try {
        new URL('https://' + trimmedString);
        return true;
      } catch (_) {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        const domainPattern = /^[\da-z\.-]+\.[a-z\.]{2,6}$/i;
        const pathPattern = /^\/[\w \.-]*$/i;
        
        if (domainPattern.test(trimmedString)) {
          return true;
        }
        
        if (pathPattern.test(trimmedString)) {
          return true;
        }
        
        return urlPattern.test(trimmedString);
      }
    }
  }
}

// 验证输入数据
function validateInputData(inputData) {
  const requiredFields = ['商品ID', '商品SPU', '商品图片链接', '专辑链接', '账户编号', '产品标签', '广告语', '标题', '描述'];
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (!inputData[field] || inputData[field].trim() === '') {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length > 0) {
    throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
  }
  
  // URL验证：商品图片链接字段可能包含图片或视频链接，需要支持多个链接
  const urlFields = ['商品图片链接', '专辑链接'];
  urlFields.forEach(field => {
    if (inputData[field]) {
      if (field === '商品图片链接') {
        // 商品图片链接字段：可能包含多个链接（支持分隔符），需要逐个验证
        const links = inputData[field].split(/[\s,，、]+/).map(l => l.trim()).filter(Boolean);
        for (const link of links) {
          if (link && !isValidUrl(link)) {
            throw new Error(`商品图片链接/商品视频链接 中包含无效的URL格式: ${link}`);
          }
        }
      } else {
        // 其他字段保持原有验证逻辑
        if (!isValidUrl(inputData[field])) {
          throw new Error(`${field} 格式不正确`);
        }
      }
    }
  });
  
  // 验证预算（支持字符串和数字）
  if (inputData.预算) {
    const budget = typeof inputData.预算 === 'string' ? parseFloat(inputData.预算) : inputData.预算;
    if (isNaN(budget) || budget <= 0) {
      throw new Error('预算必须是大于0的数字');
    }
  }
  
  // 验证年龄（支持字符串和数字，与8889端口逻辑一致）
  if (inputData['建议受众-最小年龄']) {
    const minAge = typeof inputData['建议受众-最小年龄'] === 'string' ? parseInt(inputData['建议受众-最小年龄'], 10) : inputData['建议受众-最小年龄'];
    if (!isNaN(minAge) && (minAge < 13 || minAge > 65)) {
      throw new Error('最小年龄必须在13-65之间');
    }
  }
  
  if (inputData['建议受众-最大年龄']) {
    const maxAge = typeof inputData['建议受众-最大年龄'] === 'string' ? parseInt(inputData['建议受众-最大年龄'], 10) : inputData['建议受众-最大年龄'];
    if (!isNaN(maxAge) && (maxAge < 13 || maxAge > 65)) {
      throw new Error('最大年龄必须在13-65之间');
    }
  }
  
  if (inputData.投放地区 && inputData.投放地区.trim() !== '') {
    const englishPattern = /^[A-Za-z\s,]+$/;
    if (!englishPattern.test(inputData.投放地区)) {
      throw new Error('投放地区只能包含英文字母、空格和逗号，请输入英文地区缩写');
    }
  }
  
  return true;
}

// 解析商品信息字段（支持多种分隔符）
function parseProductField(fieldValue) {
  if (!fieldValue || typeof fieldValue !== 'string') {
    return [];
  }
  
  const separators = [/\s+/, ',', '，', '、'];
  
  let result = [];
  for (const separator of separators) {
    if (typeof separator === 'string') {
      if (fieldValue.includes(separator)) {
        result = fieldValue.split(separator).map(item => item.trim()).filter(item => item !== '');
        break;
      }
    } else {
      if (separator.test(fieldValue)) {
        result = fieldValue.split(separator).map(item => item.trim()).filter(item => item !== '');
        break;
      }
    }
  }
  
  if (result.length === 0) {
    result = [fieldValue.trim()];
  }
  
  return result;
}

// 处理商品信息字段，生成多个产品记录
// 注意：'商品图片链接' 字段可能包含图片或视频链接，后续会根据链接类型自动处理
function processProductFields(inputData) {
  const productFields = ['商品ID', '商品SPU', '商品图片链接']; // 字段名保持不变
  const parsedFields = {};
  
  // 检测是否启用轮播视频模式
  const isRotationMode = inputData['轮播视频模式'] === true;
  
  productFields.forEach(field => {
    if (field === '商品ID' || field === '商品SPU') {
      const value = inputData[field] || '';
      const trimmedValue = value.trim();
      
      // 阶段七：拼图对齐模式支持
      // 如果商品ID/SPU包含逗号，说明前端已经按3:1分组了，不应该再拆分
      // 两种情况不拆分：
      // 1. 轮播视频模式（原有逻辑）
      // 2. 包含逗号的情况（拼图对齐模式，前端已经分组）
      if (isRotationMode || (trimmedValue && trimmedValue.includes(','))) {
        // 不拆分，作为单个值处理
        parsedFields[field] = trimmedValue ? [trimmedValue] : [];
        if (isRotationMode) {
          console.log(`🔄 [轮播模式] ${field} 不拆分，保持原值: ${trimmedValue}`);
        } else {
          console.log(`🔗 [拼图对齐模式] ${field} 不拆分（已包含逗号分隔），保持原值: ${trimmedValue}`);
        }
      } else {
        // 不包含逗号，按原有逻辑拆分
        parsedFields[field] = parseProductField(value);
      }
    } else {
      // 其他字段（如商品图片链接），按原有逻辑拆分
      parsedFields[field] = parseProductField(inputData[field]);
    }
  });
  
  const maxLength = Math.max(
    parsedFields['商品ID'].length,
    parsedFields['商品SPU'].length,
    parsedFields['商品图片链接'].length
  );
  
  const now = new Date();
  const defaultDateStr = now.getFullYear().toString().slice(-2) +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0');
  const productRecords = [];
  for (let i = 0; i < maxLength; i++) {
    const record = { ...inputData };
    productFields.forEach(field => {
      record[field] = parsedFields[field][i] || parsedFields[field][0] || '';
    });
    record.generatedDateStr = record.generatedDateStr || defaultDateStr;
    // 注意：batchTag 在这里不设置，因为需要 sessionId，将在 prepareProcessedProducts 中设置
    productRecords.push(record);
  }
  
  // 检测是否为分组模式（轮播模式或拼图对齐模式）
  const firstId = parsedFields['商品ID'][0] || '';
  const firstSpu = parsedFields['商品SPU'][0] || '';
  const isGroupingMode = isRotationMode || (firstId.includes(',') || firstSpu.includes(','));
  
  if (isGroupingMode) {
    if (isRotationMode) {
      console.log(`🔄 [轮播模式] 处理完成，生成 ${productRecords.length} 条记录（每组数据作为一条记录）`);
    } else {
      console.log(`🔗 [拼图对齐模式] 处理完成，生成 ${productRecords.length} 条记录（每组数据作为一条记录，3:1分组）`);
    }
  }
  
  return productRecords;
}

function buildProductKey(record) {
  const spu = (record['商品SPU'] || '').trim();
  const img = (record['商品图片链接'] || '').trim();
  const id = (record['商品ID'] || '').trim();
  return `${spu}|${img}|${id}`;
}

async function prepareProcessedProducts(dataArray, sessionId = null) {
  const processedData = [];
  const productIdMap = new Map();
  const inputArray = Array.isArray(dataArray) ? dataArray : [dataArray];
  
  // 获取会话的批量数据
  const batchData = getBatchDataForSession(sessionId);
  
  for (let index = 0; index < inputArray.length; index++) {
    const row = inputArray[index];
    try {
      const productRecords = processProductFields(row);
      for (let productIndex = 0; productIndex < productRecords.length; productIndex++) {
        const productRecord = productRecords[productIndex];
        // 设置 batchTag（如果没有提供）
        if (!productRecord.batchTag) {
          productRecord.batchTag = batchData.currentBatch;
        }
        
        const keyBase = buildProductKey(productRecord) || `${index}_${productIndex}`;
        let assignedId = productIdMap.get(keyBase);
        if (!assignedId) {
          assignedId = await generateUniqueProductId(
            productRecord.batchTag,
            productRecord.campaignDateStr || productRecord.generatedDateStr,
            sessionId
          );
          productIdMap.set(keyBase, assignedId);
        }
        const generatedProductId = assignedId.startsWith('/producttop1/')
          ? assignedId
          : `/producttop1/${assignedId}`;
        const suffix = generatedProductId.split('/').pop() || '';
        processedData.push({
          ...productRecord,
          generatedProductId,
          generatedProductSuffix: suffix
        });
      }
    } catch (error) {
      console.error(`处理第${index + 1}行数据时出错:`, error.message);
    }
  }
  
  const linkType = determineBatchLinkType(processedData.map(item => item['商品图片链接']));
  
  return { processedData, productIdMap, linkType };
}

// ==================== 链接类型检测函数 ====================

/**
 * 检测单个链接的类型（图片/视频/未知）
 * @param {string} link - 链接URL
 * @returns {string} 'image' | 'video' | 'unknown'
 */
function detectLinkType(link) {
  if (!link || typeof link !== 'string') {
    return 'unknown';
  }
  
  const trimmedLink = link.trim().toLowerCase();
  
  // 视频文件扩展名（完整列表）
  const videoFileExtensions = /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv|mpeg|mpg|f4v|rm|rmvb|asf|ts|mts|m2ts)(\?.*)?$/i;
  
  // 视频平台域名（完整列表）
  const videoPlatformPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /tiktok\.com/i,
    /douyin\.com/i,
    /bilibili\.com/i,
    /dailymotion\.com/i,
    /facebook\.com\/watch/i,
    /instagram\.com\/(p|reel)/i,
    /twitter\.com\/.*\/video/i,
    /twitch\.tv/i,
    /netflix\.com/i,
    /amazon\.com.*\/video/i
  ];
  
  // 图片文件扩展名（完整列表）
  const imageFileExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif|ico|heic|heif|avif|jp2|j2k|jpf|jpx|jpm|mj2)(\?.*)?$/i;
  
  // 优先检测视频（优先级更高）
  if (videoFileExtensions.test(trimmedLink)) {
    return 'video';
  }
  
  // 检测视频平台
  for (const pattern of videoPlatformPatterns) {
    if (pattern.test(trimmedLink)) {
      return 'video';
    }
  }
  
  // 检测图片
  if (imageFileExtensions.test(trimmedLink)) {
    return 'image';
  }
  
  // 未知类型，默认按图片处理（保持向后兼容）
  console.log(`⚠️  无法确定链接类型，默认按图片处理: ${link.substring(0, 50)}...`);
  return 'image';
}

/**
 * 判断批量链接的类型
 * 根据优先级：只要有任何一个链接被识别为视频，就判断为视频批次
 * @param {string[]} linksArray - 链接数组
 * @returns {string} 'image' | 'video'
 */
function determineBatchLinkType(linksArray) {
  if (!Array.isArray(linksArray) || linksArray.length === 0) {
    return 'image'; // 默认按图片处理
  }
  
  // 遍历所有链接，只要有任何一个被识别为视频，就返回 video
  for (const link of linksArray) {
    const linkType = detectLinkType(link);
    if (linkType === 'video') {
      console.log(`✅ 检测到视频链接，批次类型判定为：video`);
      return 'video';
    }
  }
  
  // 所有链接都不是视频，返回 image
  console.log(`✅ 未检测到视频链接，批次类型判定为：image`);
  return 'image';
}

/**
 * 从链接中提取文件名（用于 Image File Name 或 Video File Name）
 * @param {string} link - 链接URL
 * @returns {string} 文件名
 */
function extractFileNameFromLink(link) {
  if (!link || typeof link !== 'string') {
    return '';
  }
  
  try {
    // 移除URL参数和锚点
    const urlWithoutParams = link.split('?')[0].split('#')[0];
    // 提取最后一段作为文件名
    const fileName = urlWithoutParams.split('/').pop();
    return fileName || '';
  } catch (error) {
    console.error('提取文件名失败:', error);
    return '';
  }
}

// 生成唯一的产品编号
// 生成唯一产品ID（使用全局计数器，确保所有用户不重复）
async function generateUniqueProductId(userBatch = null, dateStrOverride = null, sessionId = null) {
  // 等待锁释放（防止并发冲突）
  while (counterLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  try {
    counterLock = true;
    
    const now = new Date();
    const dateStr = dateStrOverride || (
      now.getFullYear().toString().slice(-2) + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0')
    );
    
    // 获取会话的批次信息（批次仍然按会话隔离）
    const batchData = getBatchDataForSession(sessionId);
    const batch = userBatch || batchData.currentBatch;
    
    // 使用全局计数器（所有用户共享，确保不重复）
    const productNumber = globalProductCounter.currentProductNumber.toString().padStart(4, '0');
    const productId = `/producttop1/${dateStr}${batch}${productNumber}`;
    
    // 全局计数器递增（原子操作）
    globalProductCounter.currentProductNumber++;
    globalProductCounter.lastUpdated = Date.now();
    
    // 立即保存全局计数器（确保数据不丢失）
    await saveGlobalCounter();
    
    return productId;
  } finally {
    counterLock = false;
  }
}

// 生成ABO数据（完整Facebook格式）- 从8889端口服务复制
async function generateABOData(inputData, providedProductId = null, sessionId = null) {
  // 验证输入数据
  validateInputData(inputData);
  
  console.log('后端 - 接收到的完整数据:', JSON.stringify(inputData, null, 2));
  
  // 使用提供的产品ID或生成新的（传递sessionId）
  const uniqueProductId = providedProductId || await generateUniqueProductId(inputData.batchTag, inputData.campaignDateStr, sessionId);
  
  const row = {};
  
  // 按照指定顺序设置所有字段，确保表头顺序正确
  // 1. Campaign相关字段
  row['Campaign ID'] = '';
  row['Creation Package Config ID'] = '';
  
  // 生成Campaign Name: 账户编号-当前日期(YYMMDD)-产品标签-Test-01
  if (inputData.账户编号 && inputData.产品标签) {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    
    row['Campaign Name'] = `${inputData.账户编号}-${dateStr}-${inputData.产品标签}-Test-01`;
  } else {
    row['Campaign Name'] = '';
  }
  
  row['Special Ad Categories'] = 'None';
  row['Special Ad Category Country'] = '';
  row['Campaign Status'] = 'ACTIVE';
  row['Campaign Objective'] = 'Outcome Sales';
  row['Buying Type'] = 'AUCTION';
  row['Campaign Spend Limit'] = '';
  // 预算字段逻辑：
  // 1. 如果预算内容栏为空（空字符串、null、undefined、0、空白字符串）：
  //    - Campaign Daily Budget = 10
  //    - Ad Set Daily Budget = 10
  // 2. 如果预算内容栏有输入的值（比如234）：
  //    - Campaign Daily Budget = 空
  //    - Ad Set Daily Budget = 输入的值（234）
  const rawBudget = inputData.预算;
  const trimmedBudget = typeof rawBudget === 'string' ? rawBudget.trim() : rawBudget;
  let parsedBudget = Number(trimmedBudget);
  const hasValidBudget = trimmedBudget !== undefined &&
                         trimmedBudget !== null &&
                         String(trimmedBudget) !== '' &&
                         !Number.isNaN(parsedBudget) &&
                         parsedBudget > 0;
  if (!hasValidBudget) {
    parsedBudget = 10;
  }
  row['Campaign Daily Budget'] = '';
  row['Campaign Lifetime Budget'] = '';
  row['Campaign Bid Strategy'] = '';
  row['Tags'] = '';
  row['Campaign Is Using L3 Schedule'] = '';
  row['Campaign Start Time'] = '';
  row['Campaign Stop Time'] = '';
  row['Product Catalog ID'] = '';
  row['Campaign Page ID'] = '';
  row['New Objective'] = 'Yes';
  row['Buy With Prime Type'] = '';
  row['Is Budget Scheduling Enabled For Campaign'] = '';
  row['Campaign High Demand Periods'] = '';
  row['Buy With Integration Partner'] = 'NONE';
  
  // 2. Ad Set相关字段
  row['Ad Set ID'] = '';
  row['Ad Set Run Status'] = 'ACTIVE';
  row['Ad Set Lifetime Impressions'] = '0';
  // 生成Ad Set Name: 日期-国家,地区-年龄范围-编号
  const hasRegion = inputData.投放区域 && inputData.投放区域.trim() !== ''
  const hasMinAge = (inputData['建议受众-最小年龄'] && inputData['建议受众-最小年龄'].trim() !== '') || 
                   (inputData['最小年龄'] && inputData['最小年龄'].trim() !== '')
  
  if (hasRegion && hasMinAge) {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0');
    
    // 处理投放国家（取前几个国家，用逗号分隔）
    let countryInfo = '';
    if (inputData.投放国家) {
      const countries = inputData.投放国家.split(','); // 显示所有国家
      countryInfo = countries.join(',');
    }
    
    // 处理投放区域
    let regionInfo = '';
    if (inputData.投放区域) {
      regionInfo = inputData.投放区域.toLowerCase();
    }
    
    // 组合国家和区域信息
    let locationInfo = '';
    if (countryInfo && regionInfo) {
      // 投放国家有选 + 投放区域有选：日期-国家,地区-年龄范围-编号
      locationInfo = `${countryInfo}${regionInfo}`;
    } else if (regionInfo) {
      // 投放国家没选 + 投放区域有选：日期-地区-年龄范围-编号
      locationInfo = regionInfo;
    }
    
    // 处理年龄范围信息 - 优先使用建议受众-最小年龄，如果没有则使用最小年龄
    const minAge = inputData['建议受众-最小年龄'] || inputData['最小年龄'] || '';
    const maxAge = inputData['建议受众-最大年龄'] || inputData['最大年龄'] || '';
    const ageRange = minAge && maxAge ? `${minAge}${maxAge}` : minAge;
    
    // 使用递增的编号（按会话隔离）
    const sessionBatchData = getBatchDataForSession(sessionId);
    const sequence = sessionBatchData.adSetNameCounter;
    sessionBatchData.adSetNameCounter++;
    saveBatchData();
    
    row['Ad Set Name'] = `test-${dateStr}-${locationInfo}-${ageRange}-${sequence}`;
  } else {
    row['Ad Set Name'] = inputData.商品SPU ? `test-${inputData.商品SPU}_AdSet` : '';
  }
  
  // 生成Ad Set Time Start: 第二天凌晨12:00:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
  const day = tomorrow.getDate().toString().padStart(2, '0');
  const year = tomorrow.getFullYear();
  const hours = tomorrow.getHours();
  const minutes = tomorrow.getMinutes().toString().padStart(2, '0');
  const seconds = tomorrow.getSeconds().toString().padStart(2, '0');
  
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  const ampm = hours < 12 ? 'am' : 'pm';
  
  row['Ad Set Time Start'] = `${month}/${day}/${year} ${displayHours}:${minutes}:${seconds} ${ampm}`;
  row['Ad Set Time Stop'] = '';
  // 预算字段逻辑：Campaign Daily Budget 始终留空，Ad Set Daily Budget 使用填写值；为空或非法时默认 10
  row['Ad Set Daily Budget'] = String(parsedBudget);
  row['Destination Type'] = '';
  row['Ad Set Lifetime Budget'] = '0';
  row['Rate Card'] = '';
  row['Ad Set Schedule'] = '';
  row['Use Accelerated Delivery'] = 'No';
  row['Frequency Control'] = '';
  row['Ad Set Minimum Spend Limit'] = '';
  row['Ad Set Maximum Spend Limit'] = '';
  row['Is Budget Scheduling Enabled For Ad Set'] = '';
  row['Ad Set High Demand Periods'] = '';
  row['Link Object ID'] = '';
  
  // 处理像素字段，确保有tp:前缀
  let pixelValue = inputData.像素 || '';
  if (pixelValue && !pixelValue.startsWith('tp:')) {
    pixelValue = `tp:${pixelValue}`;
  }
  row['Optimized Conversion Tracking Pixels'] = pixelValue;
  row['Optimized Custom Conversion ID'] = '';
  row['Optimized Pixel Rule'] = '';
  row['Optimized Event'] = 'PURCHASE';
  row['Custom Event Name'] = '';
  
  // 生成Link: 广告域名+产品ID路径
  const adDomain = inputData.广告域名 || '';
  const productSuffix = inputData.generatedProductSuffix || (uniqueProductId.split('/').pop() || '');
  const redirectPath = productSuffix ? `/producttop1/${productSuffix}` : uniqueProductId;
  
  if (adDomain) {
    let domain = adDomain;
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    domain = domain.replace(/\/$/, '');
    
    const normalizedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
    row['Link'] = `${domain}${normalizedPath}`;
  } else {
    row['Link'] = inputData.专辑链接 || '';
  }
  
  row['Application ID'] = '';
  row['Product Set ID'] = '';
  row['Place Page Set ID'] = '';
  row['Object Store URL'] = '';
  row['Offer ID'] = '';
  row['Offline Event Data Set ID'] = '';
  
  // 3. 地理位置相关
  row['Countries'] = inputData.投放国家 || '';
  row['Cities'] = '';
  row['Regions'] = inputData.投放地区 || '';
  row['Electoral Districts'] = '';
  row['Zip'] = '';
  row['Addresses'] = '';
  row['Geo Markets (DMA)'] = '';
  row['Global Regions'] = inputData.投放区域 || '';
  row['Large Geo Areas'] = '';
  row['Medium Geo Areas'] = '';
  row['Small Geo Areas'] = '';
  row['Metro Areas'] = '';
  row['Neighborhoods'] = '';
  row['Subneighborhoods'] = '';
  row['Subcities'] = '';
  row['Location Types'] = 'home.recent';
  row['Location Cluster IDs'] = '';
  row['Location Set IDs'] = '';
  row['Excluded Countries'] = inputData.排除国家 || '';
  row['Excluded Cities'] = '';
  row['Excluded Large Geo Areas'] = '';
  row['Excluded Medium Geo Areas'] = '';
  row['Excluded Metro Areas'] = '';
  row['Excluded Small Geo Areas'] = '';
  row['Excluded Subcities'] = '';
  row['Excluded Neighborhoods'] = '';
  row['Excluded Subneighborhoods'] = '';
  row['Excluded Regions'] = '';
  row['Excluded Electoral Districts'] = '';
  row['Excluded Zip'] = '';
  row['Excluded Addresses'] = '';
  row['Excluded Geo Markets (DMA)'] = '';
  row['Excluded Global Regions'] = '';
  row['Excluded Location Cluster IDs'] = '';
  
  // 4. 受众相关
  if (inputData['建议受众-性别']) {
    row['Gender'] = inputData['建议受众-性别'] === '1' ? 'Men' : 
                   inputData['建议受众-性别'] === '2' ? 'Women' : '';
  } else {
    row['Gender'] = '';
  }
  
  // 根据进阶赋能型受众开关决定Age Min和Age Max的值
  console.log('进阶赋能型受众开关值:', inputData['进阶赋能型受众']);
  if (inputData['进阶赋能型受众'] === '关闭') {
    // 关闭模式：使用建议受众年龄字段
    row['Age Min'] = inputData['建议受众-最小年龄'] || '';
    row['Age Max'] = inputData['建议受众-最大年龄'] || '';
    console.log('关闭模式 - Age Min:', row['Age Min'], 'Age Max:', row['Age Max']);
  } else {
    // 开启模式：使用控制选项-年龄下限
    row['Age Min'] = inputData['控制选项-年龄下限'] || '';
    row['Age Max'] = '65';
    console.log('开启模式 - Age Min:', row['Age Min'], 'Age Max:', row['Age Max']);
  }
  
  // 设置其他受众字段为空
  const audienceFields = [
    'Education Status', 'Fields of Study', 'Education Schools', 'Work Job Titles', 'Work Employers',
    'College Start Year', 'College End Year', 'Interested In', 'Relationship', 'Family Statuses',
    'Industries', 'Life Events', 'Politics', 'Income', 'Net Worth', 'Home Type', 'Home Ownership',
    'Home Value', 'Multicultural Affinity', 'Generation', 'Household Composition', 'Moms',
    'Office Type', 'Behaviors', 'Connections', 'Excluded Connections', 'Friends of Connections',
    'Locales', 'Site Category', 'Unified Interests', 'Excluded User AdClusters', 'Broad Category Clusters',
    'Targeting Categories - ALL OF', 'Custom Audiences', 'Excluded Custom Audiences',
    'Flexible Inclusions', 'Flexible Exclusions', 'Advantage Audience', 'Age Range',
    'Targeting Optimization', 'Targeting Relaxation', 'Product Audience Specs',
    'Excluded Product Audience Specs', 'Targeted Business Locations', 'Dynamic Audiences',
    'Excluded Dynamic Audiences'
  ];
  
  audienceFields.forEach(field => {
    if (field === 'Advantage Audience') {
      if (inputData['进阶赋能型受众'] === '关闭') {
        row[field] = '0';
        console.log('关闭模式 - Advantage Audience:', row[field]);
      } else {
        row[field] = '1';
        console.log('开启模式 - Advantage Audience:', row[field]);
      }
    } else if (field === 'Age Range') {
      if (inputData['进阶赋能型受众'] === '关闭') {
        row[field] = '';
        console.log('关闭模式 - Age Range:', row[field]);
      } else {
        const minAge = inputData['建议受众-最小年龄'] || '';
        const maxAge = inputData['建议受众-最大年龄'] || '';
        if (minAge && maxAge) {
          row[field] = `${minAge},${maxAge}`;
        } else {
          row[field] = '';
        }
        console.log('开启模式 - Age Range:', row[field]);
      }
    } else {
      row[field] = '';
    }
  });
  
  row['Beneficiary'] = inputData.受益人 || '';
  row['Payer'] = inputData.受益人 || '';
  
  // 5. 平台相关
  const platformFields = [
    'Publisher Platforms', 'Facebook Positions', 'Instagram Positions', 'Audience Network Positions',
    'Messenger Positions', 'Oculus Positions', 'Device Platforms', 'User Device', 'Excluded User Device',
    'User Operating System', 'User OS Version', 'Wireless Carrier', 'Excluded Publisher Categories',
    'Brand Safety Inventory Filtering Levels', 'Optimization Goal', 'Attribution Spec', 'Billing Event',
    'Bid Amount', 'Ad Set Bid Strategy', 'Regional Regulated Categories',
    'Beneficiary (financial ads in Australia)', 'Payer (financial ads in Australia)',
    'Beneficiary (financial ads in Taiwan)', 'Payer (financial ads in Taiwan)',
    'Beneficiary (Taiwan)', 'Payer (Taiwan)'
  ];
  
  platformFields.forEach(field => {
    if (field === 'User Operating System') {
      row[field] = 'All';
    } else if (field === 'Brand Safety Inventory Filtering Levels') {
      row[field] = 'FACEBOOK_RELAXED, AN_RELAXED';
    } else if (field === 'Optimization Goal') {
      row[field] = 'OFFSITE_CONVERSIONS';
    } else if (field === 'Attribution Spec') {
      row[field] = '[{"event_type":"CLICK_THROUGH","window_days":7},{"event_type":"VIEW_THROUGH","window_days":1},{"event_type":"ENGAGED_VIDEO_VIEW","window_days":1}]';
    } else if (field === 'Billing Event') {
      row[field] = 'IMPRESSIONS';
    } else if (field === 'Ad Set Bid Strategy') {
      row[field] = 'Highest volume or value';
    } else if (field === 'Regional Regulated Categories') {
      row[field] = 'TAIWAN_UNIVERSAL';
    } else if (field === 'Beneficiary' || field === 'Payer') {
      row[field] = inputData.受益人 || '';
    } else if (field.includes('Beneficiary') || field.includes('Payer')) {
      row[field] = '';
    } else {
      row[field] = '';
    }
  });
  
  // 6. Ad相关字段
  row['Story ID'] = '';
  row['Ad ID'] = '';
  row['Ad Status'] = 'ACTIVE';
  row['Preview Link'] = '';
  row['Instagram Preview Link'] = '';
  // Ad Name字段：轮播模式下，商品SPU已经是逗号分隔的字符串，直接使用
  // 非轮播模式下，使用单个商品SPU
  // 注意：确保使用英文逗号","，不是中文逗号"，"
  if (inputData.商品SPU) {
    let productSpu = inputData.商品SPU.trim();
    // 如果包含中文逗号"，"，先替换为英文逗号","
    if (productSpu.includes('，')) {
      console.log('[ABO] 检测到中文逗号，自动替换为英文逗号');
      productSpu = productSpu.replace(/，/g, ',');
    }
    // 检测是否为轮播模式（商品SPU包含英文逗号，说明是多个SPU用逗号分隔）
    if (productSpu.includes(',')) {
      // 轮播模式：商品SPU已经是逗号分隔的字符串，直接使用
      console.log('[ABO] 轮播模式：商品SPU已包含逗号分隔:', productSpu);
      row['Ad Name'] = productSpu; // 直接使用，确保是英文逗号分隔的格式
    } else {
      // 非轮播模式：单个商品SPU
      row['Ad Name'] = productSpu;
    }
  } else {
    row['Ad Name'] = '';
  }
  row['Dynamic Creative Ad Format'] = '';
  
  row['Title'] = inputData.标题 || '';
  row['Title Placement'] = '';
  
  for (let i = 1; i <= 9; i++) {
    row[`Additional Title ${i}`] = '';
    row[`Additional Title ${i} Placement`] = '';
  }
  
  row['Body'] = inputData.广告语 || '';
  row['Body Placement'] = '';
  
  for (let i = 1; i <= 9; i++) {
    row[`Additional Body ${i}`] = '';
    row[`Additional Body ${i} Placement`] = '';
  }
  
  row['Display Link'] = '';
  row['Link Placement'] = '';
  
  for (let i = 1; i <= 9; i++) {
    row[`Additional Link ${i}`] = '';
    row[`Additional Display Link ${i}`] = '';
    row[`Additional Link ${i} Placement`] = '';
  }
  
  row['Link Description'] = inputData.描述 || '';
  
  for (let i = 1; i <= 9; i++) {
    row[`Additional Link Description ${i}`] = '';
  }
  
  row['Optimize text per person'] = 'No';
  row['Retailer IDs'] = '';
  row['Post Click Item Headline'] = '';
  row['Post Click Item Description'] = '';
  row['Conversion Tracking Pixels'] = inputData.像素 || '';
  row['Optimized Ad Creative'] = 'No';
  // ==================== 根据链接类型填充内容（表头结构不变）====================
  
  // 1. 解析链接内容（可能包含多个链接，用分隔符分割）
  let linkContent = inputData.商品图片链接 || ''; // 保持字段名不变，但可能包含视频链接
  const parsedLinks = linkContent ? linkContent.split(/[\s,，、]+/).map(l => l.trim()).filter(Boolean) : [];
  const batchLinkType = determineBatchLinkType(parsedLinks);
  const firstLink = parsedLinks.length > 0 ? parsedLinks[0] : ''; // 使用第一个链接
  
  console.log(`🔍 [generateABOData] 链接类型检测结果: ${batchLinkType}, 链接数量: ${parsedLinks.length}`);
  
  // 2. 所有表头字段都保持不变，根据链接类型填充不同的内容
  
  // ========== 图片相关字段（所有列名保持不变）==========
  row['Image Hash'] = ''; // 列名不变
  
  if (batchLinkType === 'video') {
    // 视频模式：图片相关列留空
    row['Image File Name'] = ''; // 列名不变，但内容为空
    console.log('📹 视频模式：Image File Name 列留空');
  } else {
    // 图片模式：图片相关列填入内容（保持原有逻辑）
    if (firstLink) {
      const imageFileName = extractFileNameFromLink(firstLink);
      row['Image File Name'] = imageFileName; // 列名不变，填入图片文件名
      console.log('📸 图片模式：Image File Name 列填入内容');
    } else {
      row['Image File Name'] = '';
    }
  }
  
  row['Image Crops'] = ''; // 列名不变
  row['Image Customization'] = ''; // 列名不变
  row['Image Placement'] = ''; // 列名不变
  
  // ========== 视频相关字段（所有列名保持不变）==========
  if (batchLinkType === 'video') {
    // 视频模式：只填入 Video File Name，Video ID 保持为空
    if (firstLink) {
      const videoFileName = extractFileNameFromLink(firstLink);
      row['Video File Name'] = videoFileName; // 列名不变，填入视频文件名
      row['Video ID'] = ''; // Video ID 保持为空（即使检测到是视频链接）
      console.log('📹 视频模式：Video File Name 填入内容，Video ID 留空');
    } else {
      row['Video File Name'] = '';
      row['Video ID'] = '';
    }
  } else {
    // 图片模式：视频相关列留空（保持原有逻辑）
    row['Video File Name'] = ''; // 列名不变，但内容为空
    row['Video ID'] = ''; // 列名不变，但内容为空
    console.log('📸 图片模式：Video File Name 和 Video ID 列留空');
  }
  
  row['Video Customization'] = ''; // 列名不变
  row['Video Placement'] = ''; // 列名不变
  
  // ========== Additional Images（所有列名保持不变）==========
  // 视频模式：全部留空；图片模式：按原有逻辑处理（当前都是空）
  for (let i = 1; i <= 9; i++) {
    row[`Additional Image ${i} Hash`] = '';
    row[`Additional Image ${i} Crops`] = '';
    row[`Additional Image ${i} Customization`] = '';
    row[`Additional Image ${i} Placement`] = '';
  }
  
  // ========== Additional Videos（所有列名保持不变）==========
  // 视频模式：可以填入内容（当前先用第一个视频，其他留空）
  // 图片模式：全部留空
  for (let i = 1; i <= 9; i++) {
    if (batchLinkType === 'video' && i === 1 && firstLink) {
      // 视频模式下，可以填入第一个视频的信息（如果需要）
      row[`Additional Video ${i} ID`] = ''; // 根据需要填入
      row[`Additional Video ${i} Customization`] = '';
      row[`Additional Video ${i} Placement`] = '';
      row[`Additional Video ${i} Thumbnail URL`] = '';
    } else {
      // 其他情况全部留空
      row[`Additional Video ${i} ID`] = '';
      row[`Additional Video ${i} Customization`] = '';
      row[`Additional Video ${i} Placement`] = '';
      row[`Additional Video ${i} Thumbnail URL`] = '';
    }
  }
  
  // ========== 其他字段保持不变 ==========
  row['Video Thumbnail URL'] = ''; // 列名不变
  row['Instagram Platform Image Hash'] = '';
  row['Instagram Platform Image Crops'] = '';
  row['Instagram Platform Image URL'] = '';
  row['Carousel Delivery Mode'] = '';
  row['Creative Type'] = batchLinkType === 'video' ? 'Video Page Post Ad' : 'Link Page Post Ad';
  row['URL Tags'] = 'utm_source={{campaign.name}}&utm_medium={{campaign.id}}&utm_campaign={{adset.id}}&utm_content={{ad.id}}';
  row['View Tags'] = '';
  row['Event ID'] = '';
  
  row['Instagram Account ID'] = '';
  row['Mobile App Deep Link'] = '';
  row['Product Link'] = '';
  row['App Link Destination'] = '';
  row['Call Extension Phone Data ID'] = '';
  row['Call to Action'] = 'SHOP_NOW';
  
  for (let i = 5; i <= 9; i++) {
    row[`Additional Call To Action ${i}`] = '';
  }
  
  row['Call to Action Link'] = '';
  row['Call to Action WhatsApp Number'] = '';
  row['Additional Custom Tracking Specs'] = '';
  row['Video Retargeting'] = '';
  row['Lead Form ID'] = '';
  row['Permalink'] = '';
  row['Force Single Link'] = '';
  row['Format Option'] = '';
  row['Dynamic Ad Voice'] = '';
  row['Creative Optimization'] = '';
  row['Template URL'] = '';
  
  const appFields = [
    'Android App Name', 'Android Package Name', 'Deep Link For Android', 'Facebook App ID',
    'iOS App Name', 'iOS App Store ID', 'Deep Link For iOS', 'iPad App Name', 'iPad App Store ID',
    'Deep Link For iPad', 'iPhone App Name', 'iPhone App Store ID', 'Deep Link For iPhone',
    'Deep link to website', 'Windows Store ID', 'Windows App Name', 'Deep Link For Windows Phone'
  ];
  
  appFields.forEach(field => {
    row[field] = '';
  });
  
  row['Add End Card'] = '';
  row['Dynamic Ads Ad Context'] = '';
  row['Page Welcome Message'] = '';
  row['App Destination'] = '';
  row['App Destination Page ID'] = '';
  row['Use Page as Actor'] = '';
  row['Image Overlay Template'] = '';
  row['Image Overlay Text Type'] = '';
  row['Image Overlay Text Font'] = '';
  row['Image Overlay Position'] = '';
  row['Image Overlay Theme Color'] = '';
  row['Image Overlay Float With Margin'] = '';
  
  for (let layer = 1; layer <= 3; layer++) {
    const layerFields = [
      'layer_type', 'image_source', 'overlay_shape', 'text_font', 'shape_color', 'text_color',
      'content_type', 'price', 'low_price', 'high_price', 'frame_source', 'frame_image_hash',
      'scale', 'blending_mode', 'opacity', 'overlay_position', 'pad_image', 'crop_image'
    ];
    
    layerFields.forEach(field => {
      row[`Image Layer ${layer} - ${field}`] = '';
    });
  }
  
  for (let product = 1; product <= 10; product++) {
    const productFields = [
      'Link', 'Name', 'Description', 'Image Hash', 'Image Crops', 'Video ID',
      'Call To Action Link', 'Mobile App Deep Link', 'Display Link', 'Place Data', 'Is Static Card'
    ];
    
    productFields.forEach(field => {
      row[`Product ${product} - ${field}`] = '';
    });
  }
  
  row['Product Sales Channel'] = '';
  row['Dynamic Creative Lead Form ID'] = '';
  
  for (let i = 1; i <= 9; i++) {
    row[`Additional Dynamic Creative Lead Gen Form ID ${i}`] = '';
  }
  
  row['Dynamic Creative Call to Action'] = '';
  
  for (let i = 5; i <= 9; i++) {
    row[`Additional Dynamic Creative Call To Action Type ${i}`] = '';
  }
  
  row['Degrees of Freedom Type'] = '';
  row['Mockup ID'] = '';
  row['Text Transformations'] = '';
  row['Ad Stop Time'] = '';
  row['Ad Start Time'] = '';
  
  return row;
}

// 生成URL重定向数据
async function generateURLRedirectData(inputData, providedProductId = null, sessionId = null) {
  const uniqueProductId = providedProductId || await generateUniqueProductId(null, null, sessionId);
  const productSuffix = inputData.generatedProductSuffix || (uniqueProductId.split('/').pop() || '');
  const redirectFrom = productSuffix ? `/producttop1/${productSuffix}` : uniqueProductId;
  
  let redirectTo = inputData.专辑链接;
  
  // 构建ids参数值：商品ID + 固定部分商品ID（用英文逗号分隔）
  const idsArray = [];
  
  // 添加商品ID（如果有）
  if (inputData.商品ID) {
    const productId = inputData.商品ID.trim();
    // 检测是否为轮播模式（商品ID包含英文逗号，说明是多个ID用逗号分隔）
    // 注意：如果包含中文逗号"，"，先替换为英文逗号","
    let normalizedProductId = productId;
    if (normalizedProductId.includes('，')) {
      console.log('[Redirect] 检测到中文逗号，自动替换为英文逗号');
      normalizedProductId = normalizedProductId.replace(/，/g, ',');
    }
    
    if (normalizedProductId.includes(',')) {
      // 轮播模式：商品ID已经是逗号分隔的字符串，直接使用
      console.log('[Redirect] 轮播模式：商品ID已包含逗号分隔:', normalizedProductId);
      // 将逗号分隔的字符串拆分成数组，然后重新用英文逗号连接（确保格式正确）
      const productIdArray = normalizedProductId.split(',').map(id => id.trim()).filter(id => id.length > 0);
      idsArray.push(...productIdArray);
    } else {
      // 非轮播模式：单个商品ID
      idsArray.push(normalizedProductId);
    }
  }
  
  // 解析并添加固定部分商品ID（支持批量输入）
  // 注意：固定部分商品ID应该从原始输入数据中获取，而不是从处理后的单行数据中获取
  // 因为固定部分商品ID是全局的，应该添加到每一行
  console.log('[Redirect] 开始处理固定部分商品ID，inputData的所有字段:', Object.keys(inputData));
  console.log('[Redirect] 尝试访问 inputData["固定部分商品ID"]:', inputData['固定部分商品ID']);
  console.log('[Redirect] 尝试访问 inputData.固定部分商品ID:', inputData.固定部分商品ID);
  
  const fixedProductIdsRaw = inputData['固定部分商品ID'] || inputData.固定部分商品ID;
  if (fixedProductIdsRaw) {
    console.log('[Redirect] ✅ 检测到固定部分商品ID:', fixedProductIdsRaw);
    console.log('[Redirect] 固定部分商品ID类型:', typeof fixedProductIdsRaw);
    console.log('[Redirect] 固定部分商品ID长度:', fixedProductIdsRaw.length);
    const fixedProductIds = parseProductField(fixedProductIdsRaw);
    console.log('[Redirect] 解析后的固定部分商品ID:', fixedProductIds);
    console.log('[Redirect] 解析后的固定部分商品ID数量:', fixedProductIds.length);
    // 固定部分商品ID追加在商品ID后面，用英文逗号分隔
    idsArray.push(...fixedProductIds);
  } else {
    console.log('[Redirect] ❌ 未检测到固定部分商品ID字段');
    console.log('[Redirect] inputData的所有字段:', Object.keys(inputData));
    console.log('[Redirect] inputData的完整内容:', JSON.stringify(inputData, null, 2));
  }
  
  // 如果有任何ID，添加到redirectTo中（使用英文逗号分隔）
  if (idsArray.length > 0) {
    const separator = redirectTo.includes('?') ? '&' : '?';
    const idsValue = idsArray.join(','); // 使用英文逗号分隔
    redirectTo = `${redirectTo}${separator}ids=${idsValue}`;
    console.log('[Redirect] 生成的Redirect to:', redirectTo);
  }
  
  if (redirectTo && !redirectTo.startsWith('/')) {
    redirectTo = '/' + redirectTo;
  }
  
  return {
    'Redirect from': redirectFrom,
    'Redirect to': redirectTo
  };
}

// 生成ABO Excel表格（使用完整Facebook格式）
async function generateABOExcel(dataArray, sessionId = null) {
  const { processedData } = await prepareProcessedProducts(dataArray);
  return await generateABOExcelFromProcessed(processedData, sessionId);
}

async function generateABOExcelFromProcessed(processedData, sessionId = null) {
  const aboData = [];
  for (const row of processedData) {
    try {
      const aboRow = await generateABOData(row, row.generatedProductId, sessionId);
      
      // 创建完整的数据行，填充所有模板字段
      const fullRow = {};
      ABO_TEMPLATE_FIELDS.forEach(field => {
        fullRow[field] = aboRow[field] || '';
      });
      
      aboData.push(fullRow);
    } catch (error) {
      console.error(`生成ABO数据时出错:`, error.message);
    }
  }
  
  // 创建Excel工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(aboData);
  XLSX.utils.book_append_sheet(wb, ws, 'ABO_Campaigns');
  
  // 转换为Buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return excelBuffer;
}

// 生成URL重定向CSV（使用8889端口服务的格式）
async function generateURLRedirectCSV(dataArray, sessionId = null) {
  const { processedData } = await prepareProcessedProducts(dataArray);
  return await generateURLRedirectCSVFromProcessed(processedData, sessionId);
}

async function generateURLRedirectCSVFromProcessed(processedData, sessionId = null) {
  const redirectData = [];
  for (let index = 0; index < processedData.length; index++) {
    const row = processedData[index];
    try {
      console.log(`[Redirect CSV] 处理第${index + 1}行数据，字段列表:`, Object.keys(row));
      console.log(`[Redirect CSV] 第${index + 1}行的固定部分商品ID字段值:`, row['固定部分商品ID'] || row.固定部分商品ID || '未找到');
      const redirectRow = await generateURLRedirectData(row, row.generatedProductId, sessionId);
      
      // 创建完整的数据行，填充所有模板字段
      const fullRow = {};
      URL_REDIRECT_FIELDS.forEach(field => {
        fullRow[field] = redirectRow[field] || '';
      });
      
      redirectData.push(fullRow);
    } catch (error) {
      console.error(`生成URL重定向数据时出错:`, error.message);
    }
  }
  
  // 转换为CSV格式
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(redirectData));
  return Buffer.from('\uFEFF' + csv, 'utf-8'); // 添加BOM以支持中文
}

// 将Buffer转换为Base64
function bufferToBase64(buffer, mimeType) {
  return {
    data: buffer.toString('base64'),
    mimeType: mimeType
  };
}

// 中间件 - 必须在路由之前定义
// 配置 Helmet 以允许 CDN 资源（Bootstrap等）和 iframe 嵌入
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
      frameAncestors: ["'self'", "http://192.168.0.51:5173", "http://localhost:5173"], // 允许被 Shoplazza 嵌入
      upgradeInsecureRequests: null
    },
  },
  frameguard: false, // 禁用 X-Frame-Options，使用 CSP 的 frameAncestors 代替
}));
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    // 允许的来源列表
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:18080',
      'http://192.168.0.51:5173',  // Shoplazza 系统
      'http://localhost:5173',     // Shoplazza 本地开发
      'http://192.168.0.51:18080', // 融合平台外部访问
    ];
    
    try {
      // 允许无 origin 的请求（如 Postman、移动应用、同源请求等）
      if (!origin) {
        return callback(null, true);
      }
      
      // 检查是否在允许列表中
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // 新增：允许所有内网 IP (192.168.x.x) 访问
      // 匹配格式：http://192.168.x.x:端口号
      const isLocalNetwork = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);
      if (isLocalNetwork) {
        console.log(`✅ 允许内网访问: ${origin}`);
        return callback(null, true);
      }
      
      // 如果不在列表中，拒绝请求
      console.warn(`⚠️  CORS 拒绝访问: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    } catch (error) {
      // 如果函数内部出错，记录错误但允许请求（避免阻塞）
      console.error('CORS origin 函数错误:', error);
      callback(null, true); // 降级处理：允许请求
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-session-id'], // 添加 x-session-id
}));

// 全局错误处理中间件（必须在路由之前）
app.use((err, req, res, next) => {
  if (err) {
    console.error('中间件错误:', err);
    // 如果是 CORS 错误，返回 403
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({ 
        success: false, 
        error: 'CORS policy violation',
        message: err.message 
      });
    }
    // 其他错误返回 500
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message || 'Unknown error'
    });
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 图片链接接口
app.get('/api/image-links', async (req, res) => {
  try {
    await loadImageLinks();
    const sessionId = getRequestSessionId(req);
    const sessionState = getSessionState(sessionId);
    const links = sessionState.links || [];

    console.log('📤 [API Gateway] GET /api/image-links', {
      sessionId,
      count: links.length
    });

    res.json({ success: true, links });
  } catch (e) {
    console.error('❌ [API Gateway] GET /api/image-links 失败:', e.message);
    console.error('❌ [API Gateway] 错误堆栈:', e.stack);
    res.json({ success: true, links: [] });
  }
});

app.post('/api/image-links', async (req, res) => {
  try {
    console.log('🔍 API Gateway 接收到图片链接同步请求');
    await loadImageLinks();
    const sessionId = getRequestSessionId(req);
    const sessionState = getSessionState(sessionId);
    
    // 处理空body或links为空数组的情况
    const body = req.body || {};
    let links = body.links;
    
    // 如果links未定义或为null，使用空数组
    if (links === undefined || links === null) {
      links = [];
    }
    
    console.log('🔍 提取的 links:', links);
    console.log('🔍 links 类型:', typeof links);
    console.log('🔍 links 是否为数组:', Array.isArray(links));
    
    if (!Array.isArray(links)) {
      console.log('❌ links 不是数组，返回400错误');
      return res.status(400).json({ success: false, error: 'links must be array' });
    }
    
    const normalizedLinks = Array.isArray(links) ? [...links] : [];
    const newSignature = JSON.stringify(normalizedLinks);
    const prevSignature = lastLinksSignature.get(sessionId);
    if (prevSignature === newSignature) {
      sessionState.updatedAt = Date.now();
      lastLinksSignature.set(sessionId, newSignature);
      await saveImageLinks();
      console.log('ℹ️ [API Gateway] 图片链接未变化，跳过后台同步和下载', { sessionId, count: sessionState.links ? sessionState.links.length : normalizedLinks.length });
      return res.json({
        success: true,
        count: sessionState.links ? sessionState.links.length : normalizedLinks.length,
        downloaded: 0,
        autoDownloadStarted: 0,
        message: 'links unchanged'
      });
    }

    sessionState.links = normalizedLinks;
    links = sessionState.links;
    sessionState.updatedAt = Date.now();
    lastLinksSignature.set(sessionId, JSON.stringify(links));
    await saveImageLinks();
    console.log('💾 [API Gateway] 已保存图片链接到文件', {
      sessionId,
      count: sessionState.links.length
    });
    
    // 如果有图片链接，立即触发后台自动下载到视频服务的可变部分
    let downloadStarted = false;
    if (links.length > 0) {
      console.log('🚀 [API Gateway] 检测到图片链接，开始后台自动下载...');
      
      // 异步执行下载，不阻塞API响应
      (async () => {
        try {
          // 先清空可变部分
          try {
            await axios.post(
              `${SERVICES.videoGeneration}/api/clear-images`,
              { folder_type: 'variable' },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-session-id': sessionId
                },
                timeout: 10000
              }
            );
            console.log('✅ [API Gateway] 已清空可变部分，开始下载图片...');
          } catch (clearError) {
            console.warn('⚠️  [API Gateway] 清空可变部分失败，继续下载:', clearError.message);
          }
          
          // 等待一下让清空操作完成
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 逐个下载图片
          let successCount = 0;
          for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (!link || !link.trim()) continue;
            
            try {
              // 使用现有的下载接口
              const downloadResp = await axios.post(
                `${SERVICES.videoGeneration}/api/download-image`,
                { 
                  url: `${req.protocol}://${req.get('host')}/api/proxy-image-direct?u=${encodeURIComponent(link)}`,
                  folder_type: 'variable'
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                  },
                  timeout: 30000
                }
              );
              
              if (downloadResp.data && downloadResp.data.success) {
                successCount++;
                console.log(`✅ [API Gateway] 后台下载成功 ${i + 1}/${links.length}: ${link.substring(0, 60)}...`);
              } else {
                console.warn(`⚠️  [API Gateway] 后台下载失败 ${i + 1}/${links.length}: ${link.substring(0, 60)}...`);
              }
              
              // 每个图片下载后稍作延迟
              if (i < links.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 350));
              }
            } catch (downloadError) {
              console.error(`❌ [API Gateway] 下载图片失败 ${i + 1}/${links.length}:`, downloadError.message);
            }
          }
          
          console.log(`📊 [API Gateway] 后台自动下载完成: 成功 ${successCount}/${links.length} 个`);
        } catch (error) {
          console.error('❌ [API Gateway] 后台自动下载异常:', error.message);
        }
      })();
      
      downloadStarted = true;
    } else {
      // 如果链接为空，清空可变部分
      (async () => {
        try {
          await axios.post(
            `${SERVICES.videoGeneration}/api/clear-images`,
            { folder_type: 'variable' },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
              },
              timeout: 10000
            }
          );
          console.log('✅ [API Gateway] 链接为空，已清空可变部分');
        } catch (clearError) {
          console.warn('⚠️  [API Gateway] 清空可变部分失败:', clearError.message);
        }
      })();
    }
    
    return res.json({ 
      success: true, 
      count: sessionState.links.length, 
      downloaded: downloadStarted ? 1 : 0, 
      autoDownloadStarted: downloadStarted,
      message: downloadStarted ? '已开始后台自动下载' : (links.length === 0 ? '已清空可变部分' : '前端将处理下载'),
      sessionId
    });
  } catch (e) {
    console.error('❌ API Gateway 图片链接同步错误:', e);
    console.error('错误堆栈:', e.stack);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 清空图片链接接口（用于清空所有功能）
app.delete('/api/image-links', async (req, res) => {
  try {
    console.log('🗑️  API Gateway 接收到清空图片链接请求');
    await loadImageLinks();
    const sessionId = getRequestSessionId(req);
    const sessionState = getSessionState(sessionId);
    sessionState.links = [];
    sessionState.updatedAt = Date.now();
    lastLinksSignature.set(sessionId, JSON.stringify([]));
    await saveImageLinks();
    console.log('✅ 已清空图片链接文件', { sessionId });
    
    return res.json({ 
      success: true, 
      message: '图片链接已清空',
      count: 0,
      sessionId
    });
  } catch (e) {
    console.error('❌ 清空图片链接错误:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 文件存储配置
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ✅ 内存存储配置（用于 imgfi 上传，不存入磁盘）
// 使用 memoryStorage 的好处：
// 1. 不占用磁盘空间
// 2. 上传速度快（直接内存操作）
// 3. 适合临时文件处理（上传后立即转发，不需要持久化）
const uploadMemory = multer({
  storage: multer.memoryStorage(), // 使用内存存储
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制（imgfi 上传限制）
  }
});


// 静态文件服务
// 开发模式下代理到Vite开发服务器
if (process.env.NODE_ENV === 'development') {
  app.get('*', async (req, res) => {
    try {
      const response = await axios({
        method: req.method,
        url: `http://localhost:18081${req.path}`,
        data: req.body,
        params: req.query,
        headers: {
          ...req.headers,
          host: undefined
        },
        timeout: 5000
      });
      
      res.status(response.status).send(response.data);
    } catch (error) {
      res.status(500).send('前端服务不可用');
    }
  });
} else {
  // 生产模式下使用构建后的静态文件
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}
app.use('/uploads', express.static('uploads'));

// 静态文件服务：public/temp 目录（用于图片拼接素材）
const publicTempDir = path.join(__dirname, 'public', 'temp');
app.use('/temp', express.static(publicTempDir));

// 图片链接管理功能已移除 - 重复的接口定义已删除

// 占位图：白底PNG（1x1）
const WHITE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axlT3cAAAAASUVORK5CYII=';
app.get('/api/placeholder/white.png', (req, res) => {
  const imgBuffer = Buffer.from(WHITE_PNG_BASE64, 'base64')
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(imgBuffer)
});

// 图片拼接：下载图片到本地
app.post('/api/fetch-image', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少图片 URL 参数'
      });
    }

    // 简单的 URL 验证
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'URL 必须以 http:// 或 https:// 开头'
      });
    }

    console.log(`📥 [图片下载] 开始下载图片: ${trimmedUrl.substring(0, 100)}...`);

    // 获取用户 Session ID（用于用户隔离）
    // 从请求头或 Cookie 获取 Session ID
    const sessionId = getRequestSessionId(req);
    console.log(`📥 [图片下载] 用户 Session ID: ${sessionId}`);

    // 创建用户专属目录：public/temp/{sessionId}/
    // 这样每个用户有独立的目录，避免文件冲突
    const publicTempDir = path.join(__dirname, 'public', 'temp', sessionId);
    await fs.mkdir(publicTempDir, { recursive: true });
    console.log(`📥 [图片下载] 用户专属目录: ${publicTempDir}`);

    // 下载图片
    const response = await axios({
      method: 'GET',
      url: trimmedUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        'Accept': 'image/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    // 获取文件扩展名（从 Content-Type 或 URL）
    let fileExt = '.jpg'; // 默认扩展名
    const contentType = response.headers['content-type'];
    if (contentType) {
      if (contentType.includes('png')) fileExt = '.png';
      else if (contentType.includes('gif')) fileExt = '.gif';
      else if (contentType.includes('webp')) fileExt = '.webp';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExt = '.jpg';
    } else {
      // 从 URL 提取扩展名
      const urlExt = trimmedUrl.split('.').pop().split('?')[0].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExt)) {
        fileExt = '.' + urlExt;
      }
    }

    // 生成唯一文件名
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const filename = uniqueId + fileExt;
    const localPath = path.join(publicTempDir, filename);

    // 保存文件
    await fs.writeFile(localPath, Buffer.from(response.data));

    // 构建访问 URL（包含 Session ID，实现用户隔离）
    // 路径格式：/temp/{sessionId}/filename.jpg
    const publicUrl = `/temp/${sessionId}/${filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

    console.log(`✅ [图片下载] 下载成功: ${filename} (${(response.data.length / 1024).toFixed(2)} KB)`);

    // 返回包含 Session ID 的路径（与 Python 服务期望的格式一致）
    // 路径格式：/temp/{sessionId}/filename.jpg
    const localPathWithSession = `/temp/${sessionId}/${filename}`;

    return res.json({
      success: true,
      localPath: localPathWithSession,  // 包含 Session ID 的路径
      publicUrl: fullUrl,
      filename: filename
    });

  } catch (error) {
    console.error('❌ [图片下载] 下载失败:', error.message);
    
    let errorMessage = '图片下载失败';
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      errorMessage = 'DNS 解析失败，无法访问该 URL';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '请求超时，请检查网络连接';
    } else if (error.response) {
      errorMessage = `HTTP 错误: ${error.response.status}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: error.code || 'DOWNLOAD_ERROR'
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      tableGeneration: '内置（独立实现）',
      videoGeneration: SERVICES.videoGeneration
    }
  });
});

// 网络连接检测端点（用于诊断DNS和网络问题）
app.get('/api/network-check', async (req, res) => {
  const testUrls = [
    { name: '百度', url: 'https://www.baidu.com' },
    { name: 'Google DNS', url: 'https://8.8.8.8' },
    { name: '测试图片域名', url: 'https://img.staticdj.com' }
  ];

  const results = [];

  for (const test of testUrls) {
    try {
      const startTime = Date.now();
      const response = await axios.get(test.url, { 
        timeout: 5000,
        validateStatus: () => true // 接受任何状态码，只要连接成功
      });
      const duration = Date.now() - startTime;
      
      results.push({
        name: test.name,
        url: test.url,
        success: true,
        status: response.status,
        duration: `${duration}ms`,
        message: '连接成功'
      });
    } catch (error) {
      results.push({
        name: test.name,
        url: test.url,
        success: false,
        error: error.message,
        code: error.code,
        message: error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' 
          ? 'DNS解析失败' 
          : error.code === 'ETIMEDOUT' 
          ? '连接超时' 
          : error.code === 'ECONNREFUSED'
          ? '连接被拒绝'
          : '连接失败'
      });
    }
  }

  // DNS服务器信息
  const dnsServers = dns.getServers();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    dnsServers: dnsServers,
    tests: results,
    summary: {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  });
});

// 服务状态检查
app.get('/api/services/status', async (req, res) => {
  const status = {
    tableGeneration: { status: 'healthy', message: '表格生成功能已内置，无需外部服务' },
    videoGeneration: { status: 'unknown', url: SERVICES.videoGeneration }
  };

  // 检查视频服务
  try {
    const videoResponse = await axios.get(`${SERVICES.videoGeneration}/api/check-ffmpeg`, { timeout: 5000 });
    status.videoGeneration.status = 'healthy';
    status.videoGeneration.data = videoResponse.data;
  } catch (error) {
    status.videoGeneration.status = 'unhealthy';
    status.videoGeneration.error = error.message;
  }

  res.json(status);
});

// 图片链接API已移除

// ========= 二进制直通：转发视频服务的静态资源（图片/视频） =========
// 注意：通用代理会用 res.json 返回数据，不适合二进制。这里单独用流式转发。
app.get(['/api/video-generation/uploads/*', '/api/video-generation/videos/*'], async (req, res) => {
  let targetUrl = '';
  try {
    const targetPath = req.path.replace('/api/video-generation', '');
    targetUrl = `${SERVICES.videoGeneration}${targetPath}`;

    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        Cookie: req.headers.cookie || '',
        // 优先用URL中的 sid 透传为 x-session-id，解决<img>/<video>/<a>无法自定义Header的问题
        'x-session-id': (req.query && req.query.sid) || req.headers['x-session-id'] || '',
        // 透传 Range 以支持视频拖动/分段加载
        ...(req.headers['range'] ? { Range: req.headers['range'] } : {})
      },
      timeout: 60000
    });

    // 透传关键响应头（Content-Type、Content-Length、Cache-Control等）
    const headersToCopy = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
    headersToCopy.forEach(h => {
      if (response.headers[h]) res.setHeader(h, response.headers[h]);
    });

    // 仅当明确需要下载时附加 Content-Disposition，默认允许内联播放
    const wantDownload = req.query.download === '1' || req.query.attachment === '1';
    if (wantDownload && !response.headers['content-disposition']) {
      const base = path.basename(targetPath || 'file');
      res.setHeader('Content-Disposition', `attachment; filename="${base}"`);
    }

    // 管道输出
    response.data.pipe(res);
  } catch (error) {
    console.error('静态资源转发错误:', error.message);
    console.error('请求路径:', req.path);
    console.error('目标URL:', targetUrl || '未构建');
    console.error('会话ID:', req.query.sid || req.headers['x-session-id'] || '未提供');
    res.status(error.response?.status || 500).json({
      error: error.message,
      path: req.path,
      targetUrl: targetUrl.toString()
    });
  }
});

// 直通视频下载接口：/api/video-generation/api/download/<filename>
app.get('/api/video-generation/api/download/*', async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/video-generation', '');
    const targetUrl = `${SERVICES.videoGeneration}${targetPath}`;

    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        Cookie: req.headers.cookie || '',
        'x-session-id': (req.query && req.query.sid) || req.headers['x-session-id'] || '',
        ...(req.headers['range'] ? { Range: req.headers['range'] } : {})
      },
      timeout: 60000
    });

    const headersToCopy = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
    headersToCopy.forEach(h => {
      if (response.headers[h]) res.setHeader(h, response.headers[h]);
    });

    const wantDownload = req.query.download === '1' || req.query.attachment === '1';
    if (wantDownload) {
      // 使用URL末尾作为文件名
      const base = path.basename(targetPath || 'file');
      res.setHeader('Content-Disposition', `attachment; filename="${base}"`);
    }

    response.data.pipe(res);
  } catch (error) {
    console.error('视频下载直通错误:', error.message);
    res.status(error.response?.status || 500).end();
  }
});

// 图片代理接口（用于前端下载图片到本地）
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, error: '缺少图片URL参数' });
    }

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📥 代理下载图片 (尝试 ${attempt}/${maxRetries}): ${url}`);

      // 下载图片，使用增强的配置
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
          Accept: 'image/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
      },
        timeout: 30000,
        // 使用自定义 DNS 解析（优先使用 Google DNS）
        lookup: customLookup,
        // 允许重定向
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
    });
    
    // 设置响应头
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Content-Length', response.data.length);
    res.setHeader('Cache-Control', 'no-cache');

    // 发送图片数据
      console.log(`✅ 图片下载成功 (尝试 ${attempt}/${maxRetries}): ${url}`);
      return res.send(Buffer.from(response.data));

  } catch (error) {
      lastError = error;
      const errorCode = error.code || '';
      const errorMessage = error.message || '未知错误';

      console.error(`❌ 图片代理下载错误 (尝试 ${attempt}/${maxRetries}):`, {
        code: errorCode,
        message: errorMessage,
        url: url
      });

      // 如果是 DNS 相关错误，等待后重试
      if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN' || errorCode === 'ETIMEDOUT') {
        if (attempt < maxRetries) {
          const delay = 1000 * attempt; // 递增延迟：1s, 2s, 3s
          console.log(`⏳ DNS/网络错误，等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ECONNRESET') {
        // 连接错误，也尝试重试
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          console.log(`⏳ 连接错误，等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // 其他错误（如 404, 403 等），不重试，直接返回
        break;
      }
    }
  }

  // 所有重试都失败
  const errorCode = lastError?.code || 'DOWNLOAD_ERROR';
  const errorMessage = lastError?.message || '图片下载失败';
  
  console.error('❌ 图片代理下载最终失败:', {
    code: errorCode,
    message: errorMessage,
    url: url,
    attempts: maxRetries
  });

  // 根据错误类型提供更友好的错误信息
  let userFriendlyError = errorMessage;
  let suggestion = '';

  if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN') {
    userFriendlyError = `DNS 解析失败: 无法解析域名 ${new URL(url).hostname}`;
    suggestion = '请检查网络连接或 DNS 配置，服务器可能无法访问外网';
  } else if (errorCode === 'ETIMEDOUT') {
    userFriendlyError = '连接超时: 服务器无法在指定时间内连接到图片服务器';
    suggestion = '请检查网络连接或稍后重试';
  } else if (errorCode === 'ECONNREFUSED') {
    userFriendlyError = '连接被拒绝: 无法连接到图片服务器';
    suggestion = '请检查网络连接或防火墙设置';
  }

  res.status(500).json({
      success: false,
    error: userFriendlyError,
    code: errorCode,
    suggestion: suggestion,
    url: url
    });
});

// 图片下载和清空功能（通过视频服务代理）
app.post('/api/video-generation/api/download-image', async (req, res) => {
  try {
    const { url, folder_type, order } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: '缺少图片URL' });
    }

    // 标准做法：转发到视频服务的下载接口，传递 url、folder_type 和 order 参数
    // folder_type 可以是 'variable' 或 'fixed'，默认为 'variable'（向后兼容）
    // order 是序号，用于文件名排序
    const resp = await axios.post(
      `${SERVICES.videoGeneration}/api/download-image`,
      { 
        url,
        folder_type: folder_type || 'variable',  // 传递 folder_type，默认值为 'variable'
        order: order  // 传递序号，用于文件名排序
      },
      {
        timeout: 30000,
      headers: {
          'Content-Type': 'application/json',
          // 透传会话，确保同一用户落在同一目录
          Cookie: req.headers.cookie || '',
          'x-session-id': req.headers['x-session-id'] || req.query.sid || 'default'
        }
      }
    );

    // 透传下游 Set-Cookie，建立/保持会话
    const setCookie = resp.headers['set-cookie'];
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    return res.status(resp.status).json(resp.data);
  } catch (error) {
    console.error('图片下载转发错误:', error.message);
    console.error('错误详情:', {
      code: error.code,
      message: error.message,
      response: error.response?.data
    });
    
    // 确保返回有效的 JSON 响应
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || '图片下载失败';
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.code || 'DOWNLOAD_ERROR',
      service: 'video-generation'
    });
  }
});

app.post('/api/video-generation/api/clear-images', async (req, res) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${SERVICES.videoGeneration}/api/clear-images`,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined
      },
      timeout: 30000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('清空图片代理错误:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      service: 'video-generation'
    });
  }
});

// 广告服务表格生成路由（使用完整Facebook格式，与8889端口逻辑一致）
// 注意：这些路由在代理之前定义，优先使用内置逻辑
app.post('/api/ad-campaign/api/generate/batch-both-tables', async (req, res) => {
  try {
    // 获取会话ID（支持多用户并发）
    const sessionId = normalizeSessionId(req.headers['x-session-id'] || req.headers['cookie']?.match(/session=([^;]+)/)?.[1]);
    
    console.log('📊 开始批量生成表格（完整Facebook格式）');
    console.log('📊 接收到的数据:', JSON.stringify(req.body, null, 2).substring(0, 500));
    console.log(`📊 会话ID: ${sessionId}`);
    
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请求数据必须是包含至少一个商品的数组'
      });
    }
    
    console.log(`📊 处理 ${req.body.length} 个商品`);
    
    // 验证每个商品的数据
    for (let i = 0; i < req.body.length; i++) {
      const item = req.body[i];
      try {
        // 注意：validateInputData会在数据有问题时抛出错误
        validateInputData(item);
        console.log(`✅ 商品 ${i + 1} 数据验证通过`);
      } catch (validateError) {
        console.error(`❌ 商品 ${i + 1} 数据验证失败:`, validateError.message);
        return res.status(400).json({
          success: false,
          error: `商品 ${i + 1} 数据验证失败: ${validateError.message}`,
          productIndex: i + 1
        });
      }
    }
    
    const prepared = await prepareProcessedProducts(req.body, sessionId);

    console.log('📊 开始生成ABO Excel...');
    const aboBuffer = await generateABOExcelFromProcessed(prepared.processedData, sessionId);
    console.log('✅ ABO Excel生成成功，大小:', aboBuffer.length, 'bytes');
    
    const aboFile = bufferToBase64(aboBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // 生成URL重定向CSV
    console.log('📊 开始生成URL重定向CSV...');
    const csvBuffer = await generateURLRedirectCSVFromProcessed(prepared.processedData, sessionId);
    console.log('✅ URL重定向CSV生成成功，大小:', csvBuffer.length, 'bytes');
    
    const urlFile = bufferToBase64(csvBuffer, 'text/csv');
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const aboFilename = `ABO_Campaign_${timestamp}.xlsx`;
    const urlFilename = `URL_Redirect_${timestamp}.csv`;
    
    console.log(`✅ 表格生成成功: ${aboFilename}, ${urlFilename}`);
    
    res.json({
      success: true,
      aboFile: {
        ...aboFile,
        filename: aboFilename
      },
      urlFile: {
        ...urlFile,
        filename: urlFilename
      }
    });
  } catch (error) {
    console.error('❌ 批量表格生成失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || '表格生成失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 生成单个ABO Excel表格（使用完整Facebook格式）
app.post('/api/ad-campaign/api/generate/abo-excel', async (req, res) => {
  try {
    // 获取会话ID（支持多用户并发）
    const sessionId = normalizeSessionId(req.headers['x-session-id'] || req.headers['cookie']?.match(/session=([^;]+)/)?.[1]);
    
    console.log('📊 开始生成ABO Excel表格（完整Facebook格式）');
    console.log(`📊 会话ID: ${sessionId}`);
    
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: '请求数据不能为空'
      });
    }
    
    const dataArray = Array.isArray(req.body) ? req.body : [req.body];
    const excelBuffer = await generateABOExcel(dataArray, sessionId);
    const file = bufferToBase64(excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `ABO_Campaign_${timestamp}.xlsx`;
    
    console.log(`✅ ABO Excel生成成功: ${filename}`);
    
    res.json({
      success: true,
      file: {
        ...file,
        filename: filename
      }
    });
  } catch (error) {
    console.error('❌ ABO Excel生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Excel生成失败'
    });
  }
});

// 生成URL重定向CSV表格（使用8889端口格式）
app.post('/api/ad-campaign/api/generate/url-redirect-csv', async (req, res) => {
  try {
    // 获取会话ID（支持多用户并发）
    const sessionId = normalizeSessionId(req.headers['x-session-id'] || req.headers['cookie']?.match(/session=([^;]+)/)?.[1]);
    
    console.log('📊 开始生成URL重定向CSV表格');
    console.log(`📊 会话ID: ${sessionId}`);
    
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: '请求数据不能为空'
      });
    }
    
    const dataArray = Array.isArray(req.body) ? req.body : [req.body];
    const csvBuffer = await generateURLRedirectCSV(dataArray, sessionId);
    const file = bufferToBase64(csvBuffer, 'text/csv');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `URL_Redirect_${timestamp}.csv`;
    
    console.log(`✅ URL重定向CSV生成成功: ${filename}`);
    
    res.json({
      success: true,
      file: {
        ...file,
        filename: filename
      }
    });
  } catch (error) {
    console.error('❌ URL重定向CSV生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'CSV生成失败'
    });
  }
});

// 广告服务其他请求代理 - 代理到8889端口（用于其他功能）
// 注意：表格生成路由已经在上面定义（app.post），这里只代理非表格生成的请求
// Express中具体路由（app.post/app.get）会优先于通用中间件（app.use）匹配
// 所以表格生成请求会被上面的app.post路由处理，不会到达这里
app.use('/api/ad-campaign', async (req, res, next) => {
  // 双重保险：如果是表格生成请求，跳过代理
  const originalPath = (req.originalUrl || req.url || '').toString();
  
  if (originalPath.includes('/api/generate/batch-both-tables') || 
      originalPath.includes('/api/generate/abo-excel') || 
      originalPath.includes('/api/generate/url-redirect-csv')) {
    console.log(`⏭️  跳过代理（双重保险），使用内置表格生成逻辑: ${originalPath}`);
    return next(); // 让上面的路由处理（虽然理论上不应该到这里）
  }
  
  try {
    // 移除 /api/ad-campaign 前缀，保留剩余的路径（包括/api前缀）
    // 例如：/api/ad-campaign/api/generate/abo-excel -> /api/generate/abo-excel
    let targetPath = req.path.replace(/^\/api\/ad-campaign/, '');
    
    // 如果targetPath为空或是根路径，从完整URL中提取
    if (!targetPath || targetPath === '/') {
      const urlPath = (req.originalUrl || req.url).split('?')[0];
      targetPath = urlPath.replace(/^\/api\/ad-campaign/, '') || '/';
    }
    
    // 构建目标URL
    let targetUrl = `${SERVICES.adCampaign}${targetPath}`;
    
    // 添加查询参数（如果存在）
    const queryString = new URLSearchParams(req.query).toString();
    if (queryString) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
    }
    
    console.log(`🔄 [广告服务代理] ${req.method} ${req.originalUrl || req.url}`);
    console.log(`   -> 目标: ${targetUrl}`);
    if (req.body && typeof req.body === 'object') {
      const bodyKeys = Array.isArray(req.body) ? `数组[${req.body.length}]` : Object.keys(req.body).join(', ');
      console.log(`   -> 请求体: ${bodyKeys}`);
    }
    
    // 构建请求配置
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined,
        'x-forwarded-for': req.ip,
        'x-forwarded-host': req.get('host')
      },
      timeout: 60000,
      maxRedirects: 5
    };
    
    // 处理请求体
    if (req.body && Object.keys(req.body).length > 0) {
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        // multipart/form-data 需要特殊处理
        axiosConfig.data = req.body;
    } else {
        axiosConfig.data = req.body;
      }
    }
    
    let response;
    try {
      response = await axios(axiosConfig);
      console.log(`   ✅ 响应状态: ${response.status} ${response.statusText}`);
      console.log(`   -> Content-Type: ${response.headers['content-type'] || 'unknown'}`);
    } catch (axiosError) {
      console.error(`   ❌ 请求失败:`, axiosError.message);
      if (axiosError.code === 'ECONNREFUSED') {
        console.error(`   -> 无法连接到 ${SERVICES.adCampaign}，请确保8889端口服务正在运行`);
      }
      if (axiosError.response) {
        response = axiosError.response;
        console.log(`   -> 错误响应: ${response.status}`);
      } else {
        throw axiosError;
      }
    }
    
    // 透传 Set-Cookie，确保会话一致
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }
    
    // 透传所有响应头（除了不应该透传的）
    const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection', 'keep-alive'];
    Object.keys(response.headers).forEach(key => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, response.headers[key]);
      }
    });
    
    // 处理响应数据
    // 检查响应类型
    const contentType = response.headers['content-type'] || '';
    
    // 如果是Excel文件或其他二进制文件
    if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/vnd.ms-excel') ||
        Buffer.isBuffer(response.data)) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', response.headers['content-disposition'] || `attachment; filename="table.xlsx"`);
      res.status(response.status).send(response.data);
    } else if (contentType.includes('application/json')) {
      res.status(response.status).json(response.data);
    } else {
      res.status(response.status).send(response.data);
    }
    
  } catch (error) {
    console.error('❌ 广告服务代理错误:', error.message);
    
    if (error.response) {
      // 上游服务返回了错误响应
      res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || error.message,
        service: 'ad-campaign',
        url: error.config?.url
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        success: false,
        error: `无法连接到广告服务 (${SERVICES.adCampaign})，请确保广告服务正在运行`,
        service: 'ad-campaign',
        code: 'ECONNREFUSED'
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        success: false,
        error: `连接广告服务超时 (${SERVICES.adCampaign})`,
        service: 'ad-campaign',
        code: 'ETIMEDOUT'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || '广告服务代理失败',
      service: 'ad-campaign'
    });
    }
  }
});

// 广告服务代理（保留旧代码作为备份注释）

// 视频服务代理
app.use('/api/video-generation', async (req, res) => {
  try {
    // 移除 /api/video-generation 前缀，因为目标服务不需要这个前缀
    const targetPath = req.path.replace(/^\/api\/video-generation/, '');
    const targetUrl = new URL(`${SERVICES.videoGeneration}${targetPath}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
    
    // 添加查询参数
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.set(key, req.query[key]);
    });
    
    console.log(`🔄 视频服务代理: ${req.method} ${req.path} -> ${targetUrl.toString()}`);
    
    const isMultipart = (req.headers['content-type'] || '').toLowerCase().startsWith('multipart/');
    
    // 对于 multipart/form-data 上传，使用原生 http/https 模块直接转发请求流
    if (isMultipart && (req.method === 'POST' || req.method === 'PUT')) {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(targetUrl.toString());
        const httpModule = urlObj.protocol === 'https:' ? https : http;
        
        const headers = {
          ...req.headers
        };
        
        // 确保重要的头部正确设置
        headers['x-session-id'] = req.headers['x-session-id'] || req.query.sid || 'default';
        headers['cookie'] = req.headers.cookie || '';
        headers['host'] = urlObj.host;
        
        // 保持原始的 content-type（包含 boundary）
        if (req.headers['content-type']) {
          headers['content-type'] = req.headers['content-type'];
        }
        
        // 如果有 content-length，保留它（让服务器自动处理可能更安全）
        // 如果没有，让 Node.js 自动计算
        
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
      method: req.method,
          headers: headers
        };
        
        console.log(`📤 代理 multipart 请求到: ${targetUrl.toString()}`);
        console.log(`📋 Content-Type: ${headers['content-type']}`);
        
        const proxyReq = httpModule.request(options, (proxyRes) => {
          // 透传响应状态码和头部
          res.status(proxyRes.statusCode);
          
          // 透传 Set-Cookie
          if (proxyRes.headers['set-cookie']) {
            res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
          }
          
          // 透传其他头部（除了 transfer-encoding）
          Object.keys(proxyRes.headers).forEach(key => {
            if (key.toLowerCase() !== 'transfer-encoding') {
              res.setHeader(key, proxyRes.headers[key]);
            }
          });
          
          // 管道响应数据
          proxyRes.pipe(res);
          
          proxyRes.on('end', () => {
            console.log(`✅ multipart 请求代理完成`);
            resolve();
          });
          
          proxyRes.on('error', (err) => {
            console.error('代理响应错误:', err);
            reject(err);
          });
        });
        
        proxyReq.on('error', (err) => {
          console.error('代理请求错误:', err);
          console.error('错误详情:', {
            code: err.code,
            message: err.message,
            syscall: err.syscall,
            address: err.address,
            port: err.port
          });
          
          if (!res.headersSent) {
            // 确保返回有效的 JSON 响应
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
              success: false,
              error: `代理请求失败: ${err.message}`,
              code: err.code || 'PROXY_ERROR',
              service: 'video-generation'
            });
          }
          reject(err);
        });
        
        // 管道请求数据流
        req.on('error', (err) => {
          console.error('原始请求错误:', err);
          proxyReq.destroy();
          if (!res.headersSent) {
            // 确保返回有效的 JSON 响应
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
              success: false,
              error: `请求流错误: ${err.message}`,
              code: 'REQUEST_STREAM_ERROR',
              service: 'video-generation'
            });
          }
          reject(err);
        });
        
        req.pipe(proxyReq);
      });
    }
    
    // 对于非 multipart 请求，继续使用 axios
    // 视频生成接口需要更长的超时时间（14张图片可能需要5-10分钟）
    const isGenerateRequest = req.path.includes('/api/generate');
    const timeout = isGenerateRequest ? 600000 : 60000; // 生成视频10分钟，其他请求60秒
    
    const axiosConfig = {
      method: req.method,
      url: targetUrl.toString(),
      params: req.query,
      headers: {
        ...req.headers,
        host: undefined,
        'x-session-id': req.headers['x-session-id'] || req.query.sid || '',
        cookie: req.headers.cookie || ''
      },
      timeout: timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      axiosConfig.data = req.body;
      
      // 调试日志：如果是拼接接口，输出请求体内容
      if (req.path.includes('/api/process/stitch')) {
        console.log('🔍 [API Gateway] 转发拼接请求，请求体:', JSON.stringify(req.body, null, 2).substring(0, 500));
      }
    }

    const response = await axios(axiosConfig);

    // 透传 Set-Cookie，确保会话一致
    const setCookie = response.headers['set-cookie']
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie)
    }
    // 若为流式响应（如下载文件），直接pipe
    if (response.data && response.data.pipe) {
      Object.entries(response.headers || {}).forEach(([k, v]) => {
        if (k.toLowerCase() === 'transfer-encoding') return;
        res.setHeader(k, v);
      });
      res.status(response.status);
      response.data.pipe(res);
    } else {
    res.status(response.status).json(response.data);
    }
  } catch (error) {
    console.error('视频服务代理错误:', error.message);
    console.error('请求路径:', req.path);
    console.error('请求方法:', req.method);
    console.error('错误代码:', error.code);
    console.error('错误详情:', error.response?.data || error.message);
    console.error('完整错误对象:', JSON.stringify({
      code: error.code,
      message: error.message,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    }, null, 2));
    
    // 返回更详细的错误信息
    let errorMessage;
    let errorCode = error.code || 'UNKNOWN';
    
    // 优先检查错误代码
    if (error.code === 'ECONNREFUSED') {
      errorMessage = `无法连接到视频服务 (${SERVICES.videoGeneration})，请确保视频服务正在运行`
      errorCode = 'ECONNREFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = `连接视频服务超时 (${SERVICES.videoGeneration})`
      errorCode = 'ETIMEDOUT';
    } else if (error.code) {
      errorMessage = `连接错误: ${error.code}`
      errorCode = error.code;
    } else if (error.response?.data?.error && error.response.data.error !== 'Error') {
      errorMessage = error.response.data.error
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message && error.message !== 'Error') {
      errorMessage = error.message
    } else {
      errorMessage = `无法连接到视频服务，请检查服务是否正在运行`
      errorCode = 'CONNECTION_FAILED';
    }
    
    // 确保返回有效的 JSON 响应
    const statusCode = error.response?.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: errorMessage, // 也包含 message 字段，方便前端使用
      service: 'video-generation',
      code: errorCode,
      url: `${SERVICES.videoGeneration}${req.path}`
    });
  }
});

// 图片下载和同步API
// 供视频服务回源的直连图片代理（避免视频服务直接连外网/SSL问题）
app.get('/api/proxy-image-direct', async (req, res) => {
  try {
    const targetUrl = req.query.u;
    if (!targetUrl) return res.status(400).send('missing u');

    const resp = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0 Safari/537.36',
        'Accept': 'image/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache'
      },
      maxRedirects: 3,
      validateStatus: s => s >= 200 && s < 400
    });

    const contentType = resp.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(resp.data));
  } catch (e) {
    console.error('proxy-image-direct 错误:', e.message);
    return res.status(e.response?.status || 500).send(e.response?.data || 'proxy error');
  }
});

app.post('/api/download-and-sync', async (req, res) => {
  try {
    const { url, order } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: '缺少图片URL' });
    }

    console.log(`下载并同步图片(网关拉取→multipart上传): ${url}, 序号: ${order || '无'}`);

    // 1) 网关先把图片下载到内存
    const dl = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0 Safari/537.36',
        Accept: 'image/*'
        },
        timeout: 30000
      });
      
    const buffer = Buffer.from(dl.data);
    const contentType = dl.headers['content-type'] || 'image/jpeg';
    const originalName = (url.split('/').pop() || `image_${Date.now()}.jpg`).split('?')[0];
    const filename = originalName || `image_${Date.now()}.jpg`;

    // 2) 始终引导视频服务去拉取"网关代理URL"，避免直连外网SSL/地域封禁
    const proxiedUrl = `${req.protocol}://${req.get('host')}/api/proxy-image-direct?u=${encodeURIComponent(url)}`;

    const dlResp = await axios.post(
      `${SERVICES.videoGeneration}/api/download-image`,
      { 
        url: proxiedUrl, 
        filename,
        folder_type: 'variable',  // 明确指定为可变部分
        order: order  // 传递序号，用于文件名排序
      },
      {
        timeout: 25000,
        headers: {
          'Content-Type': 'application/json',
          Cookie: req.headers.cookie || '',
          'x-session-id': req.headers['x-session-id'] || ''
        }
      }
    );
    const setCookie1 = dlResp.headers['set-cookie'];
    if (setCookie1) res.setHeader('Set-Cookie', setCookie1);
    return res.status(dlResp.status).json(dlResp.data || { success: true, message: '图片已保存到可变部分' });
    
  } catch (error) {
    console.error('下载和同步错误:', error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// 统一任务管理API
app.get('/api/tasks', (req, res) => {
  try {
    const taskList = Array.from(tasks.values()).map(task => ({
      id: task.id,
      type: task.type,
      name: task.name,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      error: task.error
    }));
    
    res.json({
      tasks: taskList,
      total: taskList.length
    });
  } catch (error) {
    console.error('获取任务列表错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// 创建任务
app.post('/api/tasks', (req, res) => {
  try {
    const { type, name, data } = req.body;
    
    const task = {
      id: taskIdCounter++,
      type,
      name,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
      logs: []
    };
    
    tasks.set(task.id, task);
    
    // 异步执行任务
    executeTask(task);
    
    res.json(task);
  } catch (error) {
    console.error('创建任务错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// 执行任务
async function executeTask(task) {
  try {
    updateTaskStatus(task.id, 'running', 10);
    
    if (task.type === 'ad-campaign') {
      await executeAdCampaignTask(task);
    } else if (task.type === 'video-generation') {
      await executeVideoGenerationTask(task);
    } else if (task.type === 'batch-processing') {
      await executeBatchProcessingTask(task);
    }
    
    updateTaskStatus(task.id, 'completed', 100);
  } catch (error) {
    updateTaskStatus(task.id, 'failed', task.progress, error.message);
  }
}

// 执行广告投放任务
async function executeAdCampaignTask(task) {
  addTaskLog(task.id, 'info', '开始处理广告投放任务');
  updateTaskStatus(task.id, 'running', 30);
  
  // 模拟广告投放处理
  await new Promise(resolve => setTimeout(resolve, 2000));
  addTaskLog(task.id, 'info', '广告投放数据验证完成');
  updateTaskStatus(task.id, 'running', 60);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  addTaskLog(task.id, 'info', '广告投放表格生成完成');
  updateTaskStatus(task.id, 'running', 90);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  addTaskLog(task.id, 'success', '广告投放任务完成');
}

// 执行视频生成任务
async function executeVideoGenerationTask(task) {
  addTaskLog(task.id, 'info', '开始处理视频生成任务');
  updateTaskStatus(task.id, 'running', 20);
  
  // 模拟视频生成处理
  await new Promise(resolve => setTimeout(resolve, 3000));
  addTaskLog(task.id, 'info', '图片处理完成');
  updateTaskStatus(task.id, 'running', 40);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  addTaskLog(task.id, 'info', '视频合成中...');
  updateTaskStatus(task.id, 'running', 70);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  addTaskLog(task.id, 'info', '视频编码完成');
  updateTaskStatus(task.id, 'running', 90);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  addTaskLog(task.id, 'success', '视频生成任务完成');
}

// 执行批量处理任务
async function executeBatchProcessingTask(task) {
  addTaskLog(task.id, 'info', '开始批量处理任务');
  updateTaskStatus(task.id, 'running', 25);
  
  const batchSize = task.data.batchSize || 10;
  const totalItems = task.data.totalItems || 100;
  
  for (let i = 0; i < totalItems; i += batchSize) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const progress = Math.min(25 + (i / totalItems) * 70, 95);
    updateTaskStatus(task.id, 'running', progress);
    addTaskLog(task.id, 'info', `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalItems / batchSize)}`);
  }
  
  addTaskLog(task.id, 'success', '批量处理任务完成');
}

// 更新任务状态
function updateTaskStatus(taskId, status, progress, error = null) {
  const task = tasks.get(taskId);
  if (task) {
    task.status = status;
    task.progress = progress;
    task.updatedAt = new Date().toISOString();
    if (error) {
      task.error = error;
    }
  }
}

// 添加任务日志
function addTaskLog(taskId, level, message) {
  const task = tasks.get(taskId);
  if (task) {
    task.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
  }
}

// 统一文件管理API
app.get('/api/files', async (req, res) => {
  try {
    const files = [];
    
    // 获取上传目录的文件
    try {
      const uploadFiles = await fs.readdir('uploads');
      for (const file of uploadFiles) {
        const stats = await fs.stat(`uploads/${file}`);
        files.push({
          name: file,
          type: getFileType(file),
          size: stats.size,
          service: 'unified',
          createdAt: stats.birthtime.toISOString(),
          lastAccessed: stats.atime.toISOString()
        });
      }
    } catch (error) {
      console.log('上传目录不存在或为空');
    }
    
    res.json({
      files: files,
      total: files.length
    });
  } catch (error) {
    console.error('获取文件列表错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// 文件上传
app.post('/api/files/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const file = {
      name: req.file.originalname,
      type: getFileType(req.file.originalname),
      size: req.file.size,
      service: 'unified',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      path: req.file.path
    };
    
    res.json({
      success: true,
      file: file
    });
  } catch (error) {
    console.error('文件上传错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// ========== Imgfi.com 图床上传接口 ==========
/**
 * 上传图片到 imgfi.com 图床服务
 * 
 * 实现思路：
 * 1. 接收前端传来的图片文件（使用内存存储，不存入磁盘）
 * 2. 从环境变量读取 API Key
 * 3. 创建 FormData，将图片流添加到 'source' 字段
 * 4. 使用 axios 上传到 imgfi.com（30秒超时）
 * 5. 返回统一格式：{ success: true, url: '...' }
 * 
 * 技术要点：
 * - multer.memoryStorage(): 文件存储在内存中，不占用磁盘
 * - FormData: 用于 multipart/form-data 格式上传
 * - axios: 用于 HTTP 请求
 * - 环境变量: 安全存储 API Key
 */
app.post('/api/upload-to-imgfi', uploadMemory.single('image'), async (req, res) => {
  // 调试日志：确认接口被调用
  console.log('📥 [Imgfi] 收到上传请求');
  console.log('  - 请求路径:', req.path);
  console.log('  - 请求方法:', req.method);
  console.log('  - Content-Type:', req.headers['content-type']);
  console.log('  - 文件信息:', req.file ? {
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  } : '无文件');
  try {
    // 1. 检查文件是否存在
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '没有上传文件' 
      });
    }

    // 2. 从环境变量读取 API Key 和上传地址
    const apiKey = process.env.IMGFI_API_KEY;
    const uploadUrl = process.env.IMGFI_UPLOAD_URL || 'https://imgfi.com/api/1/upload';

    // ✅ 调试日志：检查 API Key 是否正确读取（不输出完整 Key，只输出前几位）
    console.log('🔑 [Imgfi] API Key 检查:');
    console.log('  - API Key 是否存在:', apiKey ? '是' : '否');
    console.log('  - API Key 前10位:', apiKey ? apiKey.substring(0, 10) + '...' : '无');
    console.log('  - 上传地址:', uploadUrl);

    if (!apiKey) {
      console.error('❌ [Imgfi] API Key 未配置，请检查 .env 文件');
      return res.status(500).json({ 
        success: false, 
        error: '服务器配置错误：API Key 未设置' 
      });
    }

    console.log('📤 [Imgfi] 开始上传图片到 imgfi.com');
    console.log(`  - 文件名: ${req.file.originalname}`);
    console.log(`  - 文件大小: ${(req.file.size / 1024).toFixed(2)} KB`);

    // 3. 创建 FormData（用于 multipart/form-data 格式）
    // FormData 是 Node.js 中用于创建 multipart/form-data 请求体的工具
    const FormData = require('form-data');
    const formData = new FormData();
    
    // 将图片 Buffer 添加到 FormData，字段名为 'source'（imgfi.com 要求的字段名）
    // req.file.buffer 是内存中的文件数据（Buffer 对象）
    formData.append('source', req.file.buffer, {
      filename: req.file.originalname || 'image.jpg',
      contentType: req.file.mimetype || 'image/jpeg'
    });

    // 4. 使用 axios 上传到 imgfi.com
    // 设置 30 秒超时，防止请求挂起
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'X-API-Key': apiKey,  // imgfi.com 要求的认证头
        ...formData.getHeaders()  // FormData 的 headers（包含 Content-Type 和 boundary）
      },
      timeout: 30000,  // 30 秒超时
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // 5. 检查响应并返回结果
    // ✅ 调试日志：输出完整的响应信息
    console.log('📥 [Imgfi] imgfi.com 响应:');
    console.log('  - HTTP 状态码:', response.status);
    console.log('  - 响应数据:', JSON.stringify(response.data, null, 2));
    
    // 根据 imgfi.com API 文档，响应结构是：
    // {
    //   "status_code": 200,
    //   "image": {
    //     "url": "https://s.imgfi.com/images/...",
    //     "image": { "url": "..." }  // 嵌套结构
    //   }
    // }
    // 所以 URL 在 response.data.image.url，而不是 response.data.url
    
    let imgfiUrl = null;
    
    // 尝试多种可能的 URL 路径（容错处理）
    if (response.data) {
      // 优先：response.data.image.url（主要图片 URL）
      if (response.data.image && response.data.image.url) {
        imgfiUrl = response.data.image.url;
        console.log('✅ [Imgfi] 从 image.url 获取 URL:', imgfiUrl);
      }
      // 备选：response.data.image.image.url（嵌套结构中的 URL）
      else if (response.data.image && response.data.image.image && response.data.image.image.url) {
        imgfiUrl = response.data.image.image.url;
        console.log('✅ [Imgfi] 从 image.image.url 获取 URL:', imgfiUrl);
      }
      // 备选：response.data.url（直接路径，虽然文档中没有，但保留作为容错）
      else if (response.data.url) {
        imgfiUrl = response.data.url;
        console.log('✅ [Imgfi] 从 url 获取 URL:', imgfiUrl);
      }
    }
    
    if (imgfiUrl) {
      console.log('✅ [Imgfi] 上传成功:', imgfiUrl);
      
      // 返回统一格式
      return res.json({
        success: true,
        url: imgfiUrl
      });
    } else {
      // imgfi.com 返回了数据，但无法找到 url 字段
      console.warn('⚠️ [Imgfi] 响应格式异常: 无法找到 URL');
      console.warn('  - 完整响应数据:', JSON.stringify(response.data, null, 2));
      console.warn('  - 响应数据类型:', typeof response.data);
      console.warn('  - 响应数据键:', response.data ? Object.keys(response.data) : '无');
      if (response.data && response.data.image) {
        console.warn('  - image 对象键:', Object.keys(response.data.image));
      }
      
      return res.status(500).json({
        success: false,
        error: '上传成功，但未获取到外链 URL。响应数据：' + JSON.stringify(response.data)
      });
    }

  } catch (error) {
    // ✅ 增强错误日志：输出完整的错误信息
    console.error('❌ [Imgfi] 上传失败 - 详细错误信息:');
    console.error('  - 错误消息:', error.message);
    console.error('  - 错误代码:', error.code);
    console.error('  - 错误堆栈:', error.stack);
    
    // 如果是 axios 错误，输出更多信息（使用摘要，避免循环引用）
    // 原理：error.request 包含整个 Socket 对象（有循环引用），error.response.headers 也可能有循环引用
    // 只记录关键字段，既满足排错需求，又避免崩溃
    if (error.response) {
      // 有响应：服务器返回了错误状态码
      console.error('  - HTTP 状态码:', error.response.status);
      
      // 只记录关键响应头，避免循环引用
      const safeHeaders = {};
      const importantHeaders = ['content-type', 'content-length', 'server', 'date', 'x-ratelimit-remaining'];
      importantHeaders.forEach(key => {
        const headerKey = key.toLowerCase();
        if (error.response.headers[headerKey] || error.response.headers[key]) {
          safeHeaders[key] = error.response.headers[headerKey] || error.response.headers[key];
        }
      });
      console.error('  - 响应头（摘要）:', safeHeaders);
      
      // 响应数据通常是 JSON，可以安全序列化
      try {
        console.error('  - 响应数据:', JSON.stringify(error.response.data, null, 2));
      } catch (err) {
        console.error('  - 响应数据:', safeStringify(error.response.data));
      }
    } else if (error.request) {
      // 无响应：请求已发送但未收到响应（超时、网络中断等）
      console.error('  - 请求已发送，但未收到响应 (可能是超时或网络中断)');
      
      // 只记录关键字段，避免循环引用（error.request 包含整个 Socket 对象）
      console.error('  - 请求摘要:', {
        method: error.config?.method || 'UNKNOWN',
        url: error.config?.url || 'UNKNOWN',
        timeout: error.config?.timeout || '未设置',
        code: error.code || 'UNKNOWN',
        message: error.message || '无详细信息'
      });
    } else {
      // 其他类型的错误（配置错误等）
      console.error('  - 错误类型: 非网络错误');
      console.error('  - 错误详情:', safeStringify(error));
    }
    
    // 详细的错误处理
    let errorMessage = '上传失败';
    let statusCode = 500;

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // 请求超时
      errorMessage = '上传超时，请稍后重试';
      statusCode = 408;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      // 网络连接错误
      errorMessage = '无法连接到图床服务';
      statusCode = 503;
    } else if (error.response) {
      // HTTP 错误响应（imgfi.com 返回的错误）
      statusCode = error.response.status;
      const data = error.response.data;
      
      console.error('  - imgfi.com 返回的错误:', {
        status: statusCode,
        data: data
      });
      
      if (statusCode === 401) {
        errorMessage = 'API Key 无效或已过期，请检查配置';
      } else if (statusCode === 413) {
        errorMessage = '文件过大，请上传小于 10MB 的图片';
      } else if (statusCode === 400) {
        errorMessage = data?.error || data?.message || '请求参数错误';
      } else if (statusCode === 500) {
        errorMessage = data?.error || data?.message || '图床服务内部错误';
      } else {
        errorMessage = data?.error || data?.message || `上传失败 (HTTP ${statusCode})`;
      }
    } else if (error.message) {
      // 其他错误（可能是代码错误）
      errorMessage = error.message;
      console.error('  - 可能是代码错误，请检查后端日志');
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

// 获取文件类型
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
  const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'document';
}

// 批量处理API
app.post('/api/batch/process', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // 创建批量处理任务
    const task = {
      id: taskIdCounter++,
      type: 'batch-processing',
      name: `批量处理 - ${type}`,
      status: 'pending',
      progress: 0,
      data: {
        type,
        ...data,
        totalItems: data.items ? data.items.length : 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
      logs: []
    };
    
    tasks.set(task.id, task);
    
    // 异步执行批量处理任务
    executeTask(task);
    
    res.json({
      success: true,
      taskId: task.id,
      message: '批量处理任务已创建'
    });
  } catch (error) {
    console.error('批量处理错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// 系统统计API
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      tasks: {
        total: tasks.size,
        running: Array.from(tasks.values()).filter(t => t.status === 'running').length,
        completed: Array.from(tasks.values()).filter(t => t.status === 'completed').length,
        failed: Array.from(tasks.values()).filter(t => t.status === 'failed').length
      },
      services: {
        tableGeneration: 'unknown',
        videoGeneration: 'unknown'
      }
    };
    
    // 检查服务状态
    stats.services.tableGeneration = 'healthy'; // 表格生成功能已内置
    
    try {
      await axios.get(`${SERVICES.videoGeneration}/api/check-ffmpeg`, { timeout: 3000 });
      stats.services.videoGeneration = 'healthy';
    } catch (error) {
      stats.services.videoGeneration = 'unhealthy';
    }
    
    res.json(stats);
  } catch (error) {
    console.error('获取统计信息错误:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});

// 前端路由（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('API网关错误:', error);
  res.status(500).json({
    error: '内部服务器错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// ==================== 内存状态检查函数 ====================
// 用于非致命错误后的诊断，帮助排查内存泄漏等问题
// 原理：process.memoryUsage() 返回当前进程的内存使用情况
function checkMemoryStatus() {
  try {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    console.error('📊 [内存状态] 当前内存使用情况:');
    console.error(`  - RSS (常驻集大小): ${formatBytes(usage.rss)}`);
    console.error(`  - Heap Used (堆已用): ${formatBytes(usage.heapUsed)}`);
    console.error(`  - Heap Total (堆总计): ${formatBytes(usage.heapTotal)}`);
    console.error(`  - External (外部): ${formatBytes(usage.external)}`);
    
    // 如果堆内存使用超过 80%，发出警告
    // 原理：heapUsed / heapTotal 可以反映内存压力，超过80%需要关注
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      console.error(`  ⚠️ 警告: 堆内存使用率 ${heapUsagePercent.toFixed(2)}%，建议关注`);
    }
  } catch (err) {
    console.error('⚠️ [内存状态] 无法获取内存信息:', err.message);
  }
}

// ==================== 全局异常捕获机制 ====================
// 原理：Node.js 进程级别的异常捕获，防止未捕获的异常导致进程崩溃
// 区分致命错误和非致命错误，致命错误需要退出，非致命错误继续运行并记录诊断信息

// 处理未捕获的同步异常
// 触发场景：同步代码中抛出的异常没有被 try-catch 捕获
process.on('uncaughtException', (err) => {
  console.error('🔥 [全局异常] 捕获到未处理的异常:');
  console.error('  - 错误消息:', err.message);
  console.error('  - 错误代码:', err.code || 'N/A');
  console.error('  - 错误堆栈:', err.stack);
  
  // 判断是否为致命错误
  // 原理：某些错误（如内存不足、权限错误）表示系统状态异常，需要重启
  const isFatal = 
    err.message.includes('ENOMEM') ||        // 内存不足
    err.message.includes('EACCES') ||        // 权限错误
    err.message.includes('EADDRINUSE') ||    // 端口占用
    err.code === 'ERR_ASSERTION' ||          // 断言失败
    err.name === 'RangeError';                // 范围错误（通常是内存问题）
  
  if (isFatal) {
    console.error('🔥 [全局异常] 致命错误检测，进程将退出');
    // 给一点时间让日志写入完成，确保错误信息被记录
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    console.error('🔥 [全局异常] 非致命错误，服务继续运行');
    // 触发内存状态检查，帮助诊断问题
    checkMemoryStatus();
  }
});

// 处理未捕获的 Promise 拒绝
// 触发场景：Promise 被 reject 但没有 .catch() 处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [Promise异常] 未处理的 Promise 拒绝:');
  
  if (reason instanceof Error) {
    console.error('  - 错误消息:', reason.message);
    console.error('  - 错误堆栈:', reason.stack);
  } else {
    console.error('  - 拒绝原因:', safeStringify(reason));
  }
  
  // Promise 异常通常不会导致进程退出，但需要记录
  // 对于非致命错误，也检查内存状态
  if (!(reason instanceof Error) || 
      !reason.message.includes('ENOMEM') && 
      !reason.message.includes('EACCES')) {
    checkMemoryStatus();
  }
});

// ==================== 全局异常捕获机制结束 ====================

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`API网关服务运行在端口 ${PORT} (监听所有接口)`);
  console.log(`表格生成功能: 已内置（独立实现，不依赖外部服务）`);
  console.log(`视频服务: ${SERVICES.videoGeneration}`);
  console.log(`前端地址: http://localhost:${PORT}`);
  
  // 启动时加载图片链接、批量数据和全局计数器
  await loadImageLinks();
  await loadBatchData();
  await loadGlobalCounter();
  console.log(`🔧 Ad Set Name 生成逻辑已启用`);
  console.log(`🔢 全局产品ID计数器已加载: ${globalProductCounter.currentProductNumber}`);
  
  // 检查服务健康状态
  console.log('\n🔍 检查服务状态...');
  
  // 检查视频服务
  try {
    await axios.get(`${SERVICES.videoGeneration}/api/check-ffmpeg`, { timeout: 3000 });
    console.log(`✅ 视频服务 (${SERVICES.videoGeneration}) - 正常运行`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`⚠️  视频服务 (${SERVICES.videoGeneration}) - 未运行`);
      console.log(`   提示: 视频生成功能需要视频服务，请确保视频服务已启动`);
    } else {
      console.log(`⚠️  视频服务 (${SERVICES.videoGeneration}) - 连接失败: ${error.message}`);
    }
  }
  
  console.log('');
});