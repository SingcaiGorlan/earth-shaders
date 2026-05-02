import * as THREE from 'three'
import * as satellite from 'satellite.js'

/**
 * 卫星轨道可视化管理器
 */
export class SatelliteOrbitManager {
    constructor(scene, earthRadius = 2) {
        this.scene = scene
        this.earthRadius = earthRadius
        this.satellites = []
        this.orbitLines = []
        this.satelliteMeshes = []
        
        // 地球半径 (km)
        this.EARTH_RADIUS_KM = 6371
        
        // 缩放比例:将真实距离转换为场景单位
        this.scale = earthRadius / this.EARTH_RADIUS_KM
        
        // 时间系统
        this.timeOffset = 0  // 时间偏移(秒)
        this.timeScale = 1   // 时间缩放比例
        this.lastRealTime = Date.now()  // 上次更新的实际时间
        
        // 性能优化:大量卫星时使用 instanced mesh
        this.useInstancing = false
        this.satelliteInstances = null
        
        // 3D 模型缓存
        this.satelliteModels = new Map()
    }

    /**
     * 解析 TLE 数据
     * @param {string} tleString - TLE 格式的字符串
     * @returns {Object} 卫星记录
     */
    parseTLE(tleString) {
        const lines = tleString.trim().split('\n')
        if (lines.length < 3) {
            console.error('TLE 数据格式错误,需要至少 3 行')
            return null
        }
        
        const name = lines[0].trim()
        const line1 = lines[1].trim()
        const line2 = lines[2].trim()
        
        const satrec = satellite.twoline2satrec(line1, line2)
        
        return {
            name,
            satrec,
            line1,
            line2
        }
    }

    /**
     * 从 URL 加载 TLE 数据
     * @param {string} url - TLE 数据源 URL
     * @returns {Promise<Array>} 卫星数据数组
     */
    async loadTLEFromURL(url) {
        try {
            const response = await fetch(url)
            const text = await response.text()
            return this.parseTLEBatch(text)
        } catch (error) {
            console.error('加载 TLE 数据失败:', error)
            return []
        }
    }

    /**
     * 下载 TLE 数据到本地文件
     * @param {string} url - TLE 数据源 URL
     * @param {string} filename - 保存的文件名
     */
    async downloadTLE(url, filename = 'satellites.tle') {
        try {
            const response = await fetch(url)
            const text = await response.text()
            
            // 创建 Blob 对象
            const blob = new Blob([text], { type: 'text/plain' })
            
            // 创建下载链接
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            
            // 清理
            window.URL.revokeObjectURL(downloadUrl)
            document.body.removeChild(a)
            
            console.log(`TLE 数据已下载: ${filename}`)
        } catch (error) {
            console.error('下载 TLE 数据失败:', error)
        }
    }

    /**
     * 从本地文件加载 TLE 数据
     * @param {File} file - 文件对象
     * @returns {Promise<Array>} 卫星数据数组
     */
    loadTLEFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result
                    const satellites = this.parseTLEBatch(text)
                    console.log(`从文件加载了 ${satellites.length} 个卫星`)
                    resolve(satellites)
                } catch (error) {
                    console.error('解析 TLE 文件失败:', error)
                    reject(error)
                }
            }
            
            reader.onerror = () => {
                reject(new Error('读取文件失败'))
            }
            
            reader.readAsText(file)
        })
    }

    /**
     * 从 URL 加载本地 TLE 文件(如 gp.tle)
     * @param {string} url - 文件 URL
     * @returns {Promise<Array>} 卫星数据数组
     */
    async loadTLEFromLocalFile(url) {
        try {
            const response = await fetch(url)
            const text = await response.text()
            const satellites = this.parseTLEBatch(text)
            console.log(`从 ${url} 加载了 ${satellites.length} 个卫星`)
            return satellites
        } catch (error) {
            console.error('加载本地 TLE 文件失败:', error)
            return []
        }
    }

    /**
     * 批量解析 TLE 数据
     * @param {string} tleText - 包含多个卫星的 TLE 文本
     * @returns {Array} 卫星数据数组
     */
    parseTLEBatch(tleText) {
        const lines = tleText.trim().split('\n')
        const satellites = []
        
        for (let i = 0; i < lines.length; i += 3) {
            if (i + 2 < lines.length) {
                const tleBlock = lines.slice(i, i + 3).join('\n')
                const sat = this.parseTLE(tleBlock)
                if (sat) {
                    satellites.push(sat)
                }
            }
        }
        
        return satellites
    }

    /**
     * 计算卫星在指定时间的位置
     * @param {Object} satrec - 卫星记录
     * @param {Date} date - 时间
     * @returns {Object} { x, y, z } 场景坐标
     */
    getSatellitePosition(satrec, date = new Date()) {
        const positionAndVelocity = satellite.propagate(satrec, date)
        const positionEci = positionAndVelocity.position
        
        if (!positionEci) return null
        
        // ECI (Earth-Centered Inertial) 坐标转换为 Three.js 世界坐标
        // ECI 坐标系:
        //   - 原点:地心
        //   - X 轴:指向春分点(J2000.0)
        //   - Y 轴:在赤道平面内,与 X 轴垂直
        //   - Z 轴:指向北极(右手系)
        //   - 单位:km
        //
        // Three.js 坐标系:
        //   - Y 轴:向上(up)
        //   - X 轴:向右
        //   - Z 轴:向前(朝向观察者)
        //   - 单位:场景单位(这里通过 scale 缩放)
        //
        // 转换步骤:
        // 1. 将 ECI 的 Z 轴(北极)映射到 Three.js 的 Y 轴(向上)
        // 2. 将 ECI 的 Y 轴反转并映射到 Three.js 的 Z 轴
        // 3. ECI 的 X 轴直接映射到 Three.js 的 X 轴
        // 4. 应用缩放比例
        
        return {
            x: positionEci.x * this.scale,   // ECI X -> Three.js X
            y: positionEci.z * this.scale,   // ECI Z -> Three.js Y (向上)
            z: -positionEci.y * this.scale   // ECI Y -> Three.js Z (反向)
        }
    }

    /**
     * 将 Three.js 世界坐标转换回 ECI 坐标
     * @param {Object} worldPos - Three.js 世界坐标 { x, y, z }
     * @returns {Object} ECI 坐标 { x, y, z } (km)
     */
    worldToECI(worldPos) {
        return {
            x: worldPos.x / this.scale,
            y: -worldPos.z / this.scale,
            z: worldPos.y / this.scale
        }
    }

    /**
     * 可视化坐标转换过程(辅助调试)
     * @param {Object} satrec - 卫星记录
     * @param {Date} date - 时间
     * @returns {Object} 包含所有坐标系的信息
     */
    debugCoordinateTransform(satrec, date = new Date()) {
        const positionAndVelocity = satellite.propagate(satrec, date)
        const positionEci = positionAndVelocity.position
        
        if (!positionEci) return null
        
        const worldPos = this.getSatellitePosition(satrec, date)
        
        // 验证转换:world -> ECI -> world 应该得到相同结果
        const eciBack = this.worldToECI(worldPos)
        
        return {
            eci: {
                x: positionEci.x,
                y: positionEci.y,
                z: positionEci.z,
                unit: 'km'
            },
            world: {
                x: worldPos.x,
                y: worldPos.y,
                z: worldPos.z,
                unit: 'scene units'
            },
            scale: this.scale,
            earthRadiusScene: this.earthRadius,
            earthRadiusKm: this.EARTH_RADIUS_KM,
            verification: {
                eciXMatch: Math.abs(eciBack.x - positionEci.x) < 0.0001,
                eciYMatch: Math.abs(eciBack.y - positionEci.y) < 0.0001,
                eciZMatch: Math.abs(eciBack.z - positionEci.z) < 0.0001
            }
        }
    }

    /**
     * 生成轨道路径点
     * @param {Object} satrec - 卫星记录
     * @param {Date} startDate - 起始时间
     * @param {number} orbitPeriod - 轨道周期(分钟)
     * @param {number} numPoints - 路径点数量
     * @returns {Array} 位置点数组
     */
    generateOrbitPath(satrec, startDate = new Date(), orbitPeriod = 90, numPoints = 200) {
        const points = []
        const periodMs = orbitPeriod * 60 * 1000 // 转换为毫秒
        const startTime = startDate.getTime()
        
        for (let i = 0; i <= numPoints; i++) {
            const time = new Date(startTime + (periodMs * i / numPoints))
            const pos = this.getSatellitePosition(satrec, time)
            if (pos) {
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z))
            }
        }
        
        return points
    }

    /**
     * 计算卫星在未来指定时间内的位置序列
     * @param {Object} satrec - 卫星记录
     * @param {number} hours - 未来小时数(默认 24 小时)
     * @param {number} intervalMinutes - 计算间隔(分钟,默认 1 分钟)
     * @param {Date} startTime - 起始时间(默认当前时间)
     * @returns {Array} 位置序列 [{ time, position: { x, y, z } }]
     */
    calculateFuturePositions(satrec, hours = 24, intervalMinutes = 1, startTime = new Date()) {
        const positions = []
        const totalMinutes = hours * 60
        const intervalMs = intervalMinutes * 60 * 1000
        const startTimestamp = startTime.getTime()
        
        console.log(`开始计算未来 ${hours} 小时的位置序列,间隔 ${intervalMinutes} 分钟...`)
        console.log(`预计生成 ${totalMinutes / intervalMinutes + 1} 个位置点`)
        
        for (let i = 0; i <= totalMinutes; i += intervalMinutes) {
            const currentTime = new Date(startTimestamp + i * 60 * 1000)
            const pos = this.getSatellitePosition(satrec, currentTime)
            
            if (pos) {
                positions.push({
                    time: currentTime,
                    position: pos
                })
            }
            
            // 每计算 100 个点输出一次进度
            if (i % (intervalMinutes * 100) === 0 && i > 0) {
                const progress = ((i / totalMinutes) * 100).toFixed(1)
                console.log(`计算进度: ${progress}% (${i}/${totalMinutes} 分钟)`)
            }
        }
        
        console.log(`✅ 位置序列计算完成,共 ${positions.length} 个点`)
        return positions
    }

    /**
     * 获取卫星在特定时间的位置(包含地理坐标信息)
     * @param {Object} satrec - 卫星记录
     * @param {Date} date - 时间
     * @returns {Object} 完整的位置信息
     */
    getSatellitePositionWithGeo(satrec, date = new Date()) {
        const positionAndVelocity = satellite.propagate(satrec, date)
        const positionEci = positionAndVelocity.position
        
        if (!positionEci) return null
        
        // 计算 GMST(格林威治平均恒星时)
        const gmst = satellite.gstime(date)
        
        // 转换为地理坐标
        const geodetic = satellite.eciToGeodetic(positionEci, gmst)
        
        // 场景坐标
        const scenePosition = {
            x: positionEci.x * this.scale,
            y: positionEci.z * this.scale,
            z: -positionEci.y * this.scale
        }
        
        return {
            time: date,
            scenePosition,
            eciPosition: positionEci,
            geodetic: {
                longitude: satellite.degreesLong(geodetic.longitude),
                latitude: satellite.degreesLat(geodetic.latitude),
                height: geodetic.height // km
            },
            velocity: positionAndVelocity.velocity
        }
    }

    /**
     * 添加卫星及其轨道
     * @param {Object} satellite - 卫星数据
     * @param {Object} options - 配置选项
     */
    addSatellite(satellite, options = {}) {
        const {
            orbitColor = '#00ff00',
            satelliteColor = '#ffffff',
            satelliteSize = 0.05,
            showOrbit = true,
            showSatellite = true,
            orbitPeriod = 92 // 默认 ISS 轨道周期(分钟)
        } = options

        // 创建轨道路径
        if (showOrbit) {
            const orbitPoints = this.generateOrbitPath(satellite.satrec, new Date(), orbitPeriod)
            
            if (orbitPoints.length > 0) {
                const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints)
                const orbitMaterial = new THREE.LineBasicMaterial({ 
                    color: orbitColor,
                    transparent: true,
                    opacity: 0.4,
                    linewidth: 1
                })
                const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
                
                this.scene.add(orbitLine)
                this.orbitLines.push({
                    line: orbitLine,
                    satrec: satellite.satrec,
                    name: satellite.name
                })
            }
        }

        // 创建卫星标记
        if (showSatellite) {
            // 对于大量卫星,使用更简单的几何体
            const satelliteGeometry = satelliteSize < 0.04 
                ? new THREE.SphereGeometry(satelliteSize, 8, 8)  // 低多边形
                : new THREE.SphereGeometry(satelliteSize, 16, 16)  // 高多边形
            
            const satelliteMaterial = new THREE.MeshBasicMaterial({ 
                color: satelliteColor,
                transparent: true,
                opacity: 0.9
            })
            const satelliteMesh = new THREE.Mesh(satelliteGeometry, satelliteMaterial)
            
            this.scene.add(satelliteMesh)
            this.satelliteMeshes.push({
                mesh: satelliteMesh,
                satrec: satellite.satrec,
                name: satellite.name
            })
        }

        this.satellites.push(satellite)
    }

    /**
     * 更新所有卫星位置
     * @param {Date} date - 当前时间
     */
    updateSatellites(date = new Date()) {
        this.satelliteMeshes.forEach(({ mesh, satrec }) => {
            const pos = this.getSatellitePosition(satrec, date)
            if (pos) {
                mesh.position.set(pos.x, pos.y, pos.z)
            }
        })
    }

    /**
     * 清除所有卫星和轨道
     */
    clearAll() {
        console.log(`清除 ${this.orbitLines.length} 个轨道和 ${this.satelliteMeshes.length} 个卫星...`)
        
        this.orbitLines.forEach(({ line }) => {
            this.scene.remove(line)
            line.geometry.dispose()
            line.material.dispose()
        })
        
        this.satelliteMeshes.forEach((mesh) => {
            this.scene.remove(mesh)
            // 处理 Group 类型的模型
            if (mesh.isGroup) {
                mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose()
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose())
                        } else {
                            child.material.dispose()
                        }
                    }
                })
            } else {
                if (mesh.geometry) mesh.geometry.dispose()
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => m.dispose())
                    } else {
                        mesh.material.dispose()
                    }
                }
            }
        })
        
        this.satellites = []
        this.orbitLines = []
        this.satelliteMeshes = []
        
        console.log('已清除所有卫星数据')
    }

    /**
     * 获取当前卫星数量
     */
    getSatelliteCount() {
        return {
            total: this.satellites.length,
            orbits: this.orbitLines.length,
            meshes: this.satelliteMeshes.length
        }
    }

    /**
     * 清除所有卫星和轨道(不释放内存,用于快速重置)
     */
    clearAllFast() {
        this.orbitLines.forEach(({ line }) => {
            this.scene.remove(line)
        })
        
        this.satelliteMeshes.forEach((mesh) => {
            this.scene.remove(mesh)
        })
        
        this.satellites = []
        this.orbitLines = []
        this.satelliteMeshes = []
        
        console.log('已快速清除所有卫星数据')
    }

    /**
     * 设置模拟时间偏移(秒)
     * @param {number} offsetSeconds - 时间偏移(正数=未来,负数=过去)
     */
    setTimeOffset(offsetSeconds = 0) {
        this.timeOffset = offsetSeconds
        console.log(`时间偏移设置为: ${offsetSeconds} 秒 (${(offsetSeconds / 3600).toFixed(2)} 小时)`)
    }

    /**
     * 获取当前模拟时间
     * @param {Date} realTime - 真实时间(默认当前时间)
     * @returns {Date} 模拟时间
     */
    getSimulationTime(realTime = new Date()) {
        return new Date(realTime.getTime() + this.timeOffset * 1000)
    }

    /**
     * 更新时间缩放比例
     * @param {number} scale - 时间缩放(1=实时,2=2倍速,0.5=半速)
     */
    setTimeScale(scale = 1) {
        this.timeScale = scale
        console.log(`时间缩放设置为: ${scale}x`)
    }

    /**
     * 跳转到指定时间
     * @param {Date} targetTime - 目标时间
     */
    jumpToTime(targetTime) {
        const now = new Date()
        this.timeOffset = (targetTime.getTime() - now.getTime()) / 1000
        console.log(`时间跳转到: ${targetTime.toLocaleString()}`)
    }

    /**
     * 快速前进/后退指定小时数
     * @param {number} hours - 小时数(正数=前进,负数=后退)
     */
    skipHours(hours) {
        this.timeOffset += hours * 3600
        console.log(`时间${hours > 0 ? '前进' : '后退'} ${Math.abs(hours)} 小时`)
    }

    /**
     * 加载卫星 3D 模型(GLTF/GLB 格式)
     * @param {string} modelPath - 模型文件路径
     * @param {string} modelName - 模型名称(用于缓存)
     * @returns {Promise<THREE.Object3D>} 加载的模型
     */
    async loadSatelliteModel(modelPath, modelName = 'default') {
        // 检查缓存
        if (this.satelliteModels.has(modelName)) {
            console.log(`使用缓存的模型: ${modelName}`)
            return this.satelliteModels.get(modelName)
        }

        // 如果是程序化模型(以 'procedural:' 开头)
        if (modelPath.startsWith('procedural:')) {
            const modelType = modelPath.replace('procedural:', '')
            let model
            
            if (modelType === 'iss') {
                model = this.createISSModel()
            } else if (modelType === 'simple') {
                model = this.createSimpleSatelliteModel()
            } else {
                model = this.createDefaultSatelliteModel()
            }
            
            this.satelliteModels.set(modelName, model)
            console.log(`已创建程序化卫星模型: ${modelName}`)
            return model
        }

        try {
            const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
            const loader = new GLTFLoader()
            
            console.log(`开始加载卫星模型: ${modelPath}`)
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    modelPath,
                    (gltf) => resolve(gltf),
                    (progress) => {
                        if (progress.total) {
                            const percent = (progress.loaded / progress.total * 100).toFixed(1)
                            console.log(`模型加载进度: ${percent}%`)
                        }
                    },
                    (error) => reject(error)
                )
            })
            
            const model = gltf.scene
            
            // 优化模型
            model.traverse((child) => {
                if (child.isMesh) {
                    // 启用阴影
                    child.castShadow = true
                    child.receiveShadow = true
                    
                    // 优化材质
                    if (child.material) {
                        child.material.needsUpdate = true
                    }
                }
            })
            
            // 缓存模型
            this.satelliteModels.set(modelName, model)
            console.log(`卫星模型加载成功: ${modelName}`)
            
            return model
        } catch (error) {
            console.error(`加载卫星模型失败: ${modelPath}`, error)
            // 返回默认的盒子模型作为后备
            return this.createDefaultSatelliteModel()
        }
    }

    /**
     * 创建默认的卫星模型(立方体)
     * @returns {THREE.Mesh}
     */
    createDefaultSatelliteModel() {
        const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05)
        const material = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            metalness: 0.8,
            roughness: 0.2,
            emissive: '#222222'
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        return mesh
    }

    /**
     * 创建简单的卫星模型(立方体 + 太阳能板)
     * @returns {THREE.Group}
     */
    createSimpleSatelliteModel() {
        const satelliteGroup = new THREE.Group()

        // 卫星主体(立方体)
        const bodyGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.06)
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: '#cccccc',
            metalness: 0.9,
            roughness: 0.1,
            emissive: '#111111'
        })
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
        body.castShadow = true
        body.receiveShadow = true
        satelliteGroup.add(body)

        // 太阳能板 1
        const panelGeometry = new THREE.BoxGeometry(0.15, 0.01, 0.08)
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: '#1a237e',
            metalness: 0.3,
            roughness: 0.4,
            emissive: '#0a0f3d'
        })
        
        const panel1 = new THREE.Mesh(panelGeometry, panelMaterial)
        panel1.position.x = 0.1
        panel1.castShadow = true
        satelliteGroup.add(panel1)

        // 太阳能板 2
        const panel2 = new THREE.Mesh(panelGeometry, panelMaterial)
        panel2.position.x = -0.1
        panel2.castShadow = true
        satelliteGroup.add(panel2)

        // 天线
        const antennaGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8)
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            metalness: 0.8,
            roughness: 0.2
        })
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
        antenna.position.y = 0.07
        antenna.castShadow = true
        satelliteGroup.add(antenna)

        // 天线顶部
        const dishGeometry = new THREE.SphereGeometry(0.015, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
        const dish = new THREE.Mesh(dishGeometry, antennaMaterial)
        dish.position.y = 0.11
        dish.rotation.x = Math.PI
        satelliteGroup.add(dish)

        return satelliteGroup
    }

    /**
     * 创建 ISS 模型(简化版)
     * @returns {THREE.Group}
     */
    createISSModel() {
        const issGroup = new THREE.Group()

        // ISS 主体模块
        const moduleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16)
        const moduleMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            metalness: 0.7,
            roughness: 0.3
        })
        const module = new THREE.Mesh(moduleGeometry, moduleMaterial)
        module.rotation.z = Math.PI / 2
        module.castShadow = true
        issGroup.add(module)

        // 太阳能板阵列(大型)
        const solarPanelGeometry = new THREE.BoxGeometry(0.25, 0.01, 0.12)
        const solarPanelMaterial = new THREE.MeshStandardMaterial({
            color: '#1565c0',
            metalness: 0.4,
            roughness: 0.3,
            emissive: '#0a2a5e'
        })

        const panel1 = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial)
        panel1.position.set(0, 0.08, 0)
        panel1.castShadow = true
        issGroup.add(panel1)

        const panel2 = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial)
        panel2.position.set(0, -0.08, 0)
        panel2.castShadow = true
        issGroup.add(panel2)

        // 连接支架
        const strutGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8)
        const strutMaterial = new THREE.MeshStandardMaterial({
            color: '#cccccc',
            metalness: 0.8,
            roughness: 0.2
        })
        
        const strut1 = new THREE.Mesh(strutGeometry, strutMaterial)
        strut1.rotation.z = Math.PI / 2
        strut1.position.set(0, 0.04, 0)
        issGroup.add(strut1)

        const strut2 = new THREE.Mesh(strutGeometry, strutMaterial)
        strut2.rotation.z = Math.PI / 2
        strut2.position.set(0, -0.04, 0)
        issGroup.add(strut2)

        return issGroup
    }

    /**
     * 使用 3D 模型添加卫星
     * @param {Object} satData - 卫星数据
     * @param {Object} options - 配置选项
     */
    async addSatelliteWithModel(satData, options = {}) {
        const {
            modelPath = null,
            modelName = satData.name || 'satellite',
            modelScale = 1,
            orbitColor = '#00ff00',
            orbitOpacity = 0.4,
            showOrbit = true,
            showSatellite = true,
            orbitPeriod = 90
        } = options

        // 添加轨道线
        if (showOrbit) {
            const orbitLine = this.createOrbitLine(
                satData.satrec,
                new Date(),
                orbitPeriod,
                orbitColor,
                orbitOpacity
            )
            this.scene.add(orbitLine)
            this.orbitLines.push(orbitLine)
        }

        // 加载 3D 模型
        let satelliteModel
        if (modelPath) {
            satelliteModel = await this.loadSatelliteModel(modelPath, modelName)
        } else {
            satelliteModel = this.createDefaultSatelliteModel()
        }
        
        // 应用缩放
        satelliteModel.scale.setScalar(modelScale)
        
        // 计算初始位置
        const simTime = this.getSimulationTime()
        const position = this.getSatellitePosition(satData.satrec, simTime)
        
        if (position) {
            satelliteModel.position.set(position.x, position.y, position.z)
        }
        
        // 添加到场景
        this.scene.add(satelliteModel)
        
        // 保存卫星信息
        this.satellites.push({
            ...satData,
            mesh: satelliteModel,
            options
        })
        
        this.satelliteMeshes.push(satelliteModel)
        
        console.log(`已添加卫星 (3D 模型): ${satData.name}`)
    }

    /**
     * 添加示例:国际空间站 (ISS)
     */
    addISS() {
        const issTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00012345  00000-0  23456-3 0  9999
2 25544  51.6400 120.5000 0005432  80.1234 279.9876 15.49560000123456`
        
        const iss = this.parseTLE(issTLE)
        if (iss) {
            this.addSatellite(iss, {
                orbitColor: '#ff0000',
                satelliteColor: '#ff4444',
                satelliteSize: 0.08,
                orbitPeriod: 92.68
            })
        }
    }

    /**
     * 添加示例:GPS 卫星
     */
    addGPSSatellite() {
        const gpsTLE = `GPS BIIR-2  (PRN 13)
1 24876U 97035A   24001.50000000  .00000012  00000-0  00000-0 0  9998
2 24876  54.8000 250.0000 0123456 123.4567 236.5432  2.00560000123456`
        
        const gps = this.parseTLE(gpsTLE)
        if (gps) {
            this.addSatellite(gps, {
                orbitColor: '#0088ff',
                satelliteColor: '#4488ff',
                satelliteSize: 0.06,
                orbitPeriod: 717 // GPS 轨道周期约 12 小时
            })
        }
    }
}
