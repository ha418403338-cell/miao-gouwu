import { useState } from 'react'
import usePlans from '../hooks/usePlans'
import useProducts from '../hooks/useProducts'
import { PLATFORM_OPTIONS } from '../utils/constants'
const COUPON_TYPES = [
  { value: 'full_reduce', label: '满减券' },
  { value: 'discount', label: '折扣券' },
  { value: 'free_shipping', label: '免邮券' },
]

export default function ShoppingCart({ onNavigate }) {
  const { cartItems, removeFromCart, updateCartItemQuantity, clearCart, removeFromCartBatch, addPlan, toggleCartItemPin } = usePlans()
  const { addProduct } = useProducts()
  const [selectedItems, setSelectedItems] = useState([])
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isCopyMode, setIsCopyMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [planFormData, setPlanFormData] = useState({
    planName: '',
    platform: '京东',
    couponType: 'full_reduce',
    couponValue: { threshold: '', reduce: '' },
  })

  // 切换选中商品
  const toggleSelect = (productId) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter((id) => id !== productId))
    } else {
      setSelectedItems([...selectedItems, productId])
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(cartItems.map((item) => item.productId))
    }
  }

  // 计算选中商品的总价
  const selectedTotalPrice = selectedItems.reduce((sum, id) => {
    const item = cartItems.find((ci) => ci.productId === id)
    return sum + (item ? item.subtotal : 0)
  }, 0)

  // 计算优惠后金额
  const calcTotalActual = (totalOriginal, couponType, couponValue) => {
    switch (couponType) {
      case 'full_reduce':
        if (totalOriginal >= parseFloat(couponValue.threshold)) {
          return totalOriginal - parseFloat(couponValue.reduce)
        }
        return totalOriginal
      case 'discount':
        return totalOriginal * parseFloat(couponValue.rate)
      case 'free_shipping':
        return totalOriginal - (parseFloat(couponValue.shippingFee) || 6)
      default:
        return totalOriginal
    }
  }

  // 删除选中商品
  const deleteSelected = () => {
    if (selectedItems.length === 0) return
    if (confirm(`确定要删除选中的 ${selectedItems.length} 件商品吗？`)) {
      removeFromCartBatch(selectedItems)
      setSelectedItems([])
    }
  }

  // 创建凑单方案
  const handleCreatePlan = (e) => {
    e.preventDefault()
    if (!planFormData.planName) {
      alert('请填写方案名称')
      return
    }
    if (selectedItems.length === 0) {
      alert('请先选择要凑单的商品')
      return
    }

    const selectedCartItems = cartItems.filter((item) => selectedItems.includes(item.productId))
    const totalOriginal = selectedItems.reduce((sum, id) => {
      const item = cartItems.find((ci) => ci.productId === id)
      return sum + (item ? item.subtotal : 0)
    }, 0)
    const totalActual = calcTotalActual(totalOriginal, planFormData.couponType, planFormData.couponValue)

    const plan = {
      planName: planFormData.planName,
      platform: planFormData.platform,
      items: selectedCartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        brand: item.brand || '',
        spec: item.spec || '',
        unit: item.unit || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      couponType: planFormData.couponType,
      couponValue: planFormData.couponValue,
      totalOriginal,
      totalActual,
      isPurchased: false,
      purchasedAt: null,
      actualPaid: null,
    }

    addPlan(plan)
    setShowCreatePlan(false)
    setSelectedItems([])
    setPlanFormData({
      planName: '',
      platform: '京东',
      couponType: 'full_reduce',
      couponValue: { threshold: '', reduce: '' },
    })
    alert('凑单方案已创建！')
    if (onNavigate) {
      onNavigate('plans')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">待购清单</h1>
        {cartItems.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-sm text-red-500"
          >
            清空
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">🛒</div>
          <div>待购清单为空</div>
          <div className="text-sm mt-1">在参考库或临时比价中添加商品</div>
        </div>
      ) : (
        <>
          {/* 全选栏 */}
          <div className="bg-white rounded-lg p-3 mb-3 shadow-sm flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm text-gray-600">全选</span>
            </label>
            {selectedItems.length > 0 && (
              <button
                onClick={deleteSelected}
                className="text-sm text-red-500"
              >
                删除选中 ({selectedItems.length})
              </button>
            )}
          </div>

          {/* 商品列表 */}
          <div className="space-y-3 pb-24">
            {cartItems
              .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
              .map((item) => (
                <div
                  key={item.productId}
                  className={`bg-white rounded-lg p-4 shadow-sm relative ${
                    selectedItems.includes(item.productId) ? 'ring-2 ring-blue-300' : ''
                  }`}
                >
                  {item.isPinned && (
                    <div className="absolute top-2 right-2 text-gray-400 text-lg">
                      📌
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.productId)}
                      onChange={() => toggleSelect(item.productId)}
                      className="w-4 h-4 text-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      {item.brand && (
                        <div className="font-medium text-gray-800">{item.brand}</div>
                      )}
                      <div className="text-sm text-gray-500">{item.productName}</div>
                      {item.spec && (
                        <div className="text-sm text-gray-500">{item.spec}</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        {item.platform} · {item.quantity}{item.unit}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="text-blue-500 font-medium">
                          单价: ¥{item.unitPrice.toFixed(2)}
                        </div>
                        {item.netContentUnitPrice !== null && item.netContentUnitPrice !== undefined && (
                          <div className="text-green-500 text-sm">
                            净含量: ¥{item.netContentUnitPrice.toFixed(4)}/{item.netContentUnit}
                            {item.converterMainUnit && item.converterMiddleUnitName && (
                              <span className="text-xs text-gray-500 ml-2">
                                （1{item.unit}={item.converterMainUnit}{item.converterMiddleUnitName}×{item.converterMiddleUnit}{item.netContentUnit}）
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="text-lg font-bold text-blue-600">
                          ¥{item.subtotal.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateCartItemQuantity(item.productId, item.quantity - 1)
                              }
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              if (!isNaN(val) && val >= 1) {
                                updateCartItemQuantity(item.productId, val)
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value)
                              if (isNaN(val) || val < 1) {
                                updateCartItemQuantity(item.productId, 1)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur()
                              }
                            }}
                            className="w-12 text-center border border-gray-300 rounded py-1"
                          />
                          <button
                            onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setShowEditModal(true)
                          }}
                          className="px-3 py-1 text-sm border border-blue-500 text-blue-500 rounded"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setIsCopyMode(true)
                            setShowEditModal(true)
                          }}
                          className="px-3 py-1 text-sm border border-orange-500 text-orange-500 rounded"
                        >
                          复制
                        </button>
                        <button
                          onClick={() => toggleCartItemPin(item.productId)}
                          className="px-3 py-1 text-sm border border-gray-400 text-gray-500 rounded"
                        >
                          {item.isPinned ? '取消置顶' : '置顶'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDeleteTarget(item)
                        setShowDeleteConfirm(true)
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* 底部统计和创建方案按钮 */}
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg">
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-500">已选 {selectedItems.length} 件</div>
                  <div className="text-xl font-bold text-blue-500">
                    ¥{selectedTotalPrice.toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => setShowCreatePlan(true)}
                  disabled={selectedItems.length === 0}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    selectedItems.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  创建凑单方案
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 创建凑单方案弹窗 */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">创建凑单方案</h2>
            </div>
            <form onSubmit={handleCreatePlan} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方案名称 *</label>
                <input
                  type="text"
                  value={planFormData.planName}
                  onChange={(e) => setPlanFormData({ ...planFormData, planName: e.target.value })}
                  placeholder="如: 京东618凑单"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={planFormData.platform}
                  onChange={(e) => setPlanFormData({ ...planFormData, platform: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优惠券类型</label>
                <select
                  value={planFormData.couponType}
                  onChange={(e) => setPlanFormData({ ...planFormData, couponType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {COUPON_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {planFormData.couponType === 'full_reduce' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">满(元)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={planFormData.couponValue.threshold}
                      onChange={(e) =>
                        setPlanFormData({
                          ...planFormData,
                          couponValue: { ...planFormData.couponValue, threshold: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">减(元)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={planFormData.couponValue.reduce}
                      onChange={(e) =>
                        setPlanFormData({
                          ...planFormData,
                          couponValue: { ...planFormData.couponValue, reduce: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}
              {planFormData.couponType === 'discount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">折扣率(如0.9)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planFormData.couponValue.rate || ''}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        couponValue: { ...planFormData.couponValue, rate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              {planFormData.couponType === 'free_shipping' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运费(默认6元)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planFormData.couponValue.shippingFee || 6}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        couponValue: { ...planFormData.couponValue, shippingFee: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>原价合计:</span>
                    <span>¥{selectedTotalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>优惠后:</span>
                    <span className="text-blue-500 font-medium">
                      ¥{calcTotalActual(selectedTotalPrice, planFormData.couponType, planFormData.couponValue).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePlan(false)
                    setPlanFormData({
                      planName: '',
                      platform: '京东',
                      couponType: 'full_reduce',
                      couponValue: { threshold: '', reduce: '' },
                    })
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium">
                  创建方案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认清空</h3>
            <p className="text-gray-600 mb-4">确定要清空所有待购清单吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setSelectedItems([])
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

      {/* 编辑商品弹窗 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">编辑商品</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
                <input
                  type="text"
                  value={editingItem.productName || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, productName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                <input
                  type="text"
                  value={editingItem.brand || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规格描述</label>
                <input
                  type="text"
                  value={editingItem.spec || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, spec: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.quantity || 1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      const totalPrice = editingItem.subtotal || (editingItem.unitPrice * editingItem.quantity)
                      setEditingItem({ 
                        ...editingItem, 
                        quantity: val,
                        subtotal: totalPrice,
                        unitPrice: totalPrice / val
                      })
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <input
                    type="text"
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">总价（元）</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.subtotal || (editingItem.unitPrice * editingItem.quantity).toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    const qty = editingItem.quantity || 1
                    setEditingItem({ 
                      ...editingItem, 
                      subtotal: val,
                      unitPrice: qty > 0 ? val / qty : 0
                    })
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="text-xs text-gray-400 mt-1">
                  单价 = ¥{editingItem.quantity > 0 ? ((editingItem.subtotal || 0) / editingItem.quantity).toFixed(2) : '0.00'}/{editingItem.unit || '件'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={editingItem.platform || '京东'}
                  onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isCopyMode) {
                      const newItem = { ...editingItem }
                      delete newItem.productId
                      addToCart(newItem)
                      alert('商品已复制到待购清单！')
                    } else {
                      updateCartItemQuantity(editingItem.productId, editingItem.quantity)
                      const newCart = cartItems.map(ci => 
                        ci.productId === editingItem.productId ? editingItem : ci
                      )
                      localStorage.setItem('huibi_cart', JSON.stringify(newCart))
                      alert('商品已更新！')
                    }
                    setShowEditModal(false)
                    setIsCopyMode(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  {isCopyMode ? '复制' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">确定要删除「{deleteTarget.productName}」吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteTarget(null)
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  removeFromCart(deleteTarget.productId)
                  setShowDeleteConfirm(false)
                  setDeleteTarget(null)
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
