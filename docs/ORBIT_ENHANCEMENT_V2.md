# 轨道细化和拉格朗日点动态显示优化

## 📋 更新概述

本次更新对Halo轨道、环月冻结轨道和拉格朗日点进行了全面细化，添加了丰富的动态视觉效果。

## ✨ 新增功能

### 1️⃣ **拉格朗日点增强可视化**

#### 核心标记点升级
- **几何体精度提升**：从16×16升级到32×32细分
- **材质升级**：从MeshBasicMaterial升级到MeshPhongMaterial
  - 添加自发光效果（emissive）
  - 高光反射（shininess: 100）
  - 不透明度提升至0.9

#### 新增视觉效果

##### 🔵 光环效果（Glow Ring）
- **形状**：环形几何体（内径0.6，外径0.8）
- **颜色**：与拉格朗日点类型匹配
  - 稳定点（L4/L5）：绿色
  - 不稳定点（L1/L2/L3）：红色
- **特效**：
  - 透明度脉冲（0.2-0.4范围波动）
  - 持续旋转（0.3 rad/s）
  - 加法混合模式（Additive Blending）

##### ⚡ 能量场（Energy Field）
- **形状**：球体（半径1.2单位）
- **着色器效果**：
  ```glsl
  // 顶点着色器
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  // 片段着色器 - 脉冲效果
  float pulse = sin(time * 2.0 + length(vPosition) * 3.0) * 0.5 + 0.5;
  float alpha = intensity * (0.3 + 0.7 * pulse) * (1.0 - length(vPosition) / 1.2);
  ```
- **特性**：
  - 实时时间更新
  - 径向渐变透明度
  - 正弦波脉冲动画
  - 稳定点强度0.3，不稳定点强度0.5

##### 🏷️ 增强标签
- **尺寸**：512×128像素（原256×64）
- **背景面板**：
  - 圆角矩形（15px圆角）
  - 稳定点：绿色半透明背景 rgba(0, 100, 0, 0.7)
  - 不稳定点：红色半透明背景 rgba(100, 0, 0, 0.7)
  - 3px边框描边
- **文字**：
  - 字体大小：48px Bold Arial
  - 黑色阴影（blur: 4px）
  - 白色文字
- **位置**：标记点上方2.5单位
- **缩放**：6×1.5×1

---

### 2️⃣ **Halo轨道细化**

#### 渐变色轨道线
- **顶点颜色渐变**：
  - 起始色相：0.08（橙色）
  - 结束色相：0.13（橙黄色）
  - 饱和度：1.0
  - 亮度：0.5
- **线条属性**：
  - 宽度：3px（原2px）
  - 透明度：0.7（原0.6）
  - 启用顶点颜色（vertexColors: true）
  - 加法混合模式

#### 轨道路径标记
- **数量**：最多16个标记点
- **分布**：沿轨道均匀分布
- **样式**：
  - 球形标记（半径0.15单位）
  - 颜色：金黄色（0xffaa00）
  - 透明度：0.8
  - 8×8细分

---

### 3️⃣ **环月冻结轨道细化**

#### 色彩增强
- **顶点颜色渐变**：
  - 基础色：配置的轨道颜色
  - 亮度变化：±10%正弦波调制
  - 公式：`brightness += sin(t × 2π) × 0.1`
- **线条属性**：
  - 宽度：2.5px（原1.5px）
  - 透明度：0.65（原0.5）
  - 启用顶点颜色和加法混合

#### 近月点和远月点标记

##### 🟢 近月点标记（Periapsis）
- **颜色**：绿色（0x00ff00）
- **含义**：轨道上距离月球最近的点
- **尺寸**：半径0.25单位，12×12细分
- **透明度**：0.9

##### 🔴 远月点标记（Apoapsis）
- **颜色**：红色（0xff4444）
- **含义**：轨道上距离月球最远的点
- **尺寸**：半径0.25单位，12×12细分
- **透明度**：0.9

##### 计算方法
```javascript
// 遍历所有轨道点，计算到月球的距离
points.forEach((point, index) => {
    const dist = point.distanceTo(this.moonPosition)
    if (dist < minDist) {
        minDist = dist
        periIndex = index  // 近月点索引
    }
    if (dist > maxDist) {
        maxDist = dist
        apoIndex = index   // 远月点索引
    }
})
```

---

### 4️⃣ **动态动画效果**

#### 拉格朗日点动画
- **标记点脉冲**：
  - 频率：2.0 Hz
  - 幅度：±20%
  - 每个点有相位偏移
  
- **近/远月点标记脉冲**：
  - 频率：3.0 Hz（更快）
  - 幅度：±15%

- **能量场更新**：
  - 实时更新shader time uniform
  - 产生连续脉冲效果

- **光环旋转**：
  - 旋转速度：0.3 rad/s
  - 透明度脉冲：±0.1

#### Halo轨道动画
- **Z轴旋转**：
  - 速度：0.08 rad/s
  - 交替方向（偶数索引正向，奇数索引反向）
  
- **X轴摆动**：
  - 幅度：±0.1 rad
  - 频率：0.5 Hz
  - 效果：轻微"摇晃"增强三维感

#### 冻结轨道动画
- **Y轴旋转**：
  - 速度：0.02 rad/s（非常缓慢）
  - 交替方向
  - 目的：展示轨道的三维结构

---

## 🎨 视觉效果对比

### 拉格朗日点

| 元素 | 优化前 | 优化后 |
|------|--------|--------|
| 标记球体 | 0.3半径，16细分，纯色 | 0.4半径，32细分，自发光+高光 |
| 标签 | 256×64，无背景 | 512×128，彩色背景面板+边框 |
| 附加效果 | 无 | 光环+能量场+脉冲动画 |

### Halo轨道

| 元素 | 优化前 | 优化后 |
|------|--------|--------|
| 线条宽度 | 2px | 3px |
| 颜色 | 纯橙色 | 橙→黄渐变 |
| 透明度 | 0.6 | 0.7 |
| 路径标记 | 无 | 16个金黄色球体 |
| 动画 | 简单旋转 | 旋转+摆动 |

### 冻结轨道

| 元素 | 优化前 | 优化后 |
|------|--------|--------|
| 线条宽度 | 1.5px | 2.5px |
| 颜色 | 纯色 | 亮度渐变 |
| 透明度 | 0.5 | 0.65 |
| 特殊标记 | 无 | 近月点🟢+远月点🔴 |
| 动画 | 无 | 缓慢旋转 |

---

## 🔧 技术实现细节

### 1. 顶点颜色渐变
```javascript
// 为轨道创建渐变色
const colors = new Float32Array(segments * 3)
for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const color = new THREE.Color()
    color.setHSL(0.08 + t * 0.05, 1.0, 0.5) // HSL渐变
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
}
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
```

### 2. Shader能量场
```glsl
uniform float time;
uniform vec3 color;
uniform float intensity;
varying vec3 vPosition;

void main() {
    // 时间和空间双重调制的脉冲
    float pulse = sin(time * 2.0 + length(vPosition) * 3.0) * 0.5 + 0.5;
    // 径向渐变衰减
    float alpha = intensity * (0.3 + 0.7 * pulse) * (1.0 - length(vPosition) / 1.2);
    gl_FragColor = vec4(color, alpha * 0.4);
}
```

### 3. 近/远月点检测
```javascript
// 遍历轨道点找到极值
let minDist = Infinity, maxDist = 0
let periIndex = 0, apoIndex = 0

points.forEach((point, index) => {
    const dist = point.distanceTo(this.moonPosition)
    if (dist < minDist) {
        minDist = dist
        periIndex = index
    }
    if (dist > maxDist) {
        maxDist = dist
        apoIndex = index
    }
})
```

### 4. 资源清理优化
```javascript
destroy() {
    // 清理shader uniforms中的纹理等资源
    if (marker.material.uniforms) {
        Object.values(marker.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
                uniform.value.dispose()
            }
        })
    }
    // 清空数组防止内存泄漏
    this.lagrangePoints = []
    this.lagrangeMarkers = []
    this.haloOrbits = []
    this.frozenOrbits = []
}
```

---

## 📊 性能影响

### 渲染开销增加
- **拉格朗日点**：每个点增加2个网格（光环+能量场）
  - 总计：5个点 × 2 = 10个额外网格
  - 能量场使用shader，每帧更新uniform
  
- **轨道标记**：
  - Halo轨道：3条 × 16个 = 48个标记球体
  - 冻结轨道：5条 × 2个 = 10个极值标记
  - 总计：58个额外球体

### 优化措施
✅ 使用BufferGeometry高效存储  
✅ 合理的几何体细分（8-32段）  
✅ 透明度混合而非复杂光照  
✅ 共享材质实例  
✅ 正确的资源清理  

### 预期性能
- **现代GPU**：无明显影响（60 FPS）
- **集成显卡**：轻微影响（55-60 FPS）
- **移动设备**：建议降低标记数量

---

## 💡 使用建议

### 观察技巧
1. **缩放查看细节**：靠近拉格朗日点观察能量场脉冲
2. **旋转视角**：从不同角度观察Halo轨道的三维结构
3. **追踪标记**：跟随近/远月点标记理解冻结轨道形状
4. **对比颜色**：注意稳定点（绿）和不稳定点（红）的区别

### 教学应用
- **引力平衡演示**：通过脉冲强度展示稳定性差异
- **轨道力学**：近/远月点标记帮助理解椭圆轨道
- **三维空间认知**：缓慢旋转展示轨道的空间构型

---

## 🚀 快速测试

1. 启动应用：`npm run dev`
2. 访问：`http://localhost:5174/src/launch.html`
3. 勾选"拉格朗日点 & 特殊轨道"
4. 观察效果：
   - ✅ 拉格朗日点的脉冲光环
   - ✅ Halo轨道的渐变色和路径标记
   - ✅ 冻结轨道的近/远月点标记
   - ✅ 所有元素的动态动画

---

## 📝 版本信息

- **版本**：2.0
- **更新日期**：2026-05-03
- **主要改进**：
  - 拉格朗日点视觉增强（光环+能量场+标签）
  - Halo轨道渐变色和路径标记
  - 冻结轨道近/远月点标记
  - 全面动态动画系统
  - 优化的资源管理

---

**相关文档**：
- [完整指南](./HALO_AND_FROZEN_ORBITS_GUIDE.md)
- [快速参考](./HALO_FROZEN_ORBITS_QUICK_REF.md)
