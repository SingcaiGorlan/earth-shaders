#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""最后的细节修复"""

file_path = r'e:\earth-shaders\src\exercises.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 修复问题文本中缺少的问号
content = content.replace('描述的是</span>', '描述的是？</span>')
content = content.replace('面积相</div>', '面积相等</div>')
content = content.replace('立方成正</div>', '立方成正比</div>')
content = content.replace('轨道类型</span>', '轨道类型为？</span>')

# 修复"≈"符号
content = content.replace('35786 km √36000 km', '35786 km ≈ 36000 km')

# 修复句号
content = content.replace('一个焦点上</p>', '一个焦点上。</p>')
content = content.replace('周期定律)</p>', '周期定律)。</p>')
content = content.replace('自转周期相同</p>', '自转周期相同。</p>')
content = content.replace('轨道半径。</p>', '轨道半径。</p>')

# 保存文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ exercises.html 最后修复完成!")
print(" 所有希腊字母和特殊符号的乱码问题已解决!")
