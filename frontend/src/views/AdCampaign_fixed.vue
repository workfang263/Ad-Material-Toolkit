<template>
  <div class="ad-campaign-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>广告投放表格生成器</h1>
      <p>快速生成Facebook广告投放表格</p>
    </div>

    <!-- 表单区域 -->
    <div class="form-container">
      <form @submit.prevent="generateAllTables">
        <!-- 商品信息 -->
        <div class="form-section">
          <h3>商品信息</h3>
          <div class="form-group">
            <label for="商品ID">商品ID</label>
            <textarea id="商品ID" v-model="formData['商品ID']" placeholder="请输入商品ID，多个用空格或换行分隔"></textarea>
          </div>
          <div class="form-group">
            <label for="商品SPU">商品SPU</label>
            <textarea id="商品SPU" v-model="formData['商品SPU']" placeholder="请输入商品SPU，多个用空格或换行分隔"></textarea>
          </div>
          <div class="form-group">
            <label for="商品图片链接">商品图片链接</label>
            <textarea id="商品图片链接" v-model="formData['商品图片链接']" @input="syncImageLinks" placeholder="请输入商品图片链接，多个用空格或换行分隔"></textarea>
          </div>
          <div class="form-group">
            <label for="专辑链接">专辑链接</label>
            <input type="text" id="专辑链接" v-model="formData['专辑链接']" placeholder="请输入专辑链接">
          </div>
          <div class="form-group">
            <label for="广告域名">广告域名</label>
            <input type="text" id="广告域名" v-model="formData['广告域名']" placeholder="请输入广告域名">
          </div>
        </div>

        <!-- 投放设置 -->
        <div class="form-section">
          <h3>投放设置</h3>
          <div class="form-group">
            <label for="投放国家">投放国家</label>
            <div class="dropdown-container">
              <div class="dropdown-trigger" id="countryTrigger" @click="toggleCountryDropdown()">
                <span id="countryDisplay">请选择投放国家</span>
                <span class="dropdown-arrow">▼</span>
              </div>
              <div class="checkbox-container" id="countryDropdown" style="display: none;">
                <div class="country-section">
                  <div class="section-title">常见国家</div>
                  <div class="checkbox-item" v-for="country in commonCountries" :key="country.code">
                    <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" @change="updateCountryDisplay()">
                    <label :for="'country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                  </div>
                </div>
                <div class="country-section">
                  <div class="section-title">其他国家</div>
                  <div class="checkbox-item" v-for="country in otherCountries" :key="country.code">
                    <input type="checkbox" :id="'country_' + country.code" name="投放国家" :value="country.code" @change="updateCountryDisplay()">
                    <label :for="'country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                  </div>
                </div>
                <div class="dropdown-actions">
                  <button type="button" class="btn-cancel" @click="closeCountryDropdown()">取消</button>
                  <button type="button" class="btn-confirm" @click="closeCountryDropdown()">确定</button>
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
                  <input type="checkbox" id="excludeSelectAll" @change="toggleAllExcludeCountries()">
                  <label for="excludeSelectAll">全选</label>
                </div>
                <div class="checkbox-item" v-for="country in countries" :key="country.code">
                  <input type="checkbox" :id="'exclude_country_' + country.code" name="排除国家" :value="country.code" @change="updateExcludeCountryDisplay()">
                  <label :for="'exclude_country_' + country.code">{{ country.code }} ({{ country.name }})</label>
                </div>
                <div class="dropdown-actions">
                  <button type="button" class="btn-cancel" @click="closeExcludeCountryDropdown()">取消</button>
                  <button type="button" class="btn-confirm" @click="closeExcludeCountryDropdown()">确定</button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>投放区域</label>
            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="worldwide" name="投放区域" value="worldwide" @change="handleRegionChange">
                <label for="worldwide">全球</label>
              </div>
              <div class="checkbox-item">
                <input type="checkbox" id="eea" name="投放区域" value="eea" @change="handleRegionChange">
                <label for="eea">欧洲经济区</label>
              </div>
              <div class="checkbox-item">
                <input type="checkbox" id="nafta" name="投放区域" value="nafta" @change="handleRegionChange">
                <label for="nafta">北美自由贸易区</label>
              </div>
            </div>
          </div>
        </div>

        <!-- 受众设置 -->
        <div class="form-section">
          <h3>受众设置</h3>
          <div class="form-group">
            <label for="年龄范围">年龄范围</label>
            <div class="age-range">
              <input type="number" id="最小年龄" v-model="formData['最小年龄']" min="13" max="65" placeholder="最小年龄">
              <span>-</span>
              <input type="number" id="最大年龄" v-model="formData['最大年龄']" min="13" max="65" placeholder="最大年龄">
            </div>
          </div>
          <div class="form-group">
            <label for="性别">性别</label>
            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="male" name="性别" value="male">
                <label for="male">男性</label>
              </div>
              <div class="checkbox-item">
                <input type="checkbox" id="female" name="性别" value="female">
                <label for="female">女性</label>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="兴趣">兴趣</label>
            <input type="text" id="兴趣" v-model="formData['兴趣']" placeholder="请输入兴趣关键词">
          </div>
        </div>

        <!-- 预算设置 -->
        <div class="form-section">
          <h3>预算设置</h3>
          <div class="form-group">
            <label for="日预算">日预算</label>
            <input type="number" id="日预算" v-model="formData['日预算']" min="1" placeholder="请输入日预算">
          </div>
          <div class="form-group">
            <label for="出价">出价</label>
            <input type="number" id="出价" v-model="formData['出价']" min="0.01" step="0.01" placeholder="请输入出价">
          </div>
        </div>

        <!-- 其他设置 -->
        <div class="form-section">
          <h3>其他设置</h3>
          <div class="form-group">
            <label for="像素">像素</label>
            <input type="text" id="像素" v-model="formData['像素']" placeholder="请输入像素ID">
          </div>
          <div class="form-group">
            <label for="优化目标">优化目标</label>
            <select id="优化目标" v-model="formData['优化目标']">
              <option value="">请选择优化目标</option>
              <option value="reach">覆盖人数</option>
              <option value="impressions">展示次数</option>
              <option value="clicks">点击次数</option>
              <option value="conversions">转化次数</option>
            </select>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="generating">
            {{ generating ? '生成中...' : '生成所有表格' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const SESSION_KEY = 'x-session-id'

const generateSessionId = () => {
  const randomPart = Math.random().toString(36).slice(2)
  const timePart = Date.now().toString(36)
  return `sid_${randomPart}_${timePart}`
}

const getSessionId = () => {
  try {
    let sid = localStorage.getItem(SESSION_KEY)
    if (!sid || typeof sid !== 'string' || !sid.startsWith('sid_')) {
      sid = generateSessionId()
      localStorage.setItem(SESSION_KEY, sid)
      console.log('🆔 [AdCampaign] 生成新的会话ID:', sid)
    }
    return sid
  } catch (error) {
    if (!window.__fallbackCampaignSession) {
      window.__fallbackCampaignSession = generateSessionId()
      console.log('🆔 [AdCampaign] 使用临时会话ID:', window.__fallbackCampaignSession)
    }
    return window.__fallbackCampaignSession
  }
}

const sessionHeaders = (extra = {}) => ({ 'x-session-id': getSessionId(), ...extra })

// 响应式数据
const generating = ref(false)

// 表单数据
const formData = reactive({
  '商品ID': '',
  '商品SPU': '',
  '商品图片链接': '',
  '专辑链接': '',
  '广告域名': '',
  '最小年龄': '',
  '最大年龄': '',
  '兴趣': '',
  '日预算': '',
  '出价': '',
  '像素': '',
  '优化目标': ''
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
  { code: 'AD', name: '安道尔' },
  { code: 'ES', name: '西班牙' }
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
  { code: 'CO', name: '哥伦比亚' },
  { code: 'PE', name: '秘鲁' },
  { code: 'ZA', name: '南非' },
  { code: 'EG', name: '埃及' },
  { code: 'NG', name: '尼日利亚' },
  { code: 'KE', name: '肯尼亚' },
  { code: 'MA', name: '摩洛哥' },
  { code: 'IL', name: '以色列' },
  { code: 'AE', name: '阿联酋' },
  { code: 'SA', name: '沙特阿拉伯' },
  { code: 'TR', name: '土耳其' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'UA', name: '乌克兰' },
  { code: 'PL', name: '波兰' },
  { code: 'CZ', name: '捷克' },
  { code: 'SK', name: '斯洛伐克' },
  { code: 'CH', name: '瑞士' },
  { code: 'NZ', name: '新西兰' },
  { code: 'DZ', name: '阿尔及利亚' }
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
  { code: 'CG', name: '刚果共和国' },
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
  { code: 'DO', name: '多米尼加共和国' },
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

const closeExcludeCountryDropdown = () => {
  const dropdown = document.getElementById('excludeCountryDropdown')
  const trigger = document.getElementById('excludeCountryTrigger')

  dropdown.style.display = 'none'
  trigger.classList.remove('active')
}

const toggleAllExcludeCountries = () => {
  const selectAllCheckbox = document.getElementById('excludeSelectAll')
  const countryCheckboxes = document.querySelectorAll('input[name="排除国家"]')

  countryCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked
  })
  updateExcludeCountryDisplay()
}

const updateExcludeCountryDisplay = () => {
  const selectedCountries = []
  const countryCheckboxes = document.querySelectorAll('input[name="排除国家"]:checked')

  countryCheckboxes.forEach(checkbox => {
    const label = document.querySelector(`label[for="${checkbox.id}"]`)
    selectedCountries.push(label.textContent.split(' ')[0]) // 只取国家代码部分
  })

  const display = document.getElementById('excludeCountryDisplay')
  if (selectedCountries.length === 0) {
    display.textContent = '请选择排除国家'
  } else if (selectedCountries.length === 1) {
    display.textContent = selectedCountries[0]
  } else {
    display.textContent = `已选择 ${selectedCountries.length} 个国家`
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

const closeCountryDropdown = () => {
  const dropdown = document.getElementById('countryDropdown')
  const trigger = document.getElementById('countryTrigger')

  dropdown.style.display = 'none'
  trigger.classList.remove('active')
}

const updateCountryDisplay = () => {
  const selectedCountries = []
  const countryCheckboxes = document.querySelectorAll('input[name="投放国家"]:checked')

  countryCheckboxes.forEach(checkbox => {
    const label = document.querySelector(`label[for="${checkbox.id}"]`)
    selectedCountries.push(label.textContent.split(' ')[0]) // 只取国家代码部分
  })

  const display = document.getElementById('countryDisplay')
  if (selectedCountries.length === 0) {
    display.textContent = '请选择投放国家'
  } else if (selectedCountries.length === 1) {
    display.textContent = selectedCountries[0]
  } else {
    display.textContent = `已选择 ${selectedCountries.length} 个国家`
  }
}

// 区域选择处理
const handleRegionChange = (event) => {
  const checkbox = event.target
  const worldwideCheckbox = document.querySelector('input[name="投放区域"][value="worldwide"]')
  const eeaCheckbox = document.querySelector('input[name="投放区域"][value="eea"]')
  const naftaCheckbox = document.querySelector('input[name="投放区域"][value="nafta"]')

  if (checkbox.value === 'worldwide' && checkbox.checked) {
    eeaCheckbox.checked = false
    naftaCheckbox.checked = false
  } else if ((checkbox.value === 'eea' || checkbox.value === 'nafta') && checkbox.checked) {
    worldwideCheckbox.checked = false
  }
}

// 图片同步功能
const syncImageLinks = async () => {
  const imageLinks = formData['商品图片链接']
  if (!imageLinks || !imageLinks.trim()) return

  try {
    // 提取图片链接
    const links = imageLinks.split(/[\s\n]+/).filter(link => 
      link.trim() && isValidImageUrl(link.trim())
    )

    if (links.length > 0) {
      // 发送到API Gateway
      await axios.post('/api/image-links', { links }, {
        headers: sessionHeaders({ 'Content-Type': 'application/json' })
      })
      console.log('图片链接已同步:', links)
      showNotification('图片链接已同步到视频服务', 'success')
    }
  } catch (error) {
    console.error('同步图片链接失败:', error)
    showNotification('同步图片链接失败', 'error')
  }
}

// 验证图片URL
const isValidImageUrl = (url) => {
  try {
    const urlObj = new URL(url)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    const pathname = urlObj.pathname.toLowerCase()
    return imageExtensions.some(ext => pathname.includes(ext)) || 
           urlObj.hostname.includes('img') ||
           urlObj.hostname.includes('image')
  } catch {
    return false
  }
}

// 显示通知
const showNotification = (message, type = 'info') => {
  // 简单的通知实现
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    border-radius: 4px;
    z-index: 1000;
    font-size: 14px;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

// 生成表格
const generateAllTables = async () => {
  generating.value = true
  
  try {
    // 获取表单数据
    const data = getFormData()
    
    // 发送到API Gateway
    const response = await axios.post('/api/ad-campaign/api/generate/batch-both-tables', data)
    
    if (response.data.success) {
      showNotification('表格生成成功！', 'success')
      
      // 下载文件
      if (response.data.filename) {
        downloadFile(response.data.data, response.data.filename)
      }
    } else {
      showNotification('表格生成失败: ' + response.data.error, 'error')
    }
  } catch (error) {
    console.error('生成表格失败:', error)
    showNotification('生成表格失败: ' + error.message, 'error')
  } finally {
    generating.value = false
  }
}

// 获取表单数据
const getFormData = () => {
  const data = { ...formData }
  
  // 获取选中的投放国家
  const selectedCountries = []
  const countryCheckboxes = document.querySelectorAll('input[name="投放国家"]:checked')
  countryCheckboxes.forEach(checkbox => {
    selectedCountries.push(checkbox.value)
  })
  data['投放国家'] = selectedCountries.join(',')
  
  // 获取选中的排除国家
  const selectedExcludeCountries = []
  const excludeCountryCheckboxes = document.querySelectorAll('input[name="排除国家"]:checked')
  excludeCountryCheckboxes.forEach(checkbox => {
    selectedExcludeCountries.push(checkbox.value)
  })
  data['排除国家'] = selectedExcludeCountries.join(',')
  
  // 获取选中的投放区域
  const selectedRegions = []
  const regionCheckboxes = document.querySelectorAll('input[name="投放区域"]:checked')
  regionCheckboxes.forEach(checkbox => {
    selectedRegions.push(checkbox.value)
  })
  data['投放区域'] = selectedRegions.join(',')
  
  // 获取选中的性别
  const selectedGenders = []
  const genderCheckboxes = document.querySelectorAll('input[name="性别"]:checked')
  genderCheckboxes.forEach(checkbox => {
    selectedGenders.push(checkbox.value)
  })
  data['性别'] = selectedGenders.join(',')
  
  return data
}

// 下载文件
const downloadFile = (response, filename) => {
  const blob = new Blob([response], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

onMounted(() => {
  // 初始化投放国家选择
  const regionCheckboxes = document.querySelectorAll('input[name="投放区域"]')
  regionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleRegionChange)
  })
})
</script>

<style scoped>
.ad-campaign-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5rem;
}

.page-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.form-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 1px solid #ecf0f1;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.3rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #34495e;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.age-range {
  display: flex;
  align-items: center;
  gap: 10px;
}

.age-range input {
  flex: 1;
}

.age-range span {
  color: #7f8c8d;
  font-weight: 500;
}

.checkbox-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-item input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkbox-item label {
  margin: 0;
  cursor: pointer;
  font-weight: normal;
}

.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.3s ease;
  background: white;
}

.dropdown-trigger:hover {
  border-color: #3498db;
}

.dropdown-trigger.active {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.dropdown-arrow {
  color: #7f8c8d;
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
  border: 2px solid #e1e8ed;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.country-section {
  padding: 15px;
  border-bottom: 1px solid #ecf0f1;
}

.country-section:last-child {
  border-bottom: none;
}

.section-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.checkbox-container .checkbox-item {
  margin-bottom: 8px;
}

.checkbox-container .checkbox-item:last-child {
  margin-bottom: 0;
}

.dropdown-actions {
  padding: 15px;
  border-top: 1px solid #ecf0f1;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

.btn-cancel {
  background: #95a5a6;
  color: white;
}

.btn-cancel:hover {
  background: #7f8c8d;
}

.btn-confirm {
  background: #3498db;
  color: white;
}

.btn-confirm:hover {
  background: #2980b9;
}

.form-actions {
  text-align: center;
  margin-top: 40px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ad-campaign-container {
    padding: 15px;
  }
  
  .form-container {
    padding: 20px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .checkbox-group {
    flex-direction: column;
    gap: 10px;
  }
  
  .age-range {
    flex-direction: column;
    align-items: stretch;
  }
  
  .age-range span {
    text-align: center;
  }
}
</style>
