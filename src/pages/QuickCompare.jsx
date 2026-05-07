import { useState, useEffect, useRef } from 'react'
import useProducts from '../hooks/useProducts'
import usePlans from '../hooks/usePlans'
import fuzzyMatch from '../utils/fuzzyMatch'
import { convertUnitPrice, convertNetContentUnitPrice, isCountUnit, canCompare, getStandardNetContentUnit } from '../utils/unitConverter'
import { PLATFORM_OPTIONS, UNIT_OPTIONS, CATEGORY_OPTIONS, NET_CONTENT_UNIT_OPTIONS } from '../utils/constants'

function createEmptyRow() {
  return {
    rowId: Date.now().toString(36) + Math.random().toString(36).substring(2),
    productName: '',
    brand: '',
    spec: '',
    quantity: '',
    unit: 'g',
    price: '',
    platform: '淘宝',
    category: '粮油调料',
    netContent: '',
    netContentUnit: 'g',
  }
}

export default function QuickCompare() {
  const { products, addProduct } = useProducts()
  const { addToCart } = usePlans()
  const [rows, setRows] = useState([createEmptyRow()])
  const [compareResult, setCompareResult] = useState(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveFormData, setSaveFormData] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const isInitialized = useRef(false)
  
  // 单品实时比价状态
  const [singleItem, setSingleItem] = useState({
    productName: '',
    brand: '',
    spec: '',
    quantity: '',
    unit: 'g',
    price: '',
    platform: '淘宝',
    netContent: '',
    netContentUnit: 'g',
    converterUsed: false,
    converterMainUnit: 1,
    converterMiddleUnit: 1,
    converterMiddleUnitName: '',
  })
  const [singleItemMatches, setSingleItemMatches] = useState([])
  const [showConverter, setShowConverter] = useState(false)
  const [converterData, setConverterData] = useState({
    mainUnit: 1,
    middleUnit: 1,
    middleUnitName: '',
    total: 1
  })
  
  // 实时匹配参考库
  useEffect(() => {
    if (singleItem.productName || singleItem.brand) {
      const matches = fuzzyMatch(singleItem, products)
      setSingleItemMatches(matches)
    } else {
      setSingleItemMatches([])
    }
  }, [singleItem.productName, singleItem.brand, products])

  // 实时计算换算结果
  useEffect(() => {
    const main = parseInt(converterData.mainUnit) || 1
    const middle = parseInt(converterData.middleUnit) || 1
    setConverterData(prev => ({
      ...prev,
      total: main * middle
    }))
  }, [converterData.mainUnit, converterData.middleUnit])

  // 保存状态到 localStorage
  useEffect(() => {
    if (!isInitialized.current) return
    const stateToSave = {
      rows,
      compareResult,
      singleItem,
      showConverter,
      converterData,
    }
    localStorage.setItem('huibi_temp_compare', JSON.stringify(stateToSave))
  }, [rows, compareResult, singleItem, showConverter, converterData])

  // 从 localStorage 恢复状态
  useEffect(() => {
    const saved = localStorage.getItem('huibi_temp_compare')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.rows && parsed.rows.length > 0) {
          setRows(parsed.rows)
        }
        if (parsed.compareResult) {
          setCompareResult(parsed.compareResult)
        }
        if (parsed.singleItem) {
          setSingleItem(parsed.singleItem)
        }
        if (parsed.showConverter !== undefined) {
          setShowConverter(parsed.showConverter)
        }
        if (parsed.converterData) {
          setConverterData(parsed.converterData)
        }
      } catch (e) {
        console.error('恢复临时比价状态失败:', e)
      }
    }
    isInitialized.current = true
  }, [])

  // 添加新行
  const addRow = () => {
    if (rows.length >= 10) return
    setRows([...rows, createEmptyRow()])
  }

  // 更新行数据
  const updateRow = (rowId, field, value) => {
    setRows(rows.map(row =>
      row.rowId === rowId ? { ...row, [field]: value } : row
    ))
  }

  // 清空行内容
  const clearRow = (rowId) => {
    setRows(rows.map(row =>
      row.rowId === rowId ? createEmptyRow() : row
    ))
  }

  // 删除行
  const deleteRow = (rowId) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()])
    } else {
      setRows(rows.filter(row => row.rowId !== rowId))
    }
  }

  // 查找参考库中最低价记录
  const findBestMatch = (row, allProducts) => {
    console.log('findBestMatch called:', { row, allProductsLength: allProducts?.length })
    if (!row.productName && !row.brand) return null

    console.log('Calling fuzzyMatch for:', row.productName, row.brand)
    const matches = fuzzyMatch(row, allProducts)
    console.log('fuzzyMatch returned matches:', matches.length)
    if (matches.length > 0) {
      return matches.reduce((best, item) =>
        item.unitPrice < best.unitPrice ? item : best
      , matches[0])
    }

    console.log('No fuzzy match, checking by category:', row.category)
    if (row.category) {
      const categoryItems = allProducts.filter(p => p.category === row.category)
      console.log('Category items:', categoryItems.length)
      if (categoryItems.length > 0) {
        return categoryItems.reduce((best, item) =>
          item.unitPrice < best.unitPrice ? item : best
        , categoryItems[0])
      }
    }

    return null
  }

  // 开始比价
  const startCompare = () => {
    const validRows = rows.filter(row => {
      const quantity = parseFloat(row.quantity)
      const price = parseFloat(row.price)
      return row.productName && !isNaN(quantity) && !isNaN(price) && quantity > 0 && price > 0
    })

    if (validRows.length < 2) {
      alert('请至少填写2条完整的商品信息进行比价')
      return
    }

    const processedRows = validRows.map(row => {
      const quantity = parseFloat(row.quantity)
      const price = parseFloat(row.price)
      const netContent = parseFloat(row.netContent) || 0
      const netContentUnit = row.netContentUnit
      const unitPrice = convertUnitPrice(price, quantity, row.unit)
      return {
        ...row,
        quantity,
        price,
        unitPrice,
        netContent,
        netContentUnit,
        isFromLibrary: false,
        matchedProduct: findBestMatch(row, products),
      }
    })

    processedRows.sort((a, b) => {
      if (!canCompare(a.unit, b.unit)) return 0
      return a.unitPrice - b.unitPrice
    })

    let lowestPrice = Infinity
    processedRows.forEach(row => {
      if (canCompare(row.unit, processedRows[0]?.unit)) {
        if (row.unitPrice < lowestPrice) {
          lowestPrice = row.unitPrice
        }
      }
    })

    processedRows.forEach(row => {
      row.isLowest = canCompare(row.unit, processedRows[0]?.unit) && row.unitPrice === lowestPrice
      row.unitDifferent = !canCompare(row.unit, processedRows[0]?.unit)
    })

    setCompareResult(processedRows)
  }

  // 保存到参考库
  const handleSaveToLibrary = (item) => {
    setSaveFormData({
      productName: item.productName,
      brand: item.brand,
      spec: item.spec || '',
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      platform: item.platform,
      category: item.category || '其他',
      netContent: item.netContent || '',
      netContentUnit: item.netContentUnit || 'g',
      notes: '',
    })
    setShowSaveForm(true)
  }

  // 确认保存到参考库
  const confirmSaveToLibrary = () => {
    if (!saveFormData.productName || !saveFormData.brand) {
      alert('请填写商品名和品牌')
      return
    }
    const quantity = parseFloat(saveFormData.quantity) || 1
    const price = parseFloat(saveFormData.price)
    if (isNaN(price) || price <= 0) {
      alert('请填写有效的价格')
      return
    }
    const netContent = parseFloat(saveFormData.netContent) || 0
    const netContentUnit = saveFormData.netContentUnit
    const unitPrice = convertUnitPrice(price, quantity, saveFormData.unit)
    addProduct({
      productName: saveFormData.productName,
      brand: saveFormData.brand,
      spec: saveFormData.spec || '',
      quantity,
      unit: saveFormData.unit,
      price,
      platform: saveFormData.platform,
      category: saveFormData.category || '其他',
      notes: saveFormData.notes || '',
      unitPrice,
      netContent,
      netContentUnit,
    })
    setShowSaveForm(false)
    setSaveFormData(null)
    alert('已保存到参考库')
  }

  // 添加到待购清单
  const addItemToCart = (item) => {
    // 计算单价
    const unitPrice = item.unitPrice || convertUnitPrice(parseFloat(item.price), parseFloat(item.quantity), item.unit)
    // 计算净含量单价
    let netContentUnitPrice = item.netContentUnitPrice
    if (!netContentUnitPrice && item.netContent) {
      netContentUnitPrice = convertNetContentUnitPrice(parseFloat(item.price), parseFloat(item.quantity), item.unit, parseFloat(item.netContent), item.netContentUnit)
    }
    addToCart({
      productId: item.rowId || item.id || Date.now().toString(36),
      productName: item.productName,
      brand: item.brand || '',
      spec: item.spec || '',
      quantity: parseFloat(item.quantity),
      unitPrice: unitPrice,
      unit: item.unit,
      price: parseFloat(item.price),
      platform: item.platform,
      netContent: item.netContent ? parseFloat(item.netContent) : null,
      netContentUnit: item.netContentUnit || null,
      netContentUnitPrice: netContentUnitPrice,
      converterMainUnit: item.converterMainUnit || null,
      converterMiddleUnit: item.converterMiddleUnit || null,
      converterMiddleUnitName: item.converterMiddleUnitName || null,
    })
    alert('已添加到待购清单')
  }

  // 重置比价
  const resetCompare = () => {
    setRows([createEmptyRow()])
    setCompareResult(null)
    localStorage.removeItem('huibi_temp_compare')
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">临时比价</h1>

      {/* 单品实时比价 */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-gray-700">单品实时比价</h2>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg"
          >
            清空
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            {/* 第一行：商品名（占满） */}
            <input
              type="text"
              placeholder="商品名"
              value={singleItem.productName}
              onChange={(e) => setSingleItem({ ...singleItem, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {/* 第二行：品牌 + 规格 */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="品牌"
                value={singleItem.brand}
                onChange={(e) => setSingleItem({ ...singleItem, brand: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="规格"
                value={singleItem.spec || ''}
                onChange={(e) => setSingleItem({ ...singleItem, spec: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            {/* 第三行：数量 + 单位 */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="数量"
                value={singleItem.quantity}
                onChange={(e) => setSingleItem({ ...singleItem, quantity: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <select
                value={singleItem.unit}
                onChange={(e) => setSingleItem({ ...singleItem, unit: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {/* 第四行（若选计数单位则显示）：单个净含量 + 净含量单位 */}
            {isCountUnit(singleItem.unit) && (
              <div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="单个净含量"
                    value={singleItem.netContent}
                    onChange={(e) => setSingleItem({ ...singleItem, netContent: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <select
                    value={singleItem.netContentUnit}
                    onChange={(e) => setSingleItem({ ...singleItem, netContentUnit: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {NET_CONTENT_UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowConverter(!showConverter)}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
                  >
                    展开换算
                  </button>
                </div>
                
                {/* 换算助手面板 */}
                {showConverter && (
                  <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="mb-2">
                      <label className="block text-sm text-gray-600 mb-1">第一层：每[主单位]包含多少[中间单位]</label>
                      <input
                        type="number"
                        min="1"
                        value={converterData.mainUnit}
                        onChange={(e) => setConverterData({ ...converterData, mainUnit: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-200 rounded text-sm"
                      />
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">中间单位名称</label>
                        <input
                          type="text"
                          placeholder="如：包、袋、盒"
                          value={converterData.middleUnitName}
                          onChange={(e) => setConverterData({ ...converterData, middleUnitName: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm text-gray-600 mb-1">第二层：每[中间单位]包含多少[最小单位]</label>
                      <input
                        type="number"
                        min="1"
                        value={converterData.middleUnit}
                        onChange={(e) => setConverterData({ ...converterData, middleUnit: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium">总最小单位数：</span>
                      <span className="text-sm font-bold text-blue-600">{converterData.total}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSingleItem({ 
                          ...singleItem, 
                          netContent: converterData.total,
                          converterUsed: true,
                          converterMainUnit: converterData.mainUnit,
                          converterMiddleUnit: converterData.middleUnit,
                          converterMiddleUnitName: converterData.middleUnitName
                        })
                        setShowConverter(false)
                      }}
                      className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                    >
                      填入
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* 第五行：价格 + 平台 */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="价格"
                  value={singleItem.price}
                  onChange={(e) => setSingleItem({ ...singleItem, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">元</div>
              </div>
              <select
                value={singleItem.platform || '淘宝'}
                onChange={(e) => setSingleItem({ ...singleItem, platform: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 当前输入商品的单价展示 */}
          {singleItem.quantity && singleItem.price && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-700 mb-2">当前商品计算结果：</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">原始单价：</span>
                  <span className="text-sm font-medium">¥{convertUnitPrice(parseFloat(singleItem.price), parseFloat(singleItem.quantity), singleItem.unit).toFixed(2)}/{singleItem.unit}</span>
                </div>
                {singleItem.netContent && singleItem.netContentUnit && parseFloat(singleItem.converterMainUnit) > 1 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">每{singleItem.converterMiddleUnitName || singleItem.netContentUnit}单价：</span>
                      <span className="text-sm font-medium">¥{(parseFloat(singleItem.price) / (parseFloat(singleItem.quantity) * parseFloat(singleItem.converterMainUnit))).toFixed(4)}/{singleItem.converterMiddleUnitName || singleItem.netContentUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">每最小单位单价：</span>
                      <span className="text-sm font-medium">¥{convertNetContentUnitPrice(parseFloat(singleItem.price), parseFloat(singleItem.quantity), singleItem.unit, parseFloat(singleItem.netContent), singleItem.netContentUnit).toFixed(4)}/{getStandardNetContentUnit(singleItem.netContentUnit)}</span>
                    </div>
                  </>
                ) : singleItem.netContent && singleItem.netContentUnit ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">净含量单价：</span>
                    <span className="text-sm font-medium">¥{convertNetContentUnitPrice(parseFloat(singleItem.price), parseFloat(singleItem.quantity), singleItem.unit, parseFloat(singleItem.netContent), singleItem.netContentUnit).toFixed(4)}/{getStandardNetContentUnit(singleItem.netContentUnit)}</span>
                  </div>
                ) : null}
              </div>
              {/* 操作按钮 */}
              {singleItem.productName && singleItem.quantity && singleItem.price && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      addItemToCart(singleItem)
                    }}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
                  >
                    加入待购清单
                  </button>
                  <button
                    onClick={() => {
                      setSaveFormData({
                        productName: singleItem.productName,
                        brand: singleItem.brand || '',
                        spec: singleItem.spec || '',
                        quantity: singleItem.quantity,
                        unit: singleItem.unit,
                        price: singleItem.price,
                        platform: singleItem.platform || '淘宝',
                        category: '其他',
                        netContent: singleItem.netContent || '',
                        netContentUnit: singleItem.netContentUnit || 'g',
                        notes: '',
                      })
                      setShowSaveForm(true)
                    }}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"
                  >
                    存入参考库
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 实时匹配结果 */}
          {singleItemMatches.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium text-gray-700">参考库匹配结果：</div>
              {singleItemMatches.map((match) => {
                const quantity = parseFloat(singleItem.quantity) || 0
                const price = parseFloat(singleItem.price) || 0
                const userUnitPrice = singleItem.netContent 
                  ? convertNetContentUnitPrice(price, quantity, singleItem.unit, parseFloat(singleItem.netContent), singleItem.netContentUnit)
                  : convertUnitPrice(price, quantity, singleItem.unit)
                
                const matchUnitPrice = match.netContent 
                  ? convertNetContentUnitPrice(match.price, match.quantity, match.unit, match.netContent, match.netContentUnit)
                  : match.unitPrice
                
                const isCheaper = matchUnitPrice < userUnitPrice
                
                return (
                  <div key={match.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{match.productName}</div>
                        <div className="text-sm text-gray-500">{match.brand} · {match.platform} · {match.quantity}{match.unit}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          录入时间: {new Date(match.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-500">¥{match.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          单价: ¥{match.unitPrice.toFixed(2)}/{match.unit}
                        </div>
                        {match.netContent > 0 && match.netContentUnit && (
                          <div className="text-xs text-green-500">
                            净含量单价: ¥{convertNetContentUnitPrice(match.price, match.quantity, match.unit, match.netContent, match.netContentUnit).toFixed(4)}/{getStandardNetContentUnit(match.netContentUnit)}
                          </div>
                        )}
                        {!isNaN(userUnitPrice) && !isNaN(matchUnitPrice) && (
                          <div className={`text-xs font-medium mt-1 ${
                            isCheaper ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {isCheaper ? '比你输入的便宜' : '比你输入的贵'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 多品比价 */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-gray-700">多品比价 ({rows.length}/10)</h2>
          <button
            onClick={addRow}
            disabled={rows.length >= 10}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg disabled:bg-gray-300"
          >
            + 添加商品
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.rowId} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">商品 {index + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => clearRow(row.rowId)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    清空
                  </button>
                  <button
                    onClick={() => deleteRow(row.rowId)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="商品名 *"
                  value={row.productName}
                  onChange={(e) => updateRow(row.rowId, 'productName', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="品牌"
                    value={row.brand}
                    onChange={(e) => updateRow(row.rowId, 'brand', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="规格"
                    value={row.spec}
                    onChange={(e) => updateRow(row.rowId, 'spec', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="数量 *"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.rowId, 'quantity', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(row.rowId, 'unit', e.target.value)}
                    className="w-20 px-1 py-1 border border-gray-200 rounded text-sm"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <div className="flex-1 relative">
                        <input
                          type="number"
                          placeholder="价格 *"
                          value={row.price}
                          onChange={(e) => updateRow(row.rowId, 'price', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm pr-8"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">元</div>
                      </div>
                </div>
                {isCountUnit(row.unit) && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="单个净含量"
                      value={row.netContent}
                      onChange={(e) => updateRow(row.rowId, 'netContent', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                    <select
                      value={row.netContentUnit}
                      onChange={(e) => updateRow(row.rowId, 'netContentUnit', e.target.value)}
                      className="w-20 px-1 py-1 border border-gray-200 rounded text-sm"
                    >
                      {NET_CONTENT_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={row.platform}
                    onChange={(e) => updateRow(row.rowId, 'platform', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={row.category}
                    onChange={(e) => updateRow(row.rowId, 'category', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length >= 2 && (
          <button
            onClick={startCompare}
            className="w-full mt-4 py-2 bg-green-500 text-white rounded-lg font-medium"
          >
            开始比价
          </button>
        )}
      </div>

      {compareResult && (
        /* 比价结果 */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-700">比价结果</h2>
            <button
              onClick={resetCompare}
              className="text-sm text-blue-500"
            >
              重新比价
            </button>
          </div>

          {compareResult.map((item, index) => {
            const hasNetContent = item.netContent > 0 && item.netContentUnit
            const displayUnitPrice = hasNetContent
              ? convertNetContentUnitPrice(item.price, item.quantity, item.unit, item.netContent, item.netContentUnit)
              : item.unitPrice
            
            return (
              <div key={item.rowId} className="space-y-2">
                {/* 主商品卡片 */}
                <div
                  className={`bg-white rounded-lg p-4 shadow-sm ${
                    item.isLowest ? 'ring-2 ring-green-500' : ''
                  } ${item.unitDifferent ? 'opacity-60' : ''}`}
                >
                  {item.isLowest && (
                    <div className="text-xs text-green-500 font-medium mb-1">🏆 最优价</div>
                  )}
                  {item.unitDifferent && (
                    <div className="text-xs text-orange-500 font-medium mb-1">⚠️ 单位不同，仅供参考</div>
                  )}
                  {!hasNetContent && isCountUnit(item.unit) && (
                    <div className="text-xs text-orange-500 font-medium mb-1">⚠️ 未填净含量，仅按个数比价，结果仅供参考</div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        {item.brand} · {item.spec || `${item.quantity}${item.unit}`}
                      </div>
                      <div className="text-sm text-gray-500">{item.platform}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        录入时间: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-500">
                        ¥{item.price.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        单价: ¥{item.unitPrice.toFixed(2)}/{item.unit}
                      </div>
                      {hasNetContent && (
                        <div className="text-xs text-green-500">
                          净含量单价: ¥{displayUnitPrice.toFixed(2)}/{item.netContentUnit}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addItemToCart(item)}
                      className="flex-1 text-sm text-blue-500 border border-blue-500 rounded py-1"
                    >
                      加入待购清单
                    </button>
                    <button
                      onClick={() => handleSaveToLibrary(item)}
                      className="flex-1 text-sm text-green-500 border border-green-500 rounded py-1"
                    >
                      存入参考库
                    </button>
                  </div>
                </div>

                {/* 参考库匹配 */}
                {item.matchedProduct && !item.isFromLibrary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 ml-4">
                    <div className="text-xs text-blue-600 font-medium mb-2">📚 参考库最低价</div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{item.matchedProduct.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.matchedProduct.brand} · {item.matchedProduct.platform} · {item.matchedProduct.quantity}{item.matchedProduct.unit}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          录入时间: {new Date(item.matchedProduct.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${displayUnitPrice < item.matchedProduct.unitPrice ? 'text-green-500' : 'text-red-500'}`}>
                          ¥{item.matchedProduct.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          单价: ¥{item.matchedProduct.unitPrice.toFixed(2)}/{item.matchedProduct.unit}
                        </div>
                        {item.matchedProduct.netContent > 0 && item.matchedProduct.netContentUnit && (
                          <div className="text-xs text-green-500">
                            净含量单价: ¥{(item.matchedProduct.price / (item.matchedProduct.quantity * item.matchedProduct.netContent)).toFixed(2)}/{item.matchedProduct.netContentUnit}
                          </div>
                        )}
                        <div className={`text-xs font-medium mt-1 ${displayUnitPrice < item.matchedProduct.unitPrice ? 'text-green-500' : 'text-red-500'}`}>
                          {displayUnitPrice < item.matchedProduct.unitPrice ? '比你输入的便宜' : '比你输入的贵'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 保存到参考库弹窗 */}
      {showSaveForm && saveFormData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">保存到参考库</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
                <input
                  type="text"
                  value={saveFormData.productName}
                  onChange={(e) => setSaveFormData({ ...saveFormData, productName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
                <input
                  type="text"
                  value={saveFormData.brand}
                  onChange={(e) => setSaveFormData({ ...saveFormData, brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
                  <input
                    type="number"
                    step="1"
                    value={saveFormData.quantity}
                    onChange={(e) => setSaveFormData({ ...saveFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位 *</label>
                  <select
                    value={saveFormData.unit}
                    onChange={(e) => setSaveFormData({ ...saveFormData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">价格 *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saveFormData.price}
                    onChange={(e) => setSaveFormData({ ...saveFormData, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">元</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台 *</label>
                <select
                  value={saveFormData.platform}
                  onChange={(e) => setSaveFormData({ ...saveFormData, platform: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {isCountUnit(saveFormData.unit) && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">单个净含量</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saveFormData.netContent}
                      onChange={(e) => setSaveFormData({ ...saveFormData, netContent: e.target.value })}
                      placeholder="如: 500"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                    <select
                      value={saveFormData.netContentUnit}
                      onChange={(e) => setSaveFormData({ ...saveFormData, netContentUnit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {NET_CONTENT_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品类 *</label>
                <select
                  value={saveFormData.category}
                  onChange={(e) => setSaveFormData({ ...saveFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={saveFormData.notes}
                  onChange={(e) => setSaveFormData({ ...saveFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSaveForm(false)
                    setSaveFormData(null)
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={confirmSaveToLibrary}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认清空</h3>
            <p className="text-gray-600 mb-4">确定要清空所有临时比价内容吗？</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setSingleItem({
                    productName: '',
                    brand: '',
                    quantity: '',
                    unit: 'g',
                    price: '',
                    netContent: '',
                    netContentUnit: 'g',
                  })
                  setShowClearConfirm(false)
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
