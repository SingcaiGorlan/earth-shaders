# 🚀 航天器发射最终测试指南

## ✅ 最新修复 (2026-05-02)

### 修复内容

1. **航天器不动的问题** ✅
   - **原因**: `clock.getDelta()` 返回异常值
   - **修复**: 使用固定时间步长 `dt = 0.1s`

2. **绿色球体改为红色亮点** ✅
   - **原因**: 球体太小不易观察
   - **修复**: 使用红色发光点 (0xff0000) + 辉光效果

---

## 🎨 视觉改进

### 航天器外观

**之前**:
-  绿色小球 (SphereGeometry, 半径0.05)
- ❌ 不够醒目
- ❌ 远距离难以看见

**现在**:
- ✅ 红色亮点 (Points, 大小0.15)
- ✅ 鲜艳的红色 (0xff0000)
- ✅ 加法混合发光效果
- ✅ 橙色辉光 (Sprite, 0xff3300)
- ✅ 远距离清晰可见

### 控制台输出

**发射时**:
```
🚀 Initializing launch sequence...
🚀 Spacecraft launched successfully!
   Launch site: 28.5°, -80.6°
   Initial position: (1.7234, 0.9567, -0.8123)
   Initial velocity: 7800 m/s
   Velocity vector: (-0.001234, 0.005678, 0.002345)
   Azimuth: 90°, Elevation: 0°
   Multi-body gravity: Moon=true, Sun=true
```

**运行时** (每5秒):
```
[Update] Spacecraft active, time=5.0s, dt=0.10s
[Update] Spacecraft active, time=10.0s, dt=0.10s
[T=10.0s] Altitude: 345678 m, Speed: 7812.3 m/s
```

---

## 🧪 完整测试步骤

### 步骤 1: 打开应用

1. 访问 http://localhost:5173/
2. **立即打开浏览器控制台** (按 F12)
3. 清空控制台日志 (点击 🚫 图标)

### 步骤 2: 找到控制面板

在右侧GUI面板中滚动找到:
```
 Spacecraft Launcher
  ├─ 发射纬度 (°): 28.5
  ├─ 发射经度 (°): -80.6
  ├─ 发射高度 (m): 0
  ├─ 发射速度 (m/s): 7800
  ├─ 发射方位角 (°): 90
  ├─ 发射仰角 (°): 0
  ├─ 🚀 发射航天器  ← 点击这个!
  ├─ 🔄 重置
  ├─ ⏸️ 暂停模拟
  ├─ 时间缩放: 1.0
  ├─ 显示轨迹: ✓
  ├─ 🌙 月球引力: ✓
  └─ ☀️ 太阳引力: ✓
```

### 步骤 3: 发射航天器

1. **保持默认参数不变**
2. **点击 " 发射航天器" 按钮**
3. **立即观察**:
   - ✅ 控制台输出 "🚀 Initializing launch sequence..."
   - ✅ 控制台输出 "🚀 Spacecraft launched successfully!"
   - ✅ 控制台显示初始位置和速度
   - ✅ 相机视野中出现**红色亮点** (在地球表面)
   - ✅ 红色亮点旁边有**橙色辉光**

### 步骤 4: 观察运动

1. **等待5-10秒**
2. **观察控制台输出**:
   ```
   [Update] Spacecraft active, time=5.0s, dt=0.10s
   [Update] Spacecraft active, time=10.0s, dt=0.10s
   [T=10.0s] Altitude: XXXX m, Speed: XXXX m/s
   ```
3. **观察3D视图**:
   - ✅ **红色亮点应该移动**!
   - ✅ **青色轨迹线应该延伸**!
   - ✅ 每5秒控制台确认更新正在运行

### 步骤 5: 验证运动

**如果红色亮点在移动**:
- ✅ 恭喜!发射成功!
- ✅ 观察轨迹线是否正确
- ✅ 检查高度和速度是否合理

**如果红色亮点不动**:
-  继续下面的故障排查

---

## 🔍 故障排查

### 问题 A: 控制台没有任何输出

**检查**:
- [ ] 是否正确打开了控制台? (F12)
- [ ] 控制台是否有过滤器设置了 "Hide network" 或 "Hide info"?
- [ ] 点击发射按钮时控制台是否有任何红色错误?

**解决**:
```javascript
// 在控制台手动测试
console.log('Testing...');
console.log(spacecraftLauncher);
console.log(spacecraftLauncher.isLaunched);
```

### 问题 B: 看到发射日志但红色亮点不出现

**检查**:
- [ ] 控制台是否显示 "Spacecraft launched successfully!"?
- [ ] 控制台是否显示初始位置坐标?
- [ ] 相机是否对准地球?

**解决**:
```javascript
// 检查航天器是否可见
console.log(spacecraftLauncher.spacecraft.visible); // 应该是 true
console.log(spacecraftLauncher.spacecraft.position); // 应该有坐标值

// 手动设置为可见
spacecraftLauncher.spacecraft.visible = true;
```

### 问题 C: 红色亮点出现但不移动

**检查**:
- [ ] 控制台是否有 "[Update] Spacecraft active..." 输出?
- [ ] "⏸️ 暂停模拟" 是否被勾选?
- [ ] "时间缩放" 是否 > 0?

**解决**:
```javascript
// 检查状态
console.log('isLaunched:', spacecraftLauncher.isLaunched);
console.log('pauseSimulation:', spacecraftConfig.pauseSimulation);
console.log('timeScale:', spacecraftConfig.timeScale);

// 手动更新测试
spacecraftLauncher.update(0.1);
console.log('Position after update:', spacecraftLauncher.position);
```

### 问题 D: 红色亮点移动但轨迹线不显示

**检查**:
- [ ] "显示轨迹" 复选框是否勾选?
- [ ] 控制台是否有错误?

**解决**:
```javascript
// 检查轨迹
console.log('Trail visible:', spacecraftLauncher.trail.visible);
console.log('Trail positions count:', spacecraftLauncher.trailPositions.length);

// 手动显示
spacecraftLauncher.trail.visible = true;
```

### 问题 E: 控制台有 JavaScript 错误

**常见错误及解决**:

**错误 1**: `Cannot read property 'setLaunchSite' of undefined`
```javascript
// 原因: spacecraftLauncher 未定义
// 解决: 刷新页面重新加载
location.reload();
```

**错误 2**: `THREE is not defined`
```javascript
// 原因: THREE 库未加载
// 解决: 检查网络连接,刷新页面
```

**错误 3**: `spacecraftConfig is not defined`
```javascript
// 原因: 变量作用域问题
// 解决: 已在代码中修复,刷新页面
```

---

## 🎯 快速验证清单

发射后5秒内应该看到:

- [ ] ✅ 控制台: "🚀 Initializing launch sequence..."
- [ ] ✅ 控制台: "🚀 Spacecraft launched successfully!"
- [ ] ✅ 控制台: 初始位置和速度数据
- [ ] ✅ 3D视图: **红色亮点**出现在地球表面
- [ ] ✅ 3D视图: 红色亮点有**橙色辉光**
- [ ] ✅ 控制台: "[Update] Spacecraft active, time=5.0s..."
- [ ] ✅ 控制台: "[T=10.0s] Altitude: XXXX m, Speed: XXXX m/s"
- [ ] ✅ 3D视图: **红色亮点在移动**
- [ ] ✅ 3D视图: **青色轨迹线在延伸**

如果以上全部打勾,说明**发射成功**! 🎉

---

## 📸 预期视觉效果

### 发射瞬间

```
地球表面 (肯尼迪航天中心位置)
    ↓
    🔴 ← 红色亮点 (航天器)
    ✨ ← 橙色辉光
```

### 飞行中

```
太空背景
    ↓
    🔴 → → → → → ← 移动的红色亮点
    ───────────── ← 青色轨迹线
    (地球在下方)
```

### 颜色说明

- **航天器**: 鲜艳的红色 (#ff0000)
- **辉光**: 橙红色 (#ff3300), 半透明
- **轨迹**: 青色/蓝绿色 (#00ffff), 半透明
- **地球**: 蓝色/绿色 (原有)

---

## 🚀 推荐测试场景

### 场景 1: 近地轨道 (最容易观察)

```
发射纬度: 28.5°
发射经度: -80.6°
发射高度: 0 m
发射速度: 7800 m/s  ← 关键!
发射方位角: 90°
发射仰角: 0°
月球引力: 关闭
太阳引力: 关闭
时间缩放: 1.0

预期:
- 红色亮点绕地球飞行
- 高度稳定在 300-400 km
- 速度稳定在 7800 m/s 左右
- 90分钟左右完成一圈
```

### 场景 2: 快速测试运动

```
发射速度: 3000 m/s  ← 降低速度
发射仰角: 45°  ← 向上发射
时间缩放: 0.5  ← 慢动作观察

预期:
- 红色亮点向上飞然后落回
- 抛物线轨迹
- 更容易观察运动过程
```

---

## 💡 提示与技巧

### 1. 如何更好地观察红色亮点

```javascript
// 放大观察
// 使用鼠标滚轮缩放
// 或者在控制台调整相机
camera.position.set(5, 5, 5);
controls.update();
```

### 2. 如何追踪航天器

```javascript
// 让相机跟随航天器 (需要自定义实现)
// 暂时使用手动追踪
setInterval(() => {
    console.log('Spacecraft position:', spacecraftLauncher.position);
}, 1000);
```

### 3. 如何调整时间缩放

```javascript
// 快速模拟
spacecraftConfig.timeScale = 5.0; // 5倍速

// 慢动作观察
spacecraftConfig.timeScale = 0.2; // 0.2倍速

// 恢复正常
spacecraftConfig.timeScale = 1.0;
```

### 4. 如何重置测试

```javascript
// 方法 1: GUI 按钮
// 点击 "🔄 重置" 按钮

// 方法 2: 控制台
spacecraftLauncher.reset();

// 方法 3: 刷新页面
location.reload();
```

---

## 📊 性能监控

### 正常性能指标

- **帧率**: 55-60 FPS
- **内存**: +50KB (航天器数据)
- **CPU**: < 5% 额外占用
- **更新频率**: 10次/秒 (dt=0.1s)

### 如果性能下降

```javascript
// 减少轨迹点
spacecraftLauncher.maxTrailLength = 100; // 默认500

// 降低时间缩放
spacecraftConfig.timeScale = 0.5;

// 关闭多体引力
spacecraftLauncher.enableMoonGravity = false;
spacecraftLauncher.enableSunGravity = false;
```

---

##  反馈模板

如果问题仍未解决,请提供以下信息:

```
【问题描述】
红色亮点是否出现: [是/否]
红色亮点是否移动: [是/否]
轨迹线是否显示: [是/否]

【控制台输出】
(复制粘贴控制台的完整输出)

【使用参数】
发射纬度: 
发射经度: 
发射速度: 
发射仰角: 
月球引力: [开/关]
太阳引力: [开/关]

【浏览器信息】
浏览器: 
版本: 
操作系统: 

【截图】
(如有,请附上截图)
```

---

**最后更新**: 2026年5月2日  
**版本**: v2.4.1 (修复运动问题 + 红色亮点)  
**状态**: ✅ 已修复,等待测试验证
