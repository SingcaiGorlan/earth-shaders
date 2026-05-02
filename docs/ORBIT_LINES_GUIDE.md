# 🛰️ 卫星轨道线使用指南

## 功能说明

卫星轨道线功能可以显示卫星在地球周围的运行轨迹,帮助你直观地了解卫星的轨道形状和位置.

## 如何使用

### 方法1:通过启动页面配置

1. 打开 `launch.html` 启动页面
2. 在"交互功能 | Interactive Features"区域
3. 勾选以下选项:
   - ✅ **卫星轨道 | Satellite Orbits** - 启用卫星追踪系统
   - ✅ **轨道线显示 | Orbit Lines** - 显示卫星运行轨道轨迹
4. 点击"🚀 启动系统"按钮

### 方法2:通过GUI控制面板

启动应用后,在右上角的GUI控制面板中:

1. 找到 **"Satellites"** 文件夹
2. 点击以下按钮之一:
   - **"加载 ISS"** - 加载国际空间站(红色轨道)
   - **"加载 GPS"** - 加载GPS卫星(蓝色轨道)
   - **"加载 ISS (3D模型)"** - 加载带3D模型的ISS
   - **"加载简单卫星模型"** - 加载简单卫星模型

3. 卫星和轨道线会立即显示在地球周围

## 轨道线特性

### 颜色编码
- 🔴 **红色轨道** - ISS(国际空间站),低地球轨道(约400km)
- 🔵 **蓝色轨道** - GPS卫星,中地球轨道(约20,000km)
- 🟢 **绿色轨道** - 默认轨道颜色

### 轨道参数
- **透明度**: 40%(可以透过轨道线看到地球)
- **线宽**: 1像素
- **路径点数**: 200个点(确保轨道平滑)
- **轨道周期**: 
  - ISS: 约92分钟
  - GPS: 约717分钟(12小时)

### 实时更新
- 卫星位置会根据TLE(Two-Line Element)数据实时计算
- 轨道线会跟随卫星移动
- 支持时间加速和回溯

## 高级功能

### 坐标转换
系统支持多种坐标系:
- **ECI坐标系** - 地心惯性坐标系(用于物理计算)
- **Three.js世界坐标** - 场景中的显示坐标
- **地理坐标** - 经度、纬度、高度

### 调试功能
在GUI控制面板中可以:
- **"计算 ISS 24h 位置"** - 计算未来24小时的位置序列
- **"测试地理坐标"** - 查看卫星的经纬度信息
- **"调试坐标转换"** - 查看坐标转换详情

### 性能优化
- 大量卫星时使用实例化渲染(Instanced Mesh)
- 可调节时间缩放比例
- 支持时间跳转和快进/快退

## 技术细节

### TLE数据
卫星轨道基于TLE(Two-Line Element)格式数据,包含:
- 卫星编号
- 轨道参数(倾角、升交点赤经、偏心率等)
- 历元时间
- 平均运动

### 物理模型
使用 `satellite.js` 库进行轨道计算:
- SGP4/SDP4 轨道传播模型
- 考虑地球引力摄动
- 支持高精度位置计算

### 坐标系统
```
ECI (地心惯性坐标系):
  - X轴: 指向春分点
  - Y轴: 赤道平面
  - Z轴: 指向北极

Three.js 场景坐标系:
  - X轴: 向右
  - Y轴: 向上(ECI的Z轴)
  - Z轴: 向前(ECI的Y轴反向)
```

## 常见问题

### Q: 为什么看不到轨道线？
A: 确保:
1. 在launch.html中勾选了"轨道线显示"选项
2. 已加载至少一颗卫星
3. 相机距离地球不要太远

### Q: 轨道线不够平滑？
A: 可以修改 `satelliteOrbit.js` 中的 `numPoints` 参数:
```javascript
generateOrbitPath(satrec, startDate, orbitPeriod, numPoints = 200)
// 增加 numPoints 可以获得更平滑的轨道
```

### Q: 如何添加更多卫星？
A: 在 `satelliteOrbit.js` 的 `SatelliteOrbitManager` 类中:
1. 准备TLE数据
2. 调用 `parseTLE(tleString)` 解析
3. 调用 `addSatellite(satellite, options)` 添加

### Q: 轨道线颜色怎么修改？
A: 在添加卫星时指定 `orbitColor`:
```javascript
orbitManager.addSatellite(iss, {
    orbitColor: '#ff0000',  // 红色
    satelliteColor: '#ffffff',
    showOrbit: true
})
```

## 示例代码

### 添加自定义卫星
```javascript
// 在 script.js 中
const mySatelliteTLE = `MY SATELLITE
1 12345U 23001A   24001.50000000  .00012345  00000-0  23456-3 0  9999
2 12345  51.6400 120.5000 0005432  80.1234 279.9876 15.49560000123456`

const mySat = orbitManager.parseTLE(mySatelliteTLE)
if (mySat) {
    orbitManager.addSatellite(mySat, {
        orbitColor: '#00ff00',      // 绿色轨道
        satelliteColor: '#00ff00',  // 绿色卫星
        satelliteSize: 0.05,
        showOrbit: true,
        showSatellite: true,
        orbitPeriod: 95  // 轨道周期(分钟)
    })
}
```

### 切换轨道线显示/隐藏
```javascript
// 显示所有轨道线
orbitManager.orbitLines.forEach(orbitObj => {
    if (orbitObj.line) {
        orbitObj.line.visible = true
    }
})

// 隐藏所有轨道线
orbitManager.orbitLines.forEach(orbitObj => {
    if (orbitObj.line) {
        orbitObj.line.visible = false
    }
})
```

## 相关文件

- `src/satelliteOrbit.js` - 卫星轨道管理核心代码
- `src/script.js` - 主程序,包含GUI控制
- `src/launch.html` - 启动配置页面
- `static/earth/gp.tle` - GPS卫星TLE数据文件

## 更新日志

### v2.3.0
- ✅ 添加轨道线显示/隐藏开关
- ✅ 支持launch.html配置轨道线
- ✅ 优化轨道线渲染性能
- ✅ 支持多卫星同时显示
- ✅ 实时更新卫星位置

---

📚 **更多资料**: 查看 [AEROSPACE_THEORY_KNOWLEDGE_BASE.md](./AEROSPACE_THEORY_KNOWLEDGE_BASE.md) 了解轨道力学基础理论
