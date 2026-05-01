# 妙购物（miaogouwu）· 项目说明文档

> 放置路径：`.trae/rules/project_rules.md`
> 作用：每次对话 Trae 都会优先读取本文件，确保规则一致。

---

## 技术栈

- 框架：Vite + React
- 样式：Tailwind CSS
- 数据持久化：localStorage（无后端）
- 语言：JavaScript（不使用 TypeScript）

---

## 目录结构

```
src/
├── pages/
│   ├── ProductLibrary.jsx     # 参考库页面
│   ├── QuickCompare.jsx       # 临时比价页面
│   ├── BundlePlans.jsx        # 凑单方案页面
│   └── ShoppingCart.jsx       # 待购清单页面
├── components/                # 可复用组件
├── hooks/
│   ├── useProducts.js         # 商品库读写
│   └── usePlans.js            # 凑单方案读写
├── utils/
│   ├── unitConverter.js       # 单位换算（勿随意修改）
│   └── fuzzyMatch.js          # 模糊匹配（勿随意修改）
└── App.jsx                    # 底部Tab导航入口
```

---

## 核心数据结构（字段名不得修改）

```js
// 商品记录 · localStorage key: huibi_products
Product {
  id, productName, brand, spec,
  quantity, unit, price, unitPrice,
  platform, category, notes, createdAt
}

// 凑单方案 · localStorage key: huibi_plans
BundlePlan {
  id, planName, platform, items,
  couponType, couponValue,
  totalOriginal, totalActual,
  isPurchased, purchasedAt, actualPaid, createdAt
}
```

---

## 命名规范

- 组件：PascalCase，文件名与组件名一致
- 函数/变量：camelCase
- 常量：UPPER_SNAKE_CASE
- 所有注释用**中文**

---

## 禁忌（必须遵守）

1. **不要**在组件内部直接写单位换算逻辑，统一调用 `unitConverter.js`
2. **不要**修改 localStorage 的 key 名（`huibi_products` / `huibi_plans`）
3. **不要**引入付费或需要注册的第三方 UI 库
4. **不要**在未告知用户的情况下新增数据字段
5. **不要**把四个主页面合并成一个文件
6. **每次修改代码，不得修改任何其他已有功能模块，只处理当前被要求的部分**
7. **每个功能模块必须加中文注释，说明该段代码的作用**

---

## 单位换算规则（unitConverter.js 的核心逻辑）

- 重量类 → 统一换算为 g：1kg = 1000g
- 容量类 → 统一换算为 ml：1L = 1000ml
- 计数类（片/个/包/卷/件）→ 不跨类换算，同单位内比较
- 跨类比价时界面给出"单位不同，无法直接比价"提示

---

## 优惠券计算规则（BundlePlan 相关）

- `full_reduce`：满 threshold 减 reduce，未达门槛不生效
- `discount`：totalOriginal × rate
- `free_shipping`：totalOriginal - shippingFee（shippingFee 默认 6 元）

---

## 模糊匹配规则（fuzzyMatch.js 的核心逻辑）

临时比价时，输入商品与库中记录的匹配条件：
品牌名 OR 商品名中，有 **2个及以上连续或非连续汉字** 与库中记录重合，即视为匹配，调出参与比价，标注「来自参考库」。

---

## Skills 沉淀区（开发过程中逐步补充）

> 每当某个操作被重复解释超过2次，就在此处记录固定流程，避免每次重新教AI。

<## Skills 沉淀区

### Skill 1：修复 confirm() / prompt() 不支持的问题
当前环境不支持 window.confirm() 和 window.prompt()。
凡是需要二次确认的操作，一律用自定义 modal 弹窗实现：
- 新增对应的 showXxx 和 xxxTarget state
- 点击触发按钮只负责打开弹窗、存目标数据
- 实际操作函数只在弹窗「确认」按钮的 onClick 里调用
- 「取消」按钮只关闭弹窗，不执行任何操作
禁止在任何地方使用 window.confirm() / window.prompt()。

### Skill 2：净含量单价计算规则
正确公式：净含量单价 = 价格 ÷ 数量 ÷ 净含量数值
所有涉及净含量单价的地方统一调用 convertNetContentUnitPrice() 函数。
不要从 localStorage 直接读取存储的净含量单价字段用于显示，
而是在渲染时实时调用函数重新计算，避免旧数据污染。

### Skill 3：新增功能模块的标准流程
每次新增一个功能点，必须检查以下五处是否同步更新：
1. 相关页面的 JSX 渲染
2. 对应的 hook（useProducts / usePlans）
3. localStorage 存取逻辑
4. 如涉及单位/平台/品类，确认常量列表是否是最新版
5. 其他页面中调用同一数据的地方（如参考库改了字段，临时比价也要同步）

### Skill 4：平台和单位选项的统一常量
所有页面的平台选项必须使用同一份列表，不要各自硬编码：
平台：淘宝 / 天猫旗舰店 / 天猫超市 / 天猫国际 / 京东 / 拼多多 / 抖音 / 线下 / 其他
单位：g / kg / ml / L / 片 / 个 / 瓶 / 罐 / 盒 / 袋 / 包 / 条 / 块 / 套 / 双 / 张 / 卷 / 件
净含量单位：g / kg / ml / L / 抽 / 包
建议将这些常量提取到 src/utils/constants.js 统一管理，各页面从该文件引入。

### Skill 5：表单预填数据兼容性处理
编辑/复制旧数据时，旧记录可能缺少新增字段（如 category、converterMainUnit 等）。
预填 formData 时必须先写默认值再用数据覆盖：
setFormData({ category: '粮油调料', unit: 'g', ...product })
禁止直接 setFormData({ ...product })，否则旧数据会导致验证失败。

### Skill 6：多模式共用 handleSubmit 的正确写法
新建和编辑共用同一个提交函数时，必须用 editingId 区分逻辑分支：
- 编辑模式：从现有数据里取 items/关联数据，不依赖其他模块的实时状态
- 新建模式：才从其他模块（如待购清单）读取数据
禁止在 handleSubmit 里用 hook.getState() 这类写法，usePlans/useProducts 
是普通 useState hook，没有 getState 方法。

### Skill 7：跨页面状态持久化
切换页面时组件会重新渲染，useState 的值会丢失。
需要在页面切换后恢复的状态（如临时比价输入内容），必须同步存入 localStorage。
使用 useRef(false) 作为初始化标记，避免恢复完成前被保存逻辑覆盖：
const isInitialized = useRef(false)
恢复的 useEffect 末尾设 isInitialized.current = true
保存的 useEffect 开头判断 if (!isInitialized.current) return