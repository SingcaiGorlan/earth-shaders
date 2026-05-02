# 🌌 太阳系模型 - 快速参考卡

## 📊 行星数据速查表

| 行星 | 半径 | 距离 | 颜色 | 速度 | 特点 |
|------|------|------|------|------|------|
| ☿ 水星 | 0.38 | 10 | 灰褐 | 4.15 | 最近、最快 |
| ♀ 金星 | 0.95 | 15 | 金黄 | 1.62 | 最热、逆向 |
| 🌍 地球 | 1.00 | 20 | 蓝色 | 1.00 | 有月球 |
| ♂ 火星 | 0.53 | 25 | 红褐 | 0.53 | 红色星球 |
| ♃ 木星 | 3.50 | 35 | 米黄 | 0.084 | 最大 |
| ♄ 土星 | 3.00 | 45 | 淡黄 | 0.034 | 有光环 |
| ♅ 天王星 | 2.00 | 55 | 蓝绿 | 0.012 | 侧躺 |
| ♆ 海王星 | 1.90 | 65 | 深蓝 | 0.006 | 最远 |

---

## 🎮 GUI控制说明

### 启用太阳系
```
🌌 太阳系模型
├─ ☑ 启用太阳系          → 显示/隐藏整个系统
├─ ☑ 显示轨道            → 显示/隐藏轨道线
├─ ☑ 显示小行星带        → 显示/隐藏小行星
├─ 时间流速 [0.1-10]     → 调整动画速度
└─ 聚焦行星 [下拉菜单]   → 相机定位到行星
```

---

## ⌨️ 使用步骤

### 1️⃣ 启用太阳系
```javascript
// 方法1: GUI勾选 "启用太阳系"
// 方法2: 代码调用
solarSystemConfig.enableSolarSystem = true
initSolarSystem()
```

### 2️⃣ 调整视角
```javascript
// 聚焦特定行星
solarSystem.focusOnPlanet('Earth', camera, controls)

// 或手动调整
camera.position.set(0, 50, 80)
controls.target.set(0, 0, 0)
```

### 3️⃣ 控制动画
```javascript
// 调整时间流速
solarSystemConfig.timeScale = 5.0  // 5倍速

// 暂停(设为0)
solarSystemConfig.timeScale = 0

// 正常速度
solarSystemConfig.timeScale = 1.0
```

### 4️⃣ 切换显示
```javascript
// 隐藏轨道线
solarSystem.toggleOrbits(false)

// 隐藏小行星带
solarSystem.toggleAsteroidBelt(false)
```

---

## 🔢 关键参数

### 太阳
- **半径:** 3.0单位
- **光晕内层:** 3.5单位,30%透明
- **光晕外层:** 4.5单位,15%透明
- **日冕粒子:** 200个
- **光照强度:** 2.0

### 行星尺寸(相对)
```
最大: 木星 3.5
      土星 3.0
      天王星 2.0
      海王星 1.9
基准: 地球 1.0
      金星 0.95
      火星 0.53
最小: 水星 0.38
```

### 轨道距离
```
内太阳系:
  水星 10  ←→  金星 15  (间距5)
  金星 15  ←→  地球 20  (间距5)
  地球 20  ←→  火星 25  (间距5)

小行星带: 28-32

外太阳系:
  火星 25  ←→  木星 35  (间距10)
  木星 35  ←→  土星 45  (间距10)
  土星 45  ←→  天王星 55 (间距10)
  天王星 55 ←→  海王星 65 (间距10)
```

### 小行星带
- **数量:** 2,000颗
- **位置:** 28-32单位(火星木星之间)
- **高度:** ±0.75单位
- **粒子大小:** 0.05-0.2单位
- **旋转速度:** 0.0005/帧

---

## 🎨 颜色代码

| 天体 | 十六进制 | RGB | 说明 |
|------|---------|-----|------|
| 太阳 | #FFD700 | 255,215,0 | 金色 |
| 水星 | #8C7853 | 140,120,83 | 灰褐色 |
| 金星 | #FFC649 | 255,198,73 | 金黄色 |
| 地球 | #6B93D6 | 107,147,214 | 蓝色 |
| 火星 | #C1440E | 193,68,14 | 红褐色 |
| 木星 | #D8CA9D | 216,202,157 | 米黄色 |
| 土星 | #FAD5A5 | 250,213,165 | 淡黄色 |
| 天王星 | #4FD0E7 | 79,208,231 | 蓝绿色 |
| 海王星 | #4B70DD | 75,112,221 | 深蓝色 |
| 月球 | #CCCCCC | 204,204,204 | 灰色 |
| 轨道 | #444444 | 68,68,68 | 深灰色 |

---

## ⚙️ 技术细节

### 材质类型
- **类地行星:** MeshStandardMaterial(粗糙表面)
- **气态巨行星:** MeshPhongMaterial(光泽表面)
- **太阳光晕:** MeshBasicMaterial + BackSide
- **轨道线:** LineBasicMaterial
- **小行星:** PointsMaterial

### 几何体细分
- **太阳:** 64×64
- **行星:** 32×32
- **月球:** 16×16
- **轨道:** 128段
- **光环:** 64段

### 动画更新频率
```javascript
每帧更新:
  - 太阳自转: +0.002
  - 行星公转: orbitSpeed × deltaTime × timeScale
  - 行星自转: rotationSpeed × deltaTime
  - 月球公转: 0.05 × deltaTime
  - 小行星带: +0.0005 × deltaTime
```

---

## 🎯 常用场景

### 场景1: 教育演示
```javascript
// 慢速展示,便于讲解
solarSystemConfig.timeScale = 0.5
solarSystemConfig.showOrbits = true
solarSystemConfig.showAsteroidBelt = true

// 依次聚焦每个行星
const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 
                 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
```

### 场景2: 艺术渲染
```javascript
// 隐藏辅助元素,突出美感
solarSystemConfig.showOrbits = false
solarSystemConfig.showAsteroidBelt = false
solarSystemConfig.timeScale = 0.2

// 调整光照和相机
camera.position.set(30, 20, 40)
```

### 场景3: 科学模拟
```javascript
// 加速观察长期运动
solarSystemConfig.timeScale = 10.0
solarSystemConfig.showOrbits = true

// 关注特定区域(如小行星带)
camera.position.set(0, 15, 35)
controls.target.set(30, 0, 0)
```

---

## 📐 比例关系

### 开普勒第三定律验证
```
T² ∝ a³

水星: (10/4.15)² ≈ 5.8    vs    10³ = 1000
地球: (20/1.0)² = 400     vs    20³ = 8000
木星: (35/0.084)² ≈ 173K  vs    35³ = 42,875

注意:模型速度经过调整以便观察,不完全符合真实比例
```

### 洛希极限(光环形成)
```
土星光环位于洛希极限内
r_Roche ≈ 2.44 × R_planet × (ρ_planet/ρ_ring)^(1/3)

模型中:
  土星半径: 3.0
  光环内径: 3.6 (1.2×)
  光环外径: 7.5 (2.5×)
```

---

## 🔍 调试技巧

### 检查太阳系是否初始化
```javascript
console.log(solarSystem)
// 应该输出 SolarSystemModel 对象
```

### 查看行星位置
```javascript
solarSystem.planets.forEach(p => {
    console.log(`${p.data.name}: (${p.group.position.x.toFixed(2)}, 
                                    ${p.group.position.z.toFixed(2)})`)
})
```

### 性能监控
```javascript
// 浏览器控制台
renderer.info.render.triangles  // 三角形数量
renderer.info.memory.geometries // 几何体数量
```

### 临时隐藏特定行星
```javascript
// 隐藏水星
solarSystem.planets[0].group.visible = false

// 恢复显示
solarSystem.planets[0].group.visible = true
```

---

## ⚡ 性能提示

### 优化建议
✅ 不使用时禁用太阳系  
✅ 减少小行星数量(修改asteroidCount)  
✅ 降低几何体细分(32→16)  
✅ 关闭阴影(如果不需要)  
✅ 使用较低的时间流速  

### 资源占用
- **三角形数:** ~50,000
- **绘制调用:** ~30次
- **内存占用:** ~10MB
- **FPS影响:** 通常 <5%

---

## 🚨 常见问题

### Q: 太阳系不显示？
```javascript
// 检查1: 是否启用
console.log(solarSystemConfig.enableSolarSystem)

// 检查2: 是否初始化
console.log(solarSystem !== null)

// 检查3: 相机位置
console.log(camera.position)
```

### Q: 行星不动？
```javascript
// 检查时间流速
console.log(solarSystemConfig.timeScale)
// 应该 > 0

// 检查deltaTime
console.log(deltaTime)
// 应该正常传递
```

### Q: 相机聚焦没反应？
```javascript
// 检查行星名称是否正确
console.log(solarSystemConfig.focusPlanet)
// 必须是: 'Mercury', 'Venus', 'Earth', etc.

// 检查solarSystem是否存在
console.log(solarSystem !== null)
```

---

## 📞 快速命令

```javascript
// 一键启用
solarSystemConfig.enableSolarSystem = true; initSolarSystem();

// 一键聚焦地球
solarSystem.focusOnPlanet('Earth', camera, controls);

// 一键全景
camera.position.set(0, 80, 100); controls.target.set(0,0,0);

// 一键加速
solarSystemConfig.timeScale = 10;

// 一键简化
solarSystem.toggleOrbits(false); 
solarSystem.toggleAsteroidBelt(false);

// 重置
solarSystemConfig.timeScale = 1;
solarSystemConfig.focusPlanet = 'None';
```

---

**快速参考,随时查阅！🚀**
