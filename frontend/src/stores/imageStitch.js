import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { normalizeUrl } from '@/utils/urlNormalize'

export const useImageStitchStore = defineStore('imageStitch', () => {
  // 素材列表 - 存储已下载的图片
  const materials = ref([])

  // 画布槽位 - 存储三个槽位的数据（增强版：包含素材ID和商品信息）
  const canvasSlots = reactive({
    left: null,        // 左侧大图 (800x1200) - 存储 { materialId, productInfo? }
    topRight: null,    // 右上小图 (400x400) - 存储 { materialId, productInfo? }
    bottomRight: null // 右下小图 (400x400) - 存储 { materialId, productInfo? }
  })

  // ========== 核心状态：比例系统（底层驱动） ==========
  // 这是唯一的数据源，所有像素值都从这里计算得出
  // 优势：保证画布始终是1:1，无需额外调整逻辑
  const layoutRatios = reactive({
    splitX: 0.6667,    // 垂直分割线位置（0.0-1.0）
                       // 0.6667 = 800/1200，表示左侧占66.67%，右侧占33.33%
    splitY: 0.5,       // 右侧水平分割线位置（0.0-1.0）
                       // 0.5 = 600/1200，表示右上和右下各占50%
    canvasSize: 1200   // 画布总尺寸（1:1正方形，宽度=高度=1200）
  })

  // ========== 计算属性：从比例计算像素值 ==========
  // 这是唯一的数据源，所有显示和传递给后端的值都从这里计算
  // 使用 computed 的好处：
  // 1. 单一数据源：只修改比例，像素值自动更新
  // 2. 保证一致性：不会出现比例和像素值不一致的情况
  // 3. 响应式：比例改变时，所有依赖自动更新
  const imageSizes = computed(() => {
    const size = layoutRatios.canvasSize      // 1200
    const splitX = layoutRatios.splitX         // 0.6667
    const splitY = layoutRatios.splitY         // 0.5
    
    // 计算左侧尺寸
    const leftWidth = Math.round(size * splitX)  // 800 = 1200 × 0.6667
    const leftHeight = size                       // 1200（左侧占满高度）
    
    // 计算右侧尺寸
    const rightWidth = size - leftWidth           // 400 = 1200 - 800
    const topRightHeight = Math.round(size * splitY)      // 600 = 1200 × 0.5
    const bottomRightHeight = size - topRightHeight        // 600 = 1200 - 600
    
    return {
      left: {
        width: leftWidth,      // 800
        height: leftHeight     // 1200
      },
      topRight: {
        width: rightWidth,           // 400
        height: topRightHeight       // 600
      },
      bottomRight: {
        width: rightWidth,            // 400
        height: bottomRightHeight     // 600
      }
    }
  })

  // ========== 初始化方法：从默认值计算比例 ==========
  // 新默认值：左侧800×1200，右上400×600，右下400×600
  // 这个默认值本身就是1:1（1200×1200），完美！
  const initRatiosFromDefault = () => {
    const defaultSizes = {
      left: { width: 800, height: 1200 },
      topRight: { width: 400, height: 600 },
      bottomRight: { width: 400, height: 600 }
    }
    
    // 计算画布尺寸（验证是否为1:1）
    const canvasWidth = defaultSizes.left.width + defaultSizes.topRight.width  // 1200
    const canvasHeight = Math.max(
      defaultSizes.left.height,
      defaultSizes.topRight.height + defaultSizes.bottomRight.height
    )  // 1200
    
    if (canvasWidth !== canvasHeight) {
      console.warn('⚠️ [Store] 默认值不是1:1，将自动调整')
      layoutRatios.canvasSize = Math.max(canvasWidth, canvasHeight)
    } else {
      layoutRatios.canvasSize = canvasWidth  // 1200
    }
    
    // 计算比例
    layoutRatios.splitX = defaultSizes.left.width / canvasWidth  // 800/1200 = 0.6667
    layoutRatios.splitY = defaultSizes.topRight.height / (defaultSizes.topRight.height + defaultSizes.bottomRight.height)  // 600/1200 = 0.5
    
    console.log('📐 [Store] 初始化比例系统:', {
      splitX: layoutRatios.splitX,
      splitY: layoutRatios.splitY,
      canvasSize: layoutRatios.canvasSize
    })
  }

  // ========== 更新方法：从像素值反向计算比例 ==========
  // 当用户修改输入框或拖动分割线时，通过这些方法更新比例

  /**
   * 从左侧宽度更新 splitX
   * 当用户修改"左侧主图宽度"输入框时调用
   * @param {number} leftWidth - 左侧宽度（像素）
   */
  const updateSplitXFromLeftWidth = (leftWidth) => {
    const size = layoutRatios.canvasSize
    
    // 限制范围：确保左侧和右侧都至少有100px
    // 这是极端情况预防，防止用户把某张图拖到0像素导致消失
    const MIN_PX = 100
    const maxLeftWidth = size - MIN_PX
    const clampedWidth = Math.max(MIN_PX, Math.min(maxLeftWidth, leftWidth))
    
    // 计算新的 splitX（比例 = 像素值 / 总尺寸）
    layoutRatios.splitX = clampedWidth / size
    
    console.log(`📐 [Store] 从左侧宽度更新 splitX: ${leftWidth}px → ${layoutRatios.splitX.toFixed(4)}`)
    console.log(`  - 左侧宽度: ${clampedWidth}px`)
    console.log(`  - 右侧宽度: ${size - clampedWidth}px`)
  }

  /**
   * 从右上高度更新 splitY
   * 当用户修改"右上细节图高度"输入框时调用
   * @param {number} topRightHeight - 右上高度（像素）
   */
  const updateSplitYFromTopRightHeight = (topRightHeight) => {
    const size = layoutRatios.canvasSize
    
    // 限制范围：确保右上和右下都至少有100px
    const MIN_PX = 100
    const maxTopRightHeight = size - MIN_PX
    const clampedHeight = Math.max(MIN_PX, Math.min(maxTopRightHeight, topRightHeight))
    
    // 计算新的 splitY（比例 = 像素值 / 总尺寸）
    layoutRatios.splitY = clampedHeight / size
    
    console.log(`📐 [Store] 从右上高度更新 splitY: ${topRightHeight}px → ${layoutRatios.splitY.toFixed(4)}`)
    console.log(`  - 右上高度: ${clampedHeight}px`)
    console.log(`  - 右下高度: ${size - clampedHeight}px`)
  }

  /**
   * 更新画布总尺寸
   * 当用户修改"画布总尺寸"输入框时调用
   * 注意：修改画布尺寸时，splitX 和 splitY 保持不变，只是等比例缩放所有内容
   * @param {number} newSize - 新的画布尺寸（像素）
   */
  const updateCanvasSize = (newSize) => {
    // 限制范围：200-2000px
    const clampedSize = Math.max(200, Math.min(2000, newSize))
    
    // 更新画布尺寸
    layoutRatios.canvasSize = clampedSize
    
    // 注意：splitX 和 splitY 保持不变，只是等比例缩放
    // 这样所有区域的尺寸都会按比例缩放，但比例关系不变
    // 例如：如果 splitX = 0.6667，canvasSize 从 1200 变为 900
    // 左侧宽度：1200 × 0.6667 = 800 → 900 × 0.6667 = 600（等比例缩放）
    
    console.log(`📐 [Store] 更新画布总尺寸: ${clampedSize}px`)
    console.log(`  - splitX 保持不变: ${layoutRatios.splitX.toFixed(4)}`)
    console.log(`  - splitY 保持不变: ${layoutRatios.splitY.toFixed(4)}`)
    
    // 输出新的像素值（用于验证）
    const sizes = imageSizes.value
    console.log(`  - 左侧: ${sizes.left.width} × ${sizes.left.height}px`)
    console.log(`  - 右上: ${sizes.topRight.width} × ${sizes.topRight.height}px`)
    console.log(`  - 右下: ${sizes.bottomRight.width} × ${sizes.bottomRight.height}px`)
  }

  /**
   * 方法：添加素材到列表（增强版 - 自动扫描商品信息）
   * 当新素材上传时，自动检查adCampaignStore的映射表，如果匹配就自动打标签
   * 
   * @param {Object} material - 素材对象
   * material 对象结构：
   * {
   *   id: 'uuid',
   *   originalUrl: 'https://...',
   *   localPath: '/temp/xxx.jpg',
   *   publicUrl: 'http://localhost:18083/temp/xxx.jpg',
   *   previewUrl: 'http://localhost:18083/temp/xxx.jpg'
   * }
   */
  const addMaterial = async (material) => {
    // 1. 添加到素材列表（原有逻辑）
    materials.value.push(material)
    console.log('📦 [ImageStitch Store] 添加素材:', material.id)
    
    // 2. 自动扫描商品信息（新增逻辑）
    // 使用异步，避免阻塞主流程
    autoScanProductInfo(material).catch(error => {
      // 静默处理错误，不影响素材添加
      console.warn('⚠️ [ImageStitch Store] 自动扫描商品信息失败:', error)
    })
  }

  /**
   * 自动扫描商品信息（新增方法）
   * 当新素材上传时，自动检查adCampaignStore的映射表，如果匹配就自动打标签
   * 
   * 工作原理：
   * 1. 获取素材的URL（尝试多个可能的字段）
   * 2. 归一化URL
   * 3. 在adCampaignStore的映射表中查找
   * 4. 如果找到匹配的商品信息，自动打标签
   * 
   * @param {Object} material - 素材对象
   */
  const autoScanProductInfo = async (material) => {
    try {
      // 动态导入adCampaignStore（避免循环依赖）
      const { useAdCampaignStore } = await import('./adCampaign')
      const adCampaignStore = useAdCampaignStore()
      
      // 获取素材的URL（尝试多个可能的字段）
      const materialUrl = material.originalUrl || material.publicUrl || material.previewUrl || ''
      if (!materialUrl) {
        return // 没有URL，无法匹配
      }
      
      // 归一化URL
      const normalizedUrl = normalizeUrl(materialUrl)
      if (!normalizedUrl) {
        return
      }
      
      // 在adCampaignStore的映射表中查找
      const imageToProduct = adCampaignStore.productDataMapping?.imageToProduct || {}
      const productInfo = imageToProduct[normalizedUrl]
      
      if (productInfo) {
        // 找到匹配的商品信息，自动打标签
        material.productInfo = {
          productId: productInfo.productId,
          productSpu: productInfo.productSpu,
          productImage: materialUrl
        }
        console.log(`✅ [ImageStitch Store] 素材自动标记商品信息: ${material.id} -> ${productInfo.productId}/${productInfo.productSpu}`)
        
        // 可选：显示提示（避免过于频繁的提示，可以设置一个标志）
        // 只在第一次匹配时提示，或者使用防抖
        if (!material._hasShownMatchTip) {
          // ElMessage.success(`素材已自动关联商品: ${productInfo.productId}`)
          material._hasShownMatchTip = true
        }
      } else {
        console.log(`ℹ️ [ImageStitch Store] 素材未找到匹配的商品信息: ${material.id}`)
      }
    } catch (error) {
      // 如果adCampaignStore不存在或未初始化，静默失败（不影响素材添加）
      // 这种情况可能发生在：
      // 1. adCampaignStore还未初始化
      // 2. 用户还没有导入Excel数据
      // 3. 模块导入失败
      console.warn('⚠️ [ImageStitch Store] 自动扫描商品信息失败（可能adCampaignStore未初始化）:', error.message)
    }
  }

  /**
   * 批量添加素材（可选优化）
   * 如果用户批量上传多个素材，可以优化为批量扫描
   * 
   * @param {Array} materialsArray - 素材对象数组
   */
  const addMaterials = (materialsArray) => {
    materialsArray.forEach(material => {
      materials.value.push(material)
      // 异步扫描，不阻塞主流程
      autoScanProductInfo(material).catch(() => {
        // 静默处理错误
      })
    })
    
    console.log(`📦 [ImageStitch Store] 批量添加 ${materialsArray.length} 个素材`)
  }

  // 方法：从列表中删除素材
  const removeMaterial = (materialId) => {
    const index = materials.value.findIndex(m => m.id === materialId)
    if (index > -1) {
      materials.value.splice(index, 1)
      console.log('🗑️ [Store] 删除素材:', materialId)
      
      // 如果该素材在画布槽位中，也要清空对应的槽位
      // 注意：现在 canvasSlots 存储的是对象，需要检查 materialId 属性
      if (canvasSlots.left && (canvasSlots.left.materialId === materialId || canvasSlots.left === materialId)) {
        canvasSlots.left = null
      }
      if (canvasSlots.topRight && (canvasSlots.topRight.materialId === materialId || canvasSlots.topRight === materialId)) {
        canvasSlots.topRight = null
      }
      if (canvasSlots.bottomRight && (canvasSlots.bottomRight.materialId === materialId || canvasSlots.bottomRight === materialId)) {
        canvasSlots.bottomRight = null
      }
    }
  }

  // 方法：根据 ID 获取素材
  const getMaterialById = (materialId) => {
    return materials.value.find(m => m.id === materialId) || null
  }

  /**
   * 方法：设置画布槽位（增强版：支持记录商品信息）
   * @param {string} slot - 槽位名称：'left' | 'topRight' | 'bottomRight'
   * @param {string} materialId - 素材的 ID，如果为 null 则清空槽位
   * @param {Object} productInfo - 可选，商品信息 { productId, productSpu, productImage }
   */
  const setCanvasSlot = (slot, materialId, productInfo = null) => {
    // slot 可以是: 'left', 'topRight', 'bottomRight'
    if (['left', 'topRight', 'bottomRight'].includes(slot)) {
      if (materialId === null) {
        // 清空槽位
        canvasSlots[slot] = null
        console.log(`🧹 [Store] 清空槽位 ${slot}`)
      } else {
        // 设置槽位，包含素材ID和商品信息
        canvasSlots[slot] = {
          materialId,
          productInfo: productInfo || null
        }
        console.log(`🎨 [Store] 设置槽位 ${slot}:`, {
          materialId,
          hasProductInfo: !!productInfo
        })
      }
    } else {
      console.warn('⚠️ [Store] 无效的槽位名称:', slot)
    }
  }

  // 方法：清空指定槽位
  const clearCanvasSlot = (slot) => {
    if (['left', 'topRight', 'bottomRight'].includes(slot)) {
      canvasSlots[slot] = null
      console.log(`🧹 [Store] 清空槽位 ${slot}`)
    }
  }

  // 方法：重置整个画布（清空所有槽位）
  const resetCanvas = () => {
    canvasSlots.left = null
    canvasSlots.topRight = null
    canvasSlots.bottomRight = null
    console.log('🔄 [Store] 重置画布')
  }

  // 方法：检查画布是否已填满（三个槽位都有素材）
  const isCanvasComplete = () => {
    // 兼容新旧格式：可能是对象 { materialId, productInfo } 或直接是 materialId
    const hasLeft = canvasSlots.left !== null && 
                   (typeof canvasSlots.left === 'object' ? canvasSlots.left.materialId : canvasSlots.left)
    const hasTopRight = canvasSlots.topRight !== null && 
                       (typeof canvasSlots.topRight === 'object' ? canvasSlots.topRight.materialId : canvasSlots.topRight)
    const hasBottomRight = canvasSlots.bottomRight !== null && 
                          (typeof canvasSlots.bottomRight === 'object' ? canvasSlots.bottomRight.materialId : canvasSlots.bottomRight)
    
    return hasLeft && hasTopRight && hasBottomRight
  }

  /**
   * 获取槽位的素材ID（兼容新旧格式）
   * @param {string} slot - 槽位名称
   * @returns {string|null} 素材ID
   */
  const getSlotMaterialId = (slot) => {
    const slotData = canvasSlots[slot]
    if (!slotData) return null
    // 兼容新旧格式
    return typeof slotData === 'object' ? slotData.materialId : slotData
  }

  /**
   * 获取槽位的商品信息
   * @param {string} slot - 槽位名称
   * @returns {Object|null} 商品信息 { productId, productSpu, productImage }
   */
  const getSlotProductInfo = (slot) => {
    const slotData = canvasSlots[slot]
    if (!slotData || typeof slotData !== 'object') return null
    return slotData.productInfo || null
  }

  /**
   * 获取所有槽位的商品信息（用于外链同步）
   * @returns {Array} 商品信息数组，按 left, topRight, bottomRight 顺序
   */
  const getAllSlotsProductInfo = () => {
    return [
      getSlotProductInfo('left'),
      getSlotProductInfo('topRight'),
      getSlotProductInfo('bottomRight')
    ].filter(Boolean) // 过滤掉 null
  }

  // 方法：清空所有数据（重置整个 store）
  const clearAll = () => {
    materials.value = []
    resetCanvas()
    console.log('🗑️ [Store] 清空所有数据')
  }

  // 方法：设置指定图片区域的尺寸
  // 注意：在比例系统下，不能直接修改 imageSizes（它是计算属性）
  // 应该通过修改 layoutRatios 来实现
  // TODO: 重构这个方法，改为修改比例
  const setImageSize = (slot, dimension, value) => {
    console.warn('⚠️ [Store] setImageSize 在比例系统下需要重构，应该通过修改 layoutRatios 来实现')
    // 暂时不做任何操作，因为 imageSizes 是计算属性，不能直接修改
    // 后续会添加新的方法来通过比例修改尺寸
  }

  // 方法：自动调整右上和右下尺寸，确保画布是1:1正方形
  // 注意：在比例系统下，这个方法可能不再需要，因为比例系统已经保证了1:1
  // 但为了兼容现有代码，暂时保留
  // TODO: 后续可以重构或移除这个方法
  const adjustRightSizesForSquare = () => {
    // 注意：imageSizes 现在是计算属性，需要使用 .value 访问
    const sizes = imageSizes.value
    const leftWidth = sizes.left.width
    const leftHeight = sizes.left.height
    
    // 目标：总宽度 = 总高度
    // 总宽度 = leftWidth + topRightWidth
    // 总高度 = max(leftHeight, topRightHeight + bottomRightHeight) = max(leftHeight, 2 * topRightHeight)
    // 假设右上和右下相等：topRightWidth = topRightHeight = topRightSize
    
    // 情况1：如果 leftHeight >= 2 * topRightSize，那么总高度 = leftHeight
    // 需要：leftWidth + topRightSize = leftHeight
    // 所以：topRightSize = leftHeight - leftWidth
    
    // 情况2：如果 leftHeight < 2 * topRightSize，那么总高度 = 2 * topRightSize
    // 需要：leftWidth + topRightSize = 2 * topRightSize
    // 所以：leftWidth + topRightSize = 2 * topRightSize => leftWidth = topRightSize
    
    // 合并两种情况：
    let topRightSize
    if (2 * leftWidth >= leftHeight) {
      // 情况1成立：leftHeight >= 2 * topRightSize，总高度 = leftHeight
      // 需要：leftWidth + topRightSize = leftHeight
      // 所以：topRightSize = leftHeight - leftWidth
      topRightSize = leftHeight - leftWidth
    } else {
      // 情况2成立：leftHeight < 2 * topRightSize，总高度 = 2 * topRightSize
      // 需要：leftWidth + topRightSize = 2 * topRightSize
      // 所以：topRightSize = leftWidth
      topRightSize = leftWidth
    }
    
    // 限制在合理范围内（200-1200px）
    topRightSize = Math.max(200, Math.min(1200, topRightSize))
    
    // 注意：在比例系统下，不能直接修改 imageSizes（它是计算属性）
    // 应该通过修改 layoutRatios 来实现
    // 这里暂时只做日志输出，实际调整应该通过修改比例来实现
    // TODO: 重构这个方法，改为修改 layoutRatios
    console.warn('⚠️ [Store] adjustRightSizesForSquare 在比例系统下需要重构')
    
    // 验证计算结果
    const totalWidth = leftWidth + topRightSize
    const totalHeight = Math.max(leftHeight, 2 * topRightSize)
    
    console.log(`📐 [Store] 自动调整右上和右下尺寸为: ${topRightSize} × ${topRightSize}`)
    console.log(`📐 [Store] 调整后画布尺寸: ${totalWidth} × ${totalHeight} (${totalWidth === totalHeight ? '✅ 正方形' : '❌ 不是正方形'})`)
  }

  // 方法：重置所有图片尺寸为默认值
  // 在比例系统下，通过重置比例来实现
  const resetImageSizes = () => {
    // 直接调用初始化方法，重置比例
    initRatiosFromDefault()
    console.log('🔄 [Store] 重置图片尺寸为默认值（通过重置比例）')
  }

  // 计算属性：获取画布总尺寸（原始计算，不考虑1:1）
  // 在比例系统下，画布始终是1:1，所以这个方法返回的应该是正方形
  const getCanvasSize = () => {
    const sizes = imageSizes.value
    return {
      width: sizes.left.width + sizes.topRight.width,
      height: Math.max(
        sizes.left.height, 
        sizes.topRight.height + sizes.bottomRight.height
      )
    }
  }

  // 计算属性：获取1:1正方形画布尺寸
  // 在比例系统下，画布始终是1:1，所以直接返回 canvasSize
  const getCanvasSizeSquare = () => {
    // 在比例系统下，画布始终是1:1，直接返回
    const size = layoutRatios.canvasSize
    return {
      width: size,
      height: size,
      adjusted: false  // 比例系统下不需要调整
    }
    
    // 以下是旧逻辑，保留作为参考
    /*
    const sizes = imageSizes.value
    const currentWidth = sizes.left.width + sizes.topRight.width
    const currentHeight = Math.max(
      sizes.left.height,
      sizes.topRight.height + sizes.bottomRight.height
    )

    // 2. 如果已经是正方形，直接返回
    if (currentWidth === currentHeight) {
      return {
        width: currentWidth,
        height: currentHeight,
        adjusted: false // 标记是否进行了调整
      }
    }

    // 3. 计算目标正方形边长（取较大的值）
    const targetSize = Math.max(currentWidth, currentHeight)

    return {
      width: targetSize,
      height: targetSize,
      adjusted: true // 标记进行了调整
    }
    */
  }

  // 方法：获取调整后的尺寸配置（用于传递给后端生成1:1图片）
  // 在比例系统下，画布始终是1:1，所以直接返回当前尺寸
  const getAdjustedSizesForSquare = () => {
    // 在比例系统下，画布始终是1:1，直接返回当前尺寸
    const sizes = imageSizes.value
    return {
      left: { ...sizes.left },
      topRight: { ...sizes.topRight },
      bottomRight: { ...sizes.bottomRight },
      adjusted: false  // 比例系统下不需要调整
    }
    
    // 以下是旧逻辑，保留作为参考
    /*
    const sizes = imageSizes.value
    // 1. 计算当前画布尺寸
    const currentWidth = sizes.left.width + sizes.topRight.width
    const currentHeight = Math.max(
      sizes.left.height,
      sizes.topRight.height + sizes.bottomRight.height
    )

    // 2. 如果已经是正方形，直接返回原始尺寸
    if (currentWidth === currentHeight) {
      return {
        left: { ...sizes.left },
        topRight: { ...sizes.topRight },
        bottomRight: { ...sizes.bottomRight },
        adjusted: false
      }
    }

    // 3. 计算目标正方形边长
    const targetSize = Math.max(currentWidth, currentHeight)

    // 4. 初始化调整后的尺寸（复制原始尺寸）
    const adjusted = {
      left: { ...sizes.left },
      topRight: { ...sizes.topRight },
      bottomRight: { ...sizes.bottomRight },
      adjusted: true
    }

    // 5. 根据情况调整（智能调整策略，让布局更平衡）
    if (currentWidth < targetSize) {
      // 宽度不足，需要增加宽度
      // 等比例增加左侧和右上宽度
      const widthRatio = targetSize / currentWidth
      adjusted.left.width = Math.round(sizes.left.width * widthRatio)
      adjusted.topRight.width = Math.round(sizes.topRight.width * widthRatio)
      
      console.log(`📐 [Store] 宽度调整: ${currentWidth} → ${targetSize}, 比例: ${widthRatio}`)
      console.log(`  - 左侧宽度: ${sizes.left.width} → ${adjusted.left.width}`)
      console.log(`  - 右上宽度: ${sizes.topRight.width} → ${adjusted.topRight.width}`)
    } else if (currentHeight < targetSize) {
      // 高度不足，需要增加高度到targetSize
      // 策略：保持宽度不变，只增加高度
      // 让右侧两个区域的高度增加到 targetSize（等分），这样总高度 = max(leftHeight, targetSize)
      // 如果 leftHeight < targetSize，也增加到targetSize
      
      const eachRightHeight = Math.round(targetSize / 2)
      adjusted.topRight.height = eachRightHeight
      adjusted.bottomRight.height = eachRightHeight
      
      // 如果左侧高度小于targetSize，也增加到targetSize
      if (sizes.left.height < targetSize) {
        adjusted.left.height = targetSize
      }
      
      console.log(`📐 [Store] 高度调整: ${currentHeight} → ${targetSize}`)
      console.log(`  - 左侧高度: ${sizes.left.height} → ${adjusted.left.height}`)
      console.log(`  - 右上高度: ${sizes.topRight.height} → ${adjusted.topRight.height}`)
      console.log(`  - 右下高度: ${sizes.bottomRight.height} → ${adjusted.bottomRight.height}`)
    }

    // 6. 验证调整后的画布尺寸
    const adjustedWidth = adjusted.left.width + adjusted.topRight.width
    const adjustedHeight = Math.max(
      adjusted.left.height,
      adjusted.topRight.height + adjusted.bottomRight.height
    )
    
    if (adjustedWidth !== adjustedHeight) {
      console.warn(`⚠️ [Store] 调整后尺寸不匹配: ${adjustedWidth} × ${adjustedHeight}`)
    } else {
      console.log(`✅ [Store] 调整后尺寸: ${adjustedWidth} × ${adjustedHeight} (正方形)`)
    }

    return adjusted
    */
  }

  // ========== 初始化 ==========
  // 在Store创建时，从默认值初始化比例系统
  initRatiosFromDefault()

  return {
    // 状态
    materials,
    canvasSlots,
    layoutRatios,  // 新增：比例系统（核心状态）
    imageSizes,     // 改为计算属性，从比例自动计算
    
    // 方法
    addMaterial,
    removeMaterial,
    getMaterialById,
    setCanvasSlot,
    clearCanvasSlot,
    resetCanvas,
    isCanvasComplete,
    clearAll,
    setImageSize,
    resetImageSizes,
    getCanvasSize,
    getCanvasSizeSquare,
    getAdjustedSizesForSquare,
    adjustRightSizesForSquare,
    initRatiosFromDefault,  // 新增：初始化方法（可用于重置）
    
    // 新增：更新方法（用于输入框和拖动时修改比例）
    updateSplitXFromLeftWidth,      // 从左侧宽度更新 splitX
    updateSplitYFromTopRightHeight, // 从右上高度更新 splitY
    updateCanvasSize,                // 更新画布总尺寸（等比例缩放）
    
    // 新增：槽位商品信息相关方法
    getSlotMaterialId,              // 获取槽位的素材ID（兼容新旧格式）
    getSlotProductInfo,              // 获取槽位的商品信息
    getAllSlotsProductInfo           // 获取所有槽位的商品信息（用于外链同步）
  }
})


