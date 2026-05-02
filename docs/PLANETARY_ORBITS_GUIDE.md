#  行星轨道线使用指南

## 功能说明

行星轨道线功能可以显示太阳系中各行星的运行轨道,帮助你直观地了解行星的轨道形状、倾角和偏心

## 如何使用

### 方法1:通过启动页面配置(推荐)

1. 打开 `launch.html` 启动页面
2. 在"太空天气 | Space Weather"区域
3. 勾选以下选项:
   - ✅ **行星轨道 | Planetary Orbits** - 显示太阳系行星运行轨道
4. 点击"🚀 启动系统"按钮

### 方法2:通过GUI控制面板

启动应用后,在右上角的GUI控制面板中:
1. 找到 **"Solar System"** 文件夹
2. 点击 **"显示轨道"** 或 **"隐藏轨道"** 按钮
3. 行星轨道会立即显示/隐藏

## 轨道线特性

### 显示的行星

系统包含以下7颗行星(不包括地球,因为地球已在场景中心):

1. **水星 (Mercury)** - 距离太阳最近的行星
2. **金星 (Venus)** - 最热的行星
3. **火星 (Mars)** - 红色星球
4. **木星 (Jupiter)** - 最大的行星
5. **土星 (Saturn)** - 拥有美丽光环
6. **天王星 (Uranus)** - 侧躺的冰巨星
7. **海王星 (Neptune)** - 最远的行星

### 轨道参数

基于真实天文数据:

| 行星 | 距离(AU) | 偏心率 | 轨道倾角(°) | 公转周期 |
|------|----------|--------|-------------|----------|
| 水星 | 0.387 | 0.205 | 7.0 | 88天 |
| 金星 | 0.723 | 0.007 | 3.4 | 225天 |
| 火星 | 1.524 | 0.094 | 1.9 | 687天 |
| 木星 | 5.203 | 0.049 | 1.3 | 11.86年 |
| 土星 | 9.537 | 0.057 | 2.5 | 29.46年 |
| 天王星 | 19.191 | 0.046 | 0.8 | 84.01年 |
| 海王星 | 30.069 | 0.010 | 1.8 | 164.8年 |

### 视觉效果

- **颜色**: 深灰色 (#444444)
- **透明度**: 30%(可以透过轨道看到其他天体)
- **线宽**: 1像素
- **路径点数**: 256个点(确保椭圆轨道平滑)
- **形状**: 真实的椭圆轨道(非正圆)

### 物理特性

- ✅ **椭圆轨道** - 基于真实偏心率
- ✅ **轨道倾角** - 每颗行星有不同的轨道平面倾角
- ✅ **焦点偏移** - 太阳位于椭圆的一个焦点(而非中心)
- ✅ **真实比例** - 距离基于1 AU = 150场景单位

## 轨道力学基础

### 开普勒定律

1. **第一定律** - 行星沿椭圆轨道绕太阳运行,太阳位于椭圆的一个焦点
2. **第二定律** - 行星在相同时间内扫过相等的面积
3. **第三定律** - 轨道周期的平方与半长轴的立方成正比

### 轨道参数说明

#### 半长轴 (Semi-Major Axis, a)
- 椭圆轨道的最长半径
- 决定了轨道的大小
- 单位:天文单位 (AU)

#### 偏心率 (Eccentricity, e)
- 描述轨道的扁平程度
- e = 0:正圆
- 0 < e < 1:椭圆
- e = 1:抛物线
- e > 1:双曲线

#### 轨道倾角 (Inclination, i)
- 轨道平面相对于黄道面的倾斜角度
- 单位:度 (°)

#### 焦点偏移 (Focus Offset)
- 计算公式:c = a × e
- 太阳位置:距离椭圆中心 c 的位置

## 技术实现

### 代码结构

```javascript
// solarSystem.js
createOrbitalPaths() {
    this.planetData.forEach((data) => {
        // 1. 计算半长轴和半短轴
        const semiMajorAxis = data.distance  // a
        const eccentricity = data.eccentricity || 0
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity)  // b
        
        // 2. 创建椭圆曲线
        const orbitCurve = new THREE.EllipseCurve(
            0, 0,  // 中心
            semiMajorAxis, semiMinorAxis,  // x半径, y半径
            0, 2 * Math.PI,
            false,
            0
        )
        
        // 3. 生成路径点
        const points = orbitCurve.getPoints(256)
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        
        // 4. 创建轨道线
        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        })
        const orbit = new THREE.Line(geometry, material)
        
        // 5. 设置轨道倾角
        orbit.rotation.x = Math.PI / 2
        orbit.rotation.y = THREE.MathUtils.degToRad(data.inclination)
        
        // 6. 焦点偏移(太阳在焦点,不在中心)
        const focusOffset = semiMajorAxis * eccentricity
        orbit.position.set(150 + focusOffset, 0, 0)
        
        this.scene.add(orbit)
        this.orbits.push(orbit)
    })
}
```

### 坐标系统

- **太阳位置**: (150, 0, 0) - 场景单位
- **地球位置**: (0, 0, 0) - 场景中心
- **1 AU**: 150 场景单位
- **轨道中心**: 根据偏心率偏移

### 切换显示/隐藏

```javascript
// 显示所有行星轨道
solarSystem.toggleOrbits(true)

// 隐藏所有行星轨道
solarSystem.toggleOrbits(false)
```

## 常见问题

### Q: 为什么看不到行星轨道？
A: 确保:
1. 在launch.html中勾选了"行星轨道"选项
2. 或者在GUI中点击了"显示轨道"按钮
3. 相机不要离太阳太远(可能超出可视范围)

### Q: 轨道线不够平滑？
A: 可以修改 `solarSystem.js` 中的 `getPoints(256)` 参数:
```javascript
const points = orbitCurve.getPoints(512)  // 增加到512个点
```

### Q: 如何修改轨道颜色？
A: 在 `createOrbitalPaths()` 方法中修改:
```javascript
const material = new THREE.LineBasicMaterial({
    color: 0x666666,  // 改为其他颜色
    transparent: true,
    opacity: 0.5  // 调整透明度
})
```

### Q: 可以显示地球的轨道吗？
A: 地球已经在场景中心(0,0,0),它的轨道就是绕太阳运行的路径.如果需要显示,可以手动添加:
```javascript
// 在 script.js 中添加地球轨道
const earthOrbitCurve = new THREE.EllipseCurve(
    0, 0,
    150, 150,  // 地球轨道接近正圆
    0, 2 * Math.PI,
    false,
    0
)
const earthOrbitPoints = earthOrbitCurve.getPoints(256)
const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(earthOrbitPoints)
const earthOrbitMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.3
})
const earthOrbit = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial)
earthOrbit.rotation.x = Math.PI / 2
earthOrbit.position.set(75, 0, 0)  // 太阳在(150,0,0),地球轨道中心在中间
scene.add(earthOrbit)
```

### Q: 如何添加其他天体的轨道(如小行星带)？
A: 小行星带已经包含在代码中,可以通过GUI显示:
```javascript
// 显示小行星带
solarSystem.toggleAsteroidBelt(true)
```

## 预设配置

### minimal(最小配置)
- ❌ 行星轨道:关闭
- ✅ 其他基础功能:开启

### balanced(平衡模式)
- ❌ 行星轨道:关闭
- ✅ 大部分功能:开启

### full(完整体验)
- ✅ 行星轨道:开启
- ✅ 所有功能:开启

### performance(性能优先)
- ❌ 行星轨道:关闭
- ✅ 核心功能:开启

## 相关文件

- `src/solarSystem.js` - 太阳系模型核心代码(第493-534行)
- `src/script.js` - 主程序,包含GUI控制和配置应用
- `src/launch.html` - 启动配置页面
- `src/shaders/solarSystem/` - 行星着色器

## 更新日志

### v2.3.0
- ✅ 添加行星轨道显示/隐藏开关
- ✅ 支持launch.html配置行星轨道
- ✅ 基于真实天文数据(偏心率、倾角)
- ✅ 椭圆轨道(非正圆)
- ✅ 焦点偏移(太阳在焦点)
- ✅ 7颗行星轨道(不含地球)

---

📚 **更多资料**: 
- 查看 [REALISTIC_SOLAR_SYSTEM.md](./REALISTIC_SOLAR_SYSTEM.md) 了解真实太阳系比例
- 查看 [AEROSPACE_THEORY_KNOWLEDGE_BASE.md](./AEROSPACE_THEORY_KNOWLEDGE_BASE.md) 了解轨道力学基础
