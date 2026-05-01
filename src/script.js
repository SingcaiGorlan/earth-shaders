import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import earthVertexShader from './shaders/earth/vertex.glsl'
import earthFragmentShader from './shaders/earth/fragment.glsl'
import { SatelliteOrbitManager } from './satelliteOrbit.js'
import { KSPGameSystem } from './kspGame.js'

/**
 * Load user configuration from launch page
 */
const userConfig = JSON.parse(localStorage.getItem('earthVizConfig') || '{}')
console.log('Loaded user configuration:', userConfig)

// Helper function to check if feature is enabled
function isFeatureEnabled(featureName, defaultValue = true) {
    if (Object.keys(userConfig).length === 0) return defaultValue
    return userConfig[featureName] !== false
}

// Get application mode
function getAppMode() {
    return userConfig.appMode || 'education' // Default to education mode
}

/**
 * Apply user configuration to show/hide features
 */
function applyUserConfig() {
    console.log('Applying user configuration...')
    
    const appMode = getAppMode()
    console.log(`Application mode: ${appMode}`)
    
    // Hide/show solar wind
    if (typeof solarWind !== 'undefined') {
        solarWind.visible = isFeatureEnabled('solarWind', appMode === 'research')
    }
    
    // Hide/show magnetosphere
    if (typeof magnetosphere !== 'undefined') {
        magnetosphere.visible = isFeatureEnabled('magnetosphere', appMode === 'research')
    }
    
    // Hide/show aurora
    if (typeof auroraNorth !== 'undefined') {
        auroraNorth.visible = isFeatureEnabled('aurora', appMode === 'education' || appMode === 'research')
        auroraSouth.visible = isFeatureEnabled('aurora', appMode === 'education' || appMode === 'research')
    }
    
    // Hide/show gravity field
    if (typeof gravityWellsGroup !== 'undefined') {
        gravityWellsGroup.visible = isFeatureEnabled('gravityField', appMode === 'research')
    }
    
    // Hide/show field lines
    if (typeof fieldLinesGroup !== 'undefined') {
        fieldLinesGroup.visible = isFeatureEnabled('gravityField', appMode === 'research')
    }
    
    // Hide/show gravity indicators
    if (typeof gravityIndicators !== 'undefined') {
        gravityIndicators.forEach(indicator => {
            indicator.visible = isFeatureEnabled('gravityField', appMode === 'research')
        })
    }
    
    // Hide/show Lagrange points
    if (typeof lagrangeGroup !== 'undefined') {
        lagrangeGroup.visible = isFeatureEnabled('lagrangePoints', appMode === 'research')
    }
    
    // Hide/show cyclones
    if (typeof cycloneGroup !== 'undefined') {
        cycloneGroup.visible = isFeatureEnabled('cyclones', appMode === 'education')
    }
    
    // Hide/show clouds
    if (typeof clouds !== 'undefined') {
        clouds.visible = isFeatureEnabled('clouds', true)
    }
    
    // Hide/show atmosphere
    if (typeof innerAtmosphere !== 'undefined') {
        innerAtmosphere.visible = isFeatureEnabled('atmosphere', true)
        outerAtmosphere.visible = isFeatureEnabled('atmosphere', true)
    }
    
    // Disable ocean waves if not enabled
    if (typeof earthMaterial !== 'undefined' && !isFeatureEnabled('oceanWaves', appMode === 'education')) {
        if (earthMaterial.uniforms.waveHeight) {
            earthMaterial.uniforms.waveHeight.value = 0
        }
    }
    
    console.log('Configuration applied successfully!')
}

/**
 * 创建卫星列表 UI
 */
function createSatelliteListUI() {
    const container = document.createElement('div')
    container.id = 'satellite-list-container'
    container.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 280px;
        max-height: 70vh;
        background: rgba(0, 0, 20, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 8px;
        color: #fff;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `

    // 标题
    const header = document.createElement('div')
    header.style.cssText = `
        padding: 12px 15px;
        border-bottom: 1px solid rgba(100, 150, 255, 0.3);
        font-weight: bold;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `
    header.innerHTML = `
        <span>🛰️ 卫星列表</span>
        <span id="satellite-count" style="font-size: 12px; color: #88aaff;">0 个卫星</span>
    `
    container.appendChild(header)

    // 列表容器
    const listContainer = document.createElement('div')
    listContainer.id = 'satellite-list'
    listContainer.style.cssText = `
        overflow-y: auto;
        flex: 1;
        padding: 5px;
    `
    container.appendChild(listContainer)

    document.body.appendChild(container)

    return { container, listContainer }
}

/**
 * 创建卫星信息弹窗
 */
function createSatelliteInfoPopup() {
    const popup = document.createElement('div')
    popup.id = 'satellite-info-popup'
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 80vh;
        background: rgba(0, 0, 30, 0.95);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(100, 150, 255, 0.4);
        border-radius: 12px;
        color: #fff;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        z-index: 2000;
        display: none;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
        overflow: hidden;
    `

    // 头部
    const header = document.createElement('div')
    header.style.cssText = `
        padding: 15px 20px;
        background: linear-gradient(135deg, rgba(50, 80, 150, 0.6), rgba(30, 50, 100, 0.6));
        border-bottom: 1px solid rgba(100, 150, 255, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
    `
    header.innerHTML = `
        <div>
            <div id="popup-title" style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">卫星信息</div>
            <div id="popup-subtitle" style="font-size: 11px; color: #88aaff;">Satellite Details</div>
        </div>
        <button id="popup-close" style="
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 5px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        ">关闭</button>
    `

    // 内容区域
    const content = document.createElement('div')
    content.id = 'popup-content'
    content.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: calc(80vh - 70px);
    `

    popup.appendChild(header)
    popup.appendChild(content)
    document.body.appendChild(popup)

    // 关闭按钮事件
    document.getElementById('popup-close').addEventListener('click', () => {
        popup.style.display = 'none'
    })

    // 点击背景关闭
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.style.display = 'none'
        }
    })

    return popup
}

/**
 * 更新卫星列表
 */
function updateSatelliteList(satellites, onSatelliteClick) {
    const listContainer = document.getElementById('satellite-list')
    const countElement = document.getElementById('satellite-count')
    
    if (!listContainer) return
    
    // 更新计数
    countElement.textContent = `${satellites.length} 个卫星`
    
    // 清空列表
    listContainer.innerHTML = ''
    
    // 添加卫星项
    satellites.forEach((sat, index) => {
        const item = document.createElement('div')
        item.style.cssText = `
            padding: 10px 12px;
            margin: 3px 0;
            background: rgba(50, 80, 150, 0.15);
            border: 1px solid rgba(100, 150, 255, 0.15);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
        `

        // 悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(50, 80, 150, 0.3)'
            item.style.border = '1px solid rgba(100, 150, 255, 0.4)'
            item.style.transform = 'translateX(3px)'
        })

        item.addEventListener('mouseleave', () => {
            item.style.background = 'rgba(50, 80, 150, 0.15)'
            item.style.border = '1px solid rgba(100, 150, 255, 0.15)'
            item.style.transform = 'translateX(0)'
        })

        // 点击事件
        item.addEventListener('click', () => {
            onSatelliteClick(sat, index)
        })

        // 卫星图标和名称
        item.innerHTML = `
            <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4a9eff;
                margin-right: 10px;
                box-shadow: 0 0 8px rgba(74, 158, 255, 0.6);
            "></div>
            <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 2px;">${sat.name || `Satellite ${index + 1}`}</div>
                <div style="font-size: 11px; color: #88aaff;">NORAD ID: ${sat.satrec.satnum || 'N/A'}</div>
            </div>
        `

        listContainer.appendChild(item)
    })
}

/**
 * 显示卫星信息弹窗
 */
function showSatelliteInfoPopup(satellite, orbitManager) {
    const popup = document.getElementById('satellite-info-popup')
    const titleElement = document.getElementById('popup-title')
    const subtitleElement = document.getElementById('popup-subtitle')
    const contentElement = document.getElementById('popup-content')
    
    if (!popup) return
    
    // 设置标题
    titleElement.textContent = satellite.name || 'Unknown Satellite'
    subtitleElement.textContent = `NORAD ID: ${satellite.satrec.satnum}`
    
    // 获取当前位置信息
    const simTime = orbitManager.getSimulationTime()
    const posInfo = orbitManager.getSatellitePositionWithGeo(satellite.satrec, simTime)
    
    if (!posInfo) {
        contentElement.innerHTML = '<div style="color: #ff6b6b; text-align: center; padding: 20px;">无法获取卫星位置</div>'
        popup.style.display = 'block'
        return
    }
    
    // 构建内容
    contentElement.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #88aaff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">📍 当前位置</div>
            <div style="background: rgba(50, 80, 150, 0.2); padding: 12px; border-radius: 6px; border: 1px solid rgba(100, 150, 255, 0.2);">
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">地理坐标:</span>
                    <span style="margin-left: 8px; font-weight: 500;">
                        经度 ${posInfo.geodetic.longitude.toFixed(4)}°, 纬度 ${posInfo.geodetic.latitude.toFixed(4)}°
                    </span>
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">高度:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${posInfo.geodetic.height.toFixed(2)} km</span>
                </div>
                <div>
                    <span style="color: #88aaff;">场景坐标:</span>
                    <span style="margin-left: 8px; font-family: monospace; font-size: 12px;">
                        (${posInfo.scenePosition.x.toFixed(4)}, ${posInfo.scenePosition.y.toFixed(4)}, ${posInfo.scenePosition.z.toFixed(4)})
                    </span>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #88aaff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">🛰️ 轨道参数</div>
            <div style="background: rgba(50, 80, 150, 0.2); padding: 12px; border-radius: 6px; border: 1px solid rgba(100, 150, 255, 0.2);">
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">偏心率:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${satellite.satrec.ecco.toFixed(6)}</span>
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">轨道倾角:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${(satellite.satrec.inclo * 180 / Math.PI).toFixed(4)}°</span>
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">近地点高度:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${(((satellite.satrec.a * (1 - satellite.satrec.ecco) - 1) * 6371)).toFixed(2)} km</span>
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">远地点高度:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${(((satellite.satrec.a * (1 + satellite.satrec.ecco) - 1) * 6371)).toFixed(2)} km</span>
                </div>
                <div>
                    <span style="color: #88aaff;">每日运行圈数:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${(satellite.satrec.no * 1440 / (2 * Math.PI)).toFixed(4)}</span>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #88aaff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">️ 时间信息</div>
            <div style="background: rgba(50, 80, 150, 0.2); padding: 12px; border-radius: 6px; border: 1px solid rgba(100, 150, 255, 0.2);">
                <div style="margin-bottom: 6px;">
                    <span style="color: #88aaff;">当前时间:</span>
                    <span style="margin-left: 8px; font-weight: 500; font-size: 12px;">${posInfo.time.toLocaleString()}</span>
                </div>
                <div>
                    <span style="color: #88aaff;">星历时间:</span>
                    <span style="margin-left: 8px; font-weight: 500; font-size: 12px;">${satellite.satrec.jdsatepoch.toFixed(6)}</span>
                </div>
            </div>
        </div>

        <div>
            <div style="font-size: 12px; color: #88aaff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">📡 TLE 数据</div>
            <div style="background: rgba(50, 80, 150, 0.2); padding: 12px; border-radius: 6px; border: 1px solid rgba(100, 150, 255, 0.2); font-family: monospace; font-size: 11px; line-height: 1.6;">
                <div>${satellite.line1}</div>
                <div>${satellite.line2}</div>
            </div>
        </div>
    `
    
    // 显示弹窗
    popup.style.display = 'block'
}

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Earth - NASA 真实数据
 */
const earthDayTexture = textureLoader.load('./earth/earth_day_4k.jpg')
earthDayTexture.colorSpace = THREE.SRGBColorSpace

const earthNightTexture = textureLoader.load('./earth/earth_night_4k.jpg')
earthNightTexture.colorSpace = THREE.SRGBColorSpace

const earthSpecularTexture = textureLoader.load('./earth/specularClouds.jpg')

const earthCloudsTexture = textureLoader.load('./earth/earth_clouds_4k.jpg')

// Create realistic cloud layer with animation
const cloudsGeometry = new THREE.SphereGeometry(2.05, 128, 128)
const cloudsVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const cloudsFragmentShader = `
    uniform sampler2D cloudsTexture;
    uniform vec3 sunDirection;
    uniform float time;
    uniform float cloudSpeed;
    uniform float cloudDensity;
    uniform float cloudBrightness;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex noise for cloud movement
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
        // Sample cloud texture
        vec2 cloudUV = vUv;
        
        // Add time-based movement (clouds rotate slowly)
        cloudUV.x += time * cloudSpeed * 0.02;
        
        vec4 cloudData = texture2D(cloudsTexture, cloudUV);
        float cloudMask = cloudData.r;
        
        // Enhance cloud contrast and detail
        cloudMask = pow(cloudMask, 1.2);
        cloudMask *= cloudDensity;
        
        // Add subtle noise for dynamic cloud movement
        float noise1 = snoise(vec3(vUv * 10.0, time * 0.1)) * 0.1;
        float noise2 = snoise(vec3(vUv * 20.0, time * 0.15)) * 0.05;
        cloudMask += noise1 + noise2;
        cloudMask = clamp(cloudMask, 0.0, 1.0);
        
        // Calculate lighting
        vec3 viewDirection = normalize(-vPosition);
        vec3 normal = normalize(vNormal);
        float lightIntensity = max(dot(normal, sunDirection), 0.0);
        
        // Cloud color based on lighting
        vec3 cloudShadowColor = vec3(0.4, 0.42, 0.48);   // Dark cloud base
        vec3 cloudMidColor = vec3(0.75, 0.78, 0.85);     // Mid-level clouds
        vec3 cloudHighlightColor = vec3(1.0, 1.0, 1.0);  // Sunlit tops
        
        // Multi-layer cloud coloring
        vec3 cloudColor = mix(
            mix(cloudShadowColor, cloudMidColor, smoothstep(0.0, 0.4, lightIntensity)),
            cloudHighlightColor,
            smoothstep(0.3, 0.8, lightIntensity)
        );
        
        // Apply brightness adjustment
        cloudColor *= cloudBrightness;
        
        // Cloud transparency based on density and lighting
        float cloudAlpha = cloudMask * (0.3 + lightIntensity * 0.7);
        
        gl_FragColor = vec4(cloudColor, cloudAlpha);
    }
`

const cloudsMaterial = new THREE.ShaderMaterial({
    vertexShader: cloudsVertexShader,
    fragmentShader: cloudsFragmentShader,
    uniforms: {
        cloudsTexture: { value: earthCloudsTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        time: { value: 0 },
        cloudSpeed: { value: 1.0 },
        cloudDensity: { value: 1.0 },
        cloudBrightness: { value: 1.0 }
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.NormalBlending
})

const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
scene.add(clouds)

// Create tropical cyclone (typhoon/hurricane) system
// Cyclones form in specific latitude bands (5-30 degrees from equator)
const cycloneGroup = new THREE.Group()
scene.add(cycloneGroup)

// Function to create a realistic cyclone texture procedurally
function createCycloneTexture(size = 512) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    
    const centerX = size / 2
    const centerY = size / 2
    const maxRadius = size / 2
    
    // Clear with transparent background
    ctx.clearRect(0, 0, size, size)
    
    // Create spiral arms (typical cyclone structure)
    const numArms = 4
    const armWidth = 30
    
    for (let arm = 0; arm < numArms; arm++) {
        const baseAngle = (arm / numArms) * Math.PI * 2
        
        for (let r = 20; r < maxRadius - 10; r += 2) {
            const angle = baseAngle + r * 0.015 // Spiral effect
            const x = centerX + Math.cos(angle) * r
            const y = centerY + Math.sin(angle) * r
            
            // Density decreases toward edges
            const density = 1.0 - (r / maxRadius)
            const alpha = density * 0.8
            
            // Cloud color (white to gray gradient)
            const brightness = 180 + density * 75
            ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness + 10}, ${alpha})`
            
            // Draw cloud segment
            ctx.beginPath()
            ctx.arc(x, y, armWidth * density * 0.6, 0, Math.PI * 2)
            ctx.fill()
        }
    }
    
    // Add eye of the storm (clear center)
    const eyeGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40)
    eyeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    eyeGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)')
    eyeGradient.addColorStop(1, 'rgba(200, 200, 210, 0.3)')
    
    ctx.fillStyle = eyeGradient
    ctx.fillRect(0, 0, size, size)
    
    // Add eyewall (intense cloud ring around eye)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(centerX, centerY, 35, 0, Math.PI * 2)
    ctx.stroke()
    
    // Add outer cloud bands
    for (let i = 0; i < 3; i++) {
        const radius = 100 + i * 60
        ctx.strokeStyle = `rgba(220, 220, 230, ${0.3 - i * 0.08})`
        ctx.lineWidth = 15 - i * 3
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    return texture
}

// Create multiple cyclones at realistic locations
const cyclones = []
const cycloneData = [
    { lat: 15, lon: 120, intensity: 1.0, rotationSpeed: 0.3, name: 'Pacific Typhoon' },   // Western Pacific
    { lat: -18, lon: 165, intensity: 0.8, rotationSpeed: 0.25, name: 'South Pacific Cyclone' }, // South Pacific
    { lat: 22, lon: -75, intensity: 0.9, rotationSpeed: 0.35, name: 'Atlantic Hurricane' }     // Atlantic
]

cycloneData.forEach((data, index) => {
    const cycloneGeometry = new THREE.SphereGeometry(2.06, 64, 64)
    const cycloneTexture = createCycloneTexture(512)
    
    const cycloneVertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `
    
    const cycloneFragmentShader = `
        uniform sampler2D cycloneTexture;
        uniform vec3 sunDirection;
        uniform float time;
        uniform float rotationSpeed;
        uniform float intensity;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            // Rotate the cyclone texture
            vec2 center = vec2(0.5, 0.5);
            vec2 rotatedUV = vUv - center;
            float angle = time * rotationSpeed;
            
            float cosA = cos(angle);
            float sinA = sin(angle);
            
            rotatedUV = vec2(
                rotatedUV.x * cosA - rotatedUV.y * sinA,
                rotatedUV.x * sinA + rotatedUV.y * cosA
            );
            rotatedUV += center;
            
            // Sample cyclone texture
            vec4 cycloneData = texture2D(cycloneTexture, rotatedUV);
            float cycloneMask = cycloneData.r * intensity;
            
            // Calculate lighting
            vec3 viewDirection = normalize(-vPosition);
            vec3 normal = normalize(vNormal);
            float lightIntensity = max(dot(normal, sunDirection), 0.0);
            
            // Cyclone cloud coloring
            vec3 cycloneShadowColor = vec3(0.6, 0.62, 0.68);
            vec3 cycloneMidColor = vec3(0.85, 0.87, 0.92);
            vec3 cycloneHighlightColor = vec3(1.0, 1.0, 1.0);
            
            vec3 cycloneColor = mix(
                mix(cycloneShadowColor, cycloneMidColor, smoothstep(0.0, 0.4, lightIntensity)),
                cycloneHighlightColor,
                smoothstep(0.3, 0.8, lightIntensity)
            );
            
            // Apply intensity and opacity
            float finalAlpha = cycloneMask * opacity * (0.4 + lightIntensity * 0.6);
            
            gl_FragColor = vec4(cycloneColor, finalAlpha);
        }
    `
    
    const cycloneMaterial = new THREE.ShaderMaterial({
        vertexShader: cycloneVertexShader,
        fragmentShader: cycloneFragmentShader,
        uniforms: {
            cycloneTexture: { value: cycloneTexture },
            sunDirection: { value: new THREE.Vector3(1, 0, 0) },
            time: { value: 0 },
            rotationSpeed: { value: data.rotationSpeed },
            intensity: { value: data.intensity },
            opacity: { value: 0.8 }
        },
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
        blending: THREE.NormalBlending
    })
    
    const cyclone = new THREE.Mesh(cycloneGeometry, cycloneMaterial)
    
    // Position cyclone at realistic latitude/longitude
    const latRad = THREE.MathUtils.degToRad(data.lat)
    const lonRad = THREE.MathUtils.degToRad(data.lon)
    const radius = 2.06
    
    cyclone.position.x = radius * Math.cos(latRad) * Math.cos(lonRad)
    cyclone.position.y = radius * Math.sin(latRad)
    cyclone.position.z = radius * Math.cos(latRad) * Math.sin(lonRad)
    
    // Scale based on intensity (larger = more intense)
    const scale = 0.15 + data.intensity * 0.1
    cyclone.scale.set(scale, scale, scale)
    
    cyclone.userData = { ...data, material: cycloneMaterial }
    cycloneGroup.add(cyclone)
    cyclones.push(cyclone)
})

const earthMaterial = new THREE.ShaderMaterial({
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    uniforms:
    {
        dayTexture: { value: earthDayTexture },
        nightTexture: { value: earthNightTexture },
        specularTexture: { value: earthSpecularTexture },
        cloudsTexture: { value: earthCloudsTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        oceanColorIntensity: { value: 0.2 },
        time: { value: 0 },
        waveHeight: { value: 1.0 },
        waveSpeed: { value: 1.0 }
    },
    toneMapped: true
})

// GUI
const earthFolder = gui.addFolder('Earth')
earthFolder.add(earthMaterial.uniforms.oceanColorIntensity, 'value', 0, 1).name('Ocean Color Intensity')

// Ocean wave controls
const oceanConfig = {
    waveHeight: 1.0,
    waveSpeed: 1.0,
    waveAnimation: true
}

const oceanFolder = gui.addFolder('Ocean Waves')
oceanFolder.add(oceanConfig, 'waveHeight', 0, 3).name('Wave Height').onChange((value) => {
    earthMaterial.uniforms.waveHeight.value = value
})

oceanFolder.add(oceanConfig, 'waveSpeed', 0, 5).name('Wave Speed').onChange((value) => {
    earthMaterial.uniforms.waveSpeed.value = value
})

oceanFolder.add(oceanConfig, 'waveAnimation').name('Animate Waves')

// Cloud layer controls
const cloudConfig = {
    cloudSpeed: 1.0,
    cloudDensity: 1.0,
    cloudBrightness: 1.0,
    cloudVisibility: true
}

const cloudFolder = gui.addFolder('Cloud Layer')
cloudFolder.add(cloudConfig, 'cloudSpeed', 0, 5).name('Cloud Rotation Speed').onChange((value) => {
    cloudsMaterial.uniforms.cloudSpeed.value = value
})

cloudFolder.add(cloudConfig, 'cloudDensity', 0, 2).name('Cloud Density').onChange((value) => {
    cloudsMaterial.uniforms.cloudDensity.value = value
})

cloudFolder.add(cloudConfig, 'cloudBrightness', 0.5, 2).name('Cloud Brightness').onChange((value) => {
    cloudsMaterial.uniforms.cloudBrightness.value = value
})

cloudFolder.add(cloudConfig, 'cloudVisibility').name('Show Clouds').onChange((value) => {
    clouds.visible = value
})

// Tropical Cyclone (Typhoon/Hurricane) controls
const cycloneConfig = {
    cycloneVisibility: true,
    globalIntensity: 1.0,
    globalRotationSpeed: 1.0,
    cycloneOpacity: 0.8
}

const cycloneFolder = gui.addFolder('Tropical Cyclones')
cycloneFolder.add(cycloneConfig, 'cycloneVisibility').name('Show Cyclones').onChange((value) => {
    cycloneGroup.visible = value
})

cycloneFolder.add(cycloneConfig, 'globalIntensity', 0, 2).name('Global Intensity').onChange((value) => {
    cyclones.forEach((cyclone) => {
        cyclone.userData.material.uniforms.intensity.value = cyclone.userData.intensity * value
    })
})

cycloneFolder.add(cycloneConfig, 'globalRotationSpeed', 0, 3).name('Rotation Speed Multiplier').onChange((value) => {
    cyclones.forEach((cyclone) => {
        cyclone.userData.material.uniforms.rotationSpeed.value = cyclone.userData.rotationSpeed * value
    })
})

cycloneFolder.add(cycloneConfig, 'cycloneOpacity', 0.3, 1.0).name('Cyclone Opacity').onChange((value) => {
    cyclones.forEach((cyclone) => {
        cyclone.userData.material.uniforms.opacity.value = value
    })
})

// Solar Wind and Magnetosphere controls
const spaceWeatherConfig = {
    solarWindVisibility: true,
    solarWindIntensity: 1.0,
    magnetosphereVisibility: true,
    magnetosphereIntensity: 0.4,
    auroraVisibility: true,
    auroraIntensity: 0.6
}

const spaceWeatherFolder = gui.addFolder('Space Weather')
spaceWeatherFolder.add(spaceWeatherConfig, 'solarWindVisibility').name('Show Solar Wind').onChange((value) => {
    solarWind.visible = value
})

spaceWeatherFolder.add(spaceWeatherConfig, 'solarWindIntensity', 0, 2).name('Solar Wind Intensity').onChange((value) => {
    // Adjust particle opacity
    const sizes = solarWindGeometry.attributes.opacity.array
    for (let i = 0; i < sizes.length; i++) {
        sizes[i] = (0.3 + Math.random() * 0.4) * value
    }
    solarWindGeometry.attributes.opacity.needsUpdate = true
})

spaceWeatherFolder.add(spaceWeatherConfig, 'magnetosphereVisibility').name('Show Magnetosphere').onChange((value) => {
    magnetosphere.visible = value
})

spaceWeatherFolder.add(spaceWeatherConfig, 'magnetosphereIntensity', 0, 1).name('Magnetosphere Intensity').onChange((value) => {
    // This would require shader modification, simplified here
    magnetosphereMaterial.transparent = value > 0
})

spaceWeatherFolder.add(spaceWeatherConfig, 'auroraVisibility').name('Show Aurora').onChange((value) => {
    auroraNorth.visible = value
    auroraSouth.visible = value
})

spaceWeatherFolder.add(spaceWeatherConfig, 'auroraIntensity', 0.3, 1.0).name('Aurora Intensity')

// Gravitational Field controls
const gravityConfig = {
    gravityWellsVisibility: true,
    fieldLinesVisibility: true,
    indicatorsVisibility: true,
    lagrangePointsVisibility: true,
    globalOpacity: 1.0
}

const gravityFolder = gui.addFolder('Gravitational Field')
gravityFolder.add(gravityConfig, 'gravityWellsVisibility').name('Show Potential Wells').onChange((value) => {
    gravityWellsGroup.visible = value
})

gravityFolder.add(gravityConfig, 'fieldLinesVisibility').name('Show Field Lines').onChange((value) => {
    fieldLinesGroup.visible = value
})

gravityFolder.add(gravityConfig, 'indicatorsVisibility').name('Show Gravity Indicators').onChange((value) => {
    gravityIndicators.forEach(indicator => {
        indicator.visible = value
    })
})

gravityFolder.add(gravityConfig, 'lagrangePointsVisibility').name('Show Lagrange Points').onChange((value) => {
    lagrangeGroup.visible = value
})

gravityFolder.add(gravityConfig, 'globalOpacity', 0.2, 1.0).name('Global Opacity').onChange((value) => {
    // Update all gravity visualization elements
    gravityWellsGroup.children.forEach(well => {
        well.userData.material.uniforms.opacity.value = well.userData.opacity * value
    })
    
    fieldLinesGroup.children.forEach(line => {
        line.material.opacity = 0.3 * value
    })
    
    gravityIndicators.forEach(indicator => {
        indicator.material.opacity = 0.8 * value
    })
})

// Earth appearance controls
const earthConfig = {
    innerAtmosphereIntensity: 0.7,
    outerAtmosphereIntensity: 0.35,
    atmospherePulse: true
}

earthFolder.add(earthConfig, 'innerAtmosphereIntensity', 0, 1).name('Inner Atmosphere').onChange((value) => {
    // Adjust opacity by modifying the shader's alpha output
    // Since we're using additive blending, we can adjust the color intensity
    innerAtmosphereMaterial.transparent = true
})

earthFolder.add(earthConfig, 'outerAtmosphereIntensity', 0, 1).name('Outer Atmosphere').onChange((value) => {
    outerAtmosphereMaterial.transparent = true
})

earthFolder.add(earthConfig, 'atmospherePulse').name('Atmosphere Pulse')

/**
 * Satellite Orbits
 */
const orbitManager = new SatelliteOrbitManager(scene, 2)

// 初始化卫星列表 UI
const satelliteListUI = createSatelliteListUI()
const satelliteInfoPopup = createSatelliteInfoPopup()

// 卫星点击回调
const onSatelliteClick = (satellite, index) => {
    console.log(`点击了卫星: ${satellite.name}`)
    showSatelliteInfoPopup(satellite, orbitManager)
    
    // 可选：聚焦到该卫星
    if (satellite.mesh) {
        const satPos = satellite.mesh.position
        controls.target.lerp(satPos, 0.5)
    }
}

// 测试：计算 ISS 未来 24 小时位置序列
let testPositions = null

// 卫星轨道控制面板
const satelliteFolder = gui.addFolder('Satellites')
const satelliteConfig = {
    loadISS: () => {
        try {
            orbitManager.clearAll()
            orbitManager.addISS()
            console.log('已加载 ISS')
            updateSatelliteList(orbitManager.satellites, onSatelliteClick)
        } catch (error) {
            console.error('加载 ISS 失败:', error)
        }
    },
    loadGPS: () => {
        try {
            orbitManager.clearAll()
            orbitManager.addGPSSatellite()
            console.log('已加载 GPS')
            updateSatelliteList(orbitManager.satellites, onSatelliteClick)
        } catch (error) {
            console.error('加载 GPS 失败:', error)
        }
    },
    calculateISSPositions: () => {
        // 获取 ISS 的 satrec（如果已加载）
        if (orbitManager.satellites.length === 0) {
            console.warn('请先加载 ISS')
            return
        }
        
        const issSatrec = orbitManager.satellites[0].satrec
        const startTime = performance.now()
        
        // 计算未来 24 小时，每分钟一个点
        testPositions = orbitManager.calculateFuturePositions(
            issSatrec,
            24,  // 24 小时
            1,   // 每分钟一个点
            new Date()
        )
        
        const endTime = performance.now()
        console.log(`计算耗时: ${((endTime - startTime) / 1000).toFixed(2)}s`)
        
        // 打印前 5 个和后 5 个位置
        console.log('\n前 5 个位置:')
        testPositions.slice(0, 5).forEach((pos, i) => {
            console.log(`${i + 1}. ${pos.time.toLocaleString()} - x: ${pos.position.x.toFixed(4)}, y: ${pos.position.y.toFixed(4)}, z: ${pos.position.z.toFixed(4)}`)
        })
        
        console.log('\n后 5 个位置:')
        testPositions.slice(-5).forEach((pos, i) => {
            const idx = testPositions.length - 5 + i + 1
            console.log(`${idx}. ${pos.time.toLocaleString()} - x: ${pos.position.x.toFixed(4)}, y: ${pos.position.y.toFixed(4)}, z: ${pos.position.z.toFixed(4)}`)
        })
    },
    testGeoPosition: () => {
        // 测试获取包含地理坐标的完整位置信息
        if (orbitManager.satellites.length === 0) {
            console.warn('请先加载 ISS')
            return
        }
        
        const issSatrec = orbitManager.satellites[0].satrec
        const now = new Date()
        
        const posInfo = orbitManager.getSatellitePositionWithGeo(issSatrec, now)
        
        console.log('\n卫星当前位置信息:')
        console.log(`时间: ${posInfo.time.toLocaleString()}`)
        console.log(`场景坐标: x=${posInfo.scenePosition.x.toFixed(4)}, y=${posInfo.scenePosition.y.toFixed(4)}, z=${posInfo.scenePosition.z.toFixed(4)}`)
        console.log(`地理坐标: 经度=${posInfo.geodetic.longitude.toFixed(2)}°, 纬度=${posInfo.geodetic.latitude.toFixed(2)}°, 高度=${posInfo.geodetic.height.toFixed(2)} km`)
        console.log(`ECI 坐标: x=${posInfo.eciPosition.x.toFixed(2)}, y=${posInfo.eciPosition.y.toFixed(2)}, z=${posInfo.eciPosition.z.toFixed(2)} km`)
    },
    debugCoordinates: () => {
        // 调试坐标转换
        if (orbitManager.satellites.length === 0) {
            console.warn('请先加载 ISS')
            return
        }
        
        const issSatrec = orbitManager.satellites[0].satrec
        const debug = orbitManager.debugCoordinateTransform(issSatrec, new Date())
        
        console.log('\n坐标转换调试信息:')
        console.log('=== ECI 坐标系 (地心惯性坐标系) ===')
        console.log(`  X: ${debug.eci.x.toFixed(2)} km (指向春分点)`)
        console.log(`  Y: ${debug.eci.y.toFixed(2)} km (赤道平面)`)
        console.log(`  Z: ${debug.eci.z.toFixed(2)} km (指向北极)`)
        console.log('\n=== Three.js 世界坐标系 ===')
        console.log(`  X: ${debug.world.x.toFixed(4)} (向右)`)
        console.log(`  Y: ${debug.world.y.toFixed(4)} (向上)`)
        console.log(`  Z: ${debug.world.z.toFixed(4)} (向前)`)
        console.log('\n=== 转换参数 ===')
        console.log(`  地球半径: ${debug.earthRadiusKm} km`)
        console.log(`  场景地球半径: ${debug.earthRadiusScene} units`)
        console.log(`  缩放比例: ${debug.scale}`)
        console.log('\n=== 验证 (world -> ECI 反向转换) ===')
        console.log(`  X 匹配: ${debug.verification.eciXMatch}`)
        console.log(`  Y 匹配: ${debug.verification.eciYMatch}`)
        console.log(`  Z 匹配: ${debug.verification.eciZMatch}`)
    },
    skipForward1Hour: () => {
        orbitManager.skipHours(1)
    },
    skipBackward1Hour: () => {
        orbitManager.skipHours(-1)
    },
    resetTime: () => {
        orbitManager.setTimeOffset(0)
        console.log('时间已重置为当前系统时间')
    },
    setTimeScale2x: () => {
        orbitManager.setTimeScale(2)
    },
    setTimeScale05x: () => {
        orbitManager.setTimeScale(0.5)
    },
    loadISSWithModel: async () => {
        orbitManager.clearAll()
        
        // 加载 TLE
        const issTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00012345  00000-0  23456-3 0  9999
2 25544  51.6400 120.5000 0005432  80.1234 279.9876 15.49560000123456`
        
        const iss = orbitManager.parseTLE(issTLE)
        if (iss) {
            // 使用程序化 ISS 模型
            await orbitManager.addSatelliteWithModel(iss, {
                modelPath: 'procedural:iss',  // 使用程序化 ISS 模型
                modelName: 'ISS',
                modelScale: 0.5,
                orbitColor: '#ff0000',
                orbitPeriod: 92.68
            })
            updateSatelliteList(orbitManager.satellites, onSatelliteClick)
        }
    },
    loadSimpleSatellite: async () => {
        orbitManager.clearAll()
        
        // 加载 TLE
        const issTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00012345  00000-0  23456-3 0  9999
2 25544  51.6400 120.5000 0005432  80.1234 279.9876 15.49560000123456`
        
        const iss = orbitManager.parseTLE(issTLE)
        if (iss) {
            // 使用简单的卫星模型
            await orbitManager.addSatelliteWithModel(iss, {
                modelPath: 'procedural:simple',  // 使用简单卫星模型
                modelName: 'SimpleSat',
                modelScale: 1.0,
                orbitColor: '#00ff00',
                orbitPeriod: 92.68
            })
            updateSatelliteList(orbitManager.satellites, onSatelliteClick)
        }
    },
    updatePositions: true
}

// 时间控制文件夹
const timeFolder = gui.addFolder('Time Control')
const timeConfig = {
    currentTime: new Date().toLocaleString(),
    timeOffset: 0,
    timeScale: 1
}

timeFolder.add(timeConfig, 'currentTime').name('当前时间').disable()
timeFolder.add(timeConfig, 'timeOffset').name('时间偏移 (秒)').min(-86400).max(86400).step(3600)
    .onChange((value) => {
        orbitManager.setTimeOffset(value)
    })
timeFolder.add(timeConfig, 'timeScale').name('时间缩放').min(0.1).max(10).step(0.1)
    .onChange((value) => {
        orbitManager.setTimeScale(value)
    })

timeFolder.add(satelliteConfig, 'skipForward1Hour').name('快进 1 小时')
timeFolder.add(satelliteConfig, 'skipBackward1Hour').name('快退 1 小时')
timeFolder.add(satelliteConfig, 'resetTime').name('重置时间')
timeFolder.add(satelliteConfig, 'setTimeScale2x').name('2 倍速')
timeFolder.add(satelliteConfig, 'setTimeScale05x').name('0.5 倍速')

satelliteFolder.add(satelliteConfig, 'loadISS').name('加载 ISS')
satelliteFolder.add(satelliteConfig, 'loadGPS').name('加载 GPS')
satelliteFolder.add(satelliteConfig, 'loadISSWithModel').name('加载 ISS (3D模型)')
satelliteFolder.add(satelliteConfig, 'loadSimpleSatellite').name('加载简单卫星模型')
satelliteFolder.add(satelliteConfig, 'calculateISSPositions').name('计算 ISS 24h 位置')
satelliteFolder.add(satelliteConfig, 'testGeoPosition').name('测试地理坐标')
satelliteFolder.add(satelliteConfig, 'debugCoordinates').name('调试坐标转换')
satelliteFolder.add(satelliteConfig, 'updatePositions').name('实时更新位置')

// Mesh
const earthGeometry = new THREE.SphereGeometry(2, 64, 64)
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
scene.add(earth)

// Create Gravitational Field Visualization
// Based on real physics: F = G*M*m/r^2, gravitational potential V = -GM/r

// Physical constants (scaled for visualization)
const EARTH_MASS = 5.972e24 // kg (real value)
const GRAVITATIONAL_CONSTANT = 6.674e-11 // N⋅m²/kg² (real value)
const EARTH_RADIUS_REAL = 6371 // km (real value)
const SCENE_SCALE = 2 / EARTH_RADIUS_REAL // Scene units per km

// 1. Gravitational Potential Wells (Equipotential surfaces)
const gravityWellsGroup = new THREE.Group()
scene.add(gravityWellsGroup)

// Create multiple equipotential surfaces at different distances
const potentialLevels = [
    { radius: 2.5, color: 0xff0000, opacity: 0.15, name: 'Low Orbit' },      // ~3185 km altitude
    { radius: 3.5, color: 0xff6600, opacity: 0.12, name: 'Medium Orbit' },   // ~9556 km altitude
    { radius: 5.0, color: 0xffff00, opacity: 0.10, name: 'High Orbit' },     // ~19113 km altitude
    { radius: 7.5, color: 0x00ff00, opacity: 0.08, name: 'GPS Orbit' },      // ~35038 km altitude (GPS satellites)
    { radius: 11.0, color: 0x00ffff, opacity: 0.06, name: 'GEO Orbit' }      // ~63710 km altitude (Geostationary)
]

potentialLevels.forEach((level) => {
    const wellGeometry = new THREE.SphereGeometry(level.radius, 64, 64)
    const wellMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float opacity;
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vec3 viewDirection = normalize(-vPosition);
                vec3 normal = normalize(vNormal);
                
                // Fresnel effect for better visibility
                float fresnel = pow(1.0 - abs(dot(viewDirection, normal)), 2.0);
                
                // Pulsing animation
                float pulse = sin(time * 1.5) * 0.1 + 0.9;
                
                float alpha = fresnel * opacity * pulse;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        uniforms: {
            color: { value: new THREE.Color(level.color) },
            opacity: { value: level.opacity },
            time: { value: 0 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
    
    const well = new THREE.Mesh(wellGeometry, wellMaterial)
    well.userData = { ...level, material: wellMaterial }
    gravityWellsGroup.add(well)
})

// 2. Gravitational Field Lines (Radial lines showing field direction)
const fieldLinesGroup = new THREE.Group()
scene.add(fieldLinesGroup)

const numFieldLines = 48
const fieldLineLength = 8

for (let i = 0; i < numFieldLines; i++) {
    // Distribute lines evenly on sphere surface
    const phi = Math.acos(1 - 2 * (i + 0.5) / numFieldLines)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i // Golden angle distribution
    
    const startX = 2.0 * Math.sin(phi) * Math.cos(theta)
    const startY = 2.0 * Math.cos(phi)
    const startZ = 2.0 * Math.sin(phi) * Math.sin(theta)
    
    const endX = fieldLineLength * Math.sin(phi) * Math.cos(theta)
    const endY = fieldLineLength * Math.cos(phi)
    const endZ = fieldLineLength * Math.sin(phi) * Math.sin(theta)
    
    // Create line geometry
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(endX, endY, endZ)
    ])
    
    // Gradient color based on distance (stronger near Earth)
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x8888ff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    })
    
    const fieldLine = new THREE.Line(lineGeometry, lineMaterial)
    fieldLinesGroup.add(fieldLine)
}

// 3. Gravity Strength Indicator (Color-coded spheres showing field strength)
const gravityIndicatorGeometry = new THREE.SphereGeometry(0.08, 16, 16)
const gravityIndicators = []

// Place indicators at various distances to show gravity variation
const indicatorDistances = [2.2, 2.5, 3.0, 4.0, 5.0, 6.5, 8.0, 10.0]

indicatorDistances.forEach((distance, index) => {
    // Calculate relative gravity strength: g ∝ 1/r²
    const relativeGravity = Math.pow(2.0 / distance, 2)
    
    // Color from red (strong) to blue (weak)
    const color = new THREE.Color()
    color.setHSL(0.0 + (1.0 - relativeGravity) * 0.6, 1.0, 0.5)
    
    const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    })
    
    // Place indicators in a ring around equator
    const angle = (index / indicatorDistances.length) * Math.PI * 2
    const indicator = new THREE.Mesh(gravityIndicatorGeometry, indicatorMaterial)
    indicator.position.set(
        distance * Math.cos(angle),
        0,
        distance * Math.sin(angle)
    )
    
    indicator.userData = {
        distance: distance,
        relativeGravity: relativeGravity,
        material: indicatorMaterial
    }
    
    scene.add(indicator)
    gravityIndicators.push(indicator)
})

// 4. Lagrange Points Visualization (Earth-Moon system)
// L1-L5 points where gravitational forces balance
const lagrangeGroup = new THREE.Group()
scene.add(lagrangeGroup)

// Simplified Earth-Moon distance for visualization
const moonDistance = 30 // From earlier moon setup
const lagrangePoints = [
    { name: 'L1', x: moonDistance * 0.85, y: 0, z: 0, color: 0xff0000 }, // Between Earth and Moon
    { name: 'L2', x: moonDistance * 1.15, y: 0, z: 0, color: 0xff6600 }, // Beyond Moon
    { name: 'L3', x: -moonDistance, y: 0, z: 0, color: 0xffff00 },       // Opposite side
    { name: 'L4', x: moonDistance * 0.5, y: moonDistance * 0.866, z: 0, color: 0x00ff00 }, // 60° ahead
    { name: 'L5', x: moonDistance * 0.5, y: -moonDistance * 0.866, z: 0, color: 0x0000ff } // 60° behind
]

lagrangePoints.forEach((point) => {
    const pointGeometry = new THREE.SphereGeometry(0.15, 16, 16)
    const pointMaterial = new THREE.MeshBasicMaterial({
        color: point.color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    })
    
    const lagrangePoint = new THREE.Mesh(pointGeometry, pointMaterial)
    lagrangePoint.position.set(point.x, point.y, point.z)
    lagrangePoint.userData = { ...point, material: pointMaterial }
    
    // Add pulsing animation
    lagrangePoint.userData.baseScale = 1.0
    
    lagrangeGroup.add(lagrangePoint)
})

// Earth atmosphere glow effect - Multi-layer atmosphere
// Inner atmosphere layer (dense, blue)
const innerAtmosphereGeometry = new THREE.SphereGeometry(2.08, 64, 64)
const innerAtmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const innerAtmosphereFragmentShader = `
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec3 viewDirection = normalize(-vPosition);
        vec3 normal = normalize(vNormal);
        
        // Strong Fresnel effect for dense atmosphere
        float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 5.0);
        
        // Deep blue atmosphere color
        vec3 atmosphereColor = vec3(0.2, 0.5, 1.0);
        
        // Light intensity from sun
        float lightIntensity = max(dot(normal, sunDirection), 0.0);
        
        // Combine effects with strong day emphasis
        float atmosphereIntensity = fresnel * (0.4 + lightIntensity * 0.6);
        
        vec3 finalColor = atmosphereColor * atmosphereIntensity;
        
        gl_FragColor = vec4(finalColor, atmosphereIntensity * 0.7);
    }
`

const innerAtmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: innerAtmosphereVertexShader,
    fragmentShader: innerAtmosphereFragmentShader,
    uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
    },
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

const innerAtmosphere = new THREE.Mesh(innerAtmosphereGeometry, innerAtmosphereMaterial)
scene.add(innerAtmosphere)

// Outer atmosphere layer (thin, cyan/white haze)
const outerAtmosphereGeometry = new THREE.SphereGeometry(2.25, 64, 64)
const outerAtmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const outerAtmosphereFragmentShader = `
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec3 viewDirection = normalize(-vPosition);
        vec3 normal = normalize(vNormal);
        
        // Very strong Fresnel for thin outer haze
        float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 6.5);
        
        // Cyan-white haze color
        vec3 hazeColor = vec3(0.5, 0.8, 1.0);
        
        // Light intensity
        float lightIntensity = max(dot(normal, sunDirection), 0.0);
        
        // Subtle illumination
        float hazeIntensity = fresnel * (0.2 + lightIntensity * 0.3);
        
        vec3 finalColor = hazeColor * hazeIntensity;
        
        gl_FragColor = vec4(finalColor, hazeIntensity * 0.35);
    }
`

const outerAtmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: outerAtmosphereVertexShader,
    fragmentShader: outerAtmosphereFragmentShader,
    uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
    },
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

const outerAtmosphere = new THREE.Mesh(outerAtmosphereGeometry, outerAtmosphereMaterial)
scene.add(outerAtmosphere)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 1000)
camera.position.x = 12
camera.position.y = 5
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Sun and Moon - Realistic proportions scaled for visualization
 */
// Create sun with realistic size relative to Earth
// In reality: Sun radius is about 109 times Earth's radius
// For visualization: We'll use a scaled version that shows the relationship
const sunGeometry = new THREE.SphereGeometry(20, 64, 64)

// Create custom shader material for realistic sun surface
const sunVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const sunFragmentShader = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    // FBM (Fractal Brownian Motion) for more complex patterns
    float fbm(vec3 p) {
        float total = 0.0;
        float amplitude = 1.0;
        float frequency = 1.0;
        
        for (int i = 0; i < 5; i++) {
            total += snoise(p * frequency) * amplitude;
            frequency *= 2.0;
            amplitude *= 0.5;
        }
        return total;
    }
    
    void main() {
        // Multi-scale solar surface details
        float largeScale = fbm(vPosition * 0.05 + time * 0.05);
        float mediumScale = fbm(vPosition * 0.15 - time * 0.1) * 0.6;
        float smallScale = fbm(vPosition * 0.4 + time * 0.2) * 0.3;
        float fineDetail = snoise(vPosition * 1.2 - time * 0.3) * 0.15;
        
        float combinedNoise = largeScale + mediumScale + smallScale + fineDetail;
        
        // Solar limb darkening (edges are darker)
        float limbDarkening = 1.0 - 0.6 * pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        
        // Solar flare bright spots
        float flareNoise = snoise(vPosition * 0.8 + time * 0.4);
        float flareIntensity = smoothstep(0.4, 0.8, flareNoise) * smoothstep(0.0, 0.3, largeScale);
        
        // Sunspot regions (darker areas)
        float sunspotNoise = snoise(vPosition * 0.12 + time * 0.08);
        float sunspotMask = smoothstep(-0.8, -0.4, sunspotNoise) * (1.0 - smoothstep(0.0, 0.3, largeScale));
        
        // Solar color palette based on real sun temperatures
        vec3 veryHotCore = vec3(1.0, 1.0, 0.95);     // 5800K - Bright white
        vec3 hotCore = vec3(1.0, 0.95, 0.75);        // 5500K - Yellowish white
        vec3 surfaceColor = vec3(1.0, 0.75, 0.3);    // 5000K - Golden yellow
        vec3 coolerRegion = vec3(1.0, 0.55, 0.15);   // 4500K - Orange
        vec3 sunspotColor = vec3(0.7, 0.25, 0.05);   // 3800K - Dark brown-red
        vec3 flareColor = vec3(1.0, 0.85, 0.5);      // Flare bright spots
        
        // Layer color mixing
        float intensity = smoothstep(-0.6, 0.9, combinedNoise);
        vec3 color = mix(coolerRegion, surfaceColor, intensity);
        color = mix(color, hotCore, smoothstep(0.2, 0.9, intensity));
        color = mix(color, veryHotCore, smoothstep(0.6, 1.0, intensity) * 0.5);
        
        // Apply sunspots
        color = mix(color, sunspotColor, sunspotMask * 0.7);
        
        // Apply solar flares
        color = mix(color, flareColor, flareIntensity * 0.6);
        
        // Apply limb darkening
        color *= limbDarkening;
        
        // Add brightness variation with dynamic range
        float brightness = 1.0 + combinedNoise * 0.4 + flareIntensity * 0.5;
        color *= brightness;
        
        // Subtle edge glow (chromosphere effect)
        float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        color += vec3(1.0, 0.5, 0.2) * edgeGlow * 0.15;
        
        gl_FragColor = vec4(color, 1.0);
    }
`

const sunMaterial = new THREE.ShaderMaterial({
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    uniforms: {
        time: { value: 0 }
    }
})

const sun = new THREE.Mesh(sunGeometry, sunMaterial)
sun.position.set(150, 0, 0)
scene.add(sun)

// Create Solar Wind and Earth's Magnetosphere System
// Based on real physics: solar wind interacts with Earth's magnetic field

// 1. Solar Wind Particle Stream (from Sun to Earth)
const solarWindGeometry = new THREE.BufferGeometry()
const solarWindCount = 2000
const solarWindPositions = new Float32Array(solarWindCount * 3)
const solarWindSizes = new Float32Array(solarWindCount)
const solarWindOpacities = new Float32Array(solarWindCount)

for (let i = 0; i < solarWindCount; i++) {
    // Particles flow from Sun towards Earth
    const t = Math.random() // Progress from Sun (0) to beyond Earth (1)
    const progress = t * 1.2 // Extend beyond Earth
    
    // Start from Sun position
    const startX = 130 // Slightly before Sun
    const endX = -20   // Beyond Earth
    
    const x = startX + (endX - startX) * progress
    
    // Spread increases with distance
    const spread = 5 + progress * 15
    const y = (Math.random() - 0.5) * spread
    const z = (Math.random() - 0.5) * spread
    
    solarWindPositions[i * 3] = x
    solarWindPositions[i * 3 + 1] = y
    solarWindPositions[i * 3 + 2] = z
    
    solarWindSizes[i] = 0.3 + Math.random() * 0.5
    solarWindOpacities[i] = 0.3 + Math.random() * 0.4
}

solarWindGeometry.setAttribute('position', new THREE.BufferAttribute(solarWindPositions, 3))
solarWindGeometry.setAttribute('size', new THREE.BufferAttribute(solarWindSizes, 1))
solarWindGeometry.setAttribute('opacity', new THREE.BufferAttribute(solarWindOpacities, 1))

const solarWindVertexShader = `
    attribute float size;
    attribute float opacity;
    varying float vOpacity;
    uniform float time;
    
    void main() {
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Animate particles flowing toward Earth
        vec3 animatedPos = position;
        animatedPos.x += mod(time * 20.0, 150.0) - 75.0;
        
        mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`

const solarWindFragmentShader = `
    varying float vOpacity;
    
    void main() {
        // Circular particle
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        
        // Soft edge
        float alpha = (1.0 - dist * 2.0) * vOpacity;
        
        // Solar wind color (yellowish-white)
        vec3 color = vec3(1.0, 0.95, 0.7);
        
        gl_FragColor = vec4(color, alpha * 0.6);
    }
`

const solarWindMaterial = new THREE.ShaderMaterial({
    vertexShader: solarWindVertexShader,
    fragmentShader: solarWindFragmentShader,
    uniforms: {
        time: { value: 0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
})

const solarWind = new THREE.Points(solarWindGeometry, solarWindMaterial)
scene.add(solarWind)

// 2. Earth's Magnetosphere (Teardrop-shaped magnetic field)
const magnetosphereGeometry = new THREE.SphereGeometry(3.5, 64, 64)
const magnetosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Deform sphere into teardrop shape (magnetosphere)
        vec3 pos = position;
        
        // Compress on sun-facing side (dayside)
        float sunSide = max(dot(normalize(pos), vec3(1.0, 0.0, 0.0)), 0.0);
        pos.x *= (1.0 - sunSide * 0.3); // Compress dayside
        
        // Extend on night side (magnetotail)
        float nightSide = max(dot(normalize(pos), vec3(-1.0, 0.0, 0.0)), 0.0);
        pos.x *= (1.0 + nightSide * 1.5); // Extend nightside into tail
        
        // Taper the tail
        float tailFactor = smoothstep(0.0, 1.0, nightSide);
        float taper = 1.0 - tailFactor * 0.6;
        pos.y *= taper;
        pos.z *= taper;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`

const magnetosphereFragmentShader = `
    uniform vec3 sunDirection;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec3 viewDirection = normalize(-vPosition);
        vec3 normal = normalize(vNormal);
        
        // Fresnel effect for magnetic field visibility
        float fresnel = pow(1.0 - abs(dot(viewDirection, normal)), 2.5);
        
        // Magnetic field color (blue-purple aurora colors)
        vec3 fieldColor = vec3(0.2, 0.4, 1.0);
        
        // Add aurora-like pulsing
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        
        // Stronger on night side (where aurora occurs)
        float nightSide = max(dot(normalize(vPosition), vec3(-1.0, 0.0, 0.0)), 0.0);
        float intensity = fresnel * (0.15 + nightSide * 0.25) * pulse;
        
        gl_FragColor = vec4(fieldColor, intensity * 0.4);
    }
`

const magnetosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: magnetosphereVertexShader,
    fragmentShader: magnetosphereFragmentShader,
    uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        time: { value: 0 }
    },
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

const magnetosphere = new THREE.Mesh(magnetosphereGeometry, magnetosphereMaterial)
scene.add(magnetosphere)

// 3. Aurora Borealis/Australis Rings (Polar aurora zones)
const auroraGeometry = new THREE.TorusGeometry(1.95, 0.15, 32, 100)
const auroraVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Wavy animation for aurora curtains
        vec3 pos = position;
        float wave = sin(pos.x * 10.0 + time * 2.0) * 0.05;
        pos.y += wave;
        pos.z += cos(pos.x * 8.0 + time * 1.5) * 0.05;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`

const auroraFragmentShader = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        // Aurora colors (green, purple, pink)
        vec3 auroraGreen = vec3(0.0, 1.0, 0.4);
        vec3 auroraPurple = vec3(0.6, 0.0, 1.0);
        vec3 auroraPink = vec3(1.0, 0.2, 0.6);
        
        // Mix colors based on position and time
        float colorMix = sin(vPosition.x * 5.0 + time) * 0.5 + 0.5;
        vec3 auroraColor = mix(
            mix(auroraGreen, auroraPurple, colorMix),
            auroraPink,
            sin(time * 0.5) * 0.5 + 0.5
        );
        
        // Pulsing intensity
        float pulse = sin(time * 3.0) * 0.3 + 0.7;
        
        // Soft edges
        float alpha = 0.6 * pulse;
        
        gl_FragColor = vec4(auroraColor, alpha);
    }
`

const auroraMaterial = new THREE.ShaderMaterial({
    vertexShader: auroraVertexShader,
    fragmentShader: auroraFragmentShader,
    uniforms: {
        time: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

// North Pole Aurora
const auroraNorth = new THREE.Mesh(auroraGeometry, auroraMaterial)
auroraNorth.rotation.x = Math.PI / 2
auroraNorth.position.y = 1.7
scene.add(auroraNorth)

// South Pole Aurora
const auroraSouth = new THREE.Mesh(auroraGeometry, auroraMaterial.clone())
auroraSouth.rotation.x = Math.PI / 2
auroraSouth.position.y = -1.7
scene.add(auroraSouth)

// Create realistic sun glow using sprite with gradient texture
function createSunGlowTexture(innerRadius = 0.3, outerRadius = 1.0, hasDetail = false) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const context = canvas.getContext('2d')
    
    // Create radial gradient for realistic glow
    const centerX = 512
    const centerY = 512
    const gradient = context.createRadialGradient(centerX, centerY, centerX * innerRadius, centerX, centerY, centerX * outerRadius)
    
    if (hasDetail) {
        // More detailed chromosphere/corona layers
        gradient.addColorStop(0, 'rgba(255, 255, 240, 1)')      // Inner: Very bright white
        gradient.addColorStop(0.05, 'rgba(255, 250, 200, 0.95)') // Bright white-yellow
        gradient.addColorStop(0.15, 'rgba(255, 230, 120, 0.85)') // Yellow
        gradient.addColorStop(0.3, 'rgba(255, 200, 80, 0.6)')    // Golden
        gradient.addColorStop(0.5, 'rgba(255, 150, 40, 0.35)')   // Orange
        gradient.addColorStop(0.7, 'rgba(255, 100, 20, 0.15)')   // Deep orange
        gradient.addColorStop(0.85, 'rgba(255, 60, 10, 0.05)')   // Fading red
        gradient.addColorStop(1, 'rgba(255, 40, 0, 0)')          // Transparent
    } else {
        // Standard glow
        gradient.addColorStop(0, 'rgba(255, 250, 200, 1)')
        gradient.addColorStop(0.1, 'rgba(255, 220, 100, 0.8)')
        gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.4)')
        gradient.addColorStop(0.6, 'rgba(255, 120, 20, 0.15)')
        gradient.addColorStop(1, 'rgba(255, 80, 0, 0)')
    }
    
    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 1024)
    
    // Add subtle noise texture for realism
    if (hasDetail) {
        const imageData = context.getImageData(0, 0, 1024, 1024)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 10
            data[i] = Math.max(0, Math.min(255, data[i] + noise))
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
        }
        context.putImageData(imageData, 0, 0)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    return texture
}

// Inner glow (bright chromosphere)
const innerGlowTexture = createSunGlowTexture(0.15, 0.7, true)
const innerGlowMaterial = new THREE.SpriteMaterial({
    map: innerGlowTexture,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const innerGlow = new THREE.Sprite(innerGlowMaterial)
innerGlow.scale.set(70, 70, 1)
innerGlow.position.copy(sun.position)
scene.add(innerGlow)

// Middle glow (corona transition)
const middleGlowTexture = createSunGlowTexture(0.3, 0.85, false)
const middleGlowMaterial = new THREE.SpriteMaterial({
    map: middleGlowTexture,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const middleGlow = new THREE.Sprite(middleGlowMaterial)
middleGlow.scale.set(95, 95, 1)
middleGlow.position.copy(sun.position)
scene.add(middleGlow)

// Outer glow (extended corona)
const outerGlowTexture = createSunGlowTexture(0.5, 1.0, false)
const outerGlowMaterial = new THREE.SpriteMaterial({
    map: outerGlowTexture,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const outerGlow = new THREE.Sprite(outerGlowMaterial)
outerGlow.scale.set(130, 130, 1)
outerGlow.position.copy(sun.position)
scene.add(outerGlow)

// Solar prominence/ring effect (thin bright ring)
const ringGeometry = new THREE.RingGeometry(21, 23, 128)
const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#FFD700',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const solarRing = new THREE.Mesh(ringGeometry, ringMaterial)
solarRing.position.copy(sun.position)
scene.add(solarRing)

// Add sun light
const sunLight = new THREE.DirectionalLight('#FFFFFF', 2.5)
sunLight.position.copy(sun.position)
scene.add(sunLight)

// Add lens flare effect
const lensFlareLoader = new THREE.TextureLoader()
const lensFlareTexture = lensFlareLoader.load('./lenses/lensflare0.png')
const lensFlareMaterial = new THREE.SpriteMaterial({
    map: lensFlareTexture,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})
const lensFlare = new THREE.Sprite(lensFlareMaterial)
lensFlare.scale.set(40, 40, 1)
lensFlare.position.copy(sun.position)
scene.add(lensFlare)

// Create moon with realistic size relative to Earth
// In reality: Moon radius is about 0.273 times Earth's radius
// Earth radius in our scene is 2 units, so Moon should be about 0.546 units
const moonGeometry = new THREE.SphereGeometry(0.55, 64, 64)

// Create realistic moon surface using custom shader
const moonVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const moonFragmentShader = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    // Crater function - creates realistic crater with rim and shadow
    float crater(vec3 p, float scale) {
        float n = snoise(p * scale);
        float crater = smoothstep(0.3, 0.7, n);
        
        // Create crater rim
        float rim = smoothstep(0.25, 0.3, n) * (1.0 - smoothstep(0.7, 0.8, n));
        
        // Create crater floor
        float floor = smoothstep(-1.0, -0.4, n) * (1.0 - smoothstep(-0.4, 0.2, n));
        
        return crater + rim * 0.3 - floor * 0.5;
    }
    
    void main() {
        // Base lunar terrain
        float terrain1 = snoise(vPosition * 3.0) * 0.5;
        float terrain2 = snoise(vPosition * 6.0) * 0.25;
        float terrain3 = snoise(vPosition * 12.0) * 0.125;
        float terrain4 = snoise(vPosition * 24.0) * 0.0625;
        
        float totalTerrain = terrain1 + terrain2 + terrain3 + terrain4;
        
        // Multiple scales of craters
        float craters1 = crater(vPosition, 2.0);
        float craters2 = crater(vPosition * 2.5, 4.0);
        float craters3 = crater(vPosition * 5.0, 8.0);
        
        float allCraters = craters1 * 0.5 + craters2 * 0.3 + craters3 * 0.2;
        
        // Mare (dark lunar seas) - large dark regions
        float mareNoise = snoise(vPosition * 1.5 + 50.0);
        float mareMask = smoothstep(0.1, 0.4, mareNoise);
        
        // Lunar highlands (bright regions)
        float highlandsMask = 1.0 - mareMask;
        
        // Color palette based on real moon
        vec3 mareColor = vec3(0.35, 0.33, 0.32);      // Dark gray (lunar seas)
        vec3 highlandsColor = vec3(0.72, 0.70, 0.68); // Light gray (highlands)
        vec3 craterColor = vec3(0.55, 0.53, 0.51);    // Medium gray
        vec3 craterRimColor = vec3(0.80, 0.78, 0.76); // Bright rim
        vec3 dustColor = vec3(0.65, 0.63, 0.61);      // Surface dust
        
        // Mix base terrain colors
        vec3 color = mix(mareColor, highlandsColor, highlandsMask);
        
        // Apply craters
        float craterEffect = allCraters;
        color = mix(color, craterColor, smoothstep(0.0, 0.3, craterEffect));
        color = mix(color, craterRimColor, smoothstep(0.4, 0.7, craterEffect) * (1.0 - smoothstep(0.7, 1.0, craterEffect)));
        
        // Add fine surface dust layer
        color = mix(color, dustColor, 0.2);
        
        // Apply terrain variation
        color += vec3(totalTerrain * 0.08);
        
        // Subtle color variation for realism
        float colorVar = snoise(vPosition * 8.0) * 0.02;
        color += vec3(colorVar);
        
        // Rim lighting effect (lunar limb)
        float rimLight = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        color += vec3(0.1, 0.1, 0.12) * rimLight;
        
        gl_FragColor = vec4(color, 1.0);
    }
`

const moonMaterial = new THREE.ShaderMaterial({
    vertexShader: moonVertexShader,
    fragmentShader: moonFragmentShader,
    uniforms: {
        time: { value: 0 }
    }
})

const moon = new THREE.Mesh(moonGeometry, moonMaterial)
// Position moon at roughly correct distance (about 30x Earth radius in reality, scaled down for visibility)
moon.position.set(30, 0, 0)
scene.add(moon)

// Add ambient light for better visibility of non-sunlit areas
const ambientLight = new THREE.AmbientLight('#404040', 0.3)
scene.add(ambientLight)

// GUI controls for celestial bodies
const celestialFolder = gui.addFolder('Celestial Bodies')
const celestialConfig = {
    sunSize: 20,
    moonSize: 0.55,
    moonDistance: 30,
    sunDistance: 150,
    orbitSpeed: 0.05,
    innerGlowIntensity: 0.95,
    middleGlowIntensity: 0.7,
    outerGlowIntensity: 0.45,
    ringIntensity: 0.3,
    lensFlareIntensity: 0.6,
    sunAnimation: true,
    sunspotDetail: true,
    moonCraterDetail: true,
    moonMareDetail: true
}

celestialFolder.add(celestialConfig, 'sunSize', 5, 50).name('Sun Size').onChange((value) => {
    sun.geometry.dispose()
    sun.geometry = new THREE.SphereGeometry(value, 128, 128)
})

celestialFolder.add(celestialConfig, 'moonSize', 0.1, 2).name('Moon Size').onChange((value) => {
    moon.geometry.dispose()
    moon.geometry = new THREE.SphereGeometry(value, 32, 32)
})

celestialFolder.add(celestialConfig, 'moonDistance', 10, 100).name('Moon Distance')
celestialFolder.add(celestialConfig, 'sunDistance', 50, 300).name('Sun Distance').onChange((value) => {
    sun.position.set(value, 0, 0)
    sunLight.position.copy(sun.position)
    innerGlow.position.copy(sun.position)
    middleGlow.position.copy(sun.position)
    outerGlow.position.copy(sun.position)
    lensFlare.position.copy(sun.position)
    solarRing.position.copy(sun.position)
})

celestialFolder.add(celestialConfig, 'orbitSpeed', 0.01, 0.2).name('Orbit Speed')
celestialFolder.add(celestialConfig, 'innerGlowIntensity', 0, 1).name('Inner Glow').onChange((value) => {
    innerGlowMaterial.opacity = value
})
celestialFolder.add(celestialConfig, 'middleGlowIntensity', 0, 1).name('Middle Glow').onChange((value) => {
    middleGlowMaterial.opacity = value
})
celestialFolder.add(celestialConfig, 'outerGlowIntensity', 0, 1).name('Outer Glow').onChange((value) => {
    outerGlowMaterial.opacity = value
})
celestialFolder.add(celestialConfig, 'ringIntensity', 0, 1).name('Solar Ring').onChange((value) => {
    ringMaterial.opacity = value * 0.3
})
celestialFolder.add(celestialConfig, 'lensFlareIntensity', 0, 1).name('Lens Flare').onChange((value) => {
    lensFlareMaterial.opacity = value
})
celestialFolder.add(celestialConfig, 'sunAnimation').name('Animate Sun Surface')
celestialFolder.add(celestialConfig, 'sunspotDetail').name('Sunspot Details')
celestialFolder.add(celestialConfig, 'moonCraterDetail').name('Moon Crater Detail')
celestialFolder.add(celestialConfig, 'moonMareDetail').name('Moon Mare Detail')

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)
renderer.setClearColor('#000011')

/**
 * Animate
 */
const clock = new THREE.Clock()
let lastFrameTime = Date.now()
let lastListUpdateTime = 0

// Initialize KSP Game System
let kspGame = null
const appMode = getAppMode()
if (appMode === 'ksp') {
    kspGame = new KSPGameSystem(scene, earth, camera, controls)
}

// KSP GUI controls
const kspFolder = gui.addFolder('🚀 KSP Game Mode')
const kspConfig = {
    enableKSPMode: appMode === 'ksp',
    resetSpacecraft: () => kspGame && kspGame.resetSpacecraft(),
    cameraMode: 'FREE_ROAM'
}

if (kspGame) {
    kspFolder.add(kspConfig, 'enableKSPMode').name('Enable KSP Controls')
    kspFolder.add(kspConfig, 'resetSpacecraft').name('Reset Spacecraft')
    kspFolder.add(kspConfig, 'cameraMode', ['FREE_ROAM', 'FOLLOW', 'ORBIT']).name('Camera Mode').onChange((value) => {
        const modeMap = {
            'FREE_ROAM': 'FREE_ROAM',
            'FOLLOW': 'FOLLOW_SPACECRAFT',
            'ORBIT': 'ORBIT_VIEW'
        }
        kspGame.gameState.mode = modeMap[value]
    })
} else {
    kspFolder.add(kspConfig, 'enableKSPMode').name('KSP Mode (Disabled in Launch)').disable()
}

// Apply user configuration from launch page
applyUserConfig()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const currentTime = Date.now()
    const deltaTime = (currentTime - lastFrameTime) / 1000  // 秒
    lastFrameTime = currentTime

    // Update KSP game system if enabled
    if (kspConfig.enableKSPMode) {
        kspGame.update(deltaTime, elapsedTime)
    }

    earth.rotation.y = elapsedTime * 0.1

    // Rotate moon around Earth (simplified orbit)
    const moonOrbitRadius = celestialConfig.moonDistance
    const moonOrbitSpeed = celestialConfig.orbitSpeed
    moon.position.x = Math.cos(elapsedTime * moonOrbitSpeed) * moonOrbitRadius
    moon.position.z = Math.sin(elapsedTime * moonOrbitSpeed) * moonOrbitRadius
    
    // Moon slow rotation (tidal locked, but slight libration)
    moon.rotation.y = elapsedTime * 0.02
    moon.rotation.x = Math.sin(elapsedTime * 0.1) * 0.05
    moon.rotation.z = Math.cos(elapsedTime * 0.08) * 0.03

    // Animate sun surface with shader time uniform
    if (celestialConfig.sunAnimation && sunMaterial.uniforms) {
        sunMaterial.uniforms.time.value = elapsedTime
    }
    
    // Pulse the glow effects for realistic shimmering
    const glowPulse = 1.0 + Math.sin(elapsedTime * 2) * 0.05
    innerGlow.scale.set(70 * glowPulse, 70 * glowPulse, 1)
    
    const middleGlowPulse = 1.0 + Math.sin(elapsedTime * 1.7 + 0.5) * 0.06
    middleGlow.scale.set(95 * middleGlowPulse, 95 * middleGlowPulse, 1)
    
    const outerGlowPulse = 1.0 + Math.sin(elapsedTime * 1.5 + 1) * 0.08
    outerGlow.scale.set(130 * outerGlowPulse, 130 * outerGlowPulse, 1)
    
    // Rotate solar ring slowly
    solarRing.rotation.x = Math.sin(elapsedTime * 0.1) * 0.3
    solarRing.rotation.y = elapsedTime * 0.05
    solarRing.rotation.z = Math.cos(elapsedTime * 0.08) * 0.2
    
    // Pulse ring opacity
    ringMaterial.opacity = 0.25 + Math.sin(elapsedTime * 2.5) * 0.05
    
    // Subtle lens flare pulse effect (Sprite rotation is read-only)
    const flarePulse = 1.0 + Math.sin(elapsedTime * 3) * 0.1
    lensFlare.scale.set(40 * flarePulse, 40 * flarePulse, 1)

    // Update sun direction for shaders
    if (earthMaterial.uniforms.sunDirection) {
        // Calculate direction from Earth to Sun
        const sunDirection = new THREE.Vector3()
        sunDirection.subVectors(sun.position, earth.position).normalize()
        earthMaterial.uniforms.sunDirection.value.copy(sunDirection)
    }
    
    // Update time uniform for aurora and dynamic effects
    if (earthMaterial.uniforms.time) {
        earthMaterial.uniforms.time.value = elapsedTime
    }
    
    // Update wave animation parameters
    if (oceanConfig.waveAnimation) {
        if (earthMaterial.uniforms.waveHeight) {
            earthMaterial.uniforms.waveHeight.value = oceanConfig.waveHeight
        }
        if (earthMaterial.uniforms.waveSpeed) {
            earthMaterial.uniforms.waveSpeed.value = oceanConfig.waveSpeed
        }
    } else {
        // Pause wave animation by setting speed to 0
        if (earthMaterial.uniforms.waveSpeed) {
            earthMaterial.uniforms.waveSpeed.value = 0
        }
    }
    
    // Update cloud layer animation
    if (cloudsMaterial.uniforms.time) {
        cloudsMaterial.uniforms.time.value = elapsedTime
    }
    
    // Update sun direction for clouds
    if (cloudsMaterial.uniforms.sunDirection) {
        const sunDirection = new THREE.Vector3()
        sunDirection.subVectors(sun.position, earth.position).normalize()
        cloudsMaterial.uniforms.sunDirection.value.copy(sunDirection)
    }
    
    // Update cyclone animations
    cyclones.forEach((cyclone) => {
        if (cyclone.userData.material.uniforms.time) {
            cyclone.userData.material.uniforms.time.value = elapsedTime
        }
        
        if (cyclone.userData.material.uniforms.sunDirection) {
            const sunDirection = new THREE.Vector3()
            sunDirection.subVectors(sun.position, earth.position).normalize()
            cyclone.userData.material.uniforms.sunDirection.value.copy(sunDirection)
        }
    })
    
    // Update solar wind animation
    if (solarWindMaterial.uniforms.time) {
        solarWindMaterial.uniforms.time.value = elapsedTime
    }
    
    // Update magnetosphere animation
    if (magnetosphereMaterial.uniforms.time) {
        magnetosphereMaterial.uniforms.time.value = elapsedTime
    }
    
    // Update aurora animations
    auroraMaterial.uniforms.time.value = elapsedTime
    
    // Update gravitational field animations
    gravityWellsGroup.children.forEach((well) => {
        if (well.userData.material.uniforms.time) {
            well.userData.material.uniforms.time.value = elapsedTime
        }
    })
    
    // Animate Lagrange points with pulsing effect
    lagrangeGroup.children.forEach((point, index) => {
        const pulse = 1.0 + Math.sin(elapsedTime * 2.0 + index) * 0.2
        point.scale.set(pulse, pulse, pulse)
    })
    
    // Pulse atmosphere layers for subtle shimmering effect
    if (earthConfig.atmospherePulse) {
        const innerAtmosPulse = 1.0 + Math.sin(elapsedTime * 1.5) * 0.02
        innerAtmosphere.scale.set(innerAtmosPulse, innerAtmosPulse, innerAtmosPulse)
        
        const outerAtmosPulse = 1.0 + Math.sin(elapsedTime * 1.2 + 0.5) * 0.03
        outerAtmosphere.scale.set(outerAtmosPulse, outerAtmosPulse, outerAtmosPulse)
    } else {
        innerAtmosphere.scale.set(1.0, 1.0, 1.0)
        outerAtmosphere.scale.set(1.0, 1.0, 1.0)
    }

    // 更新模拟时间（应用时间缩放）
    if (orbitManager.timeScale !== 1) {
        orbitManager.timeOffset += deltaTime * (orbitManager.timeScale - 1)
    }
    
    // 获取模拟时间
    const simulationTime = orbitManager.getSimulationTime()
    
    // 更新 UI 显示
    timeConfig.currentTime = simulationTime.toLocaleString()
    timeConfig.timeOffset = orbitManager.timeOffset
    timeConfig.timeScale = orbitManager.timeScale

    // 更新卫星位置
    if (satelliteConfig.updatePositions) {
        orbitManager.updateSatellites(simulationTime)
    }

    // 定期更新卫星列表（每秒一次）
    if (currentTime - lastListUpdateTime > 1000) {
        if (orbitManager.satellites.length > 0) {
            updateSatelliteList(orbitManager.satellites, onSatelliteClick)
        }
        lastListUpdateTime = currentTime
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()