import { useState, useEffect } from 'react'
import { convertNetContentUnitPrice } from '../utils/unitConverter'

const STORAGE_KEY = 'huibi_products'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export default function useProducts() {
  const [products, setProducts] = useState([])

  // 从localStorage加载数据并重新计算净含量单价
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored)
        if (Array.isArray(parsedData)) {
          // 批量重新计算净含量单价
          const updatedProducts = parsedData.map(product => {
            // 重新计算净含量单价（如果有净含量数据）
            if (product.netContent > 0 && product.netContentUnit) {
              return {
                ...product
              }
            }
            return product
          })
          setProducts(updatedProducts)
          // 保存更新后的数据回localStorage
          saveToStorage(updatedProducts)
        }
      }
    } catch (e) {
      console.error('加载商品数据失败:', e)
    }
  }, [])

  // 保存到localStorage
  const saveToStorage = (newProducts) => {
    try {
      console.log('保存商品数据:', newProducts.length, '条')
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts))
      console.log('商品数据保存成功')
    } catch (e) {
      console.error('保存商品数据失败:', e)
    }
  }

  // 添加商品
  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    const newProducts = [newProduct, ...products]
    setProducts(newProducts)
    saveToStorage(newProducts)
    return newProduct
  }

  // 添加价格历史记录
  const addPriceHistory = (productId, price, date, type = 'actual') => {
    const newProducts = products.map(p => {
      if (p.id !== productId) return p
      const history = p.priceHistory || []
      const filtered = history.filter(h =>
        !(h.date === date && h.type === type)
      )
      return {
        ...p,
        priceHistory: [...filtered, { price, date, type }]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      }
    })
    setProducts(newProducts)
    saveToStorage(newProducts)
  }

  // 更新商品
  const updateProduct = (id, updates) => {
    const existing = products.find(p => p.id === id)
    const newProducts = products.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    )
    setProducts(newProducts)
    saveToStorage(newProducts)
    // 如果价格有变化，自动记录市场价历史
    if (existing && updates.price && updates.price !== existing.price) {
      const today = new Date().toISOString().split('T')[0]
      addPriceHistory(id, updates.unitPrice || updates.price, today, 'market')
    }
  }

  // 删除商品
  const deleteProduct = (id) => {
    const newProducts = products.filter((p) => p.id !== id)
    setProducts(newProducts)
    saveToStorage(newProducts)
  }

  // 批量添加商品
  const addProducts = (newProducts) => {
    const productsWithId = newProducts.map(p => ({
      ...p,
      id: generateId(),
      createdAt: new Date().toISOString()
    }))
    const updated = [...products, ...productsWithId]
    setProducts(updated)
    saveToStorage(updated)
  }

  // 根据ID获取商品
  const getProductById = (id) => {
    return products.find((p) => p.id === id)
  }

  // 清空所有商品
  const clearAllProducts = () => {
    setProducts([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    products,
    addProduct,
    addProducts,
    updateProduct,
    addPriceHistory,
    deleteProduct,
    getProductById,
    clearAllProducts,
  }
}
