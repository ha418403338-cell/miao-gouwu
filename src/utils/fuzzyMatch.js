function extractChinese(str) {
  if (!str) return ''
  return str.replace(/[^\u4e00-\u9fa5]/g, '')
}

function countCommonChinese(str1, str2) {
  const chinese1 = extractChinese(str1)
  const chinese2 = extractChinese(str2)
  if (!chinese1 || !chinese2) return 0

  const set2 = new Set(chinese2)
  let count = 0
  for (const char of chinese1) {
    if (set2.has(char)) {
      count++
      set2.delete(char)
    }
  }
  return count
}

function hasConsecutiveMatch(str1, str2) {
  const chinese1 = extractChinese(str1)
  const chinese2 = extractChinese(str2)
  if (!chinese1 || !chinese2) return false

  for (let i = 0; i <= chinese1.length - 2; i++) {
    const subStr = chinese1.substring(i, i + 2)
    if (chinese2.includes(subStr)) {
      return true
    }
  }
  return false
}

export function isMatch(inputItem, libraryItem) {
  const inputName = inputItem.productName || ''
  const inputBrand = inputItem.brand || ''
  const libName = libraryItem.productName || ''
  const libBrand = libraryItem.brand || ''

  console.log('isMatch check:', { inputName, inputBrand, libName, libBrand })

  const brandMatch = countCommonChinese(inputBrand, libBrand) >= 2 || hasConsecutiveMatch(inputBrand, libBrand)
  const nameMatch = countCommonChinese(inputName, libName) >= 2 || hasConsecutiveMatch(inputName, libName)

  console.log('isMatch result:', { brandMatch, nameMatch, result: brandMatch || nameMatch })

  return brandMatch || nameMatch
}

export default function fuzzyMatch(inputItem, productList) {
  console.log('fuzzyMatch called:', { inputItem, productListLength: productList?.length })
  if (!inputItem || !productList || !Array.isArray(productList)) {
    console.log('fuzzyMatch: invalid input, returning []')
    return []
  }
  const result = productList.filter((item) => {
    const match = isMatch(inputItem, item)
    console.log('filter:', item.productName, 'match:', match)
    return match
  })
  console.log('fuzzyMatch result:', result.length, 'items')
  return result
}