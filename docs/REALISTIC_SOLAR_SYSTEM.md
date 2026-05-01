# 真实比例太阳系扩展文档

## 概述

本次重大升级将太阳系模型从**独立模型**改为**基于现有地球场景的扩展**，并使用**真实的太阳系比例**。

### 核心变化

**之前：**
- 太阳系是独立模型，包含自己的太阳和地球
- 使用压缩的可视化比例（1-65单位距离）
- 创建完整的太阳系场景

**现在：**
- 太阳系是地球场景的扩展，添加其他行星
- 使用真实的天文单位（AU）比例
- 地球保持在场景中心（0,0,0）
- 太阳和其他行星围绕地球轨道运行

## 真实太阳系比例

### 天文单位（AU）

- **1 AU** = 149,597,870.7 km（地球到太阳的平均距离）
- **可视化比例**：1 AU = 10个场景单位
- **太阳位置**：(-10, 0, 0)，即地球左侧1 AU处

### 行星真实数据

| 行星 | 真实半径（地球半径） | 真实距离（AU） | 真实公转周期 | 场景距离（单位） |
|------|-------------------|--------------|------------|---------------|
| 水星 | 0.383 | 0.387 | 88天 | 3.87 |
| 金星 | 0.949 | 0.723 | 225天 | 7.23 |
| **地球** | **1.000** | **1.000** | **365天** | **0（中心）** |
| 火星 | 0.532 | 1.524 | 687天 | 15.24 |
| 木星 | 11.21 | 5.203 | 11.86年 | 52.03 |
| 土星 | 9.45 | 9.537 | 29.46年 | 95.37 |
| 天王星 | 4.01 | 19.191 | 84.01年 | 191.91 |
| 海王星 | 3.88 | 30.069 | 164.8年 | 300.69 |

### 轨道速度比例

以地球公转周期为基准（1年 = 1.0速度）：

| 行星 | 相对速度 | 说明 |
|------|---------|------|
| 水星 | 4.15x | 最快，88天绕太阳一周 |
| 金星 | 1.62x | 225天 |
| 地球 | 1.0x | 基准（365天） |
| 火星 | 0.53x | 687天 |
| 木星 | 0.084x | 11.86年 |
| 土星 | 0.034x | 29.46年 |
| 天王星 | 0.012x | 84.01年 |
| 海王星 | 0.006x | 最慢，164.8年 |

## 技术实现

### 1. SolarSystemModel 构造函数

```javascript
constructor(scene, existingEarth = null) {
    this.scene = scene
    this.existingEarth = existingEarth  // 现有地球引用
    this.planets = []
    this.orbits = []
    this.asteroidBelt = null
    this.sun = null
    this.time = 0
    this.timeScale = 1
    
    const AU = 10  // 1 AU = 10个场景单位
    
    // 行星数据（不包含地球）
    this.planetData = [
        {
            name: 'Mercury',
            radius: 0.383,  // 真实半径
            distance: 0.387 * AU,  // 真实距离
            orbitSpeed: 4.15,  // 相对速度
            // ...
        },
        // 注意：地球已存在于场景中，不添加
        // ...
    ]
}
```

### 2. 太阳位置

```javascript
createSun() {
    const sunGroup = new THREE.Group()
    
    // 太阳位于地球左侧1 AU处
    sunGroup.position.set(-10, 0, 0)
    
    // 创建太阳...
    
    // 光照覆盖整个场景（包括地球）
    const sunLight = new THREE.PointLight(0xFFFFFF, 2.0, 500)
    sunGroup.add(sunLight)
    
    this.scene.add(sunGroup)
}
```

### 3. 行星创建

```javascript
createPlanet(data, index) {
    const planetGroup = new THREE.Group()
    
    // 使用真实半径和距离
    const geometry = new THREE.SphereGeometry(data.radius, 64, 64)
    
    // 初始位置（随机角度）
    const angle = Math.random() * Math.PI * 2
    planetGroup.position.x = Math.cos(angle) * data.distance
    planetGroup.position.z = Math.sin(angle) * data.distance
    
    // 应用轨道倾角
    planetGroup.rotation.x = THREE.MathUtils.degToRad(data.inclination)
    
    this.scene.add(planetGroup)
    
    return {
        group: planetGroup,
        mesh: mesh,
        data: data,
        angle: angle,
        orbitSpeed: data.orbitSpeed * 0.01,
        rotationSpeed: data.rotationSpeed,
        material: material
    }
}
```

### 4. 小行星带位置

```javascript
createAsteroidBelt() {
    // 真实位置：火星（1.524 AU）和木星（5.203 AU）之间
    // 实际范围：2.2 - 3.2 AU from Sun
    const innerRadius = 15  // 2.5 AU from Sun
    const outerRadius = 22  // 3.2 AU from Sun
    
    for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius)
        
        // 偏移到太阳位置（-10, 0, 0）
        positions[i * 3] = Math.cos(angle) * radius - 10
        positions[i * 3 + 1] = height
        positions[i * 3 + 2] = Math.sin(angle) * radius
    }
}
```

### 5. 轨道路径

```javascript
createOrbitalPaths() {
    this.planetData.forEach((data) => {
        const orbitCurve = new THREE.EllipseCurve(
            0, 0,  // 以太阳为中心
            data.distance, data.distance,  // 使用真实AU距离
            0, 2 * Math.PI,
            false,
            0
        )
        
        const orbit = new THREE.Line(geometry, material)
        
        // 偏移到太阳位置
        orbit.position.set(-10, 0, 0)
        
        this.scene.add(orbit)
    })
}
```

### 6. 动画更新

```javascript
update(deltaTime) {
    this.time += deltaTime
    
    // 应用时间缩放
    const scaledDeltaTime = deltaTime * (this.timeScale || 1)
    
    // 更新行星轨道
    this.planets.forEach(planet => {
        planet.angle += planet.orbitSpeed * scaledDeltaTime
        planet.group.position.x = Math.cos(planet.angle) * planet.data.distance
        planet.group.position.z = Math.sin(planet.angle) * planet.data.distance
        
        // 更新太阳方向（从太阳位置-10,0,0到行星）
        const sunPos = new THREE.Vector3(-10, 0, 0)
        const planetPos = planet.group.position.clone()
        const sunDir = sunPos.sub(planetPos).normalize()
        planet.material.uniforms.sunDirection.value.copy(sunDir)
    })
}
```

### 7. Script.js 初始化

```javascript
function initSolarSystem() {
    if (!solarSystem && solarSystemConfig.enableSolarSystem) {
        // 传递现有地球给太阳系模型
        solarSystem = new SolarSystemModel(scene, earth)
        solarSystem.initSolarSystem()
        console.log('✅ Solar System Extension initialized with real proportions!')
        console.log(' Earth remains at center, other planets orbit around it')
    }
}
```

## 场景布局

```
                    海王星 (300.69)
                         |
                         |
                    天王星 (191.91)
                         |
                         |
                    土星 (95.37)
                         |
                         |
                    木星 (52.03)
                         |
                         |
太阳 (-10) ---- 水星 (3.87) ---- 地球 (0) ---- 火星 (15.24)
                         |
                         |
                    小行星带 (15-22)
```

### 坐标系说明

- **地球位置**：(0, 0, 0) - 场景中心
- **太阳位置**：(-10, 0, 0) - 地球左侧1 AU
- **水星轨道**：半径3.87，中心在(-10, 0, 0)
- **金星轨道**：半径7.23，中心在(-10, 0, 0)
- **火星轨道**：半径15.24，中心在(-10, 0, 0)
- **木星轨道**：半径52.03，中心在(-10, 0, 0)
- 其他行星依此类推...

## GUI 控制

### 太阳系文件夹

```
 太阳系模型
├──  启用太阳系
├──  显示轨道
├── ☐ 显示小行星带
├── 时间流速: 1.0 (0.1 - 10.0)
└── 聚焦行星: [下拉菜单]
    ├── None
    ├── Mercury
    ├── Venus
    ├── Mars
    ├── Jupiter
    ├── Saturn
    ├── Uranus
    └── Neptune
```

**注意：** 地球不在聚焦列表中，因为它始终在场景中心。

## 光照系统

### 太阳光照

```javascript
// 太阳光覆盖整个场景
const sunLight = new THREE.PointLight(0xFFFFFF, 2.0, 500)
```

- **强度**：2.0（足够照亮所有行星）
- **范围**：500（覆盖海王星轨道）
- **位置**：(-10, 0, 0)

### 地球光照

太阳作为点光源会照亮地球：
- 面向太阳的一面：白天
- 背向太阳的一面：夜晚
- 边缘：晨昏线

## 性能考虑

### 视距管理

由于真实比例导致外行星距离极远：

| 行星 | 距离（单位） | 可见性 |
|------|------------|--------|
| 水星 | 3.87 | ✅ 容易看到 |
| 金星 | 7.23 | ✅ 容易看到 |
| 火星 | 15.24 | ✅ 容易看到 |
| 木星 | 52.03 | ️ 需要放大 |
| 土星 | 95.37 | ⚠️ 需要放大 |
| 天王星 | 191.91 | ❌ 很难看到 |
| 海王星 | 300.69 | ❌ 几乎不可见 |

### 建议

1. **聚焦功能**：使用"聚焦行星"快速定位到远距离行星
2. **时间缩放**：外行星公转极慢，使用10x时间加速
3. **轨道显示**：启用轨道线帮助定位行星位置

## 使用示例

### 启用太阳系

```javascript
// 在GUI中勾选"启用太阳系"
solarSystemConfig.enableSolarSystem = true
```

### 聚焦到木星

```javascript
// 在GUI中选择"Jupiter"
// 或代码中：
solarSystem.focusOnPlanet('Jupiter', camera, controls)
```

### 加速时间

```javascript
// 在GUI中设置时间流速为10x
// 或代码中：
solarSystem.setTimeScale(10)
```

### 显示轨道

```javascript
// 在GUI中勾选"显示轨道"
// 或代码中：
solarSystem.toggleOrbits(true)
```

## 行星详细信息

### 水星 (Mercury)
- **半径**：0.383 地球半径（2,439 km）
- **距离**：0.387 AU（5,790万 km）
- **公转周期**：88天
- **表面温度**：-180°C ~ 430°C
- **特点**：离太阳最近，无大气层，温差极大

### 金星 (Venus)
- **半径**：0.949 地球半径（6,051 km）
- **距离**：0.723 AU（1.08亿 km）
- **公转周期**：225天
- **表面温度**：462°C（最热行星）
- **特点**：浓厚CO2大气，温室效应，逆向自转

### 地球 (Earth)
- **半径**：1.000 地球半径（6,371 km）
- **距离**：1.000 AU（1.496亿 km）
- **公转周期**：365天
- **表面温度**：-89°C ~ 57°C
- **特点**：唯一已知有生命的星球，液态水

### 火星 (Mars)
- **半径**：0.532 地球半径（3,389 km）
- **距离**：1.524 AU（2.28亿 km）
- **公转周期**：687天
- **表面温度**：-60°C
- **特点**：红色星球，有极冠，可能有液态水

### 木星 (Jupiter)
- **半径**：11.21 地球半径（69,911 km）
- **距离**：5.203 AU（7.78亿 km）
- **公转周期**：11.86年
- **特点**：最大行星，大红斑风暴，79颗卫星

### 土星 (Saturn)
- **半径**：9.45 地球半径（58,232 km）
- **距离**：9.537 AU（14.3亿 km）
- **公转周期**：29.46年
- **特点**：美丽光环系统，密度小于水，82颗卫星

### 天王星 (Uranus)
- **半径**：4.01 地球半径（25,362 km）
- **距离**：19.191 AU（28.7亿 km）
- **公转周期**：84.01年
- **特点**：侧躺旋转（97.8°倾斜），蓝绿色，27颗卫星

### 海王星 (Neptune)
- **半径**：3.88 地球半径（24,622 km）
- **距离**：30.069 AU（45.0亿 km）
- **公转周期**：164.8年
- **特点**：最远行星，风速最快（2,100 km/h），14颗卫星

## 文件变更

### 修改文件

1. **src/solarSystem.js**
   - 构造函数添加 `existingEarth` 参数
   - 移除地球数据
   - 使用真实AU比例
   - 太阳位置设置为(-10, 0, 0)
   - 更新小行星带和轨道位置
   - 更新太阳方向计算

2. **src/script.js**
   - 传递地球对象给SolarSystemModel
   - 更新控制台日志
   - 移除地球从聚焦列表

### 数据准确性

所有行星数据基于NASA真实数据：
- 半径：相对于地球半径
- 距离：天文单位（AU）
- 公转周期：地球年
- 轨道倾角：度
- 离心率：无量纲

## 版本信息

- **版本**：v1.7.0
- **发布日期**：2026-01-05
- **主要变更**：
  - ✅ 从独立模型改为场景扩展
  - ✅ 使用真实太阳系比例（AU）
  - ✅ 地球保持在场景中心
  - ✅ 太阳位于-1 AU位置
  - ✅ 所有距离基于真实数据

## 总结

这次升级实现了：

1. **场景整合**：太阳系作为地球场景的扩展，而非独立模型
2. **真实比例**：所有距离基于天文单位（AU）
3. **科学准确**：使用NASA真实行星数据
4. **教育价值**：展示真实的太阳系尺度
5. **可视化优化**：在保持真实比例的同时确保可见性

用户现在可以看到**真实的太阳系比例**，理解行星之间的巨大距离差异！

---

**文档版本**：1.0  
**最后更新**：2026-01-05  
**维护者**：开发团队
