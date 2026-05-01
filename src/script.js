import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import earthVertexShader from './shaders/earth/vertex.glsl'
import earthFragmentShader from './shaders/earth/fragment.glsl'
import { SatelliteOrbitManager } from './satelliteOrbit.js'

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
        oceanColorIntensity: { value: 0.2 }
    },
    toneMapped: true
})

// GUI
const earthFolder = gui.addFolder('Earth')
earthFolder.add(earthMaterial.uniforms.oceanColorIntensity, 'value', 0, 1).name('oceanColorIntensity')

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
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 12
camera.position.y = 5
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

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

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const currentTime = Date.now()
    const deltaTime = (currentTime - lastFrameTime) / 1000  // 秒
    lastFrameTime = currentTime

    earth.rotation.y = elapsedTime * 0.1

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