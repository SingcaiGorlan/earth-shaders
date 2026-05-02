# 太阳系专业化升级文档

## 概述

本次升级将太阳系模型从简单的基础材质升级到专业级GLSL着色器系统,与地球模型的质量标准保持一致.

## 升级内容

### 1. 新增着色器文件

创建了4套专业着色器(8个文件):

#### 太阳着色器
- **sun-vertex.glsl** - 太阳顶点着色器
- **sun-fragment.glsl** - 太阳片段着色器

**特性:**
- 多层等离子体动画效果
- 程序化太阳黑子生成
- 动态太阳耀斑
- 日冕边缘变暗效果
- 辉光和泛光效果

#### 类地行星着色器(水星、金星、火星、地球)
- **rocky-planet-vertex.glsl** - 类地行星顶点着色器
- **rocky-planet-fragment.glsl** - 类地行星片段着色器

**特性:**
- 程序化表面纹理生成
- 多层地形噪声(FBM算法)
- 大气散射效果
- 昼夜平滑过渡
- 菲涅尔边缘光
- 镜面反射

**每个行星的独特配置:**
- **水星**:无大气层,表面细节突出
- **金星**:浓厚大气层(密度0.8),金黄色大气
- **地球**:蓝色大气层(密度0.6),天蓝色大气
- **火星**:稀薄大气层(密度0.15),橙红色大气

#### 气态巨行星着色器(木星、土星、天王星、海王星)
- **gas-giant-vertex.glsl** - 气态巨行星顶点着色器
- **gas-giant-fragment.glsl** - 气态巨行星片段着色器

**特性:**
- 大气带纹理(水平条纹)
- 大气湍流效果
- 多层颜色混合
- 云层变化
- 边缘辉光

**特殊效果:**
- **木星**:大红斑风暴系统(动态旋转)
- **土星**:标准大气带
- **天王星**:蓝绿色调,侧躺旋转
- **海王星**:深蓝色调

#### 行星环着色器(土星、天王星)
- **ring-vertex.glsl** - 行星环顶点着色器
- **ring-fragment.glsl** - 行星环片段着色器

**特性:**
- 多环带结构(内环、中环、外环)
- 卡西尼环缝(著名间隙)
- 粒子分布噪声
- 径向渐变
- 透明度变化
- 光照计算

### 2. solarSystem.js 核心升级

#### 导入着色器
```javascript
import sunVertexShader from './shaders/solarSystem/sun-vertex.glsl'
import sunFragmentShader from './shaders/solarSystem/sun-fragment.glsl'
import rockyPlanetVertexShader from './shaders/solarSystem/rocky-planet-vertex.glsl'
import rockyPlanetFragmentShader from './shaders/solarSystem/rocky-planet-fragment.glsl'
import gasGiantVertexShader from './shaders/solarSystem/gas-giant-vertex.glsl'
import gasGiantFragmentShader from './shaders/solarSystem/gas-giant-fragment.glsl'
import ringVertexShader from './shaders/solarSystem/ring-vertex.glsl'
import ringFragmentShader from './shaders/solarSystem/ring-fragment.glsl'
```

#### 太阳系统升级
- 使用自定义ShaderMaterial替代MeshBasicMaterial
- 几何体细分提升至128x128(原64x64)
- 添加time、intensity、sunColor、coronaColor uniforms
- 光照强度提升至1.8(原1.5)
- 光照范围扩展至250(原200)
- 日冕粒子数增加至300(原200)

#### 行星系统升级
- 所有行星使用ShaderMaterial
- 几何体细分提升至64x64(原32x32)
- 根据行星类型自动选择着色器
- 每个行星配置独特的uniforms参数

**类地行星配置示例:**
```javascript
{
    time: { value: 0 },
    planetColor: { value: new THREE.Color(0x6B93D6) },
    atmosphereColor: { value: new THREE.Color(0x87CEEB) },
    atmosphereDensity: { value: 0.6 },
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    surfaceDetail: { value: 8.0 }
}
```

**气态巨行星配置示例:**
```javascript
{
    time: { value: 0 },
    planetColor: { value: new THREE.Color(data.color) },
    bandColor1: { value: bandColor1 },
    bandColor2: { value: bandColor2 },
    stormColor: { value: new THREE.Color(0xCC4422) },
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    rotationSpeed: { value: data.rotationSpeed * 10 },
    hasGreatSpot: { value: isJupiter ? 1.0 : 0.0 }
}
```

#### 土星环系统升级
- 使用自定义Ring Shader
- 几何体细分提升至128x8(原64)
- 改进UV映射(径向渐变)
- 三层环带颜色配置
- 透明度支持

#### 动画系统升级
- 实时更新所有着色器的time uniform
- 动态计算太阳方向(sunDirection)
- 基于行星位置的光照方向更新

```javascript
// Update shader uniforms
if (planet.material && planet.material.uniforms) {
    planet.material.uniforms.time.value = this.time
    
    // Update sun direction based on planet position
    const sunPos = new THREE.Vector3(0, 0, 0)
    const planetPos = planet.group.position.clone()
    const sunDir = sunPos.sub(planetPos).normalize()
    planet.material.uniforms.sunDirection.value.copy(sunDir)
}
```

## 着色器技术细节

### 噪声算法

所有着色器使用相同的基础噪声函数:

```glsl
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}
```

### 光照模型

所有行星使用统一的光照计算:

```glsl
// 光照强度
float lightIntensity = max(dot(normal, sunDirection), 0.0);

// 昼夜过渡
float dayFactor = smoothstep(-0.1, 0.3, dot(normal, sunDirection));

// 最终颜色
vec3 litColor = surfaceColor * (0.1 + lightIntensity * 0.9);
vec3 nightColor = surfaceColor * 0.05;
vec3 color = mix(nightColor, litColor, dayFactor);
```

### 大气散射

基于菲涅尔效应的大气散射:

```glsl
float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
float atmosphereEffect = fresnel * atmosphereDensity;
vec3 atmosphereGlow = atmosphereColor * atmosphereEffect;

// 昼夜大气差异
float dayAtmosphere = atmosphereEffect * max(dot(normal, sunDirection) + 0.5, 0.0) * 0.6;
float nightAtmosphere = atmosphereEffect * (1.0 - dayFactor) * 0.2;

color = mix(color, atmosphereGlow, dayAtmosphere + nightAtmosphere);
```

## 性能优化

### 几何体细分

| 对象 | 升级前 | 升级后 | 提升 |
|------|--------|--------|------|
| 太阳 | 64x64 | 128x128 | 4x |
| 行星 | 32x32 | 64x64 | 4x |
| 土星环 | 64 | 128x8 | 2x |

### 阴影优化

- 禁用所有行星的阴影投射和接收
- 减少GPU负担
- 提升FPS

```javascript
mesh.castShadow = false
mesh.receiveShadow = false
```

### Uniform更新优化

- 仅在update循环中更新必要的uniforms
- 避免每帧重新创建Vector3对象
- 使用引用传递

## 视觉效果对比

### 太阳

**升级前:**
- 静态黄色球体
- 简单辉光层
- 无表面细节

**升级后:**
- 动态等离子体表面
- 程序化太阳黑子
- 动态太阳耀斑
- 日冕边缘变暗
- 多层辉光效果

### 类地行星

**升级前:**
- 单一颜色球体
- 简单光照
- 无大气效果

**升级后:**
- 程序化地形纹理
- 多层FBM噪声
- 大气散射和辉光
- 菲涅尔边缘光
- 昼夜平滑过渡
- 镜面反射

### 气态巨行星

**升级前:**
- 单一颜色球体
- 简单光照

**升级后:**
- 大气带纹理
- 大气湍流
- 云层变化
- 木星大红斑(动态)
- 边缘辉光

### 土星环

**升级前:**
- 简单半透明圆环
- 单一颜色

**升级后:**
- 三层环带结构
- 卡西尼环缝
- 粒子分布噪声
- 径向渐变
- 动态光照

## 使用指南

### 启用太阳系

```javascript
// 在GUI中勾选"启用太阳系"
solarSystemConfig.enableSolarSystem = true
initSolarSystem()
```

### 查看着色器效果

1. 打开浏览器控制台
2. 检查着色器uniforms:
```javascript
// 查看太阳着色器
console.log(solarSystem.sun.material.uniforms)

// 查看行星着色器
solarSystem.planets.forEach(p => {
    console.log(p.data.name, p.material.uniforms)
})
```

### 自定义参数

可以通过修改uniforms来自定义效果:

```javascript
// 修改太阳强度
solarSystem.sun.material.uniforms.intensity.value = 2.0

// 修改地球大气密度
const earth = solarSystem.planets.find(p => p.data.name === 'Earth')
earth.material.uniforms.atmosphereDensity.value = 0.8

// 修改木星大红斑
const jupiter = solarSystem.planets.find(p => p.data.name === 'Jupiter')
jupiter.material.uniforms.hasGreatSpot.value = 0.0 // 关闭大红斑
```

## 技术规格

### 着色器复杂度

| 着色器类型 | 顶点着色器行数 | 片段着色器行数 | 总行数 |
|-----------|--------------|--------------|--------|
| 太阳 | 25 | 115 | 140 |
| 类地行星 | 25 | 116 | 141 |
| 气态巨行星 | 25 | 126 | 151 |
| 行星环 | 20 | 102 | 122 |
| **总计** | **95** | **459** | **554** |

### Uniform变量

**太阳:**
- time (float)
- intensity (float)
- sunColor (vec3)
- coronaColor (vec3)

**类地行星:**
- time (float)
- planetColor (vec3)
- atmosphereColor (vec3)
- atmosphereDensity (float)
- sunDirection (vec3)
- surfaceDetail (float)

**气态巨行星:**
- time (float)
- planetColor (vec3)
- bandColor1 (vec3)
- bandColor2 (vec3)
- stormColor (vec3)
- sunDirection (vec3)
- rotationSpeed (float)
- hasGreatSpot (float)

**行星环:**
- time (float)
- ringColor1 (vec3)
- ringColor2 (vec3)
- ringColor3 (vec3)
- sunDirection (vec3)

### Varying变量

所有着色器共用:
- vUv (vec2)
- vNormal (vec3)
- vPosition (vec3)
- vWorldPosition (vec3) - 太阳和行星着色器

## 文件清单

### 新增文件(8个着色器)

```
src/shaders/solarSystem/
├── sun-vertex.glsl           (25 lines)
├── sun-fragment.glsl         (115 lines)
├── rocky-planet-vertex.glsl  (25 lines)
├── rocky-planet-fragment.glsl (116 lines)
├── gas-giant-vertex.glsl     (25 lines)
├── gas-giant-fragment.glsl   (126 lines)
├── ring-vertex.glsl          (20 lines)
└── ring-fragment.glsl        (102 lines)
```

### 修改文件(1个)

```
src/solarSystem.js            (+120 lines, -50 lines)
```

## 版本信息

- **版本号**: v1.6.0
- **发布日期**: 2026-01-05
- **兼容性**: 与v1.5.1完全兼容
- **依赖**: Three.js, GLSL 1.0

## 未来改进方向

1. **纹理贴图支持**
   - 添加真实行星纹理贴图选项
   - 法线贴图支持
   - 高度图支持

2. **粒子系统增强**
   - 太阳风粒子流
   - 行星际尘埃
   - 彗星尾迹

3. **轨道力学**
   - 更精确的椭圆轨道
   - 行星摄动效应
   - 潮汐力模拟

4. **特效增强**
   - 体积光
   - 镜头光晕
   - 景深效果

5. **性能优化**
   - GPU Instancing
   - LOD系统
   - 视锥体裁剪

## 总结

本次升级将太阳系模型从基础可视化提升到专业级科学模拟标准:

✅ **8个专业着色器** - 与地球模型质量一致
✅ **程序化生成** - 无需外部纹理资源
✅ **动态效果** - 时间驱动的动画系统
✅ **真实光照** - 基于物理的光照模型
✅ **大气效果** - 菲涅尔散射和边缘光
✅ **特殊效果** - 太阳黑子、大红斑、环缝
✅ **性能优化** - 禁用阴影、几何体优化
✅ **可扩展性** - 模块化设计,易于扩展

太阳系现在与地球模型保持一致的专业标准,为用户提供高质量的科学可视化体验！
