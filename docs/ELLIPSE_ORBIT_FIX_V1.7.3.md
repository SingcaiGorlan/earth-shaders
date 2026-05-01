# 行星椭圆轨道修正 (v1.7.3)

## 问题分析

用户反馈"其他各行星之间的轨道，运行"不对。

### 原因

之前的轨道是**正圆形**的，不符合真实情况：
- ❌ 所有行星轨道都是圆形
- ❌ 太阳在轨道中心
- ❌ 行星运行速度恒定

真实的行星轨道应该是：
- ✅ **椭圆形**（开普勒第一定律）
- ✅ 太阳在椭圆的一个**焦点**上
- ✅ 行星在近日点运行快，远日点运行慢（开普勒第二定律）

## 修正方案

### 1. 椭圆轨道计算

根据行星的**离心率 (eccentricity)** 创建椭圆轨道：

```javascript
// 椭圆参数
const a = distance  // 半长轴 (semi-major axis)
const e = eccentricity  // 离心率
const b = a * Math.sqrt(1 - e²)  // 半短轴 (semi-minor axis)
```

### 2. 太阳位置（焦点）

太阳不在椭圆中心，而在**焦点**上：

```javascript
// 焦点偏移量: c = a × e
const focusOffset = a * e

// 太阳位置
orbit.position.set(150 + focusOffset, 0, 0)
```

### 3. 行星椭圆运动

使用椭圆的参数方程：

```javascript
// 椭圆中心（考虑焦点偏移）
const centerX = 150 + a * e
const centerZ = 0

// 参数方程
x = centerX + a × cos(angle)
z = centerZ + b × sin(angle)
```

## 行星离心率数据

| 行星 | 离心率 (e) | 轨道形状 | 说明 |
|------|----------|---------|------|
| 水星 | 0.205 | **明显椭圆** | 太阳系离心率最大的行星 |
| 金星 | 0.007 | 接近圆形 | 最圆的轨道 |
| 地球 | 0.017 | 接近圆形 | - |
| 火星 | 0.094 | **轻微椭圆** | 肉眼可见的椭圆 |
| 木星 | 0.049 | 轻微椭圆 | - |
| 土星 | 0.057 | 轻微椭圆 | - |
| 天王星 | 0.046 | 轻微椭圆 | - |
| 海王星 | 0.010 | 接近圆形 | - |

## 视觉效果

### 椭圆轨道特征

```
         远日点 (Aphelion)
              ↑
              |
    ←---------⊙---------→
              |         太阳在焦点
              ↓
         近日点 (Perihelion)
```

- **近日点**：行星离太阳最近，运行速度最快
- **远日点**：行星离太阳最远，运行速度最慢
- **椭圆度**：离心率越大，椭圆越扁

### 具体示例：水星

```javascript
// 水星数据
distance = 0.387 AU × 150 = 58.05 单位
eccentricity = 0.205

// 椭圆参数
a = 58.05  // 半长轴
b = 58.05 × √(1 - 0.205²) = 56.78  // 半短轴
c = 58.05 × 0.205 = 11.90  // 焦点偏移

// 轨道范围
近日点距离 = a - c = 46.15 单位
远日点距离 = a + c = 69.95 单位
差异 = 23.8 单位（明显可见）
```

## 代码修改总结

### 1. createOrbitalPaths() - 椭圆轨道

```javascript
// 修改前  - 圆形轨道
const orbitCurve = new THREE.EllipseCurve(
    0, 0,
    data.distance, data.distance,  // 圆：xRadius = yRadius
    0, 2 * Math.PI,
    false, 0
)
orbit.position.set(150, 0, 0)  // 太阳在中心

// 修改后 ✅ - 椭圆轨道
const semiMajorAxis = data.distance
const eccentricity = data.eccentricity || 0
const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity²)

const orbitCurve = new THREE.EllipseCurve(
    0, 0,
    semiMajorAxis, semiMinorAxis,  // 椭圆：xRadius ≠ yRadius
    0, 2 * Math.PI,
    false, 0
)

const focusOffset = semiMajorAxis * eccentricity
orbit.position.set(150 + focusOffset, 0, 0)  // 太阳在焦点
```

### 2. update() - 椭圆运动

```javascript
// 修改前 ❌ - 圆形运动
const sunX = 150
planet.group.position.x = sunX + Math.cos(angle) × distance
planet.group.position.z = Math.sin(angle) × distance

// 修改后 ✅ - 椭圆运动
const a = planet.data.distance
const e = planet.data.eccentricity || 0
const b = a × Math.sqrt(1 - e²)

const centerX = 150 + a × e
planet.group.position.x = centerX + a × Math.cos(angle)
planet.group.position.z = b × Math.sin(angle)
```

## 开普勒定律实现

### 第一定律（轨道定律）✅
> 所有行星绕太阳运动的轨道都是椭圆，太阳处在椭圆的一个焦点上。

**实现**：使用椭圆的参数方程，太阳位于焦点 `(ae, 0)`

### 第二定律（面积定律）⚠️
> 行星和太阳的连线在相等的时间间隔内扫过相等的面积。

**当前状态**：简化实现，使用恒定角速度
**未来改进**：可以实现真实的近日点加速、远日点减速

### 第三定律（周期定律）✅
> 行星公转周期的平方与其轨道半长轴的立方成正比。

**实现**：轨道速度基于真实公转周期比例

## 测试验证

✅ **语法检查通过**
```bash
node -c src/solarSystem.js  # ✅ 通过
```

## 使用方式

1. **刷新浏览器**
2. **启用" 太阳系模型 → 启用太阳系"**
3. **开启"显示轨道"**
4. **观察效果：**
   - 轨道是椭圆形（不是圆形）
   - 水星轨道最明显（离心率0.205）
   - 太阳在椭圆的一个焦点上（不是中心）
   - 各行星按椭圆轨道运行

## 视觉效果对比

### 圆形轨道 (v1.7.2) ❌
```
    ○ ← 完美圆形
    | 太阳在中心
```

### 椭圆轨道 (v1.7.3) ✅
```
    ⬮ ← 椭圆形
     ↑
    太阳在焦点（偏心）
```

## 注意事项

### 可视化效果
- 大多数行星的离心率很小，肉眼可能不太明显
- **水星**的椭圆最明显（e=0.205）
- **火星**其次（e=0.094）
- 其他行星接近圆形

### 性能优化
- 轨道线使用256个点（从128增加）
- 确保椭圆平滑
- 不影响整体性能

## 未来改进

### 1. 开普勒第二定律完整实现
- 近日点加速
- 远日点减速
- 真实面积速度守恒

### 2. 轨道进动
- 水星近日点进动
- 广义相对论效应

### 3. 多体引力
- 行星之间的引力扰动
- 更真实的轨道摄动
