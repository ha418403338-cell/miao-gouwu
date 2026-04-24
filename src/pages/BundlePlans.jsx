import { useState } from 'react'
import usePlans from '../hooks/usePlans'
import useProducts from '../hooks/useProducts'
import { PLATFORM_OPTIONS } from '../utils/constants'
const COUPON_TYPES = [
  { value: 'full_reduce', label: '满减券' },
  { value: 'discount', label: '折扣券' },
  { value: 'free_shipping', label: '免邮券' },
]

export default function BundlePlans() {
  const { plans, addPlan, updatePlan, deletePlan, markAsPurchased, cartItems } = usePlans()
  const { products } = useProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showAddItems, setShowAddItems] = useState(false)
  const [addingToPlanId, setAddingToPlanId] = useState(null)
  const [addItemsSource, setAddItemsSource] = useState('library')
  const [selectedAddItems, setSelectedAddItems] = useState([])
  const [showMarkPurchased, setShowMarkPurchased] = useState(false)
  const [markPurchasingPlan, setMarkPurchasingPlan] = useState(null)
  const [markPurchasedAmount, setMarkPurchasedAmount] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingPlanId, setDeletingPlanId] = useState(null)
  const [showUnmarkConfirm, setShowUnmarkConfirm] = useState(false)
  const [unmarkingPlan, setUnmarkingPlan] = useState(null)
  const [currentView, setCurrentView] = useState('plans') // 'plans' 或 'purchases'
  const [formData, setFormData] = useState({
    planName: '',
    platform: '京东',
    couponType: 'full_reduce',
    couponValue: { threshold: '', reduce: '' },
  })

  // 计算优惠后金额
  const calcTotalActual = (totalOriginal, couponType, couponValue) => {
    switch (couponType) {
      case 'full_reduce':
        if (totalOriginal >= couponValue.threshold) {
          return totalOriginal - couponValue.reduce
        }
        return totalOriginal
      case 'discount':
        return totalOriginal * couponValue.rate
      case 'free_shipping':
        return totalOriginal - (couponValue.shippingFee || 6)
      default:
        return totalOriginal
    }
  }

  // 提交表单
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.planName) {
      alert('请填写方案名称')
      return
    }
    const { cartItems } = usePlans.getState ? usePlans.getState() : { cartItems: [] }
    if (cartItems.length === 0) {
      alert('待购清单为空，请先添加商品')
      return
    }
    const totalOriginal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalActual = calcTotalActual(totalOriginal, formData.couponType, formData.couponValue)
    const plan = {
      planName: formData.planName,
      platform: formData.platform,
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      couponType: formData.couponType,
      couponValue: formData.couponValue,
      totalOriginal,
      totalActual,
      isPurchased: false,
      purchasedAt: null,
      actualPaid: null,
    }
    if (editingId) {
      updatePlan(editingId, plan)
    } else {
      addPlan(plan)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData({ planName: '', platform: '京东', couponType: 'full_reduce', couponValue: { threshold: '', reduce: '' } })
  }

  // 编辑方案
  const handleEdit = (plan) => {
    setFormData({
      planName: plan.planName,
      platform: plan.platform,
      couponType: plan.couponType,
      couponValue: plan.couponValue,
    })
    setEditingId(plan.id)
    setShowForm(true)
  }

  // 删除方案
  const handleDelete = (id) => {
    setDeletingPlanId(id)
    setShowDeleteConfirm(true)
  }

  // 标记已购买
  const handleMarkPurchased = (plan) => {
    setMarkPurchasingPlan(plan)
    setMarkPurchasedAmount(plan.totalActual.toFixed(2))
    setShowMarkPurchased(true)
  }

  // 取消标记已购买
  const handleUnmarkPurchased = (plan) => {
    setUnmarkingPlan(plan)
    setShowUnmarkConfirm(true)
  }

  // 复制方案文本
  const copyPlanText = (plan) => {
    const text = `${plan.planName}\n平台: ${plan.platform}\n${plan.items.map((i) => `${i.productName} x${i.quantity} ¥${i.subtotal.toFixed(2)}`).join('\n')}\n原价: ¥${plan.totalOriginal.toFixed(2)}\n实付: ¥${plan.totalActual.toFixed(2)}`
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  // 打开追加商品弹窗
  const handleAddItems = (planId) => {
    setAddingToPlanId(planId)
    setAddItemsSource('library')
    setSelectedAddItems([])
    setShowAddItems(true)
  }

  // 确认追加商品
  const confirmAddItems = () => {
    if (selectedAddItems.length === 0) {
      alert('请选择要追加的商品')
      return
    }
    const plan = plans.find((p) => p.id === addingToPlanId)
    if (!plan) return

    const sourceItems = addItemsSource === 'library' ? products : cartItems
    const itemsToAdd = sourceItems.filter((item) => selectedAddItems.includes(item.productId || item.id))

    const newItems = itemsToAdd.map((item) => ({
      productId: item.productId || item.id,
      productName: item.productName,
      brand: item.brand || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }))

    const updatedItems = [...plan.items, ...newItems]
    const newTotalOriginal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)
    const newTotalActual = calcTotalActual(newTotalOriginal, plan.couponType, plan.couponValue)

    updatePlan(plan.id, { items: updatedItems, totalOriginal: newTotalOriginal, totalActual: newTotalActual })
    setShowAddItems(false)
    setSelectedAddItems([])
    setAddingToPlanId(null)
    alert('已追加商品')
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">凑单方案</h1>
          <div className="flex border rounded-lg p-0.5 bg-gray-100">
            <button
              onClick={() => setCurrentView('plans')}
              className={`px-3 py-1 text-sm rounded-md ${currentView === 'plans' ? 'bg-white text-blue-500 font-medium' : 'text-gray-600'}`}
            >
              方案列表
            </button>
            <button
              onClick={() => setCurrentView('purchases')}
              className={`px-3 py-1 text-sm rounded-md ${currentView === 'purchases' ? 'bg-white text-blue-500 font-medium' : 'text-gray-600'}`}
            >
              购买记录
            </button>
          </div>
        </div>
        {currentView === 'plans' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + 新建方案
          </button>
        )}
      </div>

      {currentView === 'plans' ? (
        /* 方案列表 */
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="text-center text-gray-400 py-8">暂无凑单方案</div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className={`rounded-lg p-4 shadow-sm relative ${
                plan.isPurchased 
                  ? 'bg-white/70 opacity-80' 
                  : 'bg-white'
              }`}>
                {/* 已购买角标 */}
                {plan.isPurchased && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg rounded-tr-lg">
                    ✓ 已购买
                    <div className="text-xs opacity-80">
                      {new Date(plan.purchasedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className={`font-medium ${
                      plan.isPurchased ? 'text-gray-600' : 'text-gray-800'
                    }`}>{plan.planName}</div>
                    <div className="text-sm text-gray-500">{plan.platform}</div>
                  </div>
                  {plan.isPurchased && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                      实付 ¥{plan.actualPaid}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  {plan.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span>
                        {item.brand ? `${item.brand} · ` : ''}
                        {item.productName}
                        {item.spec ? ` · ${item.spec}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1
                            const newSubtotal = newQty * item.unitPrice
                            const updatedItems = plan.items.map((i, iidx) =>
                              iidx === idx ? { ...i, quantity: newQty, subtotal: newSubtotal } : i
                            )
                            const newTotalOriginal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)
                            const newTotalActual = calcTotalActual(newTotalOriginal, plan.couponType, plan.couponValue)
                            updatePlan(plan.id, { items: updatedItems, totalOriginal: newTotalOriginal, totalActual: newTotalActual })
                          }}
                          className="w-14 text-right border border-gray-300 rounded px-1 py-0.5"
                        />
                        <span className="text-gray-400">x</span>
                        <span>¥{item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">原价:</span>
                    <span className="text-gray-800">¥{plan.totalOriginal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">优惠:</span>
                    <span className="text-orange-500">
                      -¥{(plan.totalOriginal - plan.totalActual).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">实付:</span>
                    <span className="text-blue-500">¥{plan.totalActual.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {!plan.isPurchased ? (
                    <>
                      <button
                        onClick={() => handleMarkPurchased(plan)}
                        className="flex-1 text-sm text-green-500 border border-green-500 rounded py-1"
                      >
                        标记已购买
                      </button>
                      <button
                        onClick={() => copyPlanText(plan)}
                        className="flex-1 text-sm text-blue-500 border border-blue-500 rounded py-1"
                      >
                        复制文本
                      </button>
                      <button
                        onClick={() => handleAddItems(plan.id)}
                        className="flex-1 text-sm text-purple-500 border border-purple-500 rounded py-1"
                      >
                        追加商品
                      </button>
                      <button
                        onClick={() => handleEdit(plan)}
                        className="flex-1 text-sm text-gray-500 border border-gray-500 rounded py-1"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="flex-1 text-sm text-red-500 border border-red-500 rounded py-1"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => copyPlanText(plan)}
                        className="flex-1 text-sm text-blue-500 border border-blue-500 rounded py-1"
                      >
                        复制文本
                      </button>
                      <button
                        onClick={() => handleUnmarkPurchased(plan)}
                        className="flex-1 text-sm text-yellow-500 border border-yellow-500 rounded py-1"
                      >
                        取消标记
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="flex-1 text-sm text-red-500 border border-red-500 rounded py-1"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* 购买记录 */
        <div>
          {/* 筛选已购买的方案 */}
          {(() => {
            const purchasedPlans = plans.filter(plan => plan.isPurchased).sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
            
            if (purchasedPlans.length === 0) {
              return <div className="text-center text-gray-400 py-8">暂无购买记录</div>
            }
            
            // 计算汇总数据
            const totalPurchases = purchasedPlans.length
            const totalActualPaid = purchasedPlans.reduce((sum, plan) => sum + parseFloat(plan.actualPaid), 0)
            const totalSaved = purchasedPlans.reduce((sum, plan) => sum + (plan.totalOriginal - parseFloat(plan.actualPaid)), 0)
            
            // 按月份分组
            const groupedPlans = purchasedPlans.reduce((groups, plan) => {
              const date = new Date(plan.purchasedAt)
              const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`
              if (!groups[monthKey]) {
                groups[monthKey] = {
                  plans: [],
                  subtotal: 0
                }
              }
              groups[monthKey].plans.push(plan)
              groups[monthKey].subtotal += parseFloat(plan.actualPaid)
              return groups
            }, {})
            
            return (
              <>
                {/* 汇总数据 */}
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3">购买汇总</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-gray-500 text-sm">累计购买次数</div>
                      <div className="text-2xl font-bold text-blue-500">{totalPurchases}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-sm">累计实际花费</div>
                      <div className="text-2xl font-bold text-green-500">¥{totalActualPaid.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-sm">累计节省金额</div>
                      <div className="text-2xl font-bold text-orange-500">¥{totalSaved.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                {/* 月度分组 */}
                <div className="space-y-4">
                  {Object.entries(groupedPlans).map(([month, data]) => (
                    <div key={month}>
                      {/* 月份标题 */}
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-800">{month}</h3>
                        <span className="text-sm text-gray-500">本月花费: ¥{data.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {/* 月度记录列表 */}
                      <div className="space-y-3">
                        {data.plans.map((plan) => (
                          <div key={plan.id} className="bg-white rounded-lg p-4 shadow-sm relative">
                            {/* 删除按钮 */}
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                            
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-gray-800">{plan.planName}</div>
                                <div className="text-sm text-gray-500">{plan.platform}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(plan.purchasedAt).toLocaleString()}
                                </div>
                              </div>
                              <span className="text-sm bg-green-100 text-green-600 px-2 py-1 rounded">
                                实付 ¥{plan.actualPaid}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 space-y-2 mb-3">
                              {plan.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-5 gap-2 text-xs">
                                  <div className="col-span-2">
                                    {item.brand ? `${item.brand} · ` : ''}
                                    {item.productName}
                                    {item.spec ? ` · ${item.spec}` : ''}
                                  </div>
                                  <div className="text-right">
                                    {item.quantity}×{item.unit || ''}
                                  </div>
                                  <div className="text-right">
                                    ¥{item.unitPrice.toFixed(2)}
                                  </div>
                                  <div className="text-right font-medium">
                                    ¥{item.subtotal.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="border-t pt-2 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">原价合计:</span>
                                <span className="text-gray-800">¥{plan.totalOriginal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">优惠金额:</span>
                                <span className="text-orange-500">
                                  -¥{(plan.totalOriginal - parseFloat(plan.actualPaid)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold text-lg">
                                <span className="text-gray-700">实付金额:</span>
                                <span className="text-blue-500">¥{plan.actualPaid}</span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {(() => {
                                  switch (plan.couponType) {
                                    case 'full_reduce':
                                      return `优惠券：满${plan.couponValue.threshold}减${plan.couponValue.reduce}`
                                    case 'discount':
                                      return `优惠券：${(plan.couponValue.rate * 100).toFixed(0)}折`
                                    case 'free_shipping':
                                      return `优惠券：免运费${plan.couponValue.shippingFee || 6}元`
                                    default:
                                      return ''
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* 新建/编辑方案弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? '编辑方案' : '新建方案'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方案名称</label>
                <input
                  type="text"
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="如: 京东618方案A"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
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
                  value={formData.couponType}
                  onChange={(e) => setFormData({ ...formData, couponType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {COUPON_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {formData.couponType === 'full_reduce' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">满(元)</label>
                    <input
                      type="number"
                      value={formData.couponValue.threshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          couponValue: { ...formData.couponValue, threshold: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">减(元)</label>
                    <input
                      type="number"
                      value={formData.couponValue.reduce}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          couponValue: { ...formData.couponValue, reduce: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}
              {formData.couponType === 'discount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">折扣率(如0.9)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.couponValue.rate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        couponValue: { ...formData.couponValue, rate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              {formData.couponType === 'free_shipping' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运费(默认6元)</label>
                  <input
                    type="number"
                    value={formData.couponValue.shippingFee || 6}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        couponValue: { ...formData.couponValue, shippingFee: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium">
                  保存方案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 追加商品弹窗 */}
      {showAddItems && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">追加商品</h2>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setAddItemsSource('library')
                    setSelectedAddItems([])
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    addItemsSource === 'library'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  参考库商品
                </button>
                <button
                  onClick={() => {
                    setAddItemsSource('cart')
                    setSelectedAddItems([])
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    addItemsSource === 'cart'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  待购清单商品
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(addItemsSource === 'library' ? products : cartItems).length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    {addItemsSource === 'library' ? '暂无参考库商品' : '待购清单为空'}
                  </div>
                ) : (
                  (addItemsSource === 'library' ? products : cartItems).map((item) => (
                    <label
                      key={item.productId || item.id}
                      className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddItems.includes(item.productId || item.id)}
                        onChange={(e) => {
                          const itemId = item.productId || item.id
                          if (e.target.checked) {
                            setSelectedAddItems([...selectedAddItems, itemId])
                          } else {
                            setSelectedAddItems(selectedAddItems.filter((id) => id !== itemId))
                          }
                        }}
                        className="w-4 h-4 text-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.brand} · {item.quantity}{item.unit} · ¥{item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddItems(false)
                    setSelectedAddItems([])
                    setAddingToPlanId(null)
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={confirmAddItems}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  确认追加 ({selectedAddItems.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标记已购买弹窗 */}
      {showMarkPurchased && markPurchasingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">确认标记为已购买？</h2>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-3">
                方案：{markPurchasingPlan.planName}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">实付金额（选填）</label>
                <input
                  type="number"
                  step="0.01"
                  value={markPurchasedAmount}
                  onChange={(e) => setMarkPurchasedAmount(e.target.value)}
                  placeholder="留空则使用计算金额"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMarkPurchased(false)
                    setMarkPurchasingPlan(null)
                    setMarkPurchasedAmount('')
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const amount = markPurchasedAmount ? parseFloat(markPurchasedAmount) : markPurchasingPlan.totalActual
                    markAsPurchased(markPurchasingPlan.id, amount)
                    setShowMarkPurchased(false)
                    setMarkPurchasingPlan(null)
                    setMarkPurchasedAmount('')
                  }}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">确认删除？</h2>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-4">
                确定要删除这个方案吗？此操作不可恢复。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletingPlanId(null)
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    deletePlan(deletingPlanId)
                    setShowDeleteConfirm(false)
                    setDeletingPlanId(null)
                  }}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 取消标记确认弹窗 */}
      {showUnmarkConfirm && unmarkingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">确认取消标记？</h2>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-4">
                确定要取消标记"{unmarkingPlan.planName}"为已购买吗？
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnmarkConfirm(false)
                    setUnmarkingPlan(null)
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    updatePlan(unmarkingPlan.id, {
                      isPurchased: false,
                      purchasedAt: null,
                      actualPaid: null
                    })
                    setShowUnmarkConfirm(false)
                    setUnmarkingPlan(null)
                  }}
                  className="flex-1 py-2 bg-yellow-500 text-white rounded-lg font-medium"
                >
                  确认取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
