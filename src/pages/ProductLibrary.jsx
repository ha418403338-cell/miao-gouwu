import { useState, useEffect } from 'react'
import useProducts from '../hooks/useProducts'
import usePlans from '../hooks/usePlans'
import { convertUnitPrice, convertNetContentUnitPrice, isCountUnit, getStandardNetContentUnit } from '../utils/unitConverter'
import { PLATFORM_OPTIONS, UNIT_OPTIONS, CATEGORY_OPTIONS, NET_CONTENT_UNIT_OPTIONS } from '../utils/constants'

export default function ProductLibrary() {
  const { products, addProduct, addProducts, updateProduct, deleteProduct, clearAllProducts } = useProducts()
  const { addToCart } = usePlans()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [formData, setFormData] = useState({
    productName: '',
    brand: '',
    spec: '',
    quantity: '',
    unit: 'g',
    price: '',
    platform: '淘宝',
    category: '粮油调料',
    notes: '',
    netContent: '',
    netContentUnit: 'g',
    converterMainUnit: '',
    converterMiddleUnit: '',
    converterMiddleUnitName: '',
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showConverter, setShowConverter] = useState(false)
  const [converterData, setConverterData] = useState({
    mainUnit: 1,
    middleUnit: 1,
    middleUnitName: '',
    total: 1
  })
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [isExportMode, setIsExportMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // 实时计算换算结果
  useEffect(() => {
    const main = parseInt(converterData.mainUnit) || 1
    const middle = parseInt(converterData.middleUnit) || 1
    setConverterData(prev => ({
      ...prev,
      total: main * middle
    }))
  }, [converterData.mainUnit, converterData.middleUnit])

  // 筛选商品列表
  const filteredProducts = products.filter((p) => {
    const searchLower = searchKeyword.toLowerCase()
    const matchSearch =
      !searchKeyword ||
      p.productName.toLowerCase().includes(searchLower) ||
      p.brand.toLowerCase().includes(searchLower)
    const matchPlatform = !filterPlatform || p.platform === filterPlatform
    const matchCategory = !filterCategory || p.category === filterCategory
    return matchSearch && matchPlatform && matchCategory
  })

  // 重置表单
  const resetForm = () => {
    setFormData({
      productName: '',
      brand: '',
      spec: '',
      quantity: '',
      unit: 'g',
      price: '',
      platform: '淘宝',
      category: '粮油调料',
      notes: '',
      netContent: '',
      netContentUnit: 'g',
      converterMainUnit: '',
      converterMiddleUnit: '',
      converterMiddleUnitName: '',
    })
    setEditingId(null)
    setShowConverter(false)
    setConverterData({ mainUnit: 1, middleUnit: 1, middleUnitName: '', total: 1 })
  }

  // 提交表单
  const handleSubmit = (e) => {
    e.preventDefault()
    const quantity = parseFloat(formData.quantity)
    const price = parseFloat(formData.price)
    if (!formData.productName || !formData.brand || !formData.platform || !formData.category) {
      alert('请填写商品名、品牌、平台和品类')
      return
    }
    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
      alert('数量和价格必须为正数')
      return
    }
    const unitPrice = convertUnitPrice(price, quantity, formData.unit)
    const netContent = parseFloat(formData.netContent) || 0
    const netContentUnit = formData.netContentUnit
    
    if (editingId) {
      updateProduct(editingId, { ...formData, quantity, price, unitPrice, netContent, netContentUnit })
    } else {
      addProduct({ ...formData, quantity, price, unitPrice, netContent, netContentUnit })
    }
    setShowForm(false)
    resetForm()
  }

  // 编辑商品
  const handleEdit = (product) => {
    setFormData({ ...product })
    setEditingId(product.id)
    setShowForm(true)
    if (product.netContent && product.netContent > 0) {
      setShowConverter(true)
      setConverterData({
        mainUnit: product.converterMainUnit || 1,
        middleUnit: product.converterMiddleUnit || 1,
        middleUnitName: product.converterMiddleUnitName || '',
        total: product.netContent
      })
    }
  }

  // 删除商品
  const handleDelete = (id) => {
    setDeletingId(id)
    setShowDeleteConfirm(true)
  }

  // 确认删除
  const confirmDelete = () => {
    if (deletingId) {
      deleteProduct(deletingId)
    }
    setShowDeleteConfirm(false)
    setDeletingId(null)
  }

  // 取消删除
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingId(null)
  }

  // 复制商品
  const handleCopy = (product) => {
    resetForm()
    const { id, createdAt, ...rest } = product
    setFormData({ ...rest })
    setEditingId(null)
    setShowForm(true)
  }

  // 导出选中的商品
  const handleExportSelected = () => {
    if (selectedIds.size === 0) {
      alert('请先选择要导出的商品')
      return
    }
    
    const selectedProducts = products.filter(p => selectedIds.has(p.id))
    const headers = ['商品名', '品牌', '规格描述', '数量', '单位', '价格', '平台', '品类', '备注', '净含量数值', '净含量单位', '换算说明']
    
    const rows = selectedProducts.map(p => {
      let conversionNote = ''
      if (p.converterMainUnit && p.converterMiddleUnit) {
        conversionNote = `${p.converterMainUnit}${p.converterMiddleUnitName || ''}×${p.converterMiddleUnit}`
      }
      return [
        p.productName,
        p.brand || '',
        p.spec || '',
        p.quantity,
        p.unit,
        p.price,
        p.platform,
        p.category,
        p.notes || '',
        p.netContent || '',
        p.netContentUnit || '',
        conversionNote
      ]
    })
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `huigou_export_${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setIsExportMode(false)
    setSelectedIds(new Set())
  }

  // CSV导入相关函数
  const parseCSV = (text) => {
    const lines = text.trim().split('\n').map(line => line.replace(/\r$/, ''))
    if (lines.length < 2) return { success: [], errors: [], warnings: [] }
    
    const header = lines[0].split(',').map(h => h.trim())
    const requiredHeaders = ['商品名', '品牌', '规格描述', '数量', '单位', '价格', '平台', '品类', '备注']
    const headerMatch = requiredHeaders.every(h => header.includes(h))
    
    if (!headerMatch) {
      return { success: [], errors: [{ line: 0, message: '表头格式不匹配，请确保包含：商品名,品牌,规格描述,数量,单位,价格,平台,品类,备注' }], warnings: [] }
    }
    
    const success = []
    const errors = []
    const warnings = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 跳过以 # 开头的注释行
      if (line.startsWith('#')) {
        continue
      }
      
      const values = line.split(',').map(v => v.trim())
      const row = {}
      header.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      
      // 验证必填字段
      if (!row['商品名']) {
        errors.push({ line: i + 1, message: `第${i + 1}行：缺少商品名` })
        continue
      }
      
      // 验证数量和价格
      const quantity = parseFloat(row['数量'])
      const price = parseFloat(row['价格'])
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ line: i + 1, message: `第${i + 1}行：数量必须为正数，当前为"${row['数量']}"` })
        continue
      }
      if (isNaN(price) || price <= 0) {
        errors.push({ line: i + 1, message: `第${i + 1}行：价格必须为正数，当前为"${row['价格']}"` })
        continue
      }
      
      // 验证单位
      const unit = row['单位']
      if (!UNIT_OPTIONS.includes(unit)) {
        errors.push({ line: i + 1, message: `第${i + 1}行：单位"${unit}"不在允许列表中` })
        continue
      }
      
      // 处理平台
      let platform = row['平台']
      if (!PLATFORM_OPTIONS.includes(platform)) {
        warnings.push({ line: i + 1, message: `第${i + 1}行：平台"${platform}"不在允许列表中，已归为"其他"` })
        platform = '其他'
      }
      
      // 处理品类
      let category = row['品类']
      if (!CATEGORY_OPTIONS.includes(category)) {
        warnings.push({ line: i + 1, message: `第${i + 1}行：品类"${category}"不在允许列表中，已归为"其他"` })
        category = '其他'
      }
      
      // 计算单价
      const unitPrice = convertUnitPrice(price, quantity, unit)
      
      // 处理备注（只保留用户填写的备注，换算信息单独存储）
      const notes = row['备注'] || ''
      
      // 处理净含量相关字段
      let netContentValue = row['净含量数值'] ? parseFloat(row['净含量数值']) : null
      const netContentUnit = row['净含量单位'] || null
      let netContentUnitPrice = null
      
      // 如果主单位是计数类单位且填了净含量数值，自动计算净含量单价
      if (netContentValue && netContentUnit && isCountUnit(unit)) {
        netContentUnitPrice = convertNetContentUnitPrice(price, quantity, unit, netContentValue, netContentUnit)
      }
      
      // 解析换算说明，格式如"10包×100抽"或"24包×80抽"
      let converterMainUnit = ''
      let converterMiddleUnit = ''
      let converterMiddleUnitName = ''
      const converterStr = row['换算说明'] || ''
      if (converterStr) {
        const match = converterStr.match(/^(\d+)([^\d×x]+)[×x](\d+)/)
        if (match) {
          converterMainUnit = match[1]
          converterMiddleUnitName = match[2].trim()
          converterMiddleUnit = match[3]
        }
      }
      
      // 若净含量数值为空，且换算说明解析成功，则自动计算填入
      if (!netContentValue && converterMainUnit && converterMiddleUnit) {
        const calcTotal = parseInt(converterMainUnit) * parseInt(converterMiddleUnit)
        if (!isNaN(calcTotal) && calcTotal > 0) {
          netContentValue = calcTotal
        }
      }
      
      success.push({
        productName: row['商品名'],
        brand: row['品牌'] || '',
        spec: row['规格描述'] || '',
        quantity,
        unit,
        price,
        platform,
        category,
        notes,
        unitPrice,
        netContent: netContentValue,
        netContentUnit: netContentUnit,
        netContentUnitPrice,
        converterMainUnit,
        converterMiddleUnit,
        converterMiddleUnitName,
      })
    }
    
    return { success, errors, warnings }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const result = parseCSV(text)
      setImportFile(file)
      setImportPreview(result)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDownloadTemplate = () => {
    const template = '商品名,品牌,规格描述,数量,单位,价格,平台,品类,备注,净含量数值,净含量单位,换算说明\n#=== 以下为示例，此行自动跳过 ===\n#示例,清风,300抽3层,1,件,18.16,天猫旗舰店,洗护清洁,,1920,抽,24包×80抽'
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '商品导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportConfirm = () => {
    if (!importPreview || importPreview.success.length === 0) {
      alert('没有可导入的有效数据')
      return
    }
    
    let addedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    
    importPreview.success.forEach((item) => {
      // 判断是否已存在：商品名 + 品牌 + 规格描述 + 数量 + 单位 + 净含量单位 + 换算说明
      const matchKey = `${item.productName}|${item.brand}|${item.spec}|${item.quantity}|${item.unit}|${item.netContentUnit}|${item.converterMainUnit}${item.converterMiddleUnit}`
      const existingIndex = products.findIndex((p) => {
        const pMatchKey = `${p.productName}|${p.brand}|${p.spec}|${p.quantity}|${p.unit}|${p.netContentUnit}|${p.converterMainUnit}${p.converterMiddleUnit}`
        return pMatchKey === matchKey
      })
      
      if (existingIndex !== -1) {
        // 库里已有该商品，比较价格
        const existing = products[existingIndex]
        if (item.price < existing.price) {
          // CSV价格更低，覆盖
          updateProduct(existing.id, item)
          updatedCount++
        } else {
          // 库里的价格更低或相等，跳过
          skippedCount++
        }
      } else {
        // 新增商品
        addProduct(item)
        addedCount++
      }
    })
    
    alert(`成功新增 ${addedCount} 条${updatedCount > 0 ? `，覆盖 ${updatedCount} 条（价格更低）` : ''}${skippedCount > 0 ? `，跳过 ${skippedCount} 条（已有更低价）` : ''}`)
    
    setShowImportModal(false)
    setImportFile(null)
    setImportPreview(null)
  }

  const handleCloseImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportPreview(null)
  }

  return (
    <div className="p-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">商品参考库</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + 新增商品
          </button>
          <button
            onClick={() => {
              setShowImportModal(true)
              setImportFile(null)
              setImportPreview(null)
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            📥 导入CSV
          </button>
          <button
            onClick={() => {
              setIsExportMode(true)
              setSelectedIds(new Set())
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            📤 导出
          </button>
        </div>
      </div>

      {/* 搜索筛选区 */}
      <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="搜索商品名称或品牌..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {(searchKeyword || filterPlatform || filterCategory) && (
            <button
              onClick={() => {
                setSearchKeyword('')
                setFilterPlatform('')
                setFilterCategory('')
              }}
              className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg"
            >
              重置
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value="">全部平台</option>
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value="">全部分类</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          {products.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1 text-sm text-red-500 border border-red-500 rounded"
            >
              清空所有商品
            </button>
          )}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {products.length === 0 ? '暂无商品记录' : '没有符合条件的商品'}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg p-4 shadow-sm relative">
              {isExportMode && (
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => {
                      const newSelected = new Set(selectedIds)
                      if (newSelected.has(product.id)) {
                        newSelected.delete(product.id)
                      } else {
                        newSelected.add(product.id)
                      }
                      setSelectedIds(newSelected)
                    }}
                    className="w-5 h-5 rounded"
                  />
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{product.productName}</div>
                  <div className="text-sm text-gray-500">{product.brand} · {product.quantity}{product.unit}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {product.platform} · {product.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-500">
                    ¥{product.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    单价: ¥{product.unitPrice.toFixed(2)}/{product.unit}
                  </div>
                  {product.netContent > 0 && product.netContentUnit && (
                    <div className="text-xs text-green-500">
                      净含量单价: ¥{convertNetContentUnitPrice(product.price, product.quantity, product.unit, product.netContent, product.netContentUnit).toFixed(4)}/{getStandardNetContentUnit(product.netContentUnit)}
                    </div>
                  )}
                </div>
              </div>
              {product.notes && (
                <div className="mt-2 text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded">
                  备注: {product.notes}
                </div>
              )}
              {product.converterMainUnit && product.converterMiddleUnit && (
                <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  换算：{product.converterMainUnit}{product.converterMiddleUnitName || ''}×{product.converterMiddleUnit}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 text-sm text-blue-500 border border-blue-500 rounded py-1"
                >
                  编辑
                </button>
                <button
                  onClick={() => {
                    addToCart({
                      productId: product.id,
                      productName: product.productName,
                      brand: product.brand || '',
                      spec: product.spec || '',
                      quantity: product.quantity,
                      unitPrice: product.unitPrice,
                      unit: product.unit,
                      price: product.price,
                      platform: product.platform,
                      netContent: product.netContent || null,
                      netContentUnit: product.netContentUnit || null,
                      netContentUnitPrice: product.netContent
                        ? convertNetContentUnitPrice(product.price, product.quantity, product.unit, product.netContent, product.netContentUnit)
                        : null,
                      converterMainUnit: product.converterMainUnit,
                      converterMiddleUnit: product.converterMiddleUnit,
                      converterMiddleUnitName: product.converterMiddleUnitName,
                    })
                    alert('已加入待购清单')
                  }}
                  className="flex-1 text-sm text-green-500 border border-green-500 rounded py-1"
                >
                  加入清单
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 text-sm text-red-500 border border-red-500 rounded py-1"
                >
                  删除
                </button>
                <button
                  onClick={() => handleCopy(product)}
                  className="flex-1 text-sm text-orange-500 border border-orange-500 rounded py-1"
                >
                  复制
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 导出模式底部操作栏 */}
      {isExportMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 items-center justify-center shadow-lg">
          <button
            onClick={() => {
              const allIds = filteredProducts.map(p => p.id)
              setSelectedIds(new Set(allIds))
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
          >
            全选
          </button>
          <button
            onClick={() => {
              setIsExportMode(false)
              setSelectedIds(new Set())
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
          >
            取消
          </button>
          <button
            onClick={handleExportSelected}
            disabled={selectedIds.size === 0}
            className={`px-4 py-2 rounded-lg text-sm ${
              selectedIds.size > 0
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            导出已选({selectedIds.size}条)
          </button>
        </div>
      )}

      {/* 新增/编辑表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? '编辑商品' : '新增商品'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规格描述</label>
                <input
                  type="text"
                  value={formData.spec}
                  onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                  placeholder="如: 500ml×3瓶"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位 *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              {isCountUnit(formData.unit) && (
                <div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">单个净含量</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.netContent}
                        onChange={(e) => setFormData({ ...formData, netContent: e.target.value })}
                        placeholder="如: 500"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                      <select
                        value={formData.netContentUnit}
                        onChange={(e) => setFormData({ ...formData, netContentUnit: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        {NET_CONTENT_UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32 flex items-end">
                      <button
                        type="button"
                        onClick={() => setShowConverter(!showConverter)}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
                      >
                        展开换算
                      </button>
                    </div>
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
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm text-gray-600 mb-1">中间单位名称</label>
                        <input
                          type="text"
                          placeholder="如：包、袋"
                          value={converterData.middleUnitName || ''}
                          onChange={(e) => setConverterData({ ...converterData, middleUnitName: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-200 rounded text-sm"
                        />
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
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            netContent: converterData.total,
                            converterMainUnit: converterData.mainUnit,
                            converterMiddleUnit: converterData.middleUnit,
                            converterMiddleUnitName: converterData.middleUnitName || '',
                          }))
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">价格 *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">元</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">平台 *</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">CSV 批量导入</h2>
              <button onClick={handleCloseImportModal} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {/* CSV格式说明 */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">CSV 格式说明</h3>
                <p className="text-sm text-gray-600 mb-2">请按以下格式准备 CSV 文件，第一行为表头。以 # 开头的行为注释行，导入时会自动跳过：</p>
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <div className="text-xs text-gray-600 mb-1">格式模板（可复制）：</div>
                  <div className="bg-white p-2 rounded border text-xs font-mono whitespace-pre">商品名,品牌,规格描述,数量,单位,价格,平台,品类,备注,净含量数值,净含量单位,换算说明
#示例(此行会被跳过),清风,300抽3层,1,件,18.16,天猫旗舰店,洗护清洁,,1920,抽,24包×80抽</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  <p>• 净含量数值、净含量单位、换算说明为选填字段</p>
                  <p>• 净含量单位合法值：g/kg/ml/L/抽/包</p>
                  <p>• 换算说明会自动追加到备注字段末尾</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium mt-3"
                >
                  📥 下载模板
                </button>
              </div>
              
              {/* 文件上传 */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">选择 CSV 文件</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csvFileInput"
                  />
                  <label htmlFor="csvFileInput" className="cursor-pointer">
                    <div className="text-gray-600 mb-2">点击选择文件或拖拽上传</div>
                    <div className="text-sm text-gray-400">仅支持 .csv 格式</div>
                  </label>
                </div>
              </div>
              
              {/* 预览结果 */}
              {importPreview && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">解析结果</h3>
                  
                  {/* 统计信息 */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-500">{importPreview.success.length}</div>
                      <div className="text-sm text-gray-600">有效行数</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-500">{importPreview.errors.length}</div>
                      <div className="text-sm text-gray-600">错误行数</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-500">{importPreview.warnings.length}</div>
                      <div className="text-sm text-gray-600">警告行数</div>
                    </div>
                  </div>
                  
                  {/* 错误信息 */}
                  {importPreview.errors.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-red-500 mb-2">错误列表：</div>
                      <div className="bg-red-50 rounded-lg p-3 space-y-1">
                        {importPreview.errors.map((err, idx) => (
                          <div key={idx} className="text-sm text-red-600">• {err.message}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 警告信息 */}
                  {importPreview.warnings.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-yellow-500 mb-2">警告列表：</div>
                      <div className="bg-yellow-50 rounded-lg p-3 space-y-1">
                        {importPreview.warnings.map((warn, idx) => (
                          <div key={idx} className="text-sm text-yellow-600">• {warn.message}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 数据预览 */}
                  {importPreview.success.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">数据预览（前5行）：</div>
                      <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-600 border-b">
                              <th className="text-left py-1">商品名</th>
                              <th className="text-left py-1">品牌</th>
                              <th className="text-left py-1">规格</th>
                              <th className="text-right py-1">数量</th>
                              <th className="text-left py-1">单位</th>
                              <th className="text-right py-1">价格</th>
                              <th className="text-left py-1">平台</th>
                              <th className="text-left py-1">净含量</th>
                              <th className="text-right py-1">净含量单价</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.success.slice(0, 5).map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-200">
                                <td className="py-1">{item.productName}</td>
                                <td className="py-1">{item.brand || '-'}</td>
                                <td className="py-1">{item.spec || '-'}</td>
                                <td className="text-right py-1">{item.quantity}</td>
                                <td className="py-1">{item.unit}</td>
                                <td className="text-right py-1">¥{item.price.toFixed(2)}</td>
                                <td className="py-1">{item.platform}</td>
                                <td className="py-1">
                                  {item.netContent ? `${item.netContent}${item.netContentUnit}` : '-'}
                                </td>
                                <td className="text-right py-1">
                                  {item.netContentUnitPrice ? `¥${item.netContentUnitPrice.toFixed(4)}/${item.netContentUnit}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 弹窗底部按钮 */}
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={handleCloseImportModal}
                className="flex-1 py-2 border rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={!importPreview || importPreview.success.length === 0}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  importPreview && importPreview.success.length > 0
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                确认导入 {importPreview ? `（${importPreview.success.length}条）` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">确定要删除这条商品记录吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空所有商品确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认清空</h3>
            <p className="text-gray-600 mb-4">确定要清空所有商品记录吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  clearAllProducts()
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
