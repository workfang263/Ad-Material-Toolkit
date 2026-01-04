<template>
  <div class="ad-campaign-page">
    <div class="container">
      <div class="header">
        <h1>🚀 广告投放表格生成器</h1>
        <p>快速生成Facebook广告投放表格和URL重定向配置</p>
      </div>

      <div class="form-container">
        <form @submit.prevent="generateAllTables">
          <!-- 商品信息 -->
          <div class="form-section">
            <h2 class="section-title">📦 商品信息</h2>
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
                <label for="商品图片链接">商品图片链接 <span class="required">*</span></label>
                <textarea id="商品图片链接" v-model="formData['商品图片链接']" @input="syncImageLinks" required placeholder="输入商品图片链接，每行一个链接，或使用分隔符批量输入" rows="3"></textarea>
                <small class="form-help">支持多行输入：每行一个链接，按回车新增行。也支持批量输入：可用空格、中文逗号(，)、顿号(、)分隔多个链接，如：link1 link2 link3 或 link1，link2、link3</small>
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
            </div>
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
                <label for="预算">预算 <span class="required">*</span></label>
                <input type="number" id="预算" v-model="formData['预算']" required min="1" placeholder="10">
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
            <div id="advancedAudienceFields" class="form-grid">
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
            <div id="simpleAudienceFields" class="form-grid" style="display: none;">
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
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { useAdCampaignStore } from '@/stores/adCampaign'

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
  { code: 'AE', name: '阿联酋' }, { code: 'SA', name: '沙特阿拉伯' }, { code: 'TR', name: '土耳其' }, { code: 'RU', name: '俄罗斯' },
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

// 图片链接同步
const syncImageLinks = () => {
  const imageLinks = formData['商品图片链接'].split(/[\s\n,，、]/).filter(link => link.trim())
  if (imageLinks.length > 0) {
    fetch('/api/image-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ links: imageLinks })
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('图片链接已同步到视频服务')
        }
      })
      .catch(error => {
        console.error('同步图片链接失败:', error)
      })
  }
}

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
  
  console.log('切换进阶赋能型受众模式:', formData['进阶赋能型受众'])
  
  if (formData['进阶赋能型受众'] === '开启') {
    // 显示进阶字段，隐藏简化字段
    advancedFields.style.display = 'block'
    simpleFields.style.display = 'none'
    console.log('显示进阶字段，隐藏简化字段')
  } else {
    // 隐藏进阶字段，显示简化字段
    advancedFields.style.display = 'none'
    simpleFields.style.display = 'block'
    console.log('隐藏进阶字段，显示简化字段')
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
  
  console.log('格式化后的数据:', JSON.stringify(formattedData, null, 2))
  return formattedData
}

// 处理批量输入数据
const processBatchInput = (formData) => {
  console.log('处理前的商品ID原始值:', JSON.stringify(formData['商品ID']))
  console.log('处理前的商品SPU原始值:', JSON.stringify(formData['商品SPU']))
  console.log('处理前的商品图片链接原始值:', JSON.stringify(formData['商品图片链接']))
  
  const processedProductIds = formData['商品ID'] ? processMultiLineInput(formData['商品ID']) : ''
  const processedProductSpus = formData['商品SPU'] ? processMultiLineInput(formData['商品SPU']) : ''
  const processedProductImages = formData['商品图片链接'] ? processMultiLineInput(formData['商品图片链接']) : ''
  
  console.log('处理后的商品ID:', JSON.stringify(processedProductIds))
  console.log('处理后的商品SPU:', JSON.stringify(processedProductSpus))
  console.log('处理后的商品图片链接:', JSON.stringify(processedProductImages))
  
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

// 下载单个图片
const downloadImage = async (url, filename, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    console.log(`开始下载图片 (尝试 ${retryCount + 1}/${maxRetries + 1}): ${url} -> ${filename}`)
    
    // 直接使用后端代理下载，避免CORS问题
    const proxyResponse = await fetch('/api/ad-campaign/api/proxy-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    })
    
    if (!proxyResponse.ok) {
      throw new Error(`代理请求失败: ${proxyResponse.status}`)
    }
    
    const blob = await proxyResponse.blob()
    
    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    a.style.display = 'none'
    
    // 添加到DOM并触发下载
    document.body.appendChild(a)
    a.click()
    
    // 延迟清理，确保下载开始
    setTimeout(() => {
      try {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
      } catch (cleanupError) {
        console.warn('清理下载元素时出错:', cleanupError)
      }
    }, 200)
    
    console.log(`图片下载成功: ${filename}`)
    return { success: true, filename }
    
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

// 批量下载图片
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
      await new Promise(resolve => setTimeout(resolve, 500))
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
    
    progress.innerHTML = `下载完成！成功: ${successful.length} 张，失败: ${failed.length} 张`
    
    // 3秒后隐藏下载器
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    
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

// 下载文件函数
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 生成所有表格
const generateAllTables = async () => {
  generating.value = true
  
  try {
    // 先打印完整的formData
    console.log('=== 完整的formData ===')
    console.log(JSON.stringify(formData, null, 2))
    
    // 处理图片下载（与原始HTML逻辑一致）
    const imageLinksText = formData['商品图片链接']
    let imageDownloadResult = null
    
    if (imageLinksText && imageLinksText.trim()) {
      // 按现有规则拆分图片链接
      const imageLinks = processMultiLineInput(imageLinksText).split('\n').filter(link => link.trim())
      console.log('检测到图片链接:', imageLinks)
      
      if (imageLinks.length > 0) {
        // 并行下载图片（不等待完成）
        downloadAllImages(imageLinks).then(result => {
          console.log('图片下载结果:', result)
        }).catch(error => {
          console.error('图片下载出错:', error)
        })
      }
    }
    
    // 处理批量输入数据
    const batchData = processBatchInput(formData)
    
    console.log('准备发送的批量数据:', JSON.stringify(batchData, null, 2))
    
    // 根据数据量选择API
    if (batchData.length === 1) {
      // 单个数据，分别调用两个API
      let aboSuccess = false
      let urlSuccess = false
      
      try {
        // 生成ABO表格
        const aboResponse = await axios.post('/api/ad-campaign/api/generate/abo-excel', batchData[0])
        
        if (aboResponse.data.success) {
          const blob = base64toBlob(aboResponse.data.file.data, aboResponse.data.file.mimeType)
          downloadFile(blob, 'ABO_Campaign.xlsx')
          aboSuccess = true
        } else {
          throw new Error(aboResponse.data.error || 'ABO表格生成失败')
        }
      } catch (error) {
        console.error('ABO表格生成失败:', error)
        alert('ABO表格生成失败：' + error.message)
      }
      
      try {
        // 生成URL重定向表
        const urlResponse = await axios.post('/api/ad-campaign/api/generate/url-redirect-csv', batchData[0])
        
        if (urlResponse.data.success) {
          const blob = base64toBlob(urlResponse.data.file.data, urlResponse.data.file.mimeType)
          downloadFile(blob, 'URL_Redirect.csv')
          urlSuccess = true
        } else {
          throw new Error(urlResponse.data.error || 'URL重定向表生成失败')
        }
      } catch (error) {
        console.error('URL重定向表生成失败:', error)
        alert('URL重定向表生成失败：' + error.message)
      }
      
      // 显示最终结果
      if (aboSuccess && urlSuccess) {
        alert('所有表格生成成功！')
      } else if (aboSuccess || urlSuccess) {
        alert('部分表格生成成功，请检查错误信息')
      } else {
        alert('表格生成失败，请检查输入数据')
      }
      
    } else {
      // 批量数据，使用统一的批量API
      const response = await axios.post('/api/ad-campaign/api/generate/batch-both-tables', batchData)
      
      if (response.data.success) {
        // 下载ABO表格
        const aboBlob = base64toBlob(response.data.aboFile.data, response.data.aboFile.mimeType)
        downloadFile(aboBlob, response.data.aboFile.filename)
        
        // 下载URL重定向表
        const urlBlob = base64toBlob(response.data.urlFile.data, response.data.urlFile.mimeType)
        downloadFile(urlBlob, response.data.urlFile.filename)
        
        alert(`所有表格生成成功！共处理${batchData.length}个商品`)
        console.log(`批量表格生成成功！共处理${batchData.length}个商品`)
      } else {
        console.error('批量表格生成失败:', response.data.error)
        alert('批量表格生成失败：' + response.data.error)
      }
    }
  } catch (error) {
    console.error('生成表格时出错:', error)
    console.error('错误详情:', error.response?.data)
    alert('生成表格时出错：' + error.message)
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  console.log('页面初始化完成')
  console.log('初始进阶赋能型受众模式:开启')
  toggleAdvancedAudience()
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
</style>
                <input type="text" id="专辑链接后缀" v-model="formData['专辑链接后缀']" class="prefixed-input" placeholder="collections/xxxxx">
              </div>
              <small>示例：collections/xxxxx</small>
            </div>

            <div class="form-group">
              <label for="广告域名">广告域名</label>
              <div class="input-with-prefix">
                <span class="input-prefix">https://</span>
                <input type="text" id="广告域名" v-model="formData['广告域名']" class="prefixed-input" placeholder="example.com">
              </div>
              <small>示例：https://xxx.xxxxxxx.xxxx/</small>
            </div>

            <div class="form-group">
              <label for="账户编号缩写">账户编号缩写</label>
              <input type="text" id="账户编号缩写" v-model="formData['账户编号缩写']" placeholder="请输入账户编号缩写">
            </div>

            <div class="form-group">
              <label for="产品标签">产品标签</label>
              <input type="text" id="产品标签" v-model="formData['产品标签']" placeholder="请输入产品标签">
            </div>

            <div class="form-group">
              <label for="像素">像素</label>
              <input type="text" id="像素" v-model="formData['像素']" placeholder="请输入像素">
            </div>

            <div class="form-group">
              <label for="预算">预算</label>
              <input type="text" id="预算" v-model="formData['预算']" placeholder="请输入预算">
            </div>

            <div class="form-group">
              <label for="投放国家">投放国家</label>
              <div class="dropdown-container">
                <div class="dropdown-trigger" id="countryTrigger" @click="toggleCountryDropdown()">
                  <span id="countryDisplay">请选择投放国家</span>
                  <span class="dropdown-arrow">▼</span>
                </div>
                <div class="checkbox-container" id="countryDropdown" style="display: none;">
                  <div class="search-container">
                    <input type="text" id="countrySearch" placeholder="搜索国家..." @input="searchCountries">
                    <button type="button" class="add-country-btn" @click="addCustomCountry">添加</button>
                  </div>
                  <div class="country-section">
                    <div class="section-title">常见国家</div>
                    <div class="checkbox-item" v-for="country in commonCountries" :key="country.code">
                      <label class="checkbox-label">
                        <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" @change="updateCountryDisplay">
                        <span class="checkmark"></span>
                        {{ country.code }} ({{ country.name }})
                      </label>
                    </div>
                  </div>
                  <div class="country-section">
                    <div class="section-title">其他国家</div>
                    <div class="checkbox-item" v-for="country in otherCountries" :key="country.code">
                      <label class="checkbox-label">
                        <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" @change="updateCountryDisplay">
                        <span class="checkmark"></span>
                        {{ country.code }} ({{ country.name }})
                      </label>
                    </div>
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
                    <label class="checkbox-label">
                      <input type="checkbox" id="excludeSelectAll" @change="toggleAllExcludeCountries">
                      <span class="checkmark"></span>
                      全选
                    </label>
                  </div>
                  <div class="checkbox-item" v-for="country in countries" :key="country.code">
                    <label class="checkbox-label">
                      <input type="checkbox" :id="'exclude_country_' + country.code" name="排除国家" :value="country.code" @change="updateExcludeCountryDisplay">
                      <span class="checkmark"></span>
                      {{ country.code }} ({{ country.name }})
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="投放区域">投放区域</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="region_facebook" name="投放区域" value="facebook" v-model="formData['投放区域']">
                  <span class="checkmark"></span>
                  Facebook
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="region_instagram" name="投放区域" value="instagram" v-model="formData['投放区域']">
                  <span class="checkmark"></span>
                  Instagram
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="region_audience" name="投放区域" value="audience" v-model="formData['投放区域']">
                  <span class="checkmark"></span>
                  Audience Network
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="受众设置">受众设置</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="audience_age" name="受众设置" value="age" v-model="formData['受众设置']">
                  <span class="checkmark"></span>
                  年龄范围
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="audience_gender" name="受众设置" value="gender" v-model="formData['受众设置']">
                  <span class="checkmark"></span>
                  性别
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="audience_interest" name="受众设置" value="interest" v-model="formData['受众设置']">
                  <span class="checkmark"></span>
                  兴趣
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="优化目标">优化目标</label>
              <input type="text" id="优化目标" v-model="formData['优化目标']" placeholder="请输入优化目标">
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
            <div id="advancedAudienceFields" class="form-grid">
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
            <div id="simpleAudienceFields" class="form-grid" style="display: none;">
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

          <div class="form-actions">
            <button type="submit" class="generate-btn" :disabled="generating">
              {{ generating ? '生成中...' : '✨ 生成所有表格' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

// 响应式数据
const generating = ref(false)

// 表单数据
const formData = reactive({
  '商品ID': '',
  '商品SPU': '',
  '商品图片链接': '',
  '专辑链接后缀': '',
  '广告域名': '',
  '账户编号缩写': '',
  '产品标签': '',
  '像素': '',
  '预算': '',
  '投放国家': [],
  '排除国家': [],
  '投放区域': [],
  '受众设置': [],
  '优化目标': '',
  '进阶赋能型受众': '开启',
  '控制选项-年龄下限': '',
  '建议受众-性别': '1',
  '建议受众-最小年龄': '',
  '建议受众-最大年龄': '',
  '最小年龄': '',
  '最大年龄': '',
  '广告语': '',
  '标题': '',
  '描述': '',
  '受益人': ''
})

// 常见国家
const commonCountries = [
  { code: 'US', name: '美国' },
  { code: 'CA', name: '加拿大' },
  { code: 'GB', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'IT', name: '意大利' },
  { code: 'ES', name: '西班牙' },
  { code: 'NL', name: '荷兰' },
  { code: 'BE', name: '比利时' },
  { code: 'AT', name: '奥地利' },
  { code: 'CH', name: '瑞士' },
  { code: 'SE', name: '瑞典' },
  { code: 'NO', name: '挪威' },
  { code: 'DK', name: '丹麦' },
  { code: 'FI', name: '芬兰' },
  { code: 'IE', name: '爱尔兰' },
  { code: 'PT', name: '葡萄牙' },
  { code: 'GR', name: '希腊' },
  { code: 'CY', name: '塞浦路斯' },
  { code: 'LU', name: '卢森堡' },
  { code: 'MT', name: '马耳他' },
  { code: 'SI', name: '斯洛文尼亚' },
  { code: 'SK', name: '斯洛伐克' },
  { code: 'CZ', name: '捷克' },
  { code: 'HU', name: '匈牙利' },
  { code: 'PL', name: '波兰' },
  { code: 'LT', name: '立陶宛' },
  { code: 'LV', name: '拉脱维亚' },
  { code: 'EE', name: '爱沙尼亚' },
  { code: 'RO', name: '罗马尼亚' },
  { code: 'BG', name: '保加利亚' },
  { code: 'HR', name: '克罗地亚' },
  { code: 'ME', name: '黑山' },
  { code: 'RS', name: '塞尔维亚' },
  { code: 'BA', name: '波黑' },
  { code: 'MK', name: '北马其顿' },
  { code: 'AL', name: '阿尔巴尼亚' },
  { code: 'XK', name: '科索沃' },
  { code: 'IS', name: '冰岛' },
  { code: 'LI', name: '列支敦士登' },
  { code: 'MC', name: '摩纳哥' },
  { code: 'SM', name: '圣马力诺' },
  { code: 'VA', name: '梵蒂冈' },
  { code: 'AD', name: '安道尔' }
]

// 其他国家
const otherCountries = [
  { code: 'AU', name: '澳大利亚' },
  { code: 'JP', name: '日本' },
  { code: 'KR', name: '韩国' },
  { code: 'SG', name: '新加坡' },
  { code: 'MX', name: '墨西哥' },
  { code: 'BR', name: '巴西' },
  { code: 'AR', name: '阿根廷' },
  { code: 'CL', name: '智利' },
  { code: 'PE', name: '秘鲁' },
  { code: 'ZA', name: '南非' },
  { code: 'IL', name: '以色列' },
  { code: 'AE', name: '阿联酋' },
  { code: 'SA', name: '沙特阿拉伯' },
  { code: 'TR', name: '土耳其' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'UA', name: '乌克兰' }
]

// 排除国家 - 189个国家
const countries = ref([
  { code: 'IN', name: '印度' },
  { code: 'AL', name: '阿尔巴尼亚' },
  { code: 'MO', name: '澳门' },
  { code: 'GE', name: '格鲁吉亚' },
  { code: 'ZW', name: '津巴布韦' },
  { code: 'AZ', name: '阿塞拜疆' },
  { code: 'MQ', name: '马提尼克' },
  { code: 'KZ', name: '哈萨克斯坦' },
  { code: 'NC', name: '新喀里多尼亚' },
  { code: 'MD', name: '摩尔多瓦' },
  { code: 'PF', name: '法属波利尼西亚' },
  { code: 'LB', name: '黎巴嫩' },
  { code: 'BM', name: '百慕大' },
  { code: 'MY', name: '马来西亚' },
  { code: 'LC', name: '圣卢西亚' },
  { code: 'AD', name: '安道尔' },
  { code: 'AO', name: '安哥拉' },
  { code: 'RE', name: '留尼汪' },
  { code: 'PA', name: '巴拿马' },
  { code: 'JO', name: '约旦' },
  { code: 'HK', name: '香港' },
  { code: 'BG', name: '保加利亚' },
  { code: 'CZ', name: '捷克' },
  { code: 'SI', name: '斯洛文尼亚' },
  { code: 'LT', name: '立陶宛' },
  { code: 'LK', name: '斯里兰卡' },
  { code: 'MA', name: '摩洛哥' },
  { code: 'EG', name: '埃及' },
  { code: 'RO', name: '罗马尼亚' },
  { code: 'CR', name: '哥斯达黎加' },
  { code: 'PY', name: '巴拉圭' },
  { code: 'UY', name: '乌拉圭' },
  { code: 'PR', name: '波多黎各' },
  { code: 'VN', name: '越南' },
  { code: 'MU', name: '毛里求斯' },
  { code: 'OM', name: '阿曼' },
  { code: 'MK', name: '北马其顿' },
  { code: 'EE', name: '爱沙尼亚' },
  { code: 'NP', name: '尼泊尔' },
  { code: 'ME', name: '黑山' },
  { code: 'SN', name: '塞内加尔' },
  { code: 'UG', name: '乌干达' },
  { code: 'TZ', name: '坦桑尼亚' },
  { code: 'LY', name: '利比亚' },
  { code: 'MM', name: '缅甸' },
  { code: 'NA', name: '纳米比亚' },
  { code: 'MG', name: '马达加斯加' },
  { code: 'YE', name: '也门' },
  { code: 'ZM', name: '赞比亚' },
  { code: 'MW', name: '马拉维' },
  { code: 'RW', name: '卢旺达' },
  { code: 'VI', name: '美属维尔京群岛' },
  { code: 'VC', name: '圣文森特和格林纳丁斯' },
  { code: 'MN', name: '蒙古' },
  { code: 'MZ', name: '莫桑比克' },
  { code: 'ML', name: '马里' },
  { code: 'UZ', name: '乌兹别克斯坦' },
  { code: 'MC', name: '摩纳哥' },
  { code: 'TG', name: '多哥' },
  { code: 'SZ', name: '斯威士兰' },
  { code: 'LS', name: '莱索托' },
  { code: 'LA', name: '老挝' },
  { code: 'LI', name: '列支敦士登' },
  { code: 'MP', name: '北马里亚纳群岛' },
  { code: 'SR', name: '苏里南' },
  { code: 'SC', name: '塞舌尔' },
  { code: 'VG', name: '英属维尔京群岛' },
  { code: 'TC', name: '特克斯和凯科斯群岛' },
  { code: 'MR', name: '毛里塔尼亚' },
  { code: 'SM', name: '圣马力诺' },
  { code: 'SL', name: '塞拉利昂' },
  { code: 'NE', name: '尼日尔' },
  { code: 'YT', name: '马约特' },
  { code: 'LR', name: '利比里亚' },
  { code: 'TM', name: '土库曼斯坦' },
  { code: 'PK', name: '巴基斯坦' },
  { code: 'TJ', name: '塔吉克斯坦' },
  { code: 'VU', name: '瓦努阿图' },
  { code: 'SB', name: '所罗门群岛' },
  { code: 'WS', name: '萨摩亚' },
  { code: 'TO', name: '汤加' },
  { code: 'PW', name: '帕劳' },
  { code: 'SO', name: '索马里' },
  { code: 'MH', name: '马绍尔群岛' },
  { code: 'TD', name: '乍得' },
  { code: 'ST', name: '圣多美和普林西比' },
  { code: 'TV', name: '图瓦卢' },
  { code: 'NR', name: '瑙鲁' },
  { code: 'TF', name: '法属南部领地' },
  { code: 'MS', name: '蒙特塞拉特' },
  { code: 'NU', name: '纽埃' },
  { code: 'NF', name: '诺福克岛' },
  { code: 'PN', name: '皮特凯恩群岛' },
  { code: 'SH', name: '圣赫勒拿' },
  { code: 'PM', name: '圣皮埃尔和密克隆' },
  { code: 'SS', name: '南苏丹' },
  { code: 'SJ', name: '斯瓦尔巴和扬马延' },
  { code: 'TL', name: '东帝汶' },
  { code: 'TK', name: '托克劳' },
  { code: 'UM', name: '美国本土外小岛屿' },
  { code: 'WF', name: '瓦利斯和富图纳' },
  { code: 'VE', name: '委内瑞拉' },
  { code: 'TH', name: '泰国' },
  { code: 'NG', name: '尼日利亚' },
  { code: 'TT', name: '特立尼达和多巴哥' },
  { code: 'SV', name: '萨尔瓦多' },
  { code: 'NI', name: '尼加拉瓜' },
  { code: 'PS', name: '巴勒斯坦' },
  { code: 'TN', name: '突尼斯' },
  { code: 'MT', name: '马耳他' },
  { code: 'MV', name: '马尔代夫' },
  { code: 'BN', name: '文莱' },
  { code: 'GP', name: '瓜德罗普' },
  { code: 'BB', name: '巴巴多斯' },
  { code: 'CI', name: '科特迪瓦' },
  { code: 'CM', name: '喀麦隆' },
  { code: 'BW', name: '博茨瓦纳' },
  { code: 'ET', name: '埃塞俄比亚' },
  { code: 'FJ', name: '斐济' },
  { code: 'BY', name: '白俄罗斯' },
  { code: 'GU', name: '关岛' },
  { code: 'HT', name: '海地' },
  { code: 'KH', name: '柬埔寨' },
  { code: 'AW', name: '阿鲁巴' },
  { code: 'AF', name: '阿富汗' },
  { code: 'GY', name: '圭亚那' },
  { code: 'AM', name: '亚美尼亚' },
  { code: 'AG', name: '安提瓜和巴布达' },
  { code: 'GM', name: '冈比亚' },
  { code: 'FO', name: '法罗群岛' },
  { code: 'KY', name: '开曼群岛' },
  { code: 'BJ', name: '贝宁' },
  { code: 'GD', name: '格林纳达' },
  { code: 'BZ', name: '伯利兹' },
  { code: 'GF', name: '法属圭亚那' },
  { code: 'DJ', name: '吉布提' },
  { code: 'BF', name: '布基纳法索' },
  { code: 'GL', name: '格陵兰' },
  { code: 'GA', name: '加蓬' },
  { code: 'GI', name: '直布罗陀' },
  { code: 'CD', name: '刚果民主共和国' },
  { code: 'KG', name: '吉尔吉斯斯坦' },
  { code: 'PG', name: '巴布亚新几内亚' },
  { code: 'BT', name: '不丹' },
  { code: 'KN', name: '圣基茨和尼维斯' },
  { code: 'DM', name: '多米尼克' },
  { code: 'CG', name: '刚果' },
  { code: 'AI', name: '安圭拉' },
  { code: 'CV', name: '佛得角' },
  { code: 'GN', name: '几内亚' },
  { code: 'BI', name: '布隆迪' },
  { code: 'ER', name: '厄立特里亚' },
  { code: 'AS', name: '美属萨摩亚' },
  { code: 'FK', name: '福克兰群岛' },
  { code: 'GQ', name: '赤道几内亚' },
  { code: 'KM', name: '科摩罗' },
  { code: 'FM', name: '密克罗尼西亚' },
  { code: 'CF', name: '中非共和国' },
  { code: 'KI', name: '基里巴斯' },
  { code: 'AN', name: '荷属安的列斯' },
  { code: 'AQ', name: '南极洲' },
  { code: 'BV', name: '布韦岛' },
  { code: 'IO', name: '英属印度洋领地' },
  { code: 'CX', name: '圣诞岛' },
  { code: 'CK', name: '库克群岛' },
  { code: 'GW', name: '几内亚比绍' },
  { code: 'HM', name: '赫德岛和麦克唐纳群岛' },
  { code: 'GS', name: '南乔治亚和南桑威奇群岛' },
  { code: 'EH', name: '西撒哈拉' },
  { code: 'DO', name: '多米尼加' },
  { code: 'ID', name: '印度尼西亚' },
  { code: 'PH', name: '菲律宾' },
  { code: 'CN', name: '中国' },
  { code: 'HR', name: '克罗地亚' },
  { code: 'TW', name: '台湾' },
  { code: 'CO', name: '哥伦比亚' },
  { code: 'BD', name: '孟加拉国' },
  { code: 'KE', name: '肯尼亚' },
  { code: 'HU', name: '匈牙利' },
  { code: 'JM', name: '牙买加' },
  { code: 'EC', name: '厄瓜多尔' },
  { code: 'BO', name: '玻利维亚' },
  { code: 'GT', name: '危地马拉' },
  { code: 'HN', name: '洪都拉斯' },
  { code: 'GH', name: '加纳' },
  { code: 'BS', name: '巴哈马' },
  { code: 'LV', name: '拉脱维亚' },
  { code: 'IQ', name: '伊拉克' },
  { code: 'DZ', name: '阿尔及利亚' }
])

// 图片链接同步
const syncImageLinks = () => {
  const imageLinks = formData['商品图片链接'].split(/[\s\n,，、]/).filter(link => link.trim())
  if (imageLinks.length > 0) {
    fetch('/api/image-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ links: imageLinks })
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('图片链接已同步到视频服务')
        }
      })
      .catch(error => {
        console.error('同步图片链接失败:', error)
      })
  }
}

// 投放国家相关函数
const toggleCountryDropdown = () => {
  const dropdown = document.getElementById('countryDropdown')
  const trigger = document.getElementById('countryTrigger')
  
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

// 切换进阶赋能型受众显示
const toggleAdvancedAudience = () => {
  const advancedFields = document.getElementById('advancedAudienceFields')
  const simpleFields = document.getElementById('simpleAudienceFields')
  
  console.log('切换进阶赋能型受众模式:', formData['进阶赋能型受众'])
  
  if (formData['进阶赋能型受众'] === '开启') {
    // 显示进阶字段，隐藏简化字段
    advancedFields.style.display = 'block'
    simpleFields.style.display = 'none'
    console.log('显示进阶字段，隐藏简化字段')
  } else {
    // 隐藏进阶字段，显示简化字段
    advancedFields.style.display = 'none'
    simpleFields.style.display = 'block'
    console.log('隐藏进阶字段，显示简化字段')
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
  
  console.log('格式化后的数据:', JSON.stringify(formattedData, null, 2))
  return formattedData
}

// 处理批量输入数据
const processBatchInput = (formData) => {
  console.log('处理前的商品ID原始值:', JSON.stringify(formData['商品ID']))
  console.log('处理前的商品SPU原始值:', JSON.stringify(formData['商品SPU']))
  console.log('处理前的商品图片链接原始值:', JSON.stringify(formData['商品图片链接']))
  
  const processedProductIds = formData['商品ID'] ? processMultiLineInput(formData['商品ID']) : ''
  const processedProductSpus = formData['商品SPU'] ? processMultiLineInput(formData['商品SPU']) : ''
  const processedProductImages = formData['商品图片链接'] ? processMultiLineInput(formData['商品图片链接']) : ''
  
  console.log('处理后的商品ID:', JSON.stringify(processedProductIds))
  console.log('处理后的商品SPU:', JSON.stringify(processedProductSpus))
  console.log('处理后的商品图片链接:', JSON.stringify(processedProductImages))
  
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

// 下载单个图片
const downloadImage = async (url, filename, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    console.log(`开始下载图片 (尝试 ${retryCount + 1}/${maxRetries + 1}): ${url} -> ${filename}`)
    
    // 直接使用后端代理下载，避免CORS问题
    const proxyResponse = await fetch('/api/ad-campaign/api/proxy-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    })
    
    if (!proxyResponse.ok) {
      throw new Error(`代理请求失败: ${proxyResponse.status}`)
    }
    
    const blob = await proxyResponse.blob()
    
    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    a.style.display = 'none'
    
    // 添加到DOM并触发下载
    document.body.appendChild(a)
    a.click()
    
    // 延迟清理，确保下载开始
    setTimeout(() => {
      try {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
      } catch (cleanupError) {
        console.warn('清理下载元素时出错:', cleanupError)
      }
    }, 200)
    
    console.log(`图片下载成功: ${filename}`)
    return { success: true, filename }
    
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

// 批量下载图片
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
      await new Promise(resolve => setTimeout(resolve, 500))
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
    
    progress.innerHTML = `下载完成！成功: ${successful.length} 张，失败: ${failed.length} 张`
    
    // 3秒后隐藏下载器
    setTimeout(() => {
      downloader.style.display = 'none'
    }, 3000)
    
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

// 下载文件函数
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 生成所有表格
const generateAllTables = async () => {
  generating.value = true
  
  try {
    // 先打印完整的formData
    console.log('=== 完整的formData ===')
    console.log(JSON.stringify(formData, null, 2))
    
    // 处理图片下载（与原始HTML逻辑一致）
    const imageLinksText = formData['商品图片链接']
    let imageDownloadResult = null
    
    if (imageLinksText && imageLinksText.trim()) {
      // 按现有规则拆分图片链接
      const imageLinks = processMultiLineInput(imageLinksText).split('\n').filter(link => link.trim())
      console.log('检测到图片链接:', imageLinks)
      
      if (imageLinks.length > 0) {
        // 并行下载图片（不等待完成）
        downloadAllImages(imageLinks).then(result => {
          console.log('图片下载结果:', result)
        }).catch(error => {
          console.error('图片下载出错:', error)
        })
      }
    }
    
    // 处理批量输入数据
    const batchData = processBatchInput(formData)
    
    console.log('准备发送的批量数据:', JSON.stringify(batchData, null, 2))
    
    // 根据数据量选择API
    if (batchData.length === 1) {
      // 单个数据，分别调用两个API
      let aboSuccess = false
      let urlSuccess = false
      
      try {
        // 生成ABO表格
        const aboResponse = await axios.post('/api/ad-campaign/api/generate/abo-excel', batchData[0])
        
        if (aboResponse.data.success) {
          const blob = base64toBlob(aboResponse.data.file.data, aboResponse.data.file.mimeType)
          downloadFile(blob, 'ABO_Campaign.xlsx')
          aboSuccess = true
        } else {
          throw new Error(aboResponse.data.error || 'ABO表格生成失败')
        }
      } catch (error) {
        console.error('ABO表格生成失败:', error)
        alert('ABO表格生成失败：' + error.message)
      }
      
      try {
        // 生成URL重定向表
        const urlResponse = await axios.post('/api/ad-campaign/api/generate/url-redirect-csv', batchData[0])
        
        if (urlResponse.data.success) {
          const blob = base64toBlob(urlResponse.data.file.data, urlResponse.data.file.mimeType)
          downloadFile(blob, 'URL_Redirect.csv')
          urlSuccess = true
        } else {
          throw new Error(urlResponse.data.error || 'URL重定向表生成失败')
        }
      } catch (error) {
        console.error('URL重定向表生成失败:', error)
        alert('URL重定向表生成失败：' + error.message)
      }
      
      // 显示最终结果
      if (aboSuccess && urlSuccess) {
        alert('所有表格生成成功！')
      } else if (aboSuccess || urlSuccess) {
        alert('部分表格生成成功，请检查错误信息')
      } else {
        alert('表格生成失败，请检查输入数据')
      }
      
    } else {
      // 批量数据，使用统一的批量API
      const response = await axios.post('/api/ad-campaign/api/generate/batch-both-tables', batchData)
      
      if (response.data.success) {
        // 下载ABO表格
        const aboBlob = base64toBlob(response.data.aboFile.data, response.data.aboFile.mimeType)
        downloadFile(aboBlob, response.data.aboFile.filename)
        
        // 下载URL重定向表
        const urlBlob = base64toBlob(response.data.urlFile.data, response.data.urlFile.mimeType)
        downloadFile(urlBlob, response.data.urlFile.filename)
        
        alert(`所有表格生成成功！共处理${batchData.length}个商品`)
        console.log(`批量表格生成成功！共处理${batchData.length}个商品`)
      } else {
        console.error('批量表格生成失败:', response.data.error)
        alert('批量表格生成失败：' + response.data.error)
      }
    }
  } catch (error) {
    console.error('生成表格时出错:', error)
    console.error('错误详情:', error.response?.data)
    alert('生成表格时出错：' + error.message)
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  console.log('页面初始化完成')
  console.log('初始进阶赋能型受众模式:开启')
  toggleAdvancedAudience()
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

.form-actions {
  text-align: center;
  margin-top: 30px;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.generate-btn:hover {
  transform: translateY(-2px);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

.required {
  color: #e74c3c;
}

.form-help {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}
</style>