// 知识库页面交互功能

document.addEventListener('DOMContentLoaded', function() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput')
    const sections = document.querySelectorAll('.knowledge-section')
    const conceptCards = document.querySelectorAll('.concept-card')
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim()
            
            if (searchTerm === '') {
                // 显示所有内容
                showAllContent()
                return
            }
            
            // 搜索并高亮匹配内容
            searchAndHighlight(searchTerm)
        })
    }
    
    // 目录导航高亮
    const tocLinks = document.querySelectorAll('.toc a')
    const sectionElements = document.querySelectorAll('.knowledge-section')
    
    // 点击目录项时平滑滚动
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault()
            
            const targetId = this.getAttribute('href').substring(1)
            const targetSection = document.getElementById(targetId)
            
            if (targetSection) {
                targetSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                })
                
                // 更新活动状态
                tocLinks.forEach(l => l.classList.remove('active'))
                this.classList.add('active')
            }
        })
    })
    
    // 滚动时自动高亮当前章节
    window.addEventListener('scroll', function() {
        let currentSection = ''
        
        sectionElements.forEach(section => {
            const sectionTop = section.offsetTop
            const sectionHeight = section.clientHeight
            
            if (window.pageYOffset >= sectionTop - 150) {
                currentSection = section.getAttribute('id')
            }
        })
        
        tocLinks.forEach(link => {
            link.classList.remove('active')
            if (link.getAttribute('href').substring(1) === currentSection) {
                link.classList.add('active')
            }
        })
    })
    
    // 公式框点击复制功能
    const formulaBoxes = document.querySelectorAll('.formula-box')
    formulaBoxes.forEach(box => {
        box.addEventListener('click', function() {
            const code = this.querySelector('code')
            if (code) {
                const text = code.innerText
                copyToClipboard(text)
                showCopyFeedback(this)
            }
        })
        
        // 添加提示
        box.style.cursor = 'pointer'
        box.title = '点击复制公式'
    })
    
    // 初始化
    console.log('📚 航天航空知识库已加载')
})

/**
 * 显示所有内容（清除搜索）
 */
function showAllContent() {
    const allElements = document.querySelectorAll('.concept-card, .info-box, .warning-box, .example-box, .data-table')
    allElements.forEach(el => {
        el.style.display = ''
        el.style.opacity = '1'
    })
    
    // 清除高亮
    clearHighlights()
}

/**
 * 搜索并高亮匹配内容
 */
function searchAndHighlight(searchTerm) {
    const allCards = document.querySelectorAll('.concept-card, .info-box, .warning-box, .example-box')
    let matchCount = 0
    
    allCards.forEach(card => {
        const text = card.innerText.toLowerCase()
        
        if (text.includes(searchTerm)) {
            // 显示匹配的卡片
            card.style.display = ''
            card.style.opacity = '1'
            matchCount++
            
            // 高亮匹配文本
            highlightText(card, searchTerm)
        } else {
            // 隐藏不匹配的卡片
            card.style.opacity = '0.3'
            clearHighlights(card)
        }
    })
    
    console.log(`找到 ${matchCount} 个匹配项`)
}

/**
 * 高亮文本
 */
function highlightText(element, searchTerm) {
    // 先清除之前的高亮
    clearHighlights(element)
    
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    )
    
    const nodes = []
    let node
    
    while (node = walker.nextNode()) {
        if (node.nodeValue.toLowerCase().includes(searchTerm)) {
            nodes.push(node)
        }
    }
    
    nodes.forEach(node => {
        const span = document.createElement('span')
        span.innerHTML = highlightMatches(node.nodeValue, searchTerm)
        node.parentNode.replaceChild(span, node)
    })
}

/**
 * 高亮匹配的正则替换
 */
function highlightMatches(text, searchTerm) {
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi')
    return text.replace(regex, '<mark style="background: #ffd700; color: #000; padding: 2px 4px; border-radius: 3px;">$1</mark>')
}

/**
 * 清除高亮
 */
function clearHighlights(element = document) {
    const marks = element.querySelectorAll('mark')
    marks.forEach(mark => {
        const parent = mark.parentNode
        parent.replaceChild(document.createTextNode(mark.textContent), mark)
        parent.normalize()
    })
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        console.log('✅ 公式已复制到剪贴板')
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        console.log('✅ 公式已复制到剪贴板（降级方案）')
    }
}

/**
 * 显示复制反馈
 */
function showCopyFeedback(element) {
    // 创建提示
    const tooltip = document.createElement('div')
    tooltip.textContent = '✓ 已复制'
    tooltip.style.cssText = `
        position: absolute;
        top: -30px;
        right: 10px;
        background: #00ff88;
        color: #000;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.9rem;
        font-weight: bold;
        animation: fadeInOut 1.5s ease;
        z-index: 1000;
    `
    
    element.style.position = 'relative'
    element.appendChild(tooltip)
    
    setTimeout(() => {
        tooltip.remove()
    }, 1500)
}

// 添加动画样式
const style = document.createElement('style')
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
    }
`
document.head.appendChild(style)

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + F 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.getElementById('searchInput')
        if (searchInput) {
            searchInput.focus()
        }
    }
    
    // ESC 清除搜索
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput')
        if (searchInput && searchInput.value !== '') {
            searchInput.value = ''
            showAllContent()
            searchInput.blur()
        }
    }
})

console.log('📚 知识库交互系统已就绪')
console.log('💡 提示：按 Ctrl+F 快速搜索，ESC 清除搜索')
