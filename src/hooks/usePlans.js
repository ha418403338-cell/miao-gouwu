import { useState, useEffect } from 'react'

const PLANS_STORAGE_KEY = 'huibi_plans'
const CART_STORAGE_KEY = 'huibi_cart'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export default function usePlans() {
  const [plans, setPlans] = useState([])
  const [cartItems, setCartItems] = useState([])

  // 从localStorage加载数据
  useEffect(() => {
    try {
      // 加载凑单方案
      const storedPlans = localStorage.getItem(PLANS_STORAGE_KEY)
      if (storedPlans) {
        const parsedData = JSON.parse(storedPlans)
        if (Array.isArray(parsedData)) {
          setPlans(parsedData)
        }
      }
      
      // 加载待购清单
      const storedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart)
        if (Array.isArray(parsedCart)) {
          setCartItems(parsedCart)
        }
      }
    } catch (e) {
      console.error('加载数据失败:', e)
    }
  }, [])

  // 保存凑单方案到localStorage
  const savePlansToStorage = (newPlans) => {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(newPlans))
    } catch (e) {
      console.error('保存凑单方案数据失败:', e)
    }
  }

  // 保存待购清单到localStorage
  const saveCartToStorage = (newCart) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart))
    } catch (e) {
      console.error('保存待购清单数据失败:', e)
    }
  }

  // 添加凑单方案
  const addPlan = (plan) => {
    const newPlan = {
      ...plan,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    const newPlans = [newPlan, ...plans]
    setPlans(newPlans)
    savePlansToStorage(newPlans)
    return newPlan
  }

  // 更新凑单方案
  const updatePlan = (id, updates) => {
    const newPlans = plans.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    )
    setPlans(newPlans)
    savePlansToStorage(newPlans)
  }

  // 删除凑单方案
  const deletePlan = (id) => {
    const newPlans = plans.filter((p) => p.id !== id)
    setPlans(newPlans)
    savePlansToStorage(newPlans)
  }

  // 标记方案为已购买
  const markAsPurchased = (id, actualPaid) => {
    const newPlans = plans.map((p) =>
      p.id === id
        ? {
            ...p,
            isPurchased: true,
            purchasedAt: new Date().toISOString(),
            actualPaid,
            paidAmount: actualPaid,
            items: p.items.map((item) => {
              const ratio = item.subtotal / p.totalOriginal
              const actualPaidTotal = Math.round(actualPaid * ratio * 100) / 100
              const actualPaidPrice = Math.round(actualPaidTotal / item.quantity * 100) / 100
              return {
                ...item,
                originalPrice: item.unitPrice,
                actualPaidTotal,
                actualPaidPrice,
              }
            }),
          }
        : p
    )
    setPlans(newPlans)
    savePlansToStorage(newPlans)
  }

  // 添加商品到待购清单
  const addToCart = (item) => {
    const existingIndex = cartItems.findIndex(
      (ci) => ci.productId === item.productId
    )
    if (existingIndex >= 0) {
      const updated = [...cartItems]
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + (item.quantity || 1),
        subtotal:
          (updated[existingIndex].quantity + (item.quantity || 1)) *
          updated[existingIndex].unitPrice,
      }
      setCartItems(updated)
      saveCartToStorage(updated)
    } else {
      const newItem = {
        productId: item.productId || generateId(),
        productName: item.productName,
        brand: item.brand || '',
        spec: item.spec || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        unit: item.unit,
        price: item.price || item.unitPrice,
        platform: item.platform,
        netContent: item.netContent || null,
        netContentUnit: item.netContentUnit || null,
        netContentUnitPrice: item.netContentUnitPrice || null,
        subtotal: (item.quantity || 1) * item.unitPrice,
        isPinned: false,
      }
      const newCart = [...cartItems, newItem]
      setCartItems(newCart)
      saveCartToStorage(newCart)
    }
  }

  // 从待购清单移除商品
  const removeFromCart = (productId) => {
    const newCart = cartItems.filter((ci) => ci.productId !== productId)
    setCartItems(newCart)
    saveCartToStorage(newCart)
  }

  // 更新待购清单中商品数量
  const updateCartItemQuantity = (productId, quantity) => {
    if (quantity < 1) return
    const updated = cartItems.map((ci) =>
      ci.productId === productId
        ? { ...ci, quantity, subtotal: quantity * ci.unitPrice }
        : ci
    )
    setCartItems(updated)
    saveCartToStorage(updated)
  }

  // 清空待购清单
  const clearCart = () => {
    setCartItems([])
    saveCartToStorage([])
  }

  // 批量删除待购清单商品
  const removeFromCartBatch = (productIds) => {
    const newCart = cartItems.filter((ci) => !productIds.includes(ci.productId))
    setCartItems(newCart)
    saveCartToStorage(newCart)
  }

  // 切换待购清单商品置顶状态
  const toggleCartItemPin = (productId) => {
    const updated = cartItems.map((ci) =>
      ci.productId === productId ? { ...ci, isPinned: !ci.isPinned } : ci
    )
    setCartItems(updated)
    saveCartToStorage(updated)
  }

  return {
    plans,
    cartItems,
    addPlan,
    updatePlan,
    deletePlan,
    markAsPurchased,
    addToCart,
    removeFromCart,
    removeFromCartBatch,
    updateCartItemQuantity,
    clearCart,
    toggleCartItemPin,
  }
}
