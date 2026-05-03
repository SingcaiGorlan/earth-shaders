# 修复 exercises.html 中的乱码问题

$file = "e:\earth-shaders\src\exercises.html"
$content = Get-Content $file -Raw -Encoding UTF8

# 修复常见的乱码模式
$replacements = @{
    # 修复问号乱码
    '' = ''  # 删除黑色菱形问号
    '?' = '√'  # 根号
    '?/strong>' = '</strong>'
    '?/span>' = '</span>'
    '?/div>' = '</div>'
    '?/p>' = '</p>'
    '?/h4>' = '</h4>'
    
    # 修复特殊字符
    '【' = '【'
    '】' = '】'
    '（' = '（'
    '）' = '）'
    '【' = '【'
    '】' = '】'
    
    # 修复数学符号
    '?×' = '√×'
    '?μ' = '√μ'
    '?2' = '√2'
    
    # 修复章节和标题
    '章节练习题集' = '章节练习题集'
    '航天航空理论' = '航天航空理论'
    '轨道力学基础' = '轨道力学基础'
    '火箭推进原理' = '火箭推进原理'
}

foreach ($key in $replacements.Keys) {
    $content = $content -replace [regex]::Escape($key), $replacements[$key]
}

Set-Content $file -Value $content -Encoding UTF8
Write-Host "修复完成!" -ForegroundColor Green
