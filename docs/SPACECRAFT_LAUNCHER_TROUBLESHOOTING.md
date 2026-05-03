# 🚀 航天器发射问题诊断与测试指南

## 问题修复总结

### 已修复的问题

1. **发射按钮不工作** ✅
   - **原因**: 箭头函数中的变量作用域问题
   - **修复**: 改用普通函数 `function()` 代替箭头函数 `() =>`

2. **添加多体引力支持** ✅
   - **月球引力**: 实现了基于真实轨道参数的月球引力计算
   - **太阳引力**: 实现了基于1 AU距离的太阳引力计算
   - **GUI控制**: 添加了月球和太阳引力的开关控制

---

## 🧪 测试步骤

### 1. 基本发射测试

**操作步骤**:
1. 打开浏览器访问 http://localhost:5173/
2. 打开浏览器控制台（F12）
3. 在右侧GUI面板找到 **" Spacecraft Launcher"**
4. 使用默认参数，点击 **"🚀 发射航天器"** 按钮

**预期结果**:
- ✅ 控制台输出: `🚀 Initializing launch sequence...`
- ✅ 控制台输出: ` Spacecraft launched successfully!`
- ✅ 控制台显示初始位置和速度向量
- ✅ 绿色球体出现在地球表面（肯尼迪航天中心位置）
- ✅ 青色轨迹线开始延伸
- ✅ 每10秒输出一次状态：`[T=10.0s] Altitude: XXXX m, Speed: XXXX m/s`

### 2. 多体引力测试

**测试场景 A: 仅地球引力**
```
设置:
- 取消勾选 "🌙 月球引力"
- 取消勾选 "☀️ 太阳引力"
- 发射速度: 7800 m/s
- 发射仰角: 0°

预期:
- 航天器应该进入近地圆轨道
- 高度保持稳定 (~300-400 km)
- 速度保持稳定 (~7800 m/s)
```

**测试场景 B: 地球 + 月球引力**
```
设置:
- 勾选 "🌙 月球引力"
- 取消勾选 "☀️ 太阳引力"
- 发射速度: 10800 m/s (转移轨道速度)
- 发射仰角: 0°

预期:
- 航天器轨道会受到月球引力扰动
- 轨道形状会发生周期性变化
- 接近月球时速度会变化
```

**测试场景 C: 完整多体引力**
```
设置:
- 勾选 "🌙 月球引力"
- 勾选 "☀️ 太阳引力"
- 发射速度: 11200 m/s (逃逸速度)
- 发射仰角: 0°

预期:
- 航天器逐渐远离地球
- 太阳引力开始主导轨道
- 进入日心轨道
```

### 3. 控制台调试信息

**发射时应看到**:
```javascript
🚀 Initializing launch sequence...
🚀 Spacecraft launched successfully!
   Launch site: 28.5°, -80.6°
   Initial position: (1.7234, 0.9567, -0.8123)
   Initial velocity: 7800 m/s
   Velocity vector: (-0.001234, 0.005678, 0.002345)
   Azimuth: 90°, Elevation: 0°
   Multi-body gravity: Moon=true, Sun=true
```

**运行时应看到** (每10秒):
```javascript
[T=10.0s] Altitude: 345678 m, Speed: 7812.3 m/s
[T=20.0s] Altitude: 356789 m, Speed: 7798.5 m/s
[T=30.0s] Altitude: 348901 m, Speed: 7805.1 m/s
```

---

## 🔍 问题排查

### 问题 1: 点击发射按钮没有反应

**检查清单**:
- [ ] 浏览器控制台是否有错误？
- [ ] 是否看到 " Initializing launch sequence..." 日志？
- [ ] GUI面板中的参数滑块是否正常？

**解决方案**:
```javascript
// 在控制台手动测试
spacecraftLauncher.setLaunchSite(28.5, -80.6, 0);
spacecraftLauncher.setLaunchVelocity(7800, 90, 0);
spacecraftLauncher.launch();
```

### 问题 2: 航天器发射后立即消失

**可能原因**:
- 发射速度过高，航天器快速飞离视野
- 相机没有跟随航天器

**解决方案**:
```javascript
// 降低发射速度测试
spacecraftConfig.launchVelocity = 3000; // 亚轨道飞行
```

### 问题 3: 轨迹线不显示

**检查清单**:
- [ ] "显示轨迹" 复选框是否勾选？
- [ ] 控制台是否有 "Spacecraft launched successfully!" 日志？
- [ ] 航天器球体是否可见？

**解决方案**:
```javascript
// 手动显示轨迹
spacecraftLauncher.trail.visible = true;
```

### 问题 4: 航天器不运动

**可能原因**:
- "暂停模拟" 被勾选
- 时间缩放设置为0

**解决方案**:
```javascript
// 检查状态
console.log(spacecraftLauncher.isLaunched); // 应该是 true
console.log(spacecraftConfig.pauseSimulation); // 应该是 false
console.log(spacecraftConfig.timeScale); // 应该 > 0

// 在控制台手动更新
const dt = 0.1;
spacecraftLauncher.update(dt);
```

### 问题 5: 多体引力没有效果

**检查清单**:
- [ ] 月球/太阳引力复选框是否勾选？
- [ ] 控制台是否显示 `Multi-body gravity: Moon=true, Sun=true`？
- [ ] 发射速度是否足够高（>10000 m/s）才能观察到引力扰动？

**调试代码**:
```javascript
// 检查引力计算
const pos = spacecraftLauncher.position.clone();
const accel = spacecraftLauncher.calculateAcceleration(pos);
console.log('Total acceleration:', accel);

// 分别检查各天体引力
const earthAccel = spacecraftLauncher.earthGravityModel.calculateTotalGravity(pos);
console.log('Earth gravity:', earthAccel);
```

---

## 📊 性能优化建议

### 1. 轨迹点限制
```javascript
// 如果内存占用过高，减少轨迹点数量
spacecraftLauncher.maxTrailLength = 200; // 默认500
```

### 2. 时间缩放调整
```javascript
// 长时间模拟时使用较高的时间缩放
spacecraftConfig.timeScale = 5.0; // 5倍速
```

### 3. 关闭不必要的引力
```javascript
// 如果只需要地球轨道，关闭月球和太阳引力
spacecraftLauncher.enableMoonGravity = false;
spacecraftLauncher.enableSunGravity = false;
```

---

## 🎯 推荐测试场景

### 场景 1: 近地圆轨道 (ISS 模拟)
```
纬度: 28.5°
经度: -80.6°
高度: 400000 m (400 km)
速度: 7670 m/s
方位角: 90°
仰角: 0°
引力: 仅地球

预期轨道周期: ~92 分钟
```

### 场景 2: 地球同步轨道 (GEO)
```
纬度: 0° (赤道)
经度: -80.6°
高度: 35786000 m (35786 km)
速度: 3075 m/s
方位角: 90°
仰角: 0°
引力: 仅地球

预期: 航天器相对地球静止
```

### 场景 3: 月球转移轨道
```
纬度: 28.5°
经度: -80.6°
高度: 200000 m (200 km)
速度: 10800 m/s
方位角: 90°
仰角: 0°
引力: 地球 + 月球

预期: 航天器向月球方向飞行
```

### 场景 4: 星际逃逸轨道
```
纬度: 28.5°
经度: -80.6°
高度: 200000 m
速度: 11200 m/s
方位角: 90°
仰角: 0°
引力: 地球 + 月球 + 太阳

预期: 航天器逃离地球引力，进入日心轨道
```

---

##  反馈与问题报告

如果遇到问题，请提供以下信息：

1. **浏览器控制台输出** (复制完整日志)
2. **使用的发射参数** (纬度、经度、速度等)
3. **预期行为 vs 实际行为**
4. **浏览器版本和操作系统**

---

**最后更新**: 2026年5月2日  
**版本**: v2.4.0  
**状态**: ✅ 已修复发射问题，✅ 已添加多体引力
