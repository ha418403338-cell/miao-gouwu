/**
 * 单位换算工具
 * 重量类统一换算为克(g)，容量类统一换算为毫升(ml)
 * 片/个/包/卷/件 不做换算
 */

const UNIT_CATEGORY = {
  weight: ['g', 'kg'],
  volume: ['ml', 'L'],
  count: ['片', '个', '瓶', '罐', '盒', '袋', '包', '条', '块', '套', '双', '张', '卷', '件', '提'],
}

/**
 * 判断单位类别
 * @param {string} unit - 单位
 * @returns {string|null} 'weight' | 'volume' | 'count' | null
 */
export function getUnitCategory(unit) {
  if (UNIT_CATEGORY.weight.includes(unit)) return 'weight'
  if (UNIT_CATEGORY.volume.includes(unit)) return 'volume'
  if (UNIT_CATEGORY.count.includes(unit)) return 'count'
  return null
}

/**
 * 换算为标准单位的价格
 * @param {number} price - 价格（元）
 * @param {number} quantity - 数量
 * @param {string} unit - 单位
 * @returns {number} 标准化后的单位价格
 */
export function convertUnitPrice(price, quantity, unit) {
  const category = getUnitCategory(unit)
  if (!category || category === 'count') {
    return price / quantity
  }
  if (category === 'weight') {
    if (unit === 'kg') {
      return (price / quantity) * 1000
    }
    return price / quantity
  }
  if (category === 'volume') {
    if (unit === 'L') {
      return (price / quantity) * 1000
    }
    return price / quantity
  }
  return price / quantity
}

/**
 * 基于净含量计算单位价格
 * @param {number} price - 价格（元）
 * @param {number} quantity - 数量
 * @param {string} unit - 单位
 * @param {number} netContent - 单个净含量
 * @param {string} netContentUnit - 净含量单位
 * @returns {number} 基于净含量的单位价格
 */
export function convertNetContentUnitPrice(price, quantity, unit, netContent, netContentUnit) {
  if (!netContent || !netContentUnit) {
    return convertUnitPrice(price, quantity, unit)
  }
  
  // 换算净含量到最小单位
  let convertedNetContent = netContent
  if (netContentUnit === 'kg') {
    convertedNetContent = netContent * 1000
  } else if (netContentUnit === 'L') {
    convertedNetContent = netContent * 1000
  }
  
  const totalNetContent = quantity * convertedNetContent
  return price / totalNetContent
}

/**
 * 获取用于显示的标准单位
 * @param {string} unit - 原始单位
 * @returns {string} 标准单位
 */
export function getStandardUnit(unit) {
  const category = getUnitCategory(unit)
  if (category === 'weight') return 'g'
  if (category === 'volume') return 'ml'
  return unit
}

/**
 * 检查两个单位是否可以比较
 * @param {string} unit1 - 单位1
 * @param {string} unit2 - 单位2
 * @returns {boolean} 是否可以比较
 */
export function canCompare(unit1, unit2) {
  return getUnitCategory(unit1) === getUnitCategory(unit2)
}

/**
 * 检查单位是否为计数单位
 * @param {string} unit - 单位
 * @returns {boolean} 是否为计数单位
 */
export function isCountUnit(unit) {
  return getUnitCategory(unit) === 'count'
}

/**
 * 获取净含量的标准单位
 * @param {string} netContentUnit - 净含量单位
 * @returns {string} 标准单位
 */
export function getStandardNetContentUnit(netContentUnit) {
  if (netContentUnit === 'kg') return 'g'
  if (netContentUnit === 'L') return 'ml'
  return netContentUnit
}

/**
 * 净含量单位选项
 */
export const NET_CONTENT_UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', '抽', '包']
