import { useState } from 'react'
import ProductLibrary from './pages/ProductLibrary'
import QuickCompare from './pages/QuickCompare'
import BundlePlans from './pages/BundlePlans'
import ShoppingCart from './pages/ShoppingCart'

const TAB_ITEMS = [
  { key: 'library', label: '参考库', icon: '📦' },
  { key: 'compare', label: '临时比价', icon: '🔍' },
  { key: 'plans', label: '凑单方案', icon: '📋' },
  { key: 'cart', label: '待购清单', icon: '🛒' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('library')

  const renderPage = () => {
    switch (activeTab) {
      case 'library':
        return <ProductLibrary />
      case 'compare':
        return <QuickCompare />
      case 'plans':
        return <BundlePlans />
      case 'cart':
        return <ShoppingCart onNavigate={setActiveTab} />
      default:
        return <ProductLibrary />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <div className="max-w-lg mx-auto">
        {renderPage()}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-sm transition-colors ${
                activeTab === item.key
                  ? 'text-blue-500 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
