<template>
  <div class="ad-campaign-page">
    <div class="container">
      <div class="header">
        <h1>🚀 广告投放表格生成器</h1>
        <p>快速生成Facebook广告投放表格和URL重定向配置</p>
        
        <!-- 工作流模式切换 -->
        <div class="workflow-mode-switch" style="margin-top: 20px; display: flex; align-items: center; gap: 12px;">
          <el-radio-group 
            v-model="adCampaignStore.workflowMode" 
            size="large" 
            @change="handleModeChange"
          >
            <el-radio-button label="standard">标准模式</el-radio-button>
            <el-radio-button label="stitch_sync">拼图对齐模式 (3:1)</el-radio-button>
          </el-radio-group>
          <el-tooltip 
            content="标准模式：自由填写，1:1生成表格。拼图对齐模式：Excel导入+外链同步，3:1强校验" 
            placement="top"
          >
            <el-icon style="cursor: help; color: #909399;"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>

      <div class="form-container">
        <form @submit.prevent="generateAllTables">
          <!-- 商品信息 -->
          <div class="form-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                <h2 class="section-title" style="margin-bottom: 0;">📦 商品信息</h2>
                <!-- Excel导入按钮（两种模式都可用，基础功能层） -->
                <el-button 
                  type="primary" 
                  :icon="Upload"
                  @click="handleExcelImport"
                  size="small"
                >
                  导入Excel
                </el-button>
                <!-- 对齐按钮（仅在拼图对齐模式下显示） -->
                <el-button 
                  v-if="adCampaignStore.workflowMode === 'stitch_sync'"
                  type="success" 
                  @click="handleAlignData"
                  size="small"
                >
                  数据对齐
                </el-button>
              </div>
              <div class="form-check" style="display: flex; align-items: center; gap: 8px;">
                <input class="form-check-input" type="checkbox" id="rotation-mode" v-model="formData['轮播视频模式']">
                <label class="form-check-label" for="rotation-mode" style="margin: 0; cursor: pointer;">
                  对应轮播视频模式
                </label>
              </div>
            </div>
            <small class="form-help" style="display: block; margin-bottom: 15px; color: #666;">
              开启后：商品ID和商品SPU按3个一组处理，与视频生成页面的轮播模式对应。每组用英文逗号","分隔。
            </small>
            <div class="form-grid">
              <div class="form-group">
                <label for="商品ID">商品ID <span class="required">*</span></label>
                <textarea id="商品ID" v-model="formData['商品ID']" required placeholder="输入商品唯一标识，每行一个ID，或使用分隔符批量输入" rows="3"></textarea>
                <small class="form-help">支持多行输入：每行一个ID，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个ID，如：ID1 ID2 ID3 或 ID1，ID2、ID3</small>
              </div>

              <div class="form-group">
                <label for="商品SPU">商品SPU <span class="required">*</span></label>
                <textarea id="商品SPU" v-model="formData['商品SPU']" required placeholder="输入商品SPU，每行一个SPU，或使用分隔符批量输入" rows="3"></textarea>
                <small class="form-help">支持多行输入：每行一个SPU，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个SPU，如：SPU1 SPU2 SPU3 或 SPU1，SPU2、SPU3</small>
              </div>

              <div class="form-group">
                <label for="商品图片链接">商品图片链接/商品视频链接 <span class="required">*</span></label>
                <textarea id="商品图片链接" v-model="formData['商品图片链接']" required placeholder="输入商品图片链接或视频链接，每行一个链接，或使用分隔符批量输入" rows="3"></textarea>
                <small class="form-help">支持多行输入：每行一个图片或视频链接，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个链接，如：link1 link2 link3 或 link1，link2、link3。注意：输入视频链接时，将替代所有需要图片链接的地方。</small>
                <!-- 隐形下载器 -->
                <div id="imageDownloader" style="display: none;">
                  <div id="downloadProgress" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
                </div>
              </div>

              <div class="form-group">
                <label for="专辑链接">专辑链接后缀 <span class="required">*</span></label>
                <input type="text" id="专辑链接" v-model="formData['专辑链接']" required placeholder="collections/xxxxx">
                <small class="form-help">示例：collections/xxxxx</small>
              </div>

              <div class="form-group">
                <label for="固定部分商品ID">固定部分商品ID</label>
                <textarea id="固定部分商品ID" v-model="formData['固定部分商品ID']" placeholder="输入固定部分商品ID，每行一个ID，或使用分隔符批量输入" rows="3"></textarea>
                <small class="form-help">支持多行输入：每行一个ID，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个ID，如：ID1 ID2 ID3 或 ID1，ID2、ID3。这些ID会追加到URL表格的Redirect to字段中。</small>
              </div>
            </div>
          </div>

          <!-- 对齐预览表（阶段六：仅在拼图对齐模式下显示） -->
          <div v-if="alignmentStatus" class="alignment-preview">
            <!-- 预览表头部：可点击折叠/展开，显示标题和总体状态 -->
            <div class="preview-header" @click="togglePreview" :class="{ 'header-collapsed': !isPreviewExpanded }">
              <div class="header-left">
                <el-icon class="expand-icon" :class="{ 'icon-expanded': isPreviewExpanded }">
                  <ArrowDown v-if="!isPreviewExpanded" />
                  <ArrowUp v-else />
                </el-icon>
                <h4>📊 数据对齐预览</h4>
              </div>
              <div class="header-right">
                <el-tag :type="alignmentStatus.allAligned ? 'success' : 'warning'" size="large">
                  {{ alignmentStatus.allAligned ? '✅ 已对齐' : '⚠️ 部分对齐' }}
                </el-tag>
              </div>
            </div>
            
            <!-- 统计信息：始终显示在头部下方（折叠和展开状态都显示） -->
            <div class="preview-summary">
              <div class="summary-item">
                <span>总计:</span>
                <strong>{{ alignmentStatus.totalGroups }} 组</strong>
              </div>
              <div class="summary-item">
                <span>已对齐:</span>
                <strong style="color: #67c23a;">{{ alignmentStatus.alignedCount }} 组</strong>
              </div>
              <div class="summary-item" v-if="alignmentStatus.incompleteCount > 0">
                <span>不完整:</span>
                <strong style="color: #e6a23c;">{{ alignmentStatus.incompleteCount }} 组</strong>
              </div>
              <div class="summary-item" v-if="alignmentStatus.missingCount > 0">
                <span>缺失:</span>
                <strong style="color: #f56c6c;">{{ alignmentStatus.missingCount }} 个</strong>
              </div>
              <div class="summary-item" v-if="alignmentStatus.modifiedCount > 0">
                <span>已修改:</span>
                <strong style="color: #e6a23c;">{{ alignmentStatus.modifiedCount }} 个</strong>
              </div>
              <div class="summary-item" v-if="alignmentStatus.formLinksNotInMapping && alignmentStatus.formLinksNotInMapping.length > 0">
                <span>未映射外链:</span>
                <strong style="color: #909399;">{{ alignmentStatus.formLinksNotInMapping.length }} 个</strong>
              </div>
            </div>
            
            <!-- 预览列表：卡片式展示每组数据（可折叠） -->
            <transition name="slide-fade">
              <div v-show="isPreviewExpanded" class="preview-list">
              <!-- 遍历每组外链数据 -->
              <div 
                v-for="(group, index) in alignmentStatus.groups" 
                :key="index"
                class="preview-item"
                :class="{
                  'item-complete': group.complete,
                  'item-incomplete': !group.complete && (group.matched > 0 || group.modified > 0),
                  'item-unmatched': group.matched === 0 && group.missing > 0,
                  'item-has-difference': group.hasDifference
                }"
              >
                <!-- 组头部：显示外链序号和匹配状态（如：2/3） -->
                <div class="item-header">
                  <div class="item-header-left">
                    <span class="item-index">外链 {{ index + 1 }}</span>
                    <!-- 差异标记：如果有差异，显示警告图标 -->
                    <el-tag 
                      v-if="group.hasDifference" 
                      type="warning" 
                      size="small"
                      style="margin-left: 8px;"
                    >
                      有差异
                    </el-tag>
                    <!-- 未映射标记：如果外链不在映射表中 -->
                    <el-tag 
                      v-if="!group.linkMatched" 
                      type="info" 
                      size="small"
                      style="margin-left: 8px;"
                    >
                      未映射
                    </el-tag>
                  </div>
                  <div class="item-header-right">
                    <el-tag 
                      size="small" 
                      :type="group.complete ? 'success' : (group.matched > 0 || group.modified > 0) ? 'warning' : 'danger'"
                    >
                      {{ group.matched }}/3
                    </el-tag>
                  </div>
                </div>
                
                <!-- 外链预览：显示完整的外链URL -->
                <div class="link-preview" :title="group.formLink">
                  {{ group.formLink }}
                </div>
                
                <!-- 商品信息预览：显示3个商品的位置 -->
                <div class="products-preview">
                  <!-- 遍历3个商品位置 -->
                  <div 
                    v-for="(product, pIndex) in group.products" 
                    :key="pIndex"
                    class="product-box"
                    :class="{ 
                      'product-matched': product.status === 'matched',
                      'product-missing': product.status === 'missing',
                      'product-modified': product.status === 'modified',
                      'product-unknown': product.status === 'unknown'
                    }"
                  >
                    <!-- 状态图标 -->
                    <div class="product-status-icon">
                      <span v-if="product.status === 'matched'" class="icon-matched">✓</span>
                      <span v-else-if="product.status === 'missing'" class="icon-missing">✗</span>
                      <span v-else-if="product.status === 'modified'" class="icon-modified">⚠</span>
                      <span v-else class="icon-unknown">?</span>
                    </div>
                    <!-- 商品SPU：显示实际值或"缺失" -->
                    <div class="product-spu" :title="product.expectedSpu ? `期望: ${product.expectedSpu}` : ''">
                      {{ product.spu || '缺失' }}
                    </div>
                    <!-- 商品ID：显示实际值或"缺失" -->
                    <div class="product-id" :title="product.expectedId ? `期望: ${product.expectedId}` : ''">
                      {{ product.id || '-' }}
                    </div>
                    <!-- 修改提示：如果已修改，显示期望值 -->
                    <div v-if="product.status === 'modified'" class="product-expected">
                      期望: {{ product.expectedId }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </transition>
          </div>

          <!-- 投放配置 -->
          <div class="form-section">
            <h2 class="section-title">🌐 投放配置</h2>
            <div class="form-grid">
              <div class="form-group">
                <label for="广告域名">广告域名</label>
                <input type="text" id="广告域名" v-model="formData['广告域名']" placeholder="example.com">
                <small class="form-help">示例：https://xxx.xxxxxxx.xxxx/</small>
              </div>
              <div class="form-group">
                <label for="账户编号">账户编号缩写 <span class="required">*</span></label>
                <input type="text" id="账户编号" v-model="formData['账户编号']" required>
              </div>
              <div class="form-group">
                <label for="产品标签">产品标签 <span class="required">*</span></label>
                <input type="text" id="产品标签" v-model="formData['产品标签']" required>
              </div>
            </div>
          </div>

          <!-- 投放设置 -->
          <div class="form-section">
            <h2 class="section-title">📊 投放设置</h2>
            <div class="form-grid">
              <div class="form-group">
                <label for="像素">像素</label>
                <div class="input-with-prefix">
                  <span class="input-prefix">tp:</span>
                  <input type="text" id="像素" v-model="formData['像素']" placeholder="Facebook像素ID" class="prefixed-input">
                </div>
              </div>
              <div class="form-group">
                <label for="预算">预算</label>
                <input type="number" id="预算" v-model="formData['预算']" min="1" placeholder="10">
              </div>
              <div class="form-group">
                <label for="投放国家">投放国家 <span class="required">*</span></label>
                <div class="dropdown-container">
                  <div class="dropdown-trigger" @click="toggleCountryDropdown()">
                    <span id="countryDisplay">请选择投放国家</span>
                    <span class="dropdown-arrow">▼</span>
                  </div>
                  <div class="checkbox-container" id="countryDropdown" style="display: none;">
                    <div class="search-container">
                      <input type="text" id="countrySearch" placeholder="搜索国家..." @input="searchCountries">
                      <button type="button" class="add-country-btn" @click="addCustomCountry">+ 添加自定义</button>
                    </div>
                    <div class="checkbox-item">
                      <input type="checkbox" id="selectAll" @change="toggleAllCountries">
                      <label for="selectAll">全选</label>
                    </div>
                    <!-- 常用国家 -->
                    <div class="country-section">
                      <div class="section-title">常用国家</div>
                      <div class="checkbox-item" v-for="country in commonCountries" :key="country.code">
                        <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" v-model="formData['投放国家']" @change="updateCountryDisplay">
                        <label :for="'country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                      </div>
                    </div>
                    <!-- 其他国家 -->
                    <div class="country-section">
                      <div class="section-title">其他国家</div>
                      <div class="checkbox-item" v-for="country in otherCountries" :key="country.code">
                        <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" v-model="formData['投放国家']" @change="updateCountryDisplay">
                        <label :for="'country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                      </div>
                    </div>
                    <div class="dropdown-actions">
                      <button type="button" class="btn-cancel" @click="closeCountryDropdown">取消</button>
                      <button type="button" class="btn-confirm" @click="closeCountryDropdown">确定</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label for="排除国家">排除国家</label>
                <div class="dropdown-container">
                  <div class="dropdown-trigger" id="excludeCountryTrigger" @click="toggleExcludeCountryDropdown()">
                    <span id="excludeCountryDisplay">请选择排除国家</span>
                    <span class="dropdown-arrow">▼</span>
                  </div>
                  <div class="checkbox-container" id="excludeCountryDropdown" style="display: none;">
                    <div class="checkbox-item">
                      <input type="checkbox" id="excludeSelectAll" @change="toggleAllExcludeCountries">
                      <label for="excludeSelectAll">全选</label>
                    </div>
                    <div class="checkbox-item" v-for="country in countries" :key="country.code">
                      <input type="checkbox" :id="'exclude_country_' + country.code" name="排除国家" :value="country.code" v-model="formData['排除国家']" @change="updateExcludeCountryDisplay">
                      <label :for="'exclude_country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                    </div>
                    <div class="dropdown-actions">
                      <button type="button" class="btn-cancel" @click="closeExcludeCountryDropdown">取消</button>
                      <button type="button" class="btn-confirm" @click="closeExcludeCountryDropdown">确定</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label for="投放区域">投放区域</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" value="eea" v-model="formData['投放区域']" @change="handleRegionSelection">
                    <span class="checkmark"></span>
                    eea
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" value="nafta" v-model="formData['投放区域']" @change="handleRegionSelection">
                    <span class="checkmark"></span>
                    nafta
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" value="worldwide" v-model="formData['投放区域']" @change="handleRegionSelection">
                    <span class="checkmark"></span>
                    worldwide
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- 受众设置 -->
          <div class="form-section">
            <h2 class="section-title">👥 受众设置</h2>
            <div class="form-grid">
              <div class="form-group">
                <label for="进阶赋能型受众">进阶赋能型受众</label>
                <select id="进阶赋能型受众" v-model="formData['进阶赋能型受众']" @change="toggleAdvancedAudience">
                  <option value="开启">开启进阶赋能型受众</option>
                  <option value="关闭">关闭进阶赋能型受众</option>
                </select>
              </div>
            </div>
            
            <!-- 进阶赋能型受众开启时的字段 -->
            <div id="advancedAudienceFields" class="form-grid" style="display: none;">
              <div class="form-group">
                <label for="控制选项-年龄下限">控制选项-年龄下限</label>
                <input type="number" id="控制选项-年龄下限" v-model="formData['控制选项-年龄下限']" min="13" max="65">
                <small class="form-help">范围是18-25</small>
              </div>
              <div class="form-group">
                <label for="建议受众-性别">建议受众-性别</label>
                <select id="建议受众-性别" v-model="formData['建议受众-性别']">
                  <option value="1">Men</option>
                  <option value="2">Women</option>
                </select>
              </div>
              <div class="form-group">
                <label for="建议受众-最小年龄">建议受众-最小年龄</label>
                <input type="number" id="建议受众-最小年龄" v-model="formData['建议受众-最小年龄']" min="13" max="65">
                <small class="form-help">范围是25-65</small>
              </div>
              <div class="form-group">
                <label for="建议受众-最大年龄">建议受众-最大年龄</label>
                <input type="number" id="建议受众-最大年龄" v-model="formData['建议受众-最大年龄']" min="13" max="65">
                <small class="form-help">范围是25-65</small>
              </div>
            </div>
            
            <!-- 进阶赋能型受众关闭时的字段 -->
            <div id="simpleAudienceFields" class="form-grid">
              <div class="form-group">
                <label for="建议受众-性别">建议受众-性别</label>
                <select id="建议受众-性别-simple" v-model="formData['建议受众-性别']">
                  <option value="1">Men</option>
                  <option value="2">Women</option>
                </select>
              </div>
              <div class="form-group">
                <label for="最小年龄">最小年龄</label>
                <input type="number" id="最小年龄" v-model="formData['最小年龄']" min="13" max="65">
                <small class="form-help">范围是25-65</small>
              </div>
              <div class="form-group">
                <label for="最大年龄">最大年龄</label>
                <input type="number" id="最大年龄" v-model="formData['最大年龄']" min="13" max="65">
                <small class="form-help">范围是25-65</small>
              </div>
            </div>
          </div>

          <!-- 广告内容 -->
          <div class="form-section">
            <h2 class="section-title">✍️ 广告内容</h2>
            <div class="form-grid">
              <div class="form-group">
                <label for="广告语">广告语 <span class="required">*</span></label>
                <textarea id="广告语" v-model="formData['广告语']" required placeholder="输入广告语内容"></textarea>
              </div>
              <div class="form-group">
                <label for="标题">标题 <span class="required">*</span></label>
                <input type="text" id="标题" v-model="formData['标题']" required>
              </div>
              <div class="form-group">
                <label for="描述">描述 <span class="required">*</span></label>
                <textarea id="描述" v-model="formData['描述']" required placeholder="输入产品描述"></textarea>
              </div>
              <div class="form-group">
                <label for="受益人">受益人</label>
                <input type="text" id="受益人" v-model="formData['受益人']" placeholder="受益人信息">
              </div>
            </div>
          </div>

          <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>正在生成表格，请稍候...</p>
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary" :disabled="generating">
              ✨ 生成所有表格
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import { useAdCampaignStore } from '@/stores/adCampaign'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, QuestionFilled, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { normalizeUrl } from '@/utils/urlNormalize'

// 使用全局状态管理
const adCampaignStore = useAdCampaignStore()

// 响应式数据
const generating = adCampaignStore.generating

// 表单数据 - 使用全局状态
const formData = adCampaignStore.formData

// 常见国家
const commonCountries = [
  { code: 'US', name: '美国' }, { code: 'CA', name: '加拿大' }, { code: 'DK', name: '丹麦' }, { code: 'IS', name: '冰岛' },
  { code: 'HU', name: '匈牙利' }, { code: 'LU', name: '卢森堡' }, { code: 'CY', name: '塞浦路斯' }, { code: 'AT', name: '奥地利' },
  { code: 'GR', name: '希腊' }, { code: 'DE', name: '德国' }, { code: 'IT', name: '意大利' }, { code: 'NO', name: '挪威' },
  { code: 'BE', name: '比利时' }, { code: 'FR', name: '法国' }, { code: 'IE', name: '爱尔兰' }, { code: 'SE', name: '瑞典' },
  { code: 'FI', name: '芬兰' }, { code: 'GB', name: '英国' }, { code: 'NL', name: '荷兰' }, { code: 'PT', name: '葡萄牙' },
  { code: 'ES', name: '西班牙' }
]

// 其他国家
const otherCountries = [
  { code: 'AU', name: '澳大利亚' }, { code: 'JP', name: '日本' }, { code: 'KR', name: '韩国' }, { code: 'SG', name: '新加坡' },
  { code: 'MX', name: '墨西哥' }, { code: 'BR', name: '巴西' }, { code: 'AR', name: '阿根廷' }, { code: 'CL', name: '智利' },
  { code: 'CO', name: '哥伦比亚' }, { code: 'PE', name: '秘鲁' }, { code: 'ZA', name: '南非' }, { code: 'EG', name: '埃及' },
  { code: 'NG', name: '尼日利亚' }, { code: 'KE', name: '肯尼亚' }, { code: 'MA', name: '摩洛哥' }, { code: 'IL', name: '以色列' },
  { code: 'AE', name: '阿联酋' }, { code: 'SA', name: '沙特阿拉伯' }, { code: 'TR', name: '土耳其' }, // { code: 'RU', name: '俄罗斯' },
  { code: 'UA', name: '乌克兰' }, { code: 'PL', name: '波兰' }, { code: 'CZ', name: '捷克' }, { code: 'SK', name: '斯洛伐克' },
  { code: 'CH', name: '瑞士' }, { code: 'NZ', name: '新西兰' }, { code: 'DZ', name: '阿尔及利亚' }
]

// 排除国家 - 189个国家
const countries = ref([
  { code: 'IN', name: '印度' }, { code: 'AL', name: '阿尔巴尼亚' }, { code: 'MO', name: '澳门' }, { code: 'GE', name: '格鲁吉亚' },
  { code: 'ZW', name: '津巴布韦' }, { code: 'AZ', name: '阿塞拜疆' }, { code: 'MQ', name: '马提尼克' }, { code: 'KZ', name: '哈萨克斯坦' },
  { code: 'NC', name: '新喀里多尼亚' }, { code: 'MD', name: '摩尔多瓦' }, { code: 'PF', name: '法属波利尼西亚' }, { code: 'LB', name: '黎巴嫩' },
  { code: 'BM', name: '百慕大' }, { code: 'MY', name: '马来西亚' }, { code: 'LC', name: '圣卢西亚' }, { code: 'AD', name: '安道尔' },
  { code: 'AO', name: '安哥拉' }, { code: 'RE', name: '留尼汪' }, { code: 'PA', name: '巴拿马' }, { code: 'JO', name: '约旦' },
  { code: 'HK', name: '香港' }, { code: 'BG', name: '保加利亚' }, { code: 'CZ', name: '捷克' }, { code: 'SI', name: '斯洛文尼亚' },
  { code: 'LT', name: '立陶宛' }, { code: 'LK', name: '斯里兰卡' }, { code: 'MA', name: '摩洛哥' }, { code: 'EG', name: '埃及' },
  { code: 'RO', name: '罗马尼亚' }, { code: 'CR', name: '哥斯达黎加' }, { code: 'PY', name: '巴拉圭' }, { code: 'UY', name: '乌拉圭' },
  { code: 'PR', name: '波多黎各' }, { code: 'VN', name: '越南' }, { code: 'MU', name: '毛里求斯' }, { code: 'OM', name: '阿曼' },
  { code: 'MK', name: '北马其顿' }, { code: 'EE', name: '爱沙尼亚' }, { code: 'NP', name: '尼泊尔' }, { code: 'ME', name: '黑山' },
  { code: 'SN', name: '塞内加尔' }, { code: 'UG', name: '乌干达' }, { code: 'TZ', name: '坦桑尼亚' }, { code: 'LY', name: '利比亚' },
  { code: 'MM', name: '缅甸' }, { code: 'NA', name: '纳米比亚' }, { code: 'MG', name: '马达加斯加' }, { code: 'YE', name: '也门' },
  { code: 'ZM', name: '赞比亚' }, { code: 'MW', name: '马拉维' }, { code: 'RW', name: '卢旺达' }, { code: 'VI', name: '美属维尔京群岛' },
  { code: 'VC', name: '圣文森特和格林纳丁斯' }, { code: 'MN', name: '蒙古' }, { code: 'MZ', name: '莫桑比克' }, { code: 'ML', name: '马里' },
  { code: 'UZ', name: '乌兹别克斯坦' }, { code: 'MC', name: '摩纳哥' }, { code: 'TG', name: '多哥' }, { code: 'SZ', name: '斯威士兰' },
  { code: 'LS', name: '莱索托' }, { code: 'LA', name: '老挝' }, { code: 'LI', name: '列支敦士登' }, { code: 'MP', name: '北马里亚纳群岛' },
  { code: 'SR', name: '苏里南' }, { code: 'SC', name: '塞舌尔' }, { code: 'VG', name: '英属维尔京群岛' }, { code: 'TC', name: '特克斯和凯科斯群岛' },
  { code: 'MR', name: '毛里塔尼亚' }, { code: 'SM', name: '圣马力诺' }, { code: 'SL', name: '塞拉利昂' }, { code: 'NE', name: '尼日尔' },
  { code: 'YT', name: '马约特' }, { code: 'LR', name: '利比里亚' }, { code: 'TM', name: '土库曼斯坦' }, { code: 'PK', name: '巴基斯坦' },
  { code: 'TJ', name: '塔吉克斯坦' }, { code: 'VU', name: '瓦努阿图' }, { code: 'SB', name: '所罗门群岛' }, { code: 'WS', name: '萨摩亚' },
  { code: 'TO', name: '汤加' }, { code: 'PW', name: '帕劳' }, { code: 'SO', name: '索马里' }, { code: 'MH', name: '马绍尔群岛' },
  { code: 'TD', name: '乍得' }, { code: 'ST', name: '圣多美和普林西比' }, { code: 'TV', name: '图瓦卢' }, { code: 'NR', name: '瑙鲁' },
  { code: 'TF', name: '法属南部领地' }, { code: 'MS', name: '蒙特塞拉特' }, { code: 'NU', name: '纽埃' }, { code: 'NF', name: '诺福克岛' },
  { code: 'PN', name: '皮特凯恩群岛' }, { code: 'SH', name: '圣赫勒拿' }, { code: 'PM', name: '圣皮埃尔和密克隆' }, { code: 'SS', name: '南苏丹' },
  { code: 'SJ', name: '斯瓦尔巴和扬马延' }, { code: 'TL', name: '东帝汶' }, { code: 'TK', name: '托克劳' }, { code: 'UM', name: '美国本土外小岛屿' },
  { code: 'WF', name: '瓦利斯和富图纳' }, { code: 'VE', name: '委内瑞拉' }, { code: 'TH', name: '泰国' }, { code: 'NG', name: '尼日利亚' },
  { code: 'TT', name: '特立尼达和多巴哥' }, { code: 'SV', name: '萨尔瓦多' }, { code: 'NI', name: '尼加拉瓜' }, { code: 'PS', name: '巴勒斯坦' },
  { code: 'TN', name: '突尼斯' }, { code: 'MT', name: '马耳他' }, { code: 'MV', name: '马尔代夫' }, { code: 'BN', name: '文莱' },
  { code: 'GP', name: '瓜德罗普' }, { code: 'BB', name: '巴巴多斯' }, { code: 'CI', name: '科特迪瓦' }, { code: 'CM', name: '喀麦隆' },
  { code: 'BW', name: '博茨瓦纳' }, { code: 'ET', name: '埃塞俄比亚' }, { code: 'FJ', name: '斐济' }, { code: 'BY', name: '白俄罗斯' },
  { code: 'GU', name: '关岛' }, { code: 'HT', name: '海地' }, { code: 'KH', name: '柬埔寨' }, { code: 'AW', name: '阿鲁巴' },
  { code: 'AF', name: '阿富汗' }, { code: 'GY', name: '圭亚那' }, { code: 'AM', name: '亚美尼亚' }, { code: 'AG', name: '安提瓜和巴布达' },
  { code: 'GM', name: '冈比亚' }, { code: 'FO', name: '法罗群岛' }, { code: 'KY', name: '开曼群岛' }, { code: 'BJ', name: '贝宁' },
  { code: 'GD', name: '格林纳达' }, { code: 'BZ', name: '伯利兹' }, { code: 'GF', name: '法属圭亚那' }, { code: 'DJ', name: '吉布提' },
  { code: 'BF', name: '布基纳法索' }, { code: 'GL', name: '格陵兰' }, { code: 'GA', name: '加蓬' }, { code: 'GI', name: '直布罗陀' },
  { code: 'CD', name: '刚果民主共和国' }, { code: 'KG', name: '吉尔吉斯斯坦' }, { code: 'PG', name: '巴布亚新几内亚' }, { code: 'BT', name: '不丹' },
  { code: 'KN', name: '圣基茨和尼维斯' }, { code: 'DM', name: '多米尼克' }, { code: 'CG', name: '刚果' }, { code: 'AI', name: '安圭拉' },
  { code: 'CV', name: '佛得角' }, { code: 'GN', name: '几内亚' }, { code: 'BI', name: '布隆迪' }, { code: 'ER', name: '厄立特里亚' },
  { code: 'AS', name: '美属萨摩亚' }, { code: 'FK', name: '福克兰群岛' }, { code: 'GQ', name: '赤道几内亚' }, { code: 'KM', name: '科摩罗' },
  { code: 'FM', name: '密克罗尼西亚' }, { code: 'CF', name: '中非共和国' }, { code: 'KI', name: '基里巴斯' }, { code: 'AN', name: '荷属安的列斯' },
  { code: 'AQ', name: '南极洲' }, { code: 'BV', name: '布韦岛' }, { code: 'IO', name: '英属印度洋领地' }, { code: 'CX', name: '圣诞岛' },
  { code: 'CK', name: '库克群岛' }, { code: 'GW', name: '几内亚比绍' }, { code: 'HM', name: '赫德岛和麦克唐纳群岛' }, { code: 'GS', name: '南乔治亚和南桑威奇群岛' },
  { code: 'EH', name: '西撒哈拉' }, { code: 'DO', name: '多米尼加' }, { code: 'ID', name: '印度尼西亚' }, { code: 'PH', name: '菲律宾' },
  { code: 'CN', name: '中国' }, { code: 'HR', name: '克罗地亚' }, { code: 'TW', name: '台湾' }, { code: 'CO', name: '哥伦比亚' },
  { code: 'BD', name: '孟加拉国' }, { code: 'KE', name: '肯尼亚' }, { code: 'HU', name: '匈牙利' }, { code: 'JM', name: '牙买加' },
  { code: 'EC', name: '厄瓜多尔' }, { code: 'BO', name: '玻利维亚' }, { code: 'GT', name: '危地马拉' }, { code: 'HN', name: '洪都拉斯' },
  { code: 'GH', name: '加纳' }, { code: 'BS', name: '巴哈马' }, { code: 'LV', name: '拉脱维亚' }, { code: 'IQ', name: '伊拉克' },
  { code: 'DZ', name: '阿尔及利亚' },
  // 新增国家
  { code: 'AR', name: '阿根廷' }, { code: 'BH', name: '巴林' }, { code: 'BA', name: '波斯尼亚和黑塞哥维那' },
  { code: 'BR', name: '巴西' }, { code: 'CL', name: '智利' }, { code: 'CW', name: '库拉索' },
  { code: 'CY', name: '塞浦路斯' }, { code: 'CZ', name: '捷克共和国' }, { code: 'GG', name: '根西岛' },
  { code: 'JP', name: '日本' }, { code: 'UA', name: '乌克兰' }, { code: 'SY', name: '叙利亚' },
  { code: 'TR', name: '土耳其' }
])

// ========== 实时监听文本框变化（阶段一） ==========
/**
 * 监听商品图片链接变化
 * 
 * 技术原理：
 * 1. watch 监听响应式数据的变化
 * 2. 当 formData['商品图片链接'] 变化时，触发回调
 * 3. 使用防抖优化，避免频繁触发
 * 
 * 业务逻辑：
 * - 这是"以链接为锚点"的核心
 * - 外链是主数据，商品ID/SPU是从数据
 * - 外链变化时，需要重新检测对齐状态
 * 
 * 触发场景：
 * 1. 用户删除外链 → 需要检测对应的商品ID/SPU是否多余
 * 2. 用户添加外链 → 需要检测对应的商品ID/SPU是否缺失
 * 3. 用户修改外链 → 需要检测对应的商品ID/SPU是否匹配
 */
watch(() => formData['商品图片链接'], (newValue, oldValue) => {
  // 调用防抖后的更新函数
  // 300ms 内多次变化，只会在最后一次变化后 300ms 执行
  debouncedUpdateAlignmentStatus('商品图片链接', newValue, oldValue)
}, {
  // watch 选项
  immediate: false,  // 不立即执行，只在变化时执行
  deep: false        // 不需要深度监听（字符串变化）
})

/**
 * 监听商品ID变化
 * 
 * 技术原理：
 * 1. 监听 formData['商品ID'] 的变化
 * 2. 使用防抖优化性能
 * 
 * 业务逻辑：
 * - 用户删除商品ID → 需要检测是否缺失
 * - 用户修改商品ID → 需要标记为"已修改"
 * - 用户添加商品ID → 需要检测是否匹配
 * 
 * 触发场景：
 * 1. 用户删除一行ID → 预览表显示"缺失"
 * 2. 用户修改ID → 预览表标记"已修改"
 * 3. 用户添加ID → 检测是否与映射表匹配
 */
watch(() => formData['商品ID'], (newValue, oldValue) => {
  debouncedUpdateAlignmentStatus('商品ID', newValue, oldValue)
}, {
  immediate: false,
  deep: false
})

/**
 * 监听商品SPU变化
 * 
 * 技术原理：
 * 1. 监听 formData['商品SPU'] 的变化
 * 2. 使用防抖优化性能
 * 
 * 业务逻辑：
 * - 用户删除商品SPU → 需要检测是否缺失
 * - 用户修改商品SPU → 需要标记为"已修改"
 * - 用户添加商品SPU → 需要检测是否匹配
 * 
 * 触发场景：
 * 1. 用户删除一行SPU → 预览表显示"缺失"
 * 2. 用户修改SPU → 预览表标记"已修改"
 * 3. 用户添加SPU → 检测是否与映射表匹配
 */
watch(() => formData['商品SPU'], (newValue, oldValue) => {
  debouncedUpdateAlignmentStatus('商品SPU', newValue, oldValue)
}, {
  immediate: false,
  deep: false
})

// 投放国家相关函数
const toggleCountryDropdown = () => {
  const dropdown = document.getElementById('countryDropdown')
  const trigger = document.getElementById('countryDisplay')
  
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block'
    trigger.classList.add('active')
  } else {
    dropdown.style.display = 'none'
    trigger.classList.remove('active')
  }
}

const updateCountryDisplay = () => {
  const selectedCountries = []
  const countryCheckboxes = document.querySelectorAll('input[name="投放国家"]:checked')
  
  countryCheckboxes.forEach(checkbox => {
    selectedCountries.push(checkbox.value)
  })
  
  // 更新formData
  formData['投放国家'] = selectedCountries
  
  const display = document.getElementById('countryDisplay')
  if (selectedCountries.length === 0) {
    display.textContent = '请选择投放国家'
  } else if (selectedCountries.length === 1) {
    display.textContent = selectedCountries[0]
  } else {
    display.textContent = `已选择 ${selectedCountries.length} 个国家`
  }
}

const searchCountries = (event) => {
  const searchTerm = event.target.value.toLowerCase()
  const countryItems = document.querySelectorAll('#countryDropdown .checkbox-item')
  
  countryItems.forEach(item => {
    const text = item.textContent.toLowerCase()
    if (text.includes(searchTerm)) {
      item.style.display = 'block'
    } else {
      item.style.display = 'none'
    }
  })
}

const addCustomCountry = () => {
  const searchInput = document.getElementById('countrySearch')
  const countryCode = searchInput.value.trim().toUpperCase()
  
  if (countryCode && countryCode.length === 2) {
    // 添加到其他国家列表
    otherCountries.push({ code: countryCode, name: countryCode })
    searchInput.value = ''
    console.log(`已添加自定义国家: ${countryCode}`)
  }
}

const closeCountryDropdown = () => {
  const dropdown = document.getElementById('countryDropdown')
  const trigger = document.getElementById('countryDisplay')
  dropdown.style.display = 'none'
  trigger.classList.remove('active')
}

const toggleAllCountries = () => {
  const selectAllCheckbox = document.getElementById('selectAll')
  const countryCheckboxes = document.querySelectorAll('input[name="投放国家"]')
  
  if (selectAllCheckbox.checked) {
    // 全选：添加所有国家到formData
    const allCountries = []
    countryCheckboxes.forEach(checkbox => {
      checkbox.checked = true
      allCountries.push(checkbox.value)
    })
    formData['投放国家'] = allCountries
  } else {
    // 取消全选：清空formData
    countryCheckboxes.forEach(checkbox => {
      checkbox.checked = false
    })
    formData['投放国家'] = []
  }
  updateCountryDisplay()
}

// 排除国家相关函数
const toggleExcludeCountryDropdown = () => {
  const dropdown = document.getElementById('excludeCountryDropdown')
  const trigger = document.getElementById('excludeCountryTrigger')
  
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block'
    trigger.classList.add('active')
  } else {
    dropdown.style.display = 'none'
    trigger.classList.remove('active')
  }
}

const toggleAllExcludeCountries = () => {
  const selectAllCheckbox = document.getElementById('excludeSelectAll')
  const countryCheckboxes = document.querySelectorAll('input[name="排除国家"]')
  
  if (selectAllCheckbox.checked) {
    // 全选：添加所有国家到formData
    const allCountries = []
    countryCheckboxes.forEach(checkbox => {
      checkbox.checked = true
      allCountries.push(checkbox.value)
    })
    formData['排除国家'] = allCountries
  } else {
    // 取消全选：清空formData
    countryCheckboxes.forEach(checkbox => {
      checkbox.checked = false
    })
    formData['排除国家'] = []
  }
  updateExcludeCountryDisplay()
}

const updateExcludeCountryDisplay = () => {
  const selectedCountries = []
  const countryCheckboxes = document.querySelectorAll('input[name="排除国家"]:checked')
  
  countryCheckboxes.forEach(checkbox => {
    selectedCountries.push(checkbox.value)
  })
  
  // 更新formData
  formData['排除国家'] = selectedCountries
  
  const display = document.getElementById('excludeCountryDisplay')
  if (selectedCountries.length === 0) {
    display.textContent = '请选择排除国家'
  } else if (selectedCountries.length === 1) {
    display.textContent = selectedCountries[0]
  } else {
    display.textContent = `已选择 ${selectedCountries.length} 个国家`
  }
}

const closeExcludeCountryDropdown = () => {
  const dropdown = document.getElementById('excludeCountryDropdown')
  const trigger = document.getElementById('excludeCountryTrigger')
  dropdown.style.display = 'none'
  trigger.classList.remove('active')
}

// 投放区域处理
const handleRegionSelection = (event) => {
  const checkbox = event.target
  if (checkbox.value === 'worldwide') {
    // 如果选择worldwide，取消其他选择
    if (checkbox.checked) {
      formData['投放区域'] = ['worldwide']
    }
  } else {
    // 如果选择其他，取消worldwide
    if (checkbox.checked) {
      formData['投放区域'] = formData['投放区域'].filter(region => region !== 'worldwide')
    }
  }
}

// 切换进阶赋能型受众显示
const toggleAdvancedAudience = () => {
  const advancedFields = document.getElementById('advancedAudienceFields')
  const simpleFields = document.getElementById('simpleAudienceFields')
  
  const mode = formData['进阶赋能型受众']
  console.log('切换进阶赋能型受众模式:', mode)
  
  if (mode === '开启') {
    // 切到开启模式：清空简化受众字段
    formData['最小年龄'] = ''
    formData['最大年龄'] = ''
    formData['受众设置'] = []
    
    // 展示/隐藏
    advancedFields.style.display = 'block'
    simpleFields.style.display = 'none'
    console.log('显示进阶字段，隐藏简化字段，并清空：最小年龄/最大年龄/受众设置')
  } else {
    // 切到关闭模式：清空进阶受众字段
    formData['控制选项-年龄下限'] = ''
    formData['建议受众-性别'] = ''
    formData['建议受众-最小年龄'] = ''
    formData['建议受众-最大年龄'] = ''
    formData['受众设置'] = []
    
    // 展示/隐藏
    advancedFields.style.display = 'none'
    simpleFields.style.display = 'block'
    console.log('隐藏进阶字段，显示简化字段，并清空：控制选项-年龄下限/建议受众-性别/建议受众-最小年龄/建议受众-最大年龄/受众设置')
  }
}

// 处理多行输入和分隔符功能
const processMultiLineInput = (text) => {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  console.log('processMultiLineInput 输入:', JSON.stringify(text))
  
  // 支持的分隔符：空格、英文逗号、中文逗号、顿号（与原始后端一致）
  const separators = [/\s+/, ',', '，', '、']
  
  // 使用第一个匹配的分隔符进行分割
  let result = []
  for (const separator of separators) {
    if (typeof separator === 'string') {
      if (text.includes(separator)) {
        result = text.split(separator).map(item => item.trim()).filter(item => item !== '')
        break
      }
    } else {
      // 正则表达式
      if (separator.test(text)) {
        result = text.split(separator).map(item => item.trim()).filter(item => item !== '')
        break
      }
    }
  }
  
  // 如果没有找到分隔符，返回原值
  if (result.length === 0) {
    result = [text.trim()]
  }
  
  console.log('processMultiLineInput 输出:', result)
  return result.join('\n')
}

// 格式化数据以匹配后端期望的格式
const formatDataForBackend = (data) => {
  const formattedData = { ...data }
  
  // 预算字段保持原始值，不做自动填充（由后端处理默认值逻辑）
  // 如果用户未输入，这里会是空字符串 ''，后端会识别并设置默认值10
  
  // 确保年龄字段是字符串格式（后端期望字符串）
  if (typeof formattedData['最小年龄'] === 'number') {
    formattedData['最小年龄'] = formattedData['最小年龄'].toString()
  }
  if (typeof formattedData['最大年龄'] === 'number') {
    formattedData['最大年龄'] = formattedData['最大年龄'].toString()
  }
  if (typeof formattedData['建议受众-最小年龄'] === 'number') {
    formattedData['建议受众-最小年龄'] = formattedData['建议受众-最小年龄'].toString()
  }
  if (typeof formattedData['建议受众-最大年龄'] === 'number') {
    formattedData['建议受众-最大年龄'] = formattedData['建议受众-最大年龄'].toString()
  }
  
  // 将数组字段转换为字符串（后端期望的格式）
  if (Array.isArray(formattedData['投放国家'])) {
    formattedData['投放国家'] = formattedData['投放国家'].join(',')
  }
  
  if (Array.isArray(formattedData['排除国家'])) {
    formattedData['排除国家'] = formattedData['排除国家'].join(',')
  }
  
  if (Array.isArray(formattedData['投放区域'])) {
    formattedData['投放区域'] = formattedData['投放区域'].join(',')
  }
  
  // 处理像素字段，自动添加tp:前缀
  if (formattedData['像素'] && formattedData['像素'].trim()) {
    const pixelValue = formattedData['像素'].trim();
    // 如果用户输入已经包含tp:，则不重复添加
    if (!pixelValue.startsWith('tp:')) {
      formattedData['像素'] = 'tp:' + pixelValue;
    }
  }
  
  // 处理进阶赋能型受众开关 - 关闭时映射简化字段到后端期望的字段名
  if (formattedData['进阶赋能型受众'] === '关闭') {
    // 关闭进阶赋能型受众时，将简化字段映射到后端期望的字段名
    if (formattedData['最小年龄']) {
      formattedData['建议受众-最小年龄'] = formattedData['最小年龄'];
      console.log('前端 - 映射最小年龄:', formattedData['最小年龄'], '->', formattedData['建议受众-最小年龄']);
      delete formattedData['最小年龄'];
    }
    if (formattedData['最大年龄']) {
      formattedData['建议受众-最大年龄'] = formattedData['最大年龄'];
      console.log('前端 - 映射最大年龄:', formattedData['最大年龄'], '->', formattedData['建议受众-最大年龄']);
      delete formattedData['最大年龄'];
    }
    // 移除控制选项-年龄下限字段
    delete formattedData['控制选项-年龄下限'];
  }
  
  console.log('格式化后的数据:', JSON.stringify(formattedData, null, 2))
  return formattedData
}

// 按3个一组分组（轮播模式）
const groupByThree = (items) => {
  const groups = []
  for (let i = 0; i < items.length; i += 3) {
    groups.push(items.slice(i, i + 3))
  }
  return groups
}

// 处理批量输入数据
const processBatchInput = (formData) => {
  console.log('处理前的商品ID原始值:', JSON.stringify(formData['商品ID']))
  console.log('处理前的商品SPU原始值:', JSON.stringify(formData['商品SPU']))
  console.log('处理前的商品链接原始值（图片/视频）:', JSON.stringify(formData['商品图片链接']))
  console.log('轮播视频模式:', formData['轮播视频模式'])
  console.log('工作流模式:', adCampaignStore.workflowMode)
  
  const processedProductIds = formData['商品ID'] ? processMultiLineInput(formData['商品ID']) : ''
  const processedProductSpus = formData['商品SPU'] ? processMultiLineInput(formData['商品SPU']) : ''
  const processedProductImages = formData['商品图片链接'] ? processMultiLineInput(formData['商品图片链接']) : ''
  
  console.log('处理后的商品ID:', JSON.stringify(processedProductIds))
  console.log('处理后的商品SPU:', JSON.stringify(processedProductSpus))
  console.log('处理后的商品链接（图片/视频）:', JSON.stringify(processedProductImages))
  
  const productIds = processedProductIds ? processedProductIds.split('\n').map(id => id.trim()).filter(id => id.length > 0) : []
  const productSpus = processedProductSpus ? processedProductSpus.split('\n').map(spu => spu.trim()).filter(spu => spu.length > 0) : []
  const productImages = processedProductImages ? processedProductImages.split('\n').map(img => img.trim()).filter(img => img.length > 0) : []
  
  console.log('批量输入数据:', {
    productIds: productIds,
    productSpus: productSpus,
    productImages: productImages
  })
  
  console.log('productIds长度:', productIds.length)
  console.log('productSpus长度:', productSpus.length)
  console.log('productImages长度:', productImages.length)
  
  // 检查是否有批量输入
  if (productIds.length === 0 && productSpus.length === 0 && productImages.length === 0) {
    console.log('单个数据模式')
    return [formatDataForBackend(formData)] // 返回单个数据
  }
  
  // ========== 阶段七：表格生成改造 - 根据工作流模式判断分组逻辑 ==========
  /**
   * 分组逻辑判断优先级：
   * 1. 拼图对齐模式（workflowMode === 'stitch_sync'）→ 使用3:1分组
   * 2. 标准模式 + 轮播视频模式（formData['轮播视频模式'] === true）→ 使用3:1分组（保留原有功能）
   * 3. 标准模式 → 使用1:1逻辑（原有逻辑）
   * 
   * 技术原理：
   * - 拼图对齐模式的核心是3:1关系（每3个商品对应1个外链）
   * - 轮播视频模式也是3:1关系，所以在标准模式下保留此功能
   * - 标准模式的默认逻辑是1:1对应（每个商品独立一行）
   */
  
  // 判断是否需要使用3:1分组逻辑
  const isStitchSyncMode = adCampaignStore.workflowMode === 'stitch_sync'
  const rotationMode = formData['轮播视频模式'] || false
  const shouldUseThreeToOneGrouping = isStitchSyncMode || rotationMode
  
  // 3:1分组处理（拼图对齐模式 或 轮播视频模式）
  if (shouldUseThreeToOneGrouping) {
    // 根据模式类型输出不同的日志
    if (isStitchSyncMode) {
      console.log('🔗 [拼图对齐模式] 启用3:1分组处理（每3个商品ID/SPU对应1个外链）')
    } else {
      console.log('🔄 [轮播模式] 启用轮播视频模式，按3个一组分组处理')
    }
    
    // 检查商品ID和商品SPU数量是否一致
    if (productIds.length !== productSpus.length) {
      const warningMsg = `⚠️ 警告：商品ID数量(${productIds.length})与商品SPU数量(${productSpus.length})不一致！`
      console.warn(warningMsg)
      alert(warningMsg)
    }
    
    /**
     * 按3个一组分组
     * 使用 groupByThree 函数将数组按每3个元素一组进行分组
     * 例如：[1,2,3,4,5,6] → [[1,2,3], [4,5,6]]
     */
    const idGroups = groupByThree(productIds)
    const spuGroups = groupByThree(productSpus)
    const groupCount = Math.max(idGroups.length, spuGroups.length)
    
    const modePrefix = isStitchSyncMode ? '[拼图对齐模式]' : '[轮播模式]'
    console.log(`${modePrefix} 商品ID分组: ${idGroups.length}组`, idGroups)
    console.log(`${modePrefix} 商品SPU分组: ${spuGroups.length}组`, spuGroups)
    console.log(`${modePrefix} 分组数量: ${groupCount}`)
    
    // 检查图片/视频链接数量是否与分组数量一致
    if (productImages.length !== groupCount) {
      const warningMsg = `⚠️ 警告：商品图片/视频链接数量(${productImages.length})与分组数量(${groupCount})不一致！期望${groupCount}个链接。`
      console.warn(warningMsg)
      alert(warningMsg)
    }
    
    const batchData = []
    // 生成分组后的批量数据
    // 每个分组包含：3个商品ID（用逗号连接）、3个商品SPU（用逗号连接）、1个外链
    for (let i = 0; i < groupCount; i++) {
      const batchItem = { ...formData }
      
      /**
       * 将每组ID用英文逗号连接
       * 例如：[id1, id2, id3] → "id1,id2,id3"
       * 确保使用英文逗号","，不是中文逗号"，"
       */
      const idGroup = idGroups[i] || []
      batchItem['商品ID'] = idGroup.join(',') // 英文逗号
      
      /**
       * 将每组SPU用英文逗号连接
       * 例如：[spu1, spu2, spu3] → "spu1,spu2,spu3"
       */
      const spuGroup = spuGroups[i] || []
      batchItem['商品SPU'] = spuGroup.join(',') // 英文逗号
      
      // 验证输出格式（确保没有中文逗号）
      if (batchItem['商品ID'].includes('，')) {
        console.warn(`⚠️ ${modePrefix} 检测到中文逗号，自动替换为英文逗号`)
        batchItem['商品ID'] = batchItem['商品ID'].replace(/，/g, ',')
      }
      if (batchItem['商品SPU'].includes('，')) {
        console.warn(`⚠️ ${modePrefix} 检测到中文逗号，自动替换为英文逗号`)
        batchItem['商品SPU'] = batchItem['商品SPU'].replace(/，/g, ',')
      }
      
      // 每个分组对应一个外链（图片链接或视频链接）
      batchItem['商品图片链接'] = productImages[i] || productImages[0] || ''
      
      console.log(`${modePrefix} 第${i + 1}组数据:`, {
        '商品ID': batchItem['商品ID'],
        '商品SPU': batchItem['商品SPU'],
        '商品图片链接': batchItem['商品图片链接']
      })
      
      batchData.push(formatDataForBackend(batchItem))
    }
    
    console.log(`${modePrefix} 最终批量数据:`, batchData)
    return batchData
  }
  
  // ========== 标准模式：1:1对应逻辑（原有逻辑） ==========
  /**
   * 标准模式的默认逻辑：1:1对应
   * 每个商品ID、商品SPU、商品图片链接都是独立的，一一对应
   * 生成表格时，每个商品占一行
   */
  console.log('📋 [标准模式] 使用1:1对应逻辑（每个商品独立一行）')
  
  // 确定最大长度
  const maxLength = Math.max(productIds.length, productSpus.length, productImages.length)
  console.log('批量数据长度:', maxLength)
  
  const batchData = []
  // 生成批量数据
  for (let i = 0; i < maxLength; i++) {
    const batchItem = { ...formData }
    
    // 设置批量字段 - 每个商品都有独立的数据
    // 如果某个字段的批量输入少于最大长度，使用第一个值作为默认值（与原始后端逻辑一致）
    batchItem['商品ID'] = productIds[i] || productIds[0] || ''
    batchItem['商品SPU'] = productSpus[i] || productSpus[0] || ''
    batchItem['商品图片链接'] = productImages[i] || productImages[0] || ''
    
    console.log(`第${i + 1}个商品数据:`, batchItem)
    batchData.push(formatDataForBackend(batchItem))
  }
  
  console.log('最终批量数据:', batchData)
  return batchData
}

// 图片链接校验函数
const validateImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    console.log('validateImageUrl: 无效URL类型或空值:', url)
    return false
  }
  
  // 检查是否以http/https开头
  if (!url.match(/^https?:\/\//i)) {
    console.log('validateImageUrl: URL不以http/https开头:', url)
    return false
  }
  
  // 检查是否以常见图片扩展名结尾（支持更多格式）
  const imageExtensions = /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg)(\?.*)?$/i
  const isValid = imageExtensions.test(url)
  console.log('validateImageUrl: URL校验结果:', url, '->', isValid)
  return isValid
}

// 获取文件名（从URL最后一段）
const getFileNameFromUrl = (url) => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/')
    let filename = segments[segments.length - 1]
    
    // 如果没有文件名或文件名不包含扩展名，使用默认名称
    if (!filename || !filename.includes('.')) {
      const timestamp = Date.now()
      filename = `image_${timestamp}.jpg`
    }
    
    return filename
  } catch (e) {
    const timestamp = Date.now()
    return `image_${timestamp}.jpg`
  }
}

// 处理文件名冲突
const getUniqueFileName = (originalName, usedNames, index) => {
  // 直接使用原始文件名，不添加序号
  if (!usedNames.has(originalName)) {
    usedNames.add(originalName)
    return originalName
  }
  
  // 如果文件名冲突，添加时间戳后缀
  const nameParts = originalName.split('.')
  const extension = nameParts.length > 1 ? '.' + nameParts.pop() : ''
  const baseName = nameParts.join('.')
  const timestamp = Date.now()
  const uniqueName = `${baseName}_${timestamp}${extension}`
  
  usedNames.add(uniqueName)
  return uniqueName
}

// 下载单个图片并返回 Blob（不直接下载到本地，用于 ZIP 打包）
const downloadImageAsBlob = async (url, filename, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    console.log(`开始下载图片为 Blob (尝试 ${retryCount + 1}/${maxRetries + 1}): ${url} -> ${filename}`)
    
    // 通过API Gateway代理下载，避免CORS问题
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
    }
    
    const blob = await response.blob()
    
    console.log(`✅ 图片已下载为 Blob: ${filename}`)
    return { success: true, blob, filename }
    
  } catch (error) {
    const errorMessage = error.message || '未知错误'
    const isDNSError = errorMessage.includes('ENOTFOUND') || 
                      errorMessage.includes('DNS') || 
                      errorMessage.includes('getaddrinfo')
    
    console.error(`下载失败 ${url} (尝试 ${retryCount + 1}):`, error)
    
    // 如果代理失败，尝试通过浏览器直接下载（绕过服务器DNS问题）
    if (retryCount === 0) {
      try {
        console.log('尝试通过浏览器直接下载图片为 Blob...')
        
        // 尝试直接 fetch（如果允许CORS）
        const directResponse = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache'
        })
        
        if (directResponse.ok) {
          const blob = await directResponse.blob()
          console.log(`✅ 图片已通过浏览器直接下载为 Blob: ${filename}`)
          return { success: true, blob, filename }
        }
      } catch (corsError) {
        console.warn('CORS请求失败:', corsError.message)
        if (isDNSError) {
          console.warn('💡 提示: 服务器DNS解析失败，且浏览器CORS受限，无法下载此图片')
        }
      }
    }
    
    // 重试机制
    if (retryCount < maxRetries) {
      console.log(`重试下载: ${url}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return downloadImageAsBlob(url, filename, retryCount + 1)
    }
    
    return { success: false, filename, error: errorMessage }
  }
}

// 下载单个图片到本地（用于生成表格时下载）
const downloadImageToLocal = async (url, filename, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    console.log(`开始下载图片到本地 (尝试 ${retryCount + 1}/${maxRetries + 1}): ${url} -> ${filename}`)
    
    // 通过API Gateway代理下载，避免CORS问题
    // 使用代理接口下载图片
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // 使用已有的 downloadFile 函数下载到本地
    downloadFile(blob, filename)
    
    console.log(`✅ 图片已下载到本地: ${filename}`)
    return { success: true, filename }
    
  } catch (error) {
    const errorMessage = error.message || '未知错误'
    const isDNSError = errorMessage.includes('ENOTFOUND') || 
                      errorMessage.includes('DNS') || 
                      errorMessage.includes('getaddrinfo')
    
    console.error(`下载失败 ${url} (尝试 ${retryCount + 1}):`, error)
    
    // 如果是DNS错误，提供更明确的提示
    if (isDNSError && retryCount === 0) {
      console.warn('⚠️ DNS解析失败，服务器可能无法访问外网。尝试直接下载...')
    }
    
    // 如果代理失败，尝试通过浏览器直接下载（绕过服务器DNS问题）
    if (retryCount === 0) {
      try {
        console.log('尝试通过浏览器直接下载图片...')
        
        // 方法1: 尝试直接 fetch（如果允许CORS）
        try {
          const directResponse = await fetch(url, {
            method: 'GET',
            mode: 'cors', // 使用cors模式，可以读取响应
            cache: 'no-cache'
          })
          
          if (directResponse.ok) {
            const blob = await directResponse.blob()
            downloadFile(blob, filename)
            console.log(`✅ 图片已通过浏览器直接下载: ${filename}`)
            return { success: true, filename }
          }
        } catch (corsError) {
          console.warn('CORS请求失败，尝试备用方法:', corsError.message)
        }
        
        // 方法2: 如果CORS失败，使用新窗口打开（让用户手动保存）
        // 注意：这种方法无法自动下载，但至少可以让用户看到图片
        console.log('CORS受限，使用备用下载方法...')
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // 延迟一下，给浏览器时间处理
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log(`✅ 已触发图片下载（如果浏览器阻止了自动下载，请右键图片选择"另存为"）: ${filename}`)
        return { success: true, filename, note: '可能需要手动保存' }
      } catch (directError) {
        console.warn('直接下载也失败:', directError)
        if (isDNSError) {
          console.warn('💡 提示: 服务器DNS解析失败，但浏览器可能可以访问。如果下载未自动开始，请检查浏览器下载设置或手动保存图片。')
        }
      }
    }
    
    // 重试机制
    if (retryCount < maxRetries) {
      console.log(`重试下载: ${url}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 递增延迟
      return downloadImageToLocal(url, filename, retryCount + 1)
    }
    
    // 提供更友好的错误信息
    let friendlyError = errorMessage
    if (isDNSError) {
      friendlyError = `DNS解析失败: 服务器无法解析图片域名。图片已通过浏览器直接下载。`
    }
    
    return { success: false, filename, error: friendlyError }
  }
}

// 下载单个图片到服务端（用于视频服务同步）
const downloadImage = async (url, filename, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    console.log(`开始下载图片到服务端 (尝试 ${retryCount + 1}/${maxRetries + 1}): ${url} -> ${filename}`)
    
    // 使用视频服务的下载接口，将图片下载到服务端
    const downloadResponse = await fetch('/api/video-generation/api/download-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    })
    
    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.json().catch(() => ({}))
      
      // 调试：打印完整的错误数据
      console.error('图片下载错误详情:', JSON.stringify(errorData, null, 2))
      
      // 构建详细的错误信息
      let errorMessage = `HTTP ${downloadResponse.status} 错误`
      
      // 优先检查错误代码（最可靠）
      if (errorData.code) {
        if (errorData.code === 'ECONNREFUSED') {
          errorMessage = '无法连接到视频服务，请确保视频服务正在运行 (端口 9000)'
        } else if (errorData.code === 'ETIMEDOUT') {
          errorMessage = '连接视频服务超时，请检查网络连接'
        } else {
          errorMessage = `连接错误: ${errorData.code}`
        }
      } 
      // 然后检查 error 字段（如果错误代码不存在）
      else if (errorData.error && errorData.error !== 'Error' && typeof errorData.error === 'string') {
        errorMessage = errorData.error
      } 
      // 最后检查 message 字段
      else if (errorData.message && errorData.message !== 'Error' && typeof errorData.message === 'string') {
        errorMessage = errorData.message
      }
      
      const serviceInfo = errorData.service ? ` (服务: ${errorData.service})` : ''
      const codeInfo = errorData.code && errorData.code !== 'ECONNREFUSED' && errorData.code !== 'ETIMEDOUT' ? ` (错误代码: ${errorData.code})` : ''
      const urlInfo = errorData.url ? ` (请求URL: ${errorData.url})` : ''
      
      throw new Error(`下载请求失败: ${errorMessage}${serviceInfo}${codeInfo}${urlInfo}`)
    }
    
    const result = await downloadResponse.json()
    
    if (!result.success) {
      throw new Error(result.message || '下载失败')
    }
    
    console.log(`图片下载成功: ${filename} (服务端文件名: ${result.filename})`)
    return { success: true, filename, serverFilename: result.filename }
    
  } catch (error) {
    console.error(`下载失败 ${url} (尝试 ${retryCount + 1}):`, error)
    
    // 重试机制
    if (retryCount < maxRetries) {
      console.log(`重试下载: ${url}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 递增延迟
      return downloadImage(url, filename, retryCount + 1)
    }
    
    return { success: false, filename, error: error.message }
  }
}

// 下载所有图片并打包为 ZIP 文件
const downloadImagesAsZip = async (imageLinks) => {
  const downloader = document.getElementById('imageDownloader')
  const progress = document.getElementById('downloadProgress')
  
  if (!imageLinks || imageLinks.length === 0) {
    return { success: true, downloaded: 0, failed: 0 }
  }
  
  // 显示下载器
  downloader.style.display = 'block'
  progress.innerHTML = '正在准备下载图片并打包为 ZIP...'
  
  const validLinks = []
  const invalidLinks = []
  
  // 校验所有链接
  console.log(`开始校验 ${imageLinks.length} 个图片链接...`)
  imageLinks.forEach((link, index) => {
    const trimmedLink = link.trim()
    console.log(`校验链接 ${index + 1}: ${trimmedLink}`)
    if (trimmedLink && validateImageUrl(trimmedLink)) {
      validLinks.push(trimmedLink)
      console.log(`✓ 链接有效: ${trimmedLink}`)
    } else if (trimmedLink) {
      invalidLinks.push(trimmedLink)
      console.log(`✗ 链接无效: ${trimmedLink}`)
    }
  })
  
  console.log(`校验结果: 有效链接 ${validLinks.length} 个，无效链接 ${invalidLinks.length} 个`)
  
  if (invalidLinks.length > 0) {
    console.warn('以下链接格式不正确，将被跳过:', invalidLinks)
    progress.innerHTML = `发现 ${invalidLinks.length} 个无效链接，将跳过这些链接`
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  if (validLinks.length === 0) {
    progress.innerHTML = '没有有效的图片链接'
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    return { success: false, downloaded: 0, failed: 0, message: '没有有效的图片链接' }
  }
  
  progress.innerHTML = `开始下载 ${validLinks.length} 张图片...`
  
  const usedNames = new Set()
  const images = [] // 存储成功下载的图片 { blob, filename }
  const failed = [] // 存储失败的图片信息
  
  // 顺序下载所有图片到内存
  for (let index = 0; index < validLinks.length; index++) {
    const url = validLinks[index]
    
    // 更新进度
    progress.innerHTML = `正在下载图片 ${index + 1}/${validLinks.length}...`
    
    const originalFilename = getFileNameFromUrl(url)
    const uniqueFilename = getUniqueFileName(originalFilename, usedNames, index)
    
    console.log(`准备下载第${index + 1}张图片: ${url} -> ${uniqueFilename}`)
    
    const result = await downloadImageAsBlob(url, uniqueFilename)
    
    if (result.success && result.blob) {
      images.push({
        blob: result.blob,
        filename: result.filename
      })
      usedNames.add(result.filename)
      console.log(`✅ 图片 ${index + 1}/${validLinks.length} 下载成功: ${result.filename}`)
    } else {
      failed.push({
        url: url,
        filename: uniqueFilename,
        error: result.error || '下载失败'
      })
      console.error(`❌ 图片 ${index + 1}/${validLinks.length} 下载失败: ${result.error}`)
    }
    
    // 添加延迟，避免请求过快
    if (index < validLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
  
  // 如果没有成功下载任何图片，直接返回
  if (images.length === 0) {
    progress.innerHTML = `❌ 所有图片下载失败，无法生成 ZIP 文件`
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    return {
      success: false,
      downloaded: 0,
      failed: failed.length,
      validLinks: validLinks.length,
      failedDetails: failed
    }
  }
  
  // 开始打包 ZIP
  progress.innerHTML = `正在打包 ${images.length} 张图片为 ZIP 文件...`
  console.log(`开始打包 ${images.length} 张图片为 ZIP 文件...`)
  
  try {
    const zip = new JSZip()
    
    // 将所有图片添加到 ZIP（直接放在 ZIP 根目录，不创建子文件夹）
    images.forEach((image, index) => {
      zip.file(image.filename, image.blob)
      console.log(`已添加图片到 ZIP: ${image.filename} (${index + 1}/${images.length})`)
    })
    
    // 如果有失败的图片，创建一个失败列表文件
    if (failed.length > 0) {
      const failedList = failed.map((f, idx) => 
        `${idx + 1}. ${f.filename}\n   链接: ${f.url}\n   错误: ${f.error}`
      ).join('\n\n')
      zip.file('下载失败列表.txt', `以下图片下载失败：\n\n${failedList}`)
      console.log('已添加失败列表到 ZIP')
    }
    
    // 生成 ZIP 文件
    progress.innerHTML = `正在生成 ZIP 文件...`
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 } // 压缩级别 1-9，6 是平衡速度和大小
    })
    
    // 生成 ZIP 文件名（使用时间戳）
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_')
    const zipFilename = `商品图片_${timestamp}.zip`
    
    // 下载 ZIP 文件
    progress.innerHTML = `ZIP 文件已生成，开始下载...`
    console.log(`开始下载 ZIP 文件: ${zipFilename} (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`)
    
    downloadFile(zipBlob, zipFilename)
    
    // 显示成功消息
    let successMessage = `✅ ZIP 文件已生成并开始下载！<br>`
    successMessage += `<small class="text-success">包含 ${images.length} 张图片</small>`
    if (failed.length > 0) {
      successMessage += `<br><small class="text-warning">⚠️ ${failed.length} 张图片下载失败（失败列表已包含在 ZIP 中）</small>`
    }
    successMessage += `<br><small class="text-muted">文件名: ${zipFilename}</small>`
    
    progress.innerHTML = successMessage
    
    console.log(`✅ ZIP 文件下载完成: ${zipFilename}`)
    console.log(`统计: 成功 ${images.length} 张，失败 ${failed.length} 张`)
    
    // 5秒后隐藏下载器
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 5000)
    
    return {
      success: true,
      downloaded: images.length,
      failed: failed.length,
      validLinks: validLinks.length,
      zipFilename: zipFilename,
      zipSize: zipBlob.size,
      failedDetails: failed
    }
    
  } catch (error) {
    console.error('ZIP 打包失败:', error)
    progress.innerHTML = `❌ ZIP 打包失败: ${error.message}`
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 5000)
    
    return {
      success: false,
      downloaded: images.length,
      failed: failed.length + 1, // 加上打包失败
      validLinks: validLinks.length,
      error: error.message,
      failedDetails: failed
    }
  }
}

// 批量下载图片到本地（用于生成表格时）- 现在改为打包为 ZIP
const downloadAllImagesToLocal = async (imageLinks) => {
  // 调用 ZIP 打包函数
  return await downloadImagesAsZip(imageLinks)
}

// 批量下载图片到服务端（用于视频服务同步）
const downloadAllImages = async (imageLinks) => {
  const downloader = document.getElementById('imageDownloader')
  const progress = document.getElementById('downloadProgress')
  
  if (!imageLinks || imageLinks.length === 0) {
    return { success: true, downloaded: 0, failed: 0 }
  }
  
  // 显示下载器
  downloader.style.display = 'block'
  progress.innerHTML = '正在准备下载图片...'
  
  const validLinks = []
  const invalidLinks = []
  
  // 校验所有链接
  console.log(`开始校验 ${imageLinks.length} 个图片链接...`)
  imageLinks.forEach((link, index) => {
    const trimmedLink = link.trim()
    console.log(`校验链接 ${index + 1}: ${trimmedLink}`)
    if (trimmedLink && validateImageUrl(trimmedLink)) {
      validLinks.push(trimmedLink)
      console.log(`✓ 链接有效: ${trimmedLink}`)
    } else if (trimmedLink) {
      invalidLinks.push(trimmedLink)
      console.log(`✗ 链接无效: ${trimmedLink}`)
    }
  })
  
  console.log(`校验结果: 有效链接 ${validLinks.length} 个，无效链接 ${invalidLinks.length} 个`)
  
  if (invalidLinks.length > 0) {
    console.warn('以下链接格式不正确，将被跳过:', invalidLinks)
    progress.innerHTML = `发现 ${invalidLinks.length} 个无效链接，将跳过这些链接`
  }
  
  if (validLinks.length === 0) {
    progress.innerHTML = '没有有效的图片链接'
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    return { success: false, downloaded: 0, failed: 0, message: '没有有效的图片链接' }
  }
  
  progress.innerHTML = `开始下载 ${validLinks.length} 张图片...`
  
  const usedNames = new Set()
  const results = []
  
  // 改为顺序下载，避免浏览器限制
  for (let index = 0; index < validLinks.length; index++) {
    const url = validLinks[index]
    
    // 更新进度
    progress.innerHTML = `正在下载图片 ${index + 1}/${validLinks.length}...`
    
    const originalFilename = getFileNameFromUrl(url)
    const uniqueFilename = getUniqueFileName(originalFilename, usedNames, index)
    
    console.log(`准备下载第${index + 1}张图片: ${url} -> ${uniqueFilename}`)
    
    const result = await downloadImage(url, uniqueFilename)
    results.push(result)
    
    // 添加延迟，确保每个下载完成
    if (index < validLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 450))
    }
  }
  
  try {
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`下载完成统计:`)
    console.log(`- 总链接数: ${imageLinks.length}`)
    console.log(`- 有效链接数: ${validLinks.length}`)
    console.log(`- 成功下载: ${successful.length} 张`)
    console.log(`- 下载失败: ${failed.length} 张`)
    
    if (failed.length > 0) {
      console.log('失败的下载详情:')
      failed.forEach((result, index) => {
        console.log(`${index + 1}. ${result.filename}: ${result.error}`)
      })
    }
    
    // 显示详细的下载结果
    let resultMessage = `下载完成！成功: ${successful.length} 张，失败: ${failed.length} 张`
    if (failed.length > 0) {
      resultMessage += `<br><small class="text-warning">⚠️ 部分图片下载失败，可能是浏览器阻止了自动下载。请检查浏览器下载设置，或手动访问图片链接保存。</small>`
    } else if (successful.length > 0) {
      resultMessage += `<br><small class="text-success">✅ 所有图片已开始下载，请检查浏览器的下载文件夹</small>`
    }
    progress.innerHTML = resultMessage
    
    // 5秒后隐藏下载器（给用户更多时间看到提示）
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 5000)
    
    return { 
      success: true, 
      downloaded: successful.length, 
      failed: failed.length,
      totalLinks: imageLinks.length,
      validLinks: validLinks.length,
      failedDetails: failed
    }
  } catch (error) {
    console.error('批量下载出错:', error)
    progress.innerHTML = '下载过程中出现错误'
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    return { success: false, downloaded: 0, failed: validLinks.length, error: error.message }
  }
}

// Base64转Blob函数
const base64toBlob = (base64Data, mimeType) => {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * 下载文件函数
 * 
 * 技术原理：
 * 1. 使用 Blob URL 创建一个临时的下载链接
 * 2. 创建 <a> 元素并设置 download 属性
 * 3. 模拟点击触发下载
 * 4. 清理临时元素和 URL
 * 
 * 错误处理优化：
 * - 捕获 InvalidStateError（浏览器阻止下载）
 * - 捕获文件名过长或非法字符导致的错误
 * - 捕获其他可能的系统级写入错误
 * - 使用 ElMessage.error 显示友好的错误提示
 * 
 * @param {Blob} blob - 要下载的文件 Blob 对象
 * @param {string} filename - 文件名
 * @returns {boolean} 是否下载成功
 */
const downloadFile = (blob, filename) => {
  try {
    // 创建 Blob URL
    const url = window.URL.createObjectURL(blob)
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // 添加到 DOM（某些浏览器需要）
    document.body.appendChild(link)
    
    // 触发下载
    link.click()
    
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    // 错误处理：捕获各种可能的下载失败情况
    console.error('文件下载失败:', error)
    
    // 判断错误类型，给出精准的提示
    let errorMessage = '导出失败，'
    
    if (error.name === 'InvalidStateError' || error.message.includes('InvalidState')) {
      // 浏览器阻止下载（最常见的情况）
      errorMessage += '请检查浏览器是否拦截了下载，或者尝试允许自动下载。'
    } else if (error.message.includes('filename') || error.message.includes('name')) {
      // 文件名问题（过长或非法字符）
      errorMessage += `文件名可能包含非法字符或过长（"${filename}"），请检查文件名。`
    } else if (error.message.includes('quota') || error.message.includes('storage')) {
      // 存储空间不足
      errorMessage += '存储空间可能不足，请清理磁盘空间后重试。'
    } else {
      // 其他未知错误
      errorMessage += `请检查浏览器下载设置或稍后重试。错误详情：${error.message}`
    }
    
    // 使用 Element Plus 的错误提示
    ElMessage.error(errorMessage)
    
    return false
  }
}

// 常量：每份表格最大行数
const MAX_ROWS_PER_TABLE = 10

// 工具函数：将数组按指定大小拆分成多个批次
const splitIntoBatches = (array, batchSize) => {
  const batches = []
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize))
  }
  return batches
}

// 工具函数：检测是否为视频链接
const isVideoLink = (url) => {
  if (!url || typeof url !== 'string') return false
  const lowerUrl = url.toLowerCase()
  // 检测视频文件扩展名
  const videoFileExts = /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv|mpeg|mpg)(\?.*)?$/i
  // 检测视频平台域名
  const videoPlatforms = /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|douyin\.com|bilibili\.com|dailymotion\.com|facebook\.com\/watch|instagram\.com\/(p|reel))/i
  // 检测视频下载路径
  const videoDownloadPath = /\/download\/.*\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v)/i
  return videoFileExts.test(lowerUrl) || videoPlatforms.test(lowerUrl) || videoDownloadPath.test(lowerUrl)
}

/**
 * 保存表格到文件夹（直接使用浏览器下载，不弹出文件夹选择）
 * 
 * 技术原理：
 * - 直接使用降级方案（fallbackToPathNaming）
 * - 通过文件名路径（如 "ABO表格/ABO表格.xlsx"）让浏览器自动创建文件夹结构
 * - 文件会保存到浏览器的默认下载文件夹
 * 
 * 修改说明：
 * - 移除了 File System Access API 的文件夹选择功能
 * - 用户点击"生成表格"后，直接开始下载，无需选择文件夹
 * - 保持了文件夹结构（ABO表格 和 URL表格 两个子文件夹）
 * 
 * @param {Array} tables - 表格数据数组
 * @param {number} totalBatches - 总批次数
 */
const saveTablesToFolder = async (tables, totalBatches) => {
  // 直接使用降级方案：浏览器自动下载到默认下载文件夹
  // 通过文件名路径自动创建文件夹结构（例如：ABO表格/ABO表格.xlsx）
  fallbackToPathNaming(tables, totalBatches)
}

/**
 * 降级方案：使用文件夹路径命名
 * 
 * 技术原理：
 * 当 File System Access API 不可用时，使用文件夹路径命名的方式
 * 浏览器会自动创建文件夹结构（通过路径中的 / 分隔符）
 * 
 * 错误处理：
 * - 对每次 downloadFile 调用进行错误处理
 * - 统计成功和失败的下载数量
 * - 如果所有下载都失败，显示错误提示
 * 
 * @param {Array} tables - 表格数据数组
 * @param {number} totalBatches - 总批次数
 */
const fallbackToPathNaming = (tables, totalBatches) => {
  // 使用文件夹路径命名，让浏览器自动创建文件夹结构
  let successCount = 0
  let failCount = 0
  
  for (const table of tables) {
    const aboFileName = totalBatches > 1
      ? `ABO表格/ABO表格_part${table.batchIndex}.xlsx`
      : 'ABO表格/ABO表格.xlsx'
    const urlFileName = totalBatches > 1
      ? `URL表格/URL表格_part${table.batchIndex}.csv`
      : 'URL表格/URL表格.csv'
    
    // 下载文件（浏览器会自动创建文件夹）
    // downloadFile 内部已经处理了错误，这里只统计结果
    const aboSuccess = downloadFile(table.aboTable, aboFileName)
    const urlSuccess = downloadFile(table.urlTable, urlFileName)
    
    if (aboSuccess) successCount++
    else failCount++
    
    if (urlSuccess) successCount++
    else failCount++
  }
  
  // 根据结果显示不同的提示
  if (failCount === 0) {
    ElMessage.success(`已开始下载 ${totalBatches} 份表格，浏览器会自动创建文件夹结构`)
    console.log(`📥 已开始下载 ${totalBatches} 份表格`)
  } else if (successCount > 0) {
    ElMessage.warning(`部分文件下载失败（成功 ${successCount} 个，失败 ${failCount} 个），请检查浏览器下载设置`)
    console.warn(`⚠️ 部分文件下载失败: 成功 ${successCount} 个，失败 ${failCount} 个`)
  } else {
    // 所有下载都失败，错误提示已经在 downloadFile 中显示
    ElMessage.error('所有文件下载失败，请检查浏览器是否拦截了下载')
    console.error(`❌ 所有文件下载失败`)
  }
}

// 生成所有表格
const generateAllTables = async () => {
  adCampaignStore.setGenerating(true)
  
  try {
    // ========== 步骤1：数据校验拦截（阶段七：表格生成改造） ==========
    /**
     * 校验原理：
     * 1. 所有模式都需要校验：商品ID和商品SPU的行数必须一致
     * 2. 拼图对齐模式额外校验：必须满足3:1关系（每3个商品对应1个外链）
     * 3. 校验失败时阻止生成，避免产生错误数据
     */
    
    // 1. 行数相等校验（所有模式通用）
    // 确保商品ID和商品SPU的行数一致，否则无法正确生成表格
    if (!adCampaignStore.validateRowCountMatch()) {
      // 校验失败，直接返回，不继续执行生成逻辑
      // validateRowCountMatch 内部已经显示了错误提示（ElMessageBox）
      return
    }
    
    // 2. 三倍数强校验（仅拼图对齐模式）
    // 在拼图对齐模式下，必须确保数据满足3:1关系
    // 即：商品ID数量 = 外链数量 × 3
    if (adCampaignStore.workflowMode === 'stitch_sync') {
      if (!adCampaignStore.validateStrictThree()) {
        // 校验失败，直接返回，不继续执行生成逻辑
        // validateStrictThree 内部已经显示了错误提示（ElMessageBox）
        return
      }
    }
    
    // 校验通过，继续执行生成逻辑
    console.log('✅ 数据校验通过，开始生成表格')
    
    // 先打印完整的formData
    console.log('=== 完整的formData ===')
    console.log(JSON.stringify(formData, null, 2))
    
    // 提取商品链接并处理（图片下载，视频跳过，视频将替代所有图片字段）
    const linksText = formData['商品图片链接'] || ''
    const links = linksText.split(/[\s\n,，、]/).filter(link => link.trim())
    
    // 解析行对齐字段
    const processedProductIds = formData['商品ID'] ? processMultiLineInput(formData['商品ID']) : ''
    const processedProductSpus = formData['商品SPU'] ? processMultiLineInput(formData['商品SPU']) : ''
    const processedProductImages = formData['商品图片链接'] ? processMultiLineInput(formData['商品图片链接']) : ''
    
    const productIds = processedProductIds ? processedProductIds.split('\n').map(id => id.trim()).filter(id => id.length > 0) : []
    const productSpus = processedProductSpus ? processedProductSpus.split('\n').map(spu => spu.trim()).filter(spu => spu.length > 0) : []
    const productImages = processedProductImages ? processedProductImages.split('\n').map(img => img.trim()).filter(img => img.length > 0) : []
    
    // 检测是否包含视频链接
    const hasVideoLinks = productImages.some(link => isVideoLink(link))
    const totalRows = Math.max(productIds.length, productSpus.length, productImages.length)
    
    if (links.length > 0) {
      // 检测链接类型（简单前端检测，后端会再次确认）
      const hasVideoLink = links.some(link => {
        const lowerLink = link.toLowerCase();
        // 检测视频文件扩展名
        const videoFileExts = /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv|mpeg|mpg)(\?.*)?$/i;
        // 检测视频平台域名
        const videoPlatforms = /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|douyin\.com|bilibili\.com|dailymotion\.com|facebook\.com\/watch|instagram\.com\/(p|reel))/i;
        return videoFileExts.test(lowerLink) || videoPlatforms.test(lowerLink);
      });
      
      if (hasVideoLink) {
        console.log('📹 检测到视频链接，跳过下载（视频链接不需要下载到本地，将在表格中使用视频字段替代图片字段）')
        // 视频链接不下载，直接提交给后端处理
      } else {
        // // 按图片处理，下载到本地
        // console.log('📥 检测到图片链接，开始下载到本地...')
        // const downloadResult = await downloadAllImagesToLocal(links)
        // console.log('📥 图片下载结果:', downloadResult)
      }
    }
    
    // 如果检测到视频链接且数量 > 10，则分批生成
    // if (hasVideoLinks && totalRows > MAX_ROWS_PER_TABLE) {
    //   console.log(`📹 检测到视频链接，共 ${totalRows} 条，将按每 ${MAX_ROWS_PER_TABLE} 条分批生成表格`)
    //   const batches = Math.ceil(totalRows / MAX_ROWS_PER_TABLE)
    //   const allTables = []
      
    //   // 循环生成每批表格
    //   for (let i = 0; i < batches; i++) {
    //     const startIdx = i * MAX_ROWS_PER_TABLE
    //     const endIdx = Math.min(startIdx + MAX_ROWS_PER_TABLE, totalRows)
        
    //     // 创建批次数据
    //     const batchFormData = { ...formData }
    //     batchFormData['商品图片链接'] = productImages.slice(startIdx, endIdx).join('\n')
    //     batchFormData['商品ID'] = productIds.slice(startIdx, endIdx).join('\n')
    //     batchFormData['商品SPU'] = productSpus.slice(startIdx, endIdx).join('\n')
        
    //     // 处理该批次的数据
    //     const batchData = processBatchInput(batchFormData)
    //     console.log(`准备生成第 ${i + 1}/${batches} 批表格，数据行数: ${endIdx - startIdx}`)
        
    //     // 生成该批次的表格
    //     let aboBlob = null
    //     let urlBlob = null
        
    //     if (batchData.length === 1) {
    //       // 单个数据，分别调用两个API
    //       try {
    //         const aboResponse = await axios.post('/api/ad-campaign/api/generate/abo-excel', batchData[0])
    //         if (aboResponse.data.success) {
    //           aboBlob = base64toBlob(aboResponse.data.file.data, aboResponse.data.file.mimeType)
    //         } else {
    //           throw new Error(aboResponse.data.error || 'ABO表格生成失败')
    //         }
    //       } catch (error) {
    //         console.error(`第 ${i + 1} 批 ABO表格生成失败:`, error)
    //         throw error
    //       }
          
    //       try {
    //         const urlResponse = await axios.post('/api/ad-campaign/api/generate/url-redirect-csv', batchData[0])
    //         if (urlResponse.data.success) {
    //           urlBlob = base64toBlob(urlResponse.data.file.data, urlResponse.data.file.mimeType)
    //         } else {
    //           throw new Error(urlResponse.data.error || 'URL重定向表生成失败')
    //         }
    //       } catch (error) {
    //         console.error(`第 ${i + 1} 批 URL表格生成失败:`, error)
    //         throw error
    //       }
    //     } else {
    //       // 批量数据，使用统一的批量API
    //       const response = await axios.post('/api/ad-campaign/api/generate/batch-both-tables', batchData)
    //       if (response.data.success) {
    //         aboBlob = base64toBlob(response.data.aboFile.data, response.data.aboFile.mimeType)
    //         urlBlob = base64toBlob(response.data.urlFile.data, response.data.urlFile.mimeType)
    //       } else {
    //         throw new Error(response.data.error || '批量表格生成失败')
    //       }
    //     }
        
    //     allTables.push({
    //       batchIndex: i + 1,
    //       aboTable: aboBlob,
    //       urlTable: urlBlob
    //     })
    //   }
      
    //   // 保存所有表格到文件夹
    //   await saveTablesToFolder(allTables, batches)
    //   alert(`检测到视频链接，已按每${MAX_ROWS_PER_TABLE}条分批生成${batches}份表格`)
    //   return
    // }
    
    // 处理批量输入数据（原有逻辑，用于非视频链接或视频链接 <= 10 的情况）
    const batchData = processBatchInput(formData)
    
    console.log('准备发送的批量数据:', JSON.stringify(batchData, null, 2))
    
    // 根据数据量选择API（非分批情况，也使用文件夹保存）
    let aboBlob = null
    let urlBlob = null
    
    if (batchData.length === 1) {
      // 单个数据，分别调用两个API
      try {
        // 生成ABO表格
        const aboResponse = await axios.post('/api/ad-campaign/api/generate/abo-excel', batchData[0])
        
        if (aboResponse.data.success) {
          aboBlob = base64toBlob(aboResponse.data.file.data, aboResponse.data.file.mimeType)
        } else {
          throw new Error(aboResponse.data.error || 'ABO表格生成失败')
        }
      } catch (error) {
        console.error('ABO表格生成失败:', error)
        alert('ABO表格生成失败：' + error.message)
        throw error
      }
      
      try {
        // 生成URL重定向表
        const urlResponse = await axios.post('/api/ad-campaign/api/generate/url-redirect-csv', batchData[0])
        
        if (urlResponse.data.success) {
          urlBlob = base64toBlob(urlResponse.data.file.data, urlResponse.data.file.mimeType)
        } else {
          throw new Error(urlResponse.data.error || 'URL重定向表生成失败')
        }
      } catch (error) {
        console.error('URL重定向表生成失败:', error)
        alert('URL重定向表生成失败：' + error.message)
        throw error
      }
      
    } else {
      // 批量数据，使用统一的批量API
      const response = await axios.post('/api/ad-campaign/api/generate/batch-both-tables', batchData)
      
      if (response.data.success) {
        aboBlob = base64toBlob(response.data.aboFile.data, response.data.aboFile.mimeType)
        urlBlob = base64toBlob(response.data.urlFile.data, response.data.urlFile.mimeType)
      } else {
        throw new Error(response.data.error || '批量表格生成失败')
      }
    }
    
    // 保存到文件夹（单个表格也使用文件夹保存，保持一致性）
    if (aboBlob && urlBlob) {
      await saveTablesToFolder([{
        batchIndex: 1,
        aboTable: aboBlob,
        urlTable: urlBlob
      }], 1)
      alert('所有表格生成成功！')
    }
  } catch (error) {
    console.error('生成表格时出错:', error)
    console.error('错误详情:', error.response?.data)
    
    // 根据错误类型提供更友好的提示
    let errorMessage = '生成表格时出错：'
    
    if (error.response) {
      const errorData = error.response.data
      if (errorData?.error) {
        // 直接显示后端返回的错误信息
        errorMessage = errorData.error || error.message
      } else {
        errorMessage = error.message
      }
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      errorMessage = '网络连接失败，请检查网络连接或确保API网关服务正在运行'
    } else {
      errorMessage = error.message
    }
    
    alert(errorMessage)
  } finally {
    adCampaignStore.setGenerating(false)
  }
}

// ========== 工作流模式切换 ==========

/**
 * 处理工作流模式切换
 * @param {string} mode - 模式名称：'standard' | 'stitch_sync'
 * 
 * 技术原理：
 * 1. 调用Store中的handleModeChange方法，该方法现在是异步的（返回Promise）
 * 2. Store方法会检测是否有映射数据，如果有则弹出确认对话框
 * 3. 如果用户取消，Store方法返回false，这里不需要额外处理（模式保持不变）
 */
const handleModeChange = async (mode) => {
  await adCampaignStore.handleModeChange(mode)
  // 注意：如果用户取消切换，handleModeChange返回false，但不会抛出异常
  // 因此这里不需要try-catch，模式会保持原状
}

// ========== 智能对齐逻辑（阶段三：以链接为锚点） ==========
/**
 * 处理数据对齐按钮点击（重写版 - 智能对齐）
 * 
 * 技术原理：
 * 1. 以表单外链为准（主数据源）
 * 2. 智能补全缺失的数据（从 Store 中找回）
 * 3. 自动删除多余的数据（外链不存在时）
 * 4. 保留用户手动修改的数据
 * 
 * 工作流程：
 * 1. 解析表单中的外链数组（主数据源）
 * 2. 对每个外链，查找 Store 中对应的商品信息
 * 3. 检测缺失的数据，从 Store 中补全
 * 4. 检测多余的数据，自动删除
 * 5. 保留用户修改的数据
 * 
 * 业务逻辑：
 * - 外链存在 + 商品ID/SPU缺失 → 从 Store 补全
 * - 外链不存在 + 商品ID/SPU存在 → 删除多余数据
 * - 外链存在 + 商品ID/SPU已修改 → 保留用户修改
 */
const handleAlignData = () => {
  // 只在拼图对齐模式下执行
  if (adCampaignStore.workflowMode !== 'stitch_sync') {
    ElMessage.warning('请先切换到拼图对齐模式')
    return
  }
  
  // ========== 步骤1：解析表单中的外链（主数据源） ==========
  /**
   * 技术要点：
   * 1. 从表单中提取外链数组
   * 2. 这是"以链接为锚点"的核心：以表单为准
   */
  const formLinksText = formData['商品图片链接'] || ''
  const formLinks = formLinksText
    .split('\n')
    .map(link => link.trim())
    .filter(link => link.length > 0)
  
  if (formLinks.length === 0) {
    ElMessage.warning('请先同步外链或输入商品图片链接')
    return
  }
  
  // ========== 步骤2：解析表单中的商品ID和SPU（位置敏感型解析） ==========
  /**
   * 核心优化：补齐数组长度，确保不因用户删除行而产生索引偏移
   * 
   * 技术原理：
   * 1. 先计算预期的商品数量（外链数量 × 3）
   * 2. 解析表单数据，补齐到预期长度
   * 3. 这样无论用户如何删除，数组长度都是固定的，索引计算永远正确
   * 
   * 为什么这样设计：
   * - textarea 的特性：用户按退格键删除整行后，数组长度会真实缩短
   * - 如果依赖原始数组长度，删除中间的行会导致后续索引错乱
   * - 补齐到预期长度后，使用位置索引（startIndex + i）就永远不会出错
   */
  const expectedProductCount = formLinks.length * 3
  
  /**
   * 位置敏感型解析函数
   * 补齐数组长度到预期值，确保位置索引计算正确
   * 
   * @param {string} text - 表单文本内容
   * @param {number} expectedTotal - 预期的总行数
   * @returns {Array<string>} 补齐后的数组
   */
  const parseFormSection = (text, expectedTotal) => {
    const lines = text
      .split('\n')
      .map(line => line.trim())
    
    // 关键：补齐长度，确保用户删掉末尾行时，数组长度不缩短
    // 如果用户删除了中间的行，这里会保留空字符串，位置索引仍然正确
    while (lines.length < expectedTotal) {
      lines.push('')
    }
    
    // 截取到预期长度（防止用户输入了过多行）
    return lines.slice(0, expectedTotal)
  }
  
  // 使用位置敏感型解析，补齐到预期长度
  const currentIds = parseFormSection(formData['商品ID'] || '', expectedProductCount)
  const currentSpus = parseFormSection(formData['商品SPU'] || '', expectedProductCount)
  
  // ========== 步骤3：获取 Store 中的映射数据（辅助数据源） ==========
  const storeExternalLinks = adCampaignStore.productDataMapping?.externalLinks || []
  const linkToProductInfoMap = new Map()
  
  // 构建外链到商品信息的映射
  storeExternalLinks.forEach((linkRecord) => {
    const { externalLink, productInfo } = linkRecord
    const normalizedLink = normalizeUrl(externalLink)
    
    if (productInfo && productInfo.length === 3) {
      linkToProductInfoMap.set(normalizedLink, productInfo)
    }
  })
  
  // ========== 步骤4：智能对齐 - 以表单外链为准（位置敏感型） ==========
  /**
   * 核心逻辑（优化版）：
   * 1. 遍历表单中的每个外链
   * 2. 使用位置索引（startIndex + i）获取对应的商品数据
   * 3. 同时检查 ID 和 SPU，如果其中一个为空，补全
   * 4. 保留用户修改的数据
   */
  const alignedIds = []
  const alignedSpus = []
  const alignedLinks = []
  
  let filledCount = 0  // 补全的数量
  let keptCount = 0     // 保留的数量
  
  formLinks.forEach((formLink, groupIndex) => {
    const normalizedFormLink = normalizeUrl(formLink)
    const productInfo = linkToProductInfoMap.get(normalizedFormLink)
    
    console.log(`🔍 [对齐] 处理外链 ${groupIndex + 1}:`, {
      formLink,
      normalizedFormLink,
      hasProductInfo: !!productInfo,
      productInfoLength: productInfo?.length || 0
    })
    
    // 计算这组数据在表单中的起始位置
    const startIndex = groupIndex * 3
    
    if (productInfo && productInfo.length === 3) {
      // Store 中有这个外链的记录
      for (let i = 0; i < 3; i++) {
        const pos = startIndex + i  // 使用位置索引，而不是 slice
        
        // 从补齐后的数组中获取对应位置的数据
        const formId = currentIds[pos] || ''
        const formSpu = currentSpus[pos] || ''
        
        const expectedInfo = productInfo[i]
        const expectedId = expectedInfo.productId
        const expectedSpu = expectedInfo.productSpu
        
        // 修复问题1 & 2：同时检查 ID 和 SPU
        const isIdEmpty = !formId || formId.trim() === ''
        const isSpuEmpty = !formSpu || formSpu.trim() === ''
        
        if (isIdEmpty || isSpuEmpty) {
          // 缺失：从 Store 中补全（只有缺失时才补全，已有的保留）
          alignedIds.push(isIdEmpty ? expectedId : formId)
          alignedSpus.push(isSpuEmpty ? expectedSpu : formSpu)
          filledCount++
          console.log(`🔧 [对齐] 位置 ${pos}: 补全缺失数据`, {
            formId: formId || '(空)',
            formSpu: formSpu || '(空)',
            expectedId,
            expectedSpu
          })
        } else if (formId !== expectedId || formSpu !== expectedSpu) {
          // 已修改：用 Store 的数据替换，实现对齐
          // 注意：这是"对齐"操作，应该用 Store 的数据替换表单数据，让它们对齐
          alignedIds.push(expectedId)
          alignedSpus.push(expectedSpu)
          keptCount++
          console.log(`🔄 [对齐] 位置 ${pos}: 替换已修改数据`, {
            formId,
            formSpu,
            expectedId,
            expectedSpu
          })
        } else {
          // 匹配：使用表单数据（或 Store 数据都可以，因为它们一致）
          alignedIds.push(formId)
          alignedSpus.push(formSpu)
        }
      }
      
      alignedLinks.push(formLink)
    } else {
      // Store 中没有这个外链的记录（用户手动添加的）
      // 保留用户输入的数据
      for (let i = 0; i < 3; i++) {
        const pos = startIndex + i
        alignedIds.push(currentIds[pos] || '')
        alignedSpus.push(currentSpus[pos] || '')
      }
      
      alignedLinks.push(formLink)
    }
  })
  
  // ========== 步骤5：清理多余的数据 ==========
  /**
   * 核心逻辑：
   * 1. alignedIds 和 alignedSpus 的长度应该等于 expectedProductCount
   * 2. 如果超过，截取到正确长度
   * 3. 如果不足，补齐空行（理论上不会发生，因为我们已经补齐了）
   */
  // 确保对齐后的数据数量正确
  while (alignedIds.length < expectedProductCount) {
    alignedIds.push('')
  }
  while (alignedSpus.length < expectedProductCount) {
    alignedSpus.push('')
  }
  
  // 截取到正确的数量（防止意外情况）
  alignedIds.splice(expectedProductCount)
  alignedSpus.splice(expectedProductCount)
  
  // ========== 步骤6：更新表单 ==========
  console.log('📊 [对齐] 对齐结果统计:', {
    alignedIdsLength: alignedIds.length,
    alignedSpusLength: alignedSpus.length,
    alignedLinksLength: alignedLinks.length,
    expectedProductCount,
    filledCount,
    keptCount,
    alignedIds: alignedIds.slice(0, 9),  // 只显示前9个
    alignedSpus: alignedSpus.slice(0, 9)  // 只显示前9个
  })
  
  const oldIds = formData['商品ID']
  const oldSpus = formData['商品SPU']
  const newIds = alignedIds.join('\n')
  const newSpus = alignedSpus.join('\n')
  
  console.log('🔄 [对齐] 更新前:', {
    oldIdsLength: oldIds.split('\n').filter(id => id.trim()).length,
    oldSpusLength: oldSpus.split('\n').filter(spu => spu.trim()).length
  })
  
  formData['商品ID'] = newIds
  formData['商品SPU'] = newSpus
  formData['商品图片链接'] = alignedLinks.join('\n')
  
  console.log('✅ [对齐] 更新后:', {
    newIdsLength: newIds.split('\n').filter(id => id.trim()).length,
    newSpusLength: newSpus.split('\n').filter(spu => spu.trim()).length,
    idsChanged: oldIds !== newIds,
    spusChanged: oldSpus !== newSpus
  })
  
  // ========== 步骤7：反馈结果 ==========
  const messages = []
  if (filledCount > 0) {
    messages.push(`补全了 ${filledCount} 个缺失的商品数据`)
  }
  if (keptCount > 0) {
    messages.push(`对齐了 ${keptCount} 个不匹配的商品数据`)
  }
  if (messages.length === 0) {
    ElMessage.success('数据对齐完成，所有数据已匹配')
  } else {
    ElMessage.success(`数据对齐完成：${messages.join('，')}`)
  }
  
  console.log('✅ [智能对齐] 对齐完成', {
    totalGroups: formLinks.length,
    filledCount,
    keptCount,
    idsChanged: oldIds !== newIds,
    spusChanged: oldSpus !== newSpus
  })
}

// ========== 实时监听文本框变化（阶段一：以链接为锚点的动态校验） ==========
/**
 * 防抖工具函数
 * 
 * 技术原理：
 * 1. 防抖（Debounce）是一种性能优化技术
 * 2. 当事件频繁触发时，只在停止触发后的一段时间内执行一次
 * 3. 例如：用户快速输入时，不会每次都触发 watch，而是等用户停止输入 300ms 后再触发
 * 
 * 实现原理：
 * - 使用 setTimeout 延迟执行
 * - 每次调用时，清除之前的定时器
 * - 只有最后一次调用会在延迟后执行
 * 
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒），默认 300ms
 * @returns {Function} 防抖后的函数
 * 
 * 使用示例：
 * const debouncedUpdate = debounce(() => {
 *   console.log('用户停止输入了')
 * }, 300)
 * 
 * // 快速调用多次，只会在最后一次调用后 300ms 执行一次
 * debouncedUpdate()  // 不会执行
 * debouncedUpdate()  // 不会执行
 * debouncedUpdate()  // 300ms 后执行
 */
const debounce = (func, delay = 300) => {
  let timeoutId = null
  
  return function(...args) {
    // 清除之前的定时器
    // 如果用户在延迟时间内再次触发，之前的定时器会被取消
    clearTimeout(timeoutId)
    
    // 设置新的定时器
    // 只有在 delay 时间内没有再次触发，才会执行函数
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * 实时更新对齐状态
 * 
 * 技术原理：
 * 1. 这个函数会在表单数据变化时被调用
 * 2. 由于 alignmentStatus 是 computed，它会自动重新计算
 * 3. 但我们需要确保 computed 的依赖包含表单数据
 * 
 * 当前实现：
 * - 打印日志，方便调试
 * - 后续阶段会在这里添加更复杂的逻辑
 * 
 * @param {string} field - 变化的字段名称
 * @param {string} newValue - 新值
 * @param {string} oldValue - 旧值
 */
const updateAlignmentStatusOnChange = (field, newValue, oldValue) => {
  // 只在拼图对齐模式下处理
  if (adCampaignStore.workflowMode !== 'stitch_sync') {
    return
  }
  
  console.log(`🔄 [实时监听] ${field} 发生变化:`, {
    oldValue: oldValue?.substring(0, 50) + '...',  // 只显示前50个字符
    newValue: newValue?.substring(0, 50) + '...',
    oldLength: oldValue?.split('\n').filter(v => v.trim()).length || 0,
    newLength: newValue?.split('\n').filter(v => v.trim()).length || 0
  })
  
  // 注意：alignmentStatus 是 computed，会自动重新计算
  // 但我们需要确保它依赖表单数据（后续阶段会优化）
}

/**
 * 创建防抖后的更新函数
 * 
 * 技术原理：
 * 1. 使用 debounce 包装 updateAlignmentStatusOnChange
 * 2. 延迟时间设置为 300ms，平衡响应速度和性能
 * 3. 用户快速输入时，不会频繁触发更新
 */
const debouncedUpdateAlignmentStatus = debounce(updateAlignmentStatusOnChange, 300)

// ========== 对齐状态预览（阶段二：以链接为锚点的动态校验） ==========
/**
 * 计算对齐状态（重写版 - 以表单外链为准）
 * 
 * 技术原理：
 * 1. computed 是 Vue 3 的响应式计算属性
 * 2. 它会自动追踪依赖（formData、workflowMode、productDataMapping）
 * 3. 当依赖变化时，computed 会自动重新计算
 * 
 * 核心改进（阶段二）：
 * 1. 以表单外链为准（主数据源），而不是 Store 中的 externalLinks
 * 2. 实时检测表单数据，反映用户的真实操作
 * 3. 检测三种状态：匹配、缺失、修改
 * 
 * 工作流程：
 * 1. 解析表单中的外链数组（主数据源）
 * 2. 对每个外链，查找 Store 中对应的商品信息
 * 3. 对比表单数据和 Store 数据，检测状态
 * 4. 返回对齐状态对象
 * 
 * @returns {Object|null} 对齐状态对象，包含：
 *   - totalGroups: 总组数（基于表单外链）
 *   - alignedCount: 已对齐组数
 *   - incompleteCount: 不完整组数
 *   - unmatchedCount: 未匹配商品数
 *   - missingCount: 缺失商品数（新增）
 *   - modifiedCount: 已修改商品数（新增）
 *   - allAligned: 是否全部对齐
 *   - groups: 每组详细信息数组
 *   - formLinksNotInMapping: 表单中有但 Store 中没有的外链（新增）
 */
const alignmentStatus = computed(() => {
  // 只在拼图对齐模式下显示对齐预览
  if (adCampaignStore.workflowMode !== 'stitch_sync') {
    return null
  }
  
  // ========== 步骤1：解析表单中的外链（主数据源） ==========
  /**
   * 技术要点：
   * 1. 从表单中提取外链数组
   * 2. 过滤空行和空白字符
   * 3. 这是"以链接为锚点"的核心：以表单为准
   */
  const formLinksText = formData['商品图片链接'] || ''
  const formLinks = formLinksText
    .split('\n')
    .map(link => link.trim())
    .filter(link => link.length > 0)
  
  // 如果没有外链，返回空状态
  if (formLinks.length === 0) {
    return {
      totalGroups: 0,
      alignedCount: 0,
      incompleteCount: 0,
      unmatchedCount: 0,
      missingCount: 0,
      modifiedCount: 0,
      allAligned: false,
      groups: [],
      formLinksNotInMapping: []
    }
  }
  
  // ========== 步骤2：解析表单中的商品ID和SPU（位置敏感型解析） ==========
  /**
   * 核心优化：补齐数组长度，不过滤空值，保持位置对应关系
   * 
   * 技术要点：
   * 1. 计算预期的商品数量（外链数量 × 3）
   * 2. 解析表单数据，补齐到预期长度
   * 3. 不过滤空值，保留空行（空行表示缺失）
   * 4. 这样位置索引计算永远正确，不会因为用户删除行而错乱
   */
  const expectedProductCount = formLinks.length * 3
  
  /**
   * 位置敏感型解析函数（与 handleAlignData 保持一致）
   * 补齐数组长度到预期值，确保位置索引计算正确
   */
  const parseFormSection = (text, expectedTotal) => {
    const lines = text
      .split('\n')
      .map(line => line.trim())
    
    // 关键：补齐长度，不过滤空值
    while (lines.length < expectedTotal) {
      lines.push('')
    }
    
    // 截取到预期长度
    return lines.slice(0, expectedTotal)
  }
  
  // 使用位置敏感型解析，补齐到预期长度（不过滤空值）
  const formIds = parseFormSection(formData['商品ID'] || '', expectedProductCount)
  const formSpus = parseFormSection(formData['商品SPU'] || '', expectedProductCount)
  
  // ========== 步骤3：获取 Store 中的映射数据（辅助数据源） ==========
  /**
   * 技术要点：
   * 1. Store 中的 externalLinks 是辅助数据源
   * 2. 用于查找外链对应的商品信息
   * 3. 但不作为主数据源（表单才是主数据源）
   */
  const storeExternalLinks = adCampaignStore.productDataMapping?.externalLinks || []
  const imageToProduct = adCampaignStore.productDataMapping?.imageToProduct || {}
  
  // ========== 步骤4：构建外链到商品信息的映射（从 Store 中查找） ==========
  /**
   * 技术要点：
   * 1. 创建一个映射表：外链 → 商品信息
   * 2. 用于快速查找表单外链对应的商品信息
   */
  const linkToProductInfoMap = new Map()
  
  storeExternalLinks.forEach((linkRecord) => {
    const { externalLink, productInfo } = linkRecord
    const normalizedLink = normalizeUrl(externalLink)
    
    // 如果外链有商品信息，存储到映射表中
    if (productInfo && productInfo.length === 3) {
      linkToProductInfoMap.set(normalizedLink, productInfo)
    }
  })
  
  // ========== 步骤5：以表单外链为准，检测对齐状态 ==========
  /**
   * 核心逻辑：
   * 1. 遍历表单中的每个外链（主数据源）
   * 2. 查找 Store 中对应的商品信息（辅助数据源）
   * 3. 对比表单数据和 Store 数据，检测状态
   */
  const groups = []
  const formLinksNotInMapping = []
  
  formLinks.forEach((formLink, groupIndex) => {
    const normalizedFormLink = normalizeUrl(formLink)
    
    // 在 Store 中查找这个外链对应的商品信息
    const productInfo = linkToProductInfoMap.get(normalizedFormLink)
    
    // 如果 Store 中没有这个外链的记录，标记为"不在映射表中"
    if (!productInfo) {
      formLinksNotInMapping.push(formLink)
      
      // 即使不在映射表中，也要显示在预览表中
      // 计算这组数据在表单中的起始位置
      const startIndex = groupIndex * 3
      
      // 构建商品信息（没有 Store 数据，只能显示表单数据）
      // 使用位置索引获取，而不是 slice
      const products = []
      for (let i = 0; i < 3; i++) {
        const pos = startIndex + i  // 使用位置索引
        
        // 从补齐后的数组中获取对应位置的数据
        const formId = formIds[pos] || ''
        const formSpu = formSpus[pos] || ''
        
        products.push({
          status: formId ? 'unknown' : 'missing',  // 未知状态或缺失
          id: formId || null,
          spu: formSpu || null,
          expectedId: null,  // Store 中没有数据
          expectedSpu: null
        })
      }
      
      groups.push({
        externalLink: formLink,
        formLink: formLink,
        linkMatched: false,  // 外链不在映射表中
        products,
        matched: 0,  // 无法匹配（没有 Store 数据）
        complete: false,
        hasDifference: true  // 有差异（不在映射表中）
      })
      
      return  // 继续处理下一个外链
    }
    
    // ========== 步骤6：检测商品信息的状态（位置敏感型） ==========
    /**
     * 核心逻辑（优化版）：
     * 1. 计算这组数据在表单中的起始位置（每个外链对应3个商品）
     * 2. 使用位置索引（startIndex + i）获取对应的商品数据
     * 3. 同时检查 ID 和 SPU，检测状态
     * 4. 对比 Store 中的商品信息，检测状态
     */
    const startIndex = groupIndex * 3
    
    // 构建商品信息数组，检测每个商品的状态
    const products = []
    let matchedCount = 0
    let missingCount = 0
    let modifiedCount = 0
    
    for (let i = 0; i < 3; i++) {
      const pos = startIndex + i  // 使用位置索引，而不是 slice
      
      // 从补齐后的数组中获取对应位置的数据
      const formId = formIds[pos] || ''
      const formSpu = formSpus[pos] || ''
      
      const expectedInfo = productInfo[i]
      const expectedId = expectedInfo.productId
      const expectedSpu = expectedInfo.productSpu
      
      // 检测状态：缺失、修改、匹配（同时检查 ID 和 SPU）
      let status = 'matched'  // 默认匹配
      
      const isIdEmpty = !formId || formId.trim() === ''
      const isSpuEmpty = !formSpu || formSpu.trim() === ''
      
      if (isIdEmpty || isSpuEmpty) {
        status = 'missing'  // 缺失：ID 或 SPU 为空
        missingCount++
      } else if (formId !== expectedId || formSpu !== expectedSpu) {
        status = 'modified'  // 修改：表单中的值与 Store 不一致
        modifiedCount++
      } else {
        status = 'matched'  // 匹配：表单中的值与 Store 一致
        matchedCount++
      }
      
      products.push({
        status,  // 'matched' | 'missing' | 'modified'
        id: formId || null,
        spu: formSpu || null,
        expectedId,  // Store 中的期望值
        expectedSpu
      })
    }
    
    // 检测外链是否匹配
    const linkMatched = true  // 外链在映射表中，视为匹配
    
    // 判断这组是否完整（3个商品都匹配）
    const complete = matchedCount === 3 && linkMatched
    
    groups.push({
      externalLink: formLink,  // Store 中的外链（用于显示）
      formLink: formLink,      // 表单中的外链（实际数据）
      linkMatched,
      products,
      matched: matchedCount,
      missing: missingCount,
      modified: modifiedCount,
      complete,
      hasDifference: missingCount > 0 || modifiedCount > 0  // 是否有差异
    })
  })
  
  // ========== 步骤7：统计信息 ==========
  const alignedCount = groups.filter(g => g.complete).length
  const incompleteCount = groups.filter(g => !g.complete && (g.matched > 0 || g.missing > 0 || g.modified > 0)).length
  const unmatchedCount = groups.reduce((sum, g) => {
    return sum + g.products.filter(p => p.status === 'missing').length
  }, 0)
  const totalMissingCount = groups.reduce((sum, g) => sum + (g.missing || 0), 0)
  const totalModifiedCount = groups.reduce((sum, g) => sum + (g.modified || 0), 0)
  
  return {
    totalGroups: groups.length,
    alignedCount,
    incompleteCount,
    unmatchedCount,
    missingCount: totalMissingCount,  // 新增：缺失商品总数
    modifiedCount: totalModifiedCount,  // 新增：已修改商品总数
    allAligned: alignedCount === groups.length && groups.length > 0 && formLinksNotInMapping.length === 0,
    groups,
    formLinksNotInMapping  // 新增：表单中有但 Store 中没有的外链
  }
})

/**
 * 折叠/展开状态控制
 * 使用 ref 创建响应式状态，默认折叠（false）
 * 
 * 技术原理：
 * 1. ref 创建响应式引用，初始值为 false（折叠状态）
 * 2. 点击头部时切换状态，触发视图更新
 * 3. 使用 v-show 控制预览列表显示，性能优于 v-if（因为只是切换显示，不需要重新创建DOM）
 */
const isPreviewExpanded = ref(false) // 默认折叠

/**
 * 切换预览表展开/折叠状态
 */
const togglePreview = () => {
  isPreviewExpanded.value = !isPreviewExpanded.value
}

// ========== Excel导入功能 ==========

/**
 * 处理Excel导入按钮点击
 * 触发文件选择器
 */
const handleExcelImport = () => {
  // 创建隐藏的文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processExcelImport(file)
    }
  }
  input.click()
}

/**
 * 解析Excel文件
 * @param {File} file - Excel文件对象
 */
const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Excel文件解析失败：' + error.message))
      }
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    reader.readAsBinaryString(file)
  })
}

/**
 * 自动识别表头
 * 识别商品ID、商品SPU、商品主图、商品属性*等列
 * @param {Object} firstRow - Excel第一行数据（表头行）
 * @returns {Object} 识别到的表头映射 { productId: '商品ID', productSpu: '商品SPU', ... }
 */
const autoDetectHeaders = (firstRow) => {
  const headers = {}
  const keys = Object.keys(firstRow)
  
  // 定义要识别的表头及其可能的名称
  const headerPatterns = {
    productId: ['商品ID', '商品id', '商品 Id', 'productid', 'product id'],
    productSpu: ['商品SPU', '商品spu', '商品 Spu', 'productspu', 'product spu'],
    productImage: ['商品主图', '商品主圖', '主图', '主圖', 'productmainimage', 'product main image'],
    productAttribute: ['商品属性*', '商品屬性*', '商品属性', '商品屬性', 'productattribute', 'product attribute']
  }
  
  // 遍历所有列，查找匹配的表头
  keys.forEach(key => {
    const normalizedKey = String(key).trim()
    
    // 检查每个模式
    Object.keys(headerPatterns).forEach(patternKey => {
      headerPatterns[patternKey].forEach(pattern => {
        if (normalizedKey === pattern || normalizedKey.includes(pattern)) {
          headers[patternKey] = key
        }
      })
    })
  })
  
  return headers
}

/**
 * 检查必需表头是否存在
 * @param {Object} headers - 识别到的表头映射
 * @returns {Array} 缺失的表头数组
 */
const checkRequiredHeaders = (headers) => {
  const required = ['productId', 'productSpu', 'productImage', 'productAttribute']
  return required.filter(key => !headers[key])
}

/**
 * 显示手动映射对话框
 * @param {Object} firstRow - Excel第一行数据
 * @param {Array} missingHeaders - 缺失的表头数组
 * @returns {Promise<Object>} 用户手动映射的结果
 */
const showManualMappingDialog = (firstRow, missingHeaders) => {
  return new Promise((resolve) => {
    const keys = Object.keys(firstRow)
    const headerLabels = {
      productId: '商品ID',
      productSpu: '商品SPU',
      productImage: '商品主图',
      productAttribute: '商品属性*'
    }
    
    // 构建提示信息
    let message = '无法自动识别以下表头，请手动选择：\n\n'
    missingHeaders.forEach(key => {
      message += `${headerLabels[key]}: 需要从Excel列中选择\n`
    })
    message += '\n可用列：\n' + keys.slice(0, 10).join(', ') + (keys.length > 10 ? '...' : '')
    
    ElMessageBox.confirm(
      message,
      '表头识别失败',
      {
        confirmButtonText: '手动映射',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      // 这里可以扩展为更复杂的对话框，让用户选择每个表头对应的列
      // 暂时返回null，表示用户取消
      resolve(null)
    }).catch(() => {
      resolve(null)
    })
  })
}

/**
 * 显示导入预览对话框
 * @param {Object} extractedData - 提取的数据 { productIds, productSpus, productImages }
 * @returns {Promise<boolean>} 用户是否确认导入
 */
const showImportPreviewDialog = (extractedData) => {
  return new Promise((resolve) => {
    const count = extractedData.productIds.length
    const previewText = `将导入 ${count} 条数据\n\n` +
      `商品ID: ${count} 个\n` +
      `商品SPU: ${count} 个\n` +
      `商品主图: ${count} 个\n\n` +
      `前3条数据预览：\n` +
      `1. ID: ${extractedData.productIds[0] || '-'}, SPU: ${extractedData.productSpus[0] || '-'}\n` +
      `2. ID: ${extractedData.productIds[1] || '-'}, SPU: ${extractedData.productSpus[1] || '-'}\n` +
      `3. ID: ${extractedData.productIds[2] || '-'}, SPU: ${extractedData.productSpus[2] || '-'}`
    
    ElMessageBox.confirm(
      previewText,
      '导入预览',
      {
        confirmButtonText: '确认导入',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).then(() => {
      resolve(true)
    }).catch(() => {
      resolve(false)
    })
  })
}

/**
 * 处理Excel导入
 * @param {File} file - Excel文件对象
 */
const processExcelImport = async (file) => {
  try {
    ElMessage.info('正在解析Excel文件...')
    
    // 1. 解析Excel文件
    const jsonData = await parseExcelFile(file)
    
    if (!jsonData || jsonData.length === 0) {
      ElMessage.error('Excel文件为空或格式不正确')
      return
    }
    
    // 2. 自动识别表头
    const firstRow = jsonData[0] || {}
    const headers = autoDetectHeaders(firstRow)
    
    // 3. 检查必需表头
    const missingHeaders = checkRequiredHeaders(headers)
    
    if (missingHeaders.length > 0) {
      // 4. 手动映射（暂时提示用户）
      ElMessage.warning(`无法自动识别表头：${missingHeaders.join(', ')}，请确保Excel文件包含正确的表头`)
      return
    }
    
    // 5. 处理数据
    processExcelDataWithHeaders(jsonData, headers)
    
  } catch (error) {
    console.error('Excel导入失败:', error)
    ElMessage.error('Excel导入失败：' + error.message)
  }
}

/**
 * 使用识别到的表头处理Excel数据
 * @param {Array} jsonData - Excel数据数组
 * @param {Object} headers - 表头映射
 */
const processExcelDataWithHeaders = (jsonData, headers) => {
  // 1. 筛选"商品属性*"为"M"的行
  const filteredData = jsonData.filter(row => {
    const attrValue = String(row[headers.productAttribute] || '').trim().toUpperCase()
    return attrValue === 'M'
  })
  
  if (filteredData.length === 0) {
    ElMessage.warning('没有找到商品属性*为"M"的数据')
    return
  }
  
  // 2. 提取数据
  const extractedData = {
    productIds: [],
    productSpus: [],
    productImages: []
  }
  
  filteredData.forEach(row => {
    const id = String(row[headers.productId] || '').trim()
    const spu = String(row[headers.productSpu] || '').trim()
    let image = String(row[headers.productImage] || '').trim()
    
    // 如果商品主图有多个URL（用分隔符分隔），只取第一个
    if (image.includes(',') || image.includes('，') || image.includes(';')) {
      image = image.split(/[,，;]/)[0].trim()
    }
    
    if (id && spu && image) {
      extractedData.productIds.push(id)
      extractedData.productSpus.push(spu)
      extractedData.productImages.push(image) // 存储原始URL
    }
  })
  
  // 3. 行数一致性检查
  if (extractedData.productIds.length !== extractedData.productSpus.length ||
      extractedData.productIds.length !== extractedData.productImages.length) {
    ElMessage.error('提取的数据行数不一致，请检查Excel文件')
    return
  }
  
  if (extractedData.productIds.length === 0) {
    ElMessage.warning('没有提取到有效数据')
    return
  }
  
  // 4. 显示预览对话框
  showImportPreviewDialog(extractedData).then(confirmed => {
    if (confirmed) {
      // 5. 确认后填充表单
      formData['商品ID'] = extractedData.productIds.join('\n')
      formData['商品SPU'] = extractedData.productSpus.join('\n')
      formData['商品图片链接'] = extractedData.productImages.join('\n')
      
      // 6. 建立映射（使用归一化URL）
      const normalizedImages = extractedData.productImages.map(img => normalizeUrl(img))
      
      adCampaignStore.buildImageToProductMapping(
        extractedData.productIds,
        extractedData.productSpus,
        normalizedImages
      )
      
      // 7. 扫描素材库并打标签（使用原始URL进行匹配）
      adCampaignStore.scanAndTagMaterials(
        extractedData.productIds,
        extractedData.productSpus,
        extractedData.productImages
      )
      
      // 8. 标记同步来源（注意：syncSource是ref，需要通过.value访问）
      // 但store已经暴露了syncSource，可以直接赋值
      adCampaignStore.syncSource = 'excel'
      
      ElMessage.success(`成功导入 ${extractedData.productIds.length} 条数据`)
    }
  })
}

onMounted(async () => {
  console.log('页面初始化完成')
  console.log('初始进阶赋能型受众模式:关闭')
  toggleAdvancedAudience()
  
  // 输出轮播视频模式的初始状态
  console.log('🎬 [AdCampaign] 轮播视频模式初始状态:', {
    enabled: formData['轮播视频模式'],
    type: typeof formData['轮播视频模式']
  })

  // 监听轮播视频模式的变化
  watch(() => formData['轮播视频模式'], (newValue, oldValue) => {
    console.log('🎬 [AdCampaign] 轮播视频模式状态改变:', {
      oldValue: oldValue,
      newValue: newValue,
      type: typeof newValue,
      timestamp: new Date().toISOString()
    })
    console.log(`🎬 [AdCampaign] ${newValue ? '✅ 已启用轮播视频模式' : '❌ 已禁用轮播视频模式'} - 商品ID和商品SPU将${newValue ? '按3个一组处理' : '按原有逻辑处理'}`)
  }, { immediate: true })

  // 图片同步功能已移除（不再同步到视频服务的可变部分）
  
  // 添加全局点击监听器，实现点击外部关闭下拉菜单
  document.addEventListener('click', (event) => {
    const countryDropdown = document.getElementById('countryDropdown')
    const countryTrigger = document.querySelector('.dropdown-container .dropdown-trigger')
    const excludeCountryDropdown = document.getElementById('excludeCountryDropdown')
    const excludeCountryTrigger = document.getElementById('excludeCountryTrigger')
    
    // 检查投放国家下拉菜单
    if (countryDropdown && countryDropdown.style.display === 'block') {
      if (!countryTrigger.contains(event.target) && !countryDropdown.contains(event.target)) {
        closeCountryDropdown()
      }
    }
    
    // 检查排除国家下拉菜单
    if (excludeCountryDropdown && excludeCountryDropdown.style.display === 'block') {
      if (!excludeCountryTrigger.contains(event.target) && !excludeCountryDropdown.contains(event.target)) {
        closeExcludeCountryDropdown()
      }
    }
  })
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.ad-campaign-page {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 15px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  text-align: center;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.header p {
  font-size: 1.2em;
  opacity: 0.9;
}

.form-container {
  padding: 40px;
}

.form-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 1.5em;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #667eea;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  z-index: 1;
  pointer-events: none;
}

.prefixed-input {
  padding-left: 35px !important;
  width: 100%;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group small {
  margin-top: 5px;
  color: #666;
  font-size: 12px;
}

.form-help {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  padding: 8px 0;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  transition: all 0.3s ease;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark {
  background-color: #667eea;
  border-color: #667eea;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label:hover .checkmark {
  border-color: #667eea;
}

.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  cursor: pointer;
  background: white;
  transition: border-color 0.3s ease;
}

.dropdown-trigger:hover,
.dropdown-trigger.active {
  border-color: #667eea;
}

.dropdown-arrow {
  transition: transform 0.3s ease;
}

.dropdown-trigger.active .dropdown-arrow {
  transform: rotate(180deg);
}

.checkbox-container {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e1e5e9;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
}

.search-container {
  padding: 10px;
  border-bottom: 1px solid #e1e5e9;
  margin-bottom: 10px;
}

.search-container input {
  width: 70%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

.add-country-btn {
  background-color: #667eea;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.add-country-btn:hover {
  background-color: #5a6fd8;
}

.country-section {
  margin-bottom: 15px;
}

.section-title {
  font-weight: bold;
  color: #333;
  padding: 8px 0;
  border-bottom: 1px solid #e1e5e9;
  margin-bottom: 10px;
}

.checkbox-item {
  padding: 5px 10px;
}

.dropdown-actions {
  padding: 10px;
  border-top: 1px solid #e1e5e9;
  display: flex;
  justify-content: space-between;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background-color: #667eea;
  color: white;
}

.btn-cancel:hover {
  background-color: #e5e5e5;
}

.btn-confirm:hover {
  background-color: #5a6fd8;
}

.loading {
  display: none;
  text-align: center;
  padding: 20px;
}

.loading.show {
  display: block;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.button-group {
  text-align: center;
  margin-top: 30px;
}

.btn {
  padding: 15px 40px;
  font-size: 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-primary:hover {
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.required {
  color: #e74c3c;
}

/* ========== 对齐预览表样式（阶段六） ========== */
/**
 * 对齐预览表容器
 * 使用浅灰色背景，圆角边框，增加视觉层次感
 */
.alignment-preview {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

/**
 * 预览表头部
 * 使用 flex 布局，左右分布标题和状态标签
 * 添加可点击样式和折叠/展开图标
 */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none; /* 禁止选中文本 */
}

.preview-header:hover {
  background-color: #f0f2f5;
}

.preview-header.header-collapsed {
  margin-bottom: 0;
  border-bottom: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  font-size: 16px;
  color: #909399;
  transition: transform 0.3s ease;
}

.expand-icon.icon-expanded {
  transform: rotate(0deg);
}

.preview-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

/**
 * 预览列表容器
 * 使用 flex 纵向布局，每个卡片之间有间距
 * 注意：margin-bottom 已移到上方，因为统计信息现在在预览列表下方
 */

/**
 * 预览项（每个外链组）
 * 白色背景，圆角边框，根据对齐状态显示不同颜色边框
 */
.preview-item {
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
}

/* 已对齐：绿色边框 */
.preview-item.item-complete {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

/* 部分对齐：黄色边框 */
.preview-item.item-incomplete {
  border-color: #e6a23c;
  background-color: #fef9e7;
}

/* 未对齐：红色边框 */
.preview-item.item-unmatched {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

/**
 * 项头部：显示外链序号和匹配状态
 */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-header-right {
  display: flex;
  align-items: center;
}

/* 有差异的预览项：黄色边框 */
.preview-item.item-has-difference {
  border-color: #e6a23c;
  background-color: #fef9e7;
}

.item-index {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

/**
 * 外链预览
 * 使用小字体，灰色，自动换行，超出部分显示省略号
 */
.link-preview {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

/**
 * 商品信息预览容器
 * 使用 flex 横向布局，3个商品并排显示
 */
.products-preview {
  display: flex;
  gap: 8px;
}

/**
 * 商品信息框
 * 每个商品占 1/3 宽度，居中显示
 */
.product-box {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #e4e7ed;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.3s ease;
}

/* ========== 商品状态样式（阶段二：三种状态） ========== */
/**
 * 匹配状态：绿色
 * 表单数据与 Store 数据一致
 */
.product-box.product-matched {
  background-color: #f0f9ff;
  border-color: #67c23a;
  position: relative;
}

/* 缺失状态：红色 */
.product-box.product-missing {
  background-color: #fef0f0;
  border-color: #f56c6c;
  opacity: 0.9;
  position: relative;
}

/* 修改状态：黄色 */
.product-box.product-modified {
  background-color: #fef9e7;
  border-color: #e6a23c;
  position: relative;
}

/* 未知状态：灰色（外链不在映射表中） */
.product-box.product-unknown {
  background-color: #f5f7fa;
  border-color: #909399;
  opacity: 0.8;
  position: relative;
}

/* 兼容旧样式：未匹配（保留向后兼容） */
.product-box.product-unmatched {
  background-color: #fef0f0;
  border-color: #f56c6c;
  opacity: 0.7;
}

/**
 * 商品状态图标
 * 显示在商品框的左上角
 */
.product-status-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 12px;
  font-weight: bold;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
}

.icon-matched {
  color: #67c23a;
}

.icon-missing {
  color: #f56c6c;
}

.icon-modified {
  color: #e6a23c;
}

.icon-unknown {
  color: #909399;
}

/**
 * 商品SPU显示
 * 加粗，较大字体
 */
.product-spu {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  color: #303133;
  margin-top: 20px;  /* 为状态图标留出空间 */
}

.product-box.product-missing .product-spu,
.product-box.product-unknown .product-spu {
  color: #909399;
}

.product-box.product-modified .product-spu {
  color: #e6a23c;
}

/**
 * 商品ID显示
 * 小字体，灰色
 */
.product-id {
  font-size: 11px;
  color: #909399;
}

.product-box.product-missing .product-id,
.product-box.product-unknown .product-id {
  color: #c0c4cc;
}

/**
 * 期望值显示（修改状态时显示）
 * 小字体，显示 Store 中的期望值
 */
.product-expected {
  font-size: 10px;
  color: #909399;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #e4e7ed;
}

/**
 * 统计信息容器
 * 使用 flex 横向布局，显示总体统计
 * 始终显示在头部下方，预览列表在统计信息下方（展开时）
 */
.preview-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

/**
 * 预览列表容器
 * 展开时显示在统计信息下方
 */
.preview-list {
  margin-top: 16px;
  margin-bottom: 0;
}

.summary-item {
  font-size: 14px;
  color: #606266;
}

.summary-item strong {
  font-weight: 600;
  margin-left: 4px;
}

/* ========== 折叠/展开过渡动画 ========== */
/**
 * Vue Transition 组件使用的过渡动画
 * slide-fade: 滑动淡入淡出效果
 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>