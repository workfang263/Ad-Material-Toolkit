import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { normalizeUrl } from '@/utils/urlNormalize'
import { ElMessage, ElMessageBox } from 'element-plus'

export const useAdCampaignStore = defineStore('adCampaign', () => {
  // 表单数据状态
  const formData = reactive({
    '商品ID': '',
    '商品SPU': '',
    '商品图片链接': '',
    '专辑链接': '',
    '固定部分商品ID': '',
    '轮播视频模式': false,
    '广告域名': '',
    '账户编号': '',
    '产品标签': '',
    '像素': '',
    '预算': '',
    '投放国家': [],
    '排除国家': [],
    '投放区域': [],
    '投放地区': '',
    '受众设置': [],
    '优化目标': '',
    '进阶赋能型受众': '关闭',
    '控制选项-年龄下限': '',
    '建议受众-性别': '2',
    '建议受众-最小年龄': '',
    '建议受众-最大年龄': '',
    '最小年龄': '',
    '最大年龄': '',
    '广告语': '',
    '标题': '',
    '描述': '',
    '受益人': ''
  })

  // 页面状态
  const isAdvancedAudience = ref(false)
  const generating = ref(false)

  // ========== 工作流模式状态 ==========
  /**
   * 工作流模式
   * - 'standard': 标准模式（保留原有功能，自由填写，1:1生成表格）
   * - 'stitch_sync': 拼图对齐模式（新功能，Excel导入+外链同步，3:1强校验）
   */
  const workflowMode = ref('standard')

  // ========== 同步来源标记 ==========
  /**
   * 同步来源标记
   * - 'none': 无数据来源
   * - 'excel': 数据来自Excel导入
   * - 'stitch': 数据来自拼图页面同步
   */
  const syncSource = ref('none')

  // ========== 数据映射关系（持久化） ==========
  /**
   * 产品数据映射关系
   * 用于管理外链、图片链接、商品ID/SPU之间的对应关系
   */
  const productDataMapping = ref({
    // 外链记录数组
    // 每个元素包含：外链URL、对应的图片链接数组、商品信息数组
    externalLinks: [],
    
    // 图片链接到商品的映射（key: 归一化后的URL）
    // 用于快速查找图片对应的商品信息
    imageToProduct: {},
    
    // 商品ID和商品SPU数组（原始数据备份）
    productIds: [],
    productSpus: []
  })

  // 方法：重置表单数据
  const resetFormData = () => {
    Object.keys(formData).forEach(key => {
      if (Array.isArray(formData[key])) {
        formData[key] = []
      } else if (typeof formData[key] === 'number') {
        formData[key] = ''
      } else {
        formData[key] = ''
      }
    })
    
    // 重置默认值
    formData['进阶赋能型受众'] = '关闭'
    formData['建议受众-性别'] = '2'
    isAdvancedAudience.value = false
  }

  // 方法：更新表单数据
  const updateFormData = (newData) => {
    Object.assign(formData, newData)
  }

  // 方法：获取表单数据
  const getFormData = () => {
    return { ...formData }
  }

  // 方法：设置生成状态
  const setGenerating = (status) => {
    generating.value = status
  }

  // 方法：切换进阶受众模式
  const toggleAdvancedAudience = (mode) => {
    formData['进阶赋能型受众'] = mode
    isAdvancedAudience.value = mode === '开启'
  }

  // ========== 工作流模式切换 ==========
  /**
   * 处理工作流模式切换
   * @param {string} mode - 模式名称：'standard' | 'stitch_sync'
   * @returns {Promise<boolean>} 返回是否成功切换模式
   * 
   * 技术原理：
   * 1. 检测当前是否存在映射数据（productDataMapping中的externalLinks或imageToProduct）
   * 2. 如果存在数据，弹出确认对话框，告知用户切换模式将清空对齐映射
   * 3. 用户确认后才切换模式并清理映射数据
   * 4. 用户取消则保持原模式不变，不清除任何表单文本
   */
  const handleModeChange = async (mode) => {
    // 检测当前是否存在映射数据
    const hasMappingData = 
      (productDataMapping.value.externalLinks && productDataMapping.value.externalLinks.length > 0) ||
      (productDataMapping.value.imageToProduct && Object.keys(productDataMapping.value.imageToProduct).length > 0)
    
    // 如果存在映射数据，需要用户确认
    if (hasMappingData) {
      try {
        await ElMessageBox.confirm(
          '切换模式将清空当前的对齐映射数据，是否继续？',
          '切换模式确认',
          {
            type: 'warning',
            confirmButtonText: '继续切换',
            cancelButtonText: '取消'
          }
        )
        
        // 用户确认：清理映射数据
        productDataMapping.value.externalLinks = []
        productDataMapping.value.imageToProduct = {}
        productDataMapping.value.productIds = []
        productDataMapping.value.productSpus = []
        
        // 切换模式
        workflowMode.value = mode
        if (mode === 'standard') {
          ElMessage.success('已切换到标准模式，已清空对齐映射数据')
        } else {
          ElMessage.success('已切换到拼图对齐模式，已清空对齐映射数据')
        }
        return true
      } catch {
        // 用户取消：不切换模式，不清除任何数据（包括表单文本）
        return false
      }
    } else {
      // 没有映射数据，直接切换模式
      workflowMode.value = mode
      if (mode === 'standard') {
        ElMessage.info('已切换到标准模式，将跳过3:1校验')
      } else {
        ElMessage.info('已切换到拼图对齐模式，将启用3:1强校验')
      }
      return true
    }
  }

  // ========== Excel导入相关方法 ==========
  /**
   * 建立图片链接到商品的映射关系
   * 在Excel导入后调用，用于后续的图片匹配
   * 
   * @param {string[]} productIds - 商品ID数组
   * @param {string[]} productSpus - 商品SPU数组
   * @param {string[]} productImages - 商品图片链接数组（已归一化）
   */
  const buildImageToProductMapping = (productIds, productSpus, productImages) => {
    // 保存原始数据
    productDataMapping.value.productIds = productIds
    productDataMapping.value.productSpus = productSpus
    
    // 建立映射关系
    const mapping = {}
    productImages.forEach((imageUrl, index) => {
      const normalizedUrl = normalizeUrl(imageUrl)
      if (normalizedUrl && productIds[index] && productSpus[index]) {
        mapping[normalizedUrl] = {
          productId: productIds[index],
          productSpu: productSpus[index]
        }
      }
    })
    
    productDataMapping.value.imageToProduct = mapping
    console.log('✅ [Store] 已建立图片到商品的映射关系，共', Object.keys(mapping).length, '条')
  }

  /**
   * 扫描素材库并打标签
   * Excel导入后，扫描imageStitch store中的素材，为匹配的素材打上商品信息标签
   * 
   * @param {string[]} productIds - 商品ID数组
   * @param {string[]} productSpus - 商品SPU数组
   * @param {string[]} productImages - 商品图片链接数组（原始URL，未归一化）
   */
  const scanAndTagMaterials = (productIds, productSpus, productImages) => {
    // 动态导入imageStitchStore（避免循环依赖）
    import('./imageStitch').then(({ useImageStitchStore }) => {
      const imageStitchStore = useImageStitchStore()
      
      productImages.forEach((imageUrl, index) => {
        const normalizedUrl = normalizeUrl(imageUrl)
        const productId = productIds[index]
        const productSpu = productSpus[index]
        
        // 在素材库中查找匹配的素材
        const matchedMaterial = imageStitchStore.materials.find(material => {
          const materialUrl = normalizeUrl(material.originalUrl || material.publicUrl || '')
          return materialUrl === normalizedUrl
        })
        
        if (matchedMaterial) {
          // 给素材打上商品信息标签
          matchedMaterial.productInfo = {
            productId,
            productSpu,
            productImage: imageUrl
          }
          console.log(`✅ [Store] 素材已标记商品信息: ${matchedMaterial.id} -> ${productId}/${productSpu}`)
        }
      })
    }).catch(error => {
      console.warn('⚠️ [Store] 扫描素材库失败（可能imageStitchStore未初始化）:', error)
    })
  }

  // ========== 外链同步相关方法 ==========
  /**
   * 添加外链（智能切换模式）
   * 首次从拼图同步时，如果之前有Excel数据，则覆盖；否则追加
   * 
   * @param {string} externalLink - 外链URL
   * @param {Array} imageLinks - 图片链接数组，每个元素包含 { link, productInfo? }
   */
  const addExternalLink = (externalLink, imageLinks) => {
    // 去重检查：检查外链是否已存在
    const normalizedExternalLink = normalizeUrl(externalLink)
    const existing = productDataMapping.value.externalLinks.find(
      item => normalizeUrl(item.externalLink) === normalizedExternalLink
    )
    
    if (existing) {
      ElMessage.warning('该外链已同步过，不再重复追加')
      return
    }
    
    // 构建外链记录
    const linkRecord = {
      externalLink,
      imageLinks: imageLinks.map(item => normalizeUrl(item.link)),
      productInfo: imageLinks.map(item => item.productInfo).filter(Boolean) // 商品信息（如果有）
    }
    
    // 智能切换逻辑
    const isFirstStitchSync = syncSource.value === 'excel' || 
                             (syncSource.value === 'none' && productDataMapping.value.externalLinks.length === 0)
    
    if (isFirstStitchSync && syncSource.value === 'excel') {
      // 覆盖模式：首次从拼图同步，且之前有Excel数据
      productDataMapping.value.externalLinks = [linkRecord]
      formData['商品图片链接'] = externalLink
      ElMessage.info('首次同步外链，已覆盖Excel导入的图片链接')
    } else {
      // 追加模式：后续同步或首次同步但之前没有Excel数据
      productDataMapping.value.externalLinks.push(linkRecord)
      const existingLinks = formData['商品图片链接'] ? 
        formData['商品图片链接'].split('\n').filter(l => l.trim()) : []
      existingLinks.push(externalLink)
      formData['商品图片链接'] = existingLinks.join('\n')
    }
    
    // 更新同步来源标记
    syncSource.value = 'stitch'
    
    // 更新映射关系（如果图片链接有对应的商品信息）
    updateImageLinkMapping()
    
    console.log('✅ [Store] 已添加外链:', externalLink)
  }

  /**
   * 更新图片链接映射关系
   * 当外链同步时，如果图片链接有对应的商品信息，更新映射
   */
  const updateImageLinkMapping = () => {
    productDataMapping.value.externalLinks.forEach(linkRecord => {
      linkRecord.imageLinks.forEach((imageLink, index) => {
        const normalizedLink = normalizeUrl(imageLink)
        const productInfo = linkRecord.productInfo?.[index]
        
        if (productInfo && !productDataMapping.value.imageToProduct[normalizedLink]) {
          productDataMapping.value.imageToProduct[normalizedLink] = {
            productId: productInfo.productId,
            productSpu: productInfo.productSpu
          }
        }
      })
    })
  }

  // ========== 数据对齐相关方法 ==========
  /**
   * 对齐数据
   * 根据外链和图片链接，匹配商品ID和SPU，按3:1规则对齐
   */
  const alignData = () => {
    if (workflowMode.value !== 'stitch_sync') {
      ElMessage.warning('请先切换到拼图对齐模式')
      return
    }
    
    // 校验
    if (!validateStrictThree()) {
      return
    }
    
    // 对齐逻辑
    const externalLinks = productDataMapping.value.externalLinks || []
    const alignedProductIds = []
    const alignedProductSpus = []
    
    externalLinks.forEach((linkRecord) => {
      const { imageLinks, productInfo } = linkRecord
      
      // 优先使用素材自带的商品信息（最准确）
      if (productInfo && productInfo.length === 3) {
        productInfo.forEach(info => {
          alignedProductIds.push(info.productId)
          alignedProductSpus.push(info.productSpu)
        })
      } else {
        // 降级：通过图片链接查找映射表
        imageLinks.forEach(imageLink => {
          const normalizedLink = normalizeUrl(imageLink)
          const product = productDataMapping.value.imageToProduct[normalizedLink]
          if (product) {
            alignedProductIds.push(product.productId)
            alignedProductSpus.push(product.productSpu)
          }
        })
      }
    })
    
    // 更新表单
    formData['商品ID'] = alignedProductIds.join('\n')
    formData['商品SPU'] = alignedProductSpus.join('\n')
    
    ElMessage.success('数据对齐完成')
    console.log('✅ [Store] 数据对齐完成，共对齐', externalLinks.length, '组数据')
  }

  // ========== 校验函数 ==========
  /**
   * 严格的三倍数校验（仅拼图对齐模式）
   * 校验外链数量 × 3 是否等于商品ID数量
   * 
   * @returns {boolean} 校验是否通过
   */
  /**
   * 解析层函数：从表单文本框中实时解析有效的外链列表
   * 
   * 技术原理：
   * 1. 按换行符分割文本
   * 2. 去除每行的首尾空格
   * 3. 过滤掉空行（确保统计准确）
   * 
   * 设计理念：
   * - 以表单为准：直接读取用户当前在文本框中看到的数据
   * - 实时解析：每次调用都重新解析，反映最新的用户操作
   * - 健壮性：处理空行和空格，确保统计准确
   * 
   * @returns {string[]} 有效的外链数组
   */
  const getFormLinks = () => {
    const linksText = formData['商品图片链接'] || ''
    
    // 按换行符分割，去除空格，过滤空行
    return linksText
      .split('\n')
      .map(link => link.trim())
      .filter(link => link !== '') // 过滤空行，这才是用户真正想要的外链
  }

  /**
   * 严格的三倍数校验（仅拼图对齐模式）
   * 
   * 核心设计理念：基于"实时解析"的校验 + 精准报错
   * - 校验脱离 Store 计数：完全基于 formData['商品图片链接'] 文本框内解析出的实时行数
   * - Store 职责定位：Store 仅作为"映射字典"使用，不参与计数
   * - 健壮性：在解析文本框时，务必处理好空行和空格，确保统计的链接数量是准确的
   * - 精准报错：检测具体哪一组外链缺失商品ID，并提示精确的行号范围
   * 
   * 修复问题：
   * - 之前使用 Store 中的 externalLinks 数组，导致用户删除表单外链后校验仍然使用旧数据
   * - 现在改为实时解析表单文本框，确保校验与实际数据一致
   * - 优化错误提示：从"数据不匹配"改为"第X组外链缺失对应的商品ID，请检查第Y-Z行"
   * 
   * 行号计算公式：
   * - textarea的行号是从1开始的
   * - 第groupIndex组（从1开始）对应的商品ID行号范围：
   *   起始行 = (groupIndex - 1) * 3 + 1
   *   结束行 = (groupIndex - 1) * 3 + 3
   * - 例如：第3组对应的行号范围是 (3-1)*3+1 到 (3-1)*3+3，即第7、8、9行
   * 
   * @returns {boolean} 校验是否通过
   */
  const validateStrictThree = () => {
    // 只在拼图对齐模式下校验
    if (workflowMode.value !== 'stitch_sync') {
      return true
    }
    
    // ========== 步骤1：实时解析表单中的外链数量（主数据源） ==========
    /**
     * 使用解析层函数获取表单中的有效外链列表
     * 这是用户当前在文本框中看到的数据，是校验的基准
     */
    const currentLinks = getFormLinks()
    const linkCount = currentLinks.length // 例如：3个
    
    // ========== 步骤2：解析表单中的商品ID数量 ==========
    /**
     * 从表单中获取商品ID数量
     * 同样需要处理空行和空格，确保统计准确
     */
    const productIds = formData['商品ID'] ? 
      formData['商品ID'].split('\n').map(id => id.trim()).filter(id => id !== '') : []
    const idCount = productIds.length // 例如：9个
    
    // ========== 步骤3：校验核心逻辑 ==========
    /**
     * 校验核心：idCount === linkCount * 3
     * 例如：9 === 3 * 3 ✓
     * 
     * 如果不符合3:1关系，说明数据不完整或不对齐
     */
    
    // 检查是否有外链
    if (linkCount === 0) {
      ElMessage.warning('请先同步外链或在"商品图片链接"中输入外链')
      return false
    }
    
    // 计算期望的商品ID数量
    const requiredIdCount = linkCount * 3
    
    // 校验是否符合3:1关系
    if (idCount !== requiredIdCount) {
      // ========== 精准报错：检测具体哪一组缺失商品ID ==========
      /**
       * 技术原理：
       * 1. 遍历每一组外链（从第1组开始）
       * 2. 计算每组应该对应的商品ID行号范围
       * 3. 检查该范围内是否有足够的商品ID
       * 4. 找出第一个缺失的组，并提示精确的行号范围
       */
      
      // 找出第一个缺失商品ID的组
      let missingGroupIndex = null
      for (let groupIndex = 1; groupIndex <= linkCount; groupIndex++) {
        // 计算该组对应的商品ID行号范围（从1开始）
        const startRow = (groupIndex - 1) * 3 + 1  // 起始行
        const endRow = (groupIndex - 1) * 3 + 3    // 结束行
        
        // 检查该范围内是否有足够的商品ID
        // 如果idCount小于endRow，说明这一组缺失
        if (idCount < endRow) {
          missingGroupIndex = groupIndex
          break
        }
      }
      
      // 构建精准的错误提示
      let errorMessage = `数据不匹配！\n\n`
      errorMessage += `当前有 ${linkCount} 个外链，需要 ${requiredIdCount} 个商品ID。\n`
      errorMessage += `但实际检测到 ${idCount} 个商品ID。\n\n`
      
      if (missingGroupIndex) {
        // 计算缺失组的行号范围
        const startRow = (missingGroupIndex - 1) * 3 + 1
        const endRow = (missingGroupIndex - 1) * 3 + 3
        errorMessage += `❌ 第 ${missingGroupIndex} 组外链缺失对应的商品ID，请检查第 ${startRow}-${endRow} 行。\n\n`
      }
      
      errorMessage += `提示：\n`
      errorMessage += `1. 每个拼图需要3张图片对应3个商品ID\n`
      errorMessage += `2. 请检查Excel数据是否有遗漏\n`
      errorMessage += `3. 可以点击"数据对齐"按钮自动对齐数据`
      
      ElMessageBox.alert(
        errorMessage,
        '校验失败',
        { type: 'error', confirmButtonText: '知道了' }
      )
      return false
    }
    
    return true
  }

  /**
   * 行数相等校验（所有模式通用）
   * 校验商品ID和商品SPU的行数是否一致
   * 
   * 优化：精准报错，提示具体哪一行缺失数据
   * - 如果商品ID行数多，提示第X行缺失商品SPU
   * - 如果商品SPU行数多，提示第X行缺失商品ID
   * - textarea的行号是从1开始的
   * 
   * @returns {boolean} 校验是否通过
   */
  const validateRowCountMatch = () => {
    // 解析商品ID和商品SPU（保留空行以保持位置对应）
    const productIdsRaw = formData['商品ID'] ? formData['商品ID'].split('\n') : []
    const productSpusRaw = formData['商品SPU'] ? formData['商品SPU'].split('\n') : []
    
    // 过滤空行的版本（用于统计）
    const productIds = productIdsRaw.map(id => id.trim()).filter(id => id !== '')
    const productSpus = productSpusRaw.map(spu => spu.trim()).filter(spu => spu !== '')
    
    // 行数相等，校验通过
    if (productIds.length === productSpus.length) {
      return true
    }
    
    // ========== 精准报错：找出具体哪一行缺失数据 ==========
    /**
     * 技术原理：
     * 1. 比较商品ID和商品SPU的行数差异
     * 2. 找出第一个不匹配的位置（考虑空行）
     * 3. 提示具体的行号和缺失的字段
     */
    
    let errorMessage = `数据不一致！\n\n`
    errorMessage += `商品ID有 ${productIds.length} 行\n`
    errorMessage += `商品SPU有 ${productSpus.length} 行\n\n`
    
    // 找出第一个不匹配的行（考虑空行）
    const maxLength = Math.max(productIdsRaw.length, productSpusRaw.length)
    let missingRow = null
    let missingField = null
    
    for (let i = 0; i < maxLength; i++) {
      const idExists = productIdsRaw[i] && productIdsRaw[i].trim() !== ''
      const spuExists = productSpusRaw[i] && productSpusRaw[i].trim() !== ''
      
      // 找到第一个不匹配的行（一个存在，另一个不存在）
      if (idExists && !spuExists) {
        missingRow = i + 1  // 行号从1开始
        missingField = '商品SPU'
        break
      } else if (!idExists && spuExists) {
        missingRow = i + 1  // 行号从1开始
        missingField = '商品ID'
        break
      }
    }
    
    // 如果找不到具体位置（可能是末尾缺失），使用行数差异提示
    if (missingRow) {
      errorMessage += `❌ 第 ${missingRow} 行缺失${missingField}，请检查并补齐。\n\n`
    } else if (productIds.length > productSpus.length) {
      // 商品ID更多，说明末尾缺失商品SPU
      errorMessage += `❌ 第 ${productSpus.length + 1} 行起缺失商品SPU，请检查并补齐。\n\n`
    } else {
      // 商品SPU更多，说明末尾缺失商品ID
      errorMessage += `❌ 第 ${productIds.length + 1} 行起缺失商品ID，请检查并补齐。\n\n`
    }
    
    errorMessage += `请确保商品ID和商品SPU的行数一致，且一一对应。`
    
    ElMessageBox.alert(
      errorMessage,
      '数据校验失败',
      { type: 'warning', confirmButtonText: '知道了' }
    )
    return false
  }

  /**
   * 检查对齐状态
   * 返回对齐状态的详细信息，用于可视化预览
   * 
   * @returns {Object|null} 对齐状态对象，如果不是拼图对齐模式则返回null
   */
  const checkAlignmentStatus = () => {
    if (workflowMode.value !== 'stitch_sync') return null
    
    const externalLinks = productDataMapping.value.externalLinks || []
    const imageToProduct = productDataMapping.value.imageToProduct || {}
    
    const groups = externalLinks.map((linkRecord) => {
      const { externalLink, imageLinks, productInfo } = linkRecord
      
      // 优先使用productInfo
      let products = []
      if (productInfo && productInfo.length > 0) {
        products = productInfo.map(info => ({
          matched: true,
          id: info.productId,
          spu: info.productSpu
        }))
      } else {
        products = imageLinks.map(imageLink => {
          const normalizedLink = normalizeUrl(imageLink)
          const product = imageToProduct[normalizedLink]
          return {
            imageLink,
            matched: !!product,
            id: product?.productId || null,
            spu: product?.productSpu || null
          }
        })
      }
      
      const matchedCount = products.filter(p => p.matched).length
      const complete = matchedCount === 3
      
      return {
        externalLink,
        products,
        matched: matchedCount,
        complete
      }
    })
    
    const alignedCount = groups.filter(g => g.complete).length
    const incompleteCount = groups.filter(g => !g.complete && g.matched > 0).length
    const unmatchedCount = groups.reduce((sum, g) => {
      return sum + g.products.filter(p => !p.matched).length
    }, 0)
    
    return {
      totalGroups: groups.length,
      alignedCount,
      incompleteCount,
      unmatchedCount,
      allAligned: alignedCount === groups.length && groups.length > 0,
      groups
    }
  }

  return {
    // 状态
    formData,
    isAdvancedAudience,
    generating,
    workflowMode,
    syncSource,
    productDataMapping,
    
    // 方法
    resetFormData,
    updateFormData,
    getFormData,
    setGenerating,
    toggleAdvancedAudience,
    handleModeChange,
    buildImageToProductMapping,
    scanAndTagMaterials,
    addExternalLink,
    alignData,
    validateStrictThree,
    validateRowCountMatch,
    checkAlignmentStatus
  }
}, {
  // 持久化配置
  persist: {
    key: 'ad-campaign-data',
    storage: window.localStorage,
    paths: ['productDataMapping', 'workflowMode', 'syncSource']
  }
})
