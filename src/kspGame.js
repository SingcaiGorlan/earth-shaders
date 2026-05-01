/**
 * KSP-style Game System
 * Implements Kerbal Space Program-like gameplay mechanics
 */

import * as THREE from 'three'

export class KSPGameSystem {
    constructor(scene, earth, camera, controls) {
        this.scene = scene
        this.earth = earth
        this.camera = camera
        this.controls = controls
        
        // Game state
        this.gameState = {
            mode: 'GROUND',  // GROUND, LAUNCH, ORBITAL, FREE_ROAM
            timeWarp: 1,
            paused: false,
            missionTime: 0,
            launchPhase: 'PRE_LAUNCH',  // PRE_LAUNCH, COUNTDOWN, LIFTOFF, ASCENT, ORBIT_INSERTION
            countdownTime: 0,
            altitude: 0,
            velocity: 0
        }
        
        // Spacecraft (player's vessel)
        this.spacecraft = null
        this.spacecraftConfig = {
            // 航天器基本信息
            name: '探索者一号',
            type: '载人飞船',
            
            // 质量参数 (kg)
            dryMass: 850,      // 干质量（不含燃料）
            fuelMass: 450,     // 燃料质量
            totalMass: 1300,   // 总质量
            
            // 发动机参数
            engine: {
                type: '液氧煤油发动机',
                thrust: 3500,        // 推力 (kN)
                isp: 311,            // 比冲 (秒)
                burnTime: 380,       // 燃烧时间 (秒)
                fuelConsumption: 12  // 燃料消耗率 (kg/s)
            },
            
            // RCS参数
            rcs: {
                thrust: 0.5,         // 单组推力 (kN)
                isp: 70,             // 比冲 (秒)
                monopropellant: 50   // 单组推进剂 (kg)
            },
            
            // 燃料系统
            fuelSystem: {
                fuel: 100,           // 当前燃料百分比
                monopropellant: 100, // RCS燃料百分比
                maxFuel: 450,        // 最大燃料 (kg)
                maxMonoprop: 50      // 最大RCS燃料 (kg)
            },
            
            // 尺寸参数 (m)
            dimensions: {
                length: 8.5,         // 总长度
                diameter: 2.8,       // 直径
                span: 12.0           // 太阳能板展开宽度
            },
            
            // 电力系统
            power: {
                solarPanelOutput: 4.5,  // 太阳能板输出 (kW)
                batteryCapacity: 50,    // 电池容量 (kWh)
                currentPower: 100       // 当前电量百分比
            },
            
            // 热控系统
            thermal: {
                maxTemperature: 150,    // 最大温度 (°C)
                currentTemperature: 20  // 当前温度 (°C)
            },
            
            // 当前状态
            throttle: 0,           // 节流阀 0-1
            thrust: 0,             // 当前推力
            orientation: new THREE.Quaternion(),
            angularVelocity: new THREE.Vector3(0, 0, 0)
        }
        
        this.spacecraftData = {
            position: new THREE.Vector3(0, 0, 5),
            velocity: new THREE.Vector3(2.5, 0, 0), // Initial orbital velocity
            mass: 1300,
            fuel: 100,
            monopropellant: 100,
            throttle: 0,
            orientation: new THREE.Quaternion(),
            angularVelocity: new THREE.Vector3(0, 0, 0)
        }
        
        // Control systems
        this.controlSystems = {
            sasEnabled: false, // 自动稳定系统
            rcsEnabled: false, // RCS姿态控制
            targetOrientation: new THREE.Quaternion(),
            stabilityLevel: 0 // SAS稳定性等级 0-3
        }
        
        // Maneuver planning
        this.maneuverNode = null
        this.predictedOrbit = []
        
        // Orbital parameters
        this.orbitalData = {
            apoapsis: 0,
            periapsis: 0,
            inclination: 0,
            period: 0,
            eccentricity: 0,
            trueAnomaly: 0,
            meanAnomaly: 0
        }
        
        // UI elements
        this.hudElements = {}
        this.keys = {}
        this.navball = null // 导航球
        
        this.initSpacecraft()
        this.createHUD()
        this.createNavball()
        this.createSpacecraftConfigPanel()
        this.setupControls()
        
        // Initialize extended features
        this.createAttitudePanel()
        this.create3DAttitudeIndicator()
        this.createManeuverNode()
        this.createMapView()
        this.create2DAttitudePanel()
        this.createRCSControls()
        this.createThrottleControl()
        
        // Initialize ground space center
        if (this.gameState.mode === 'GROUND') {
            this.createSpaceCenter()
            this.initGroundScene()
        }
    }
    
    /**
     * Initialize detailed professional spacecraft
     */
    initSpacecraft() {
        const spacecraftGroup = new THREE.Group()
        
        // === 1. 主燃料箱 (Main Fuel Tank) ===
        const tankGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 24)
        const tankMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.8,
            roughness: 0.25,
            envMapIntensity: 1.5
        })
        const fuelTank = new THREE.Mesh(tankGeometry, tankMaterial)
        fuelTank.rotation.x = Math.PI / 2
        fuelTank.position.z = 0.1
        spacecraftGroup.add(fuelTank)
        
        // 燃料箱细节 - 条纹
        const stripeGeometry = new THREE.CylinderGeometry(0.155, 0.155, 0.02, 24)
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0066cc,
            metalness: 0.5,
            roughness: 0.5
        })
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
            stripe.rotation.x = Math.PI / 2
            stripe.position.z = -0.2 + i * 0.4
            spacecraftGroup.add(stripe)
        }
        
        // === 2. 载荷舱/服务舱 (Service Module) ===
        const serviceGeometry = new THREE.CylinderGeometry(0.16, 0.15, 0.5, 24)
        const serviceMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 0.7,
            roughness: 0.3
        })
        const serviceModule = new THREE.Mesh(serviceGeometry, serviceMaterial)
        serviceModule.rotation.x = Math.PI / 2
        serviceModule.position.z = 0.95
        spacecraftGroup.add(serviceModule)
        
        // === 3. 返回舱 (Crew Capsule) ===
        const capsuleGeometry = new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        const capsuleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.4,
            roughness: 0.6
        })
        const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial)
        capsule.rotation.x = -Math.PI / 2
        capsule.position.z = 1.45
        spacecraftGroup.add(capsule)
        
        // 返回舱隔热罩
        const heatShieldGeometry = new THREE.CylinderGeometry(0.2, 0.18, 0.05, 32)
        const heatShieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.3,
            roughness: 0.8
        })
        const heatShield = new THREE.Mesh(heatShieldGeometry, heatShieldMaterial)
        heatShield.rotation.x = Math.PI / 2
        heatShield.position.z = 1.5
        spacecraftGroup.add(heatShield)
        
        // === 4. 逃逸塔 (Launch Escape System) ===
        const escapeTowerGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 8)
        const escapeTowerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            metalness: 0.6,
            roughness: 0.4
        })
        const escapeTower = new THREE.Mesh(escapeTowerGeometry, escapeTowerMaterial)
        escapeTower.rotation.x = Math.PI / 2
        escapeTower.position.z = 1.7
        spacecraftGroup.add(escapeTower)
        
        // 逃逸塔整流罩
        const fairingGeometry = new THREE.ConeGeometry(0.04, 0.15, 8)
        const fairingMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6666,
            metalness: 0.5,
            roughness: 0.5
        })
        const fairing = new THREE.Mesh(fairingGeometry, fairingMaterial)
        fairing.rotation.x = -Math.PI / 2
        fairing.position.z = 1.95
        spacecraftGroup.add(fairing)
        
        // === 5. 主发动机 (Main Engine) ===
        const engineBellGeometry = new THREE.CylinderGeometry(0.08, 0.14, 0.25, 24, 1, true)
        const engineBellMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.95,
            roughness: 0.15,
            side: THREE.DoubleSide
        })
        const engineBell = new THREE.Mesh(engineBellGeometry, engineBellMaterial)
        engineBell.rotation.x = Math.PI / 2
        engineBell.position.z = -0.6
        spacecraftGroup.add(engineBell)
        
        // 发动机喷管内部
        const nozzleInnerGeometry = new THREE.CylinderGeometry(0.07, 0.13, 0.23, 24)
        const nozzleInnerMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.2
        })
        const nozzleInner = new THREE.Mesh(nozzleInnerGeometry, nozzleInnerMaterial)
        nozzleInner.rotation.x = Math.PI / 2
        nozzleInner.position.z = -0.58
        spacecraftGroup.add(nozzleInner)
        
        // 发动机燃烧室
        const combustionChamberGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.15, 16)
        const combustionChamberMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.85,
            roughness: 0.3
        })
        const combustionChamber = new THREE.Mesh(combustionChamberGeometry, combustionChamberMaterial)
        combustionChamber.rotation.x = Math.PI / 2
        combustionChamber.position.z = -0.42
        spacecraftGroup.add(combustionChamber)
        
        // === 6. 太阳能板 (Solar Panels) - 可展开 ===
        const panelGroup = new THREE.Group()
        
        // 太阳能板基板
        const panelBaseGeometry = new THREE.BoxGeometry(0.8, 0.01, 0.35)
        const panelBaseMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a4e,
            metalness: 0.2,
            roughness: 0.7,
            emissive: 0x000033,
            emissiveIntensity: 0.2
        })
        
        // 左侧太阳能板
        const leftPanel = new THREE.Mesh(panelBaseGeometry, panelBaseMaterial)
        leftPanel.position.set(-0.55, 0, 0.5)
        panelGroup.add(leftPanel)
        
        // 右侧太阳能板
        const rightPanel = new THREE.Mesh(panelBaseGeometry, panelBaseMaterial)
        rightPanel.position.set(0.55, 0, 0.5)
        panelGroup.add(rightPanel)
        
        // 太阳能板网格线
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x4444aa,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        })
        
        const leftGrid = new THREE.Mesh(
            new THREE.PlaneGeometry(0.75, 0.3, 8, 4),
            gridMaterial
        )
        leftGrid.position.set(-0.55, 0.006, 0.5)
        panelGroup.add(leftGrid)
        
        const rightGrid = new THREE.Mesh(
            new THREE.PlaneGeometry(0.75, 0.3, 8, 4),
            gridMaterial
        )
        rightGrid.position.set(0.55, 0.006, 0.5)
        panelGroup.add(rightGrid)
        
        // 太阳能板支架
        const strutGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8)
        const strutMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.3
        })
        
        const leftStrut = new THREE.Mesh(strutGeometry, strutMaterial)
        leftStrut.rotation.z = Math.PI / 2
        leftStrut.position.set(-0.35, 0, 0.5)
        panelGroup.add(leftStrut)
        
        const rightStrut = new THREE.Mesh(strutGeometry, strutMaterial)
        rightStrut.rotation.z = Math.PI / 2
        rightStrut.position.set(0.35, 0, 0.5)
        panelGroup.add(rightStrut)
        
        spacecraftGroup.add(panelGroup)
        this.solarPanels = panelGroup
        
        // === 7. 天线系统 (Antenna System) ===
        const antennaGeometry = new THREE.CylinderGeometry(0.005, 0.008, 0.3, 8)
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.9,
            roughness: 0.2
        })
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
        antenna.position.set(0, 0.2, 0.8)
        spacecraftGroup.add(antenna)
        
        // 天线碟形
        const dishGeometry = new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3)
        const dishMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.7,
            roughness: 0.3,
            side: THREE.DoubleSide
        })
        const dish = new THREE.Mesh(dishGeometry, dishMaterial)
        dish.rotation.x = Math.PI
        dish.position.set(0, 0.35, 0.8)
        spacecraftGroup.add(dish)
        
        // === 8. 姿态控制推进器 (RCS Thrusters) ===
        this.addRCSThrustersDetailed(spacecraftGroup)
        
        // === 9. 发动机火焰效果 ===
        const flameGeometry = new THREE.ConeGeometry(0.12, 0.6, 16, 1, true)
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        })
        this.engineFlame = new THREE.Mesh(flameGeometry, flameMaterial)
        this.engineFlame.rotation.x = -Math.PI / 2
        this.engineFlame.position.z = -0.9
        spacecraftGroup.add(this.engineFlame)
        
        // 内层火焰
        const innerFlameGeometry = new THREE.ConeGeometry(0.06, 0.4, 16, 1, true)
        const innerFlameMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        })
        this.innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial)
        this.innerFlame.rotation.x = -Math.PI / 2
        this.innerFlame.position.z = -0.8
        spacecraftGroup.add(this.innerFlame)
        
        // === 10. 标识和标记 ===
        // 国旗标记
        const flagGeometry = new THREE.PlaneGeometry(0.08, 0.05)
        const flagMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide
        })
        const flag = new THREE.Mesh(flagGeometry, flagMaterial)
        flag.position.set(0.16, 0, 0.3)
        flag.rotation.y = Math.PI / 2
        spacecraftGroup.add(flag)
        
        // 任务标识
        const labelGeometry = new THREE.PlaneGeometry(0.12, 0.04)
        const labelMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066cc,
            side: THREE.DoubleSide
        })
        const label = new THREE.Mesh(labelGeometry, labelMaterial)
        label.position.set(-0.16, 0, 0.3)
        label.rotation.y = -Math.PI / 2
        spacecraftGroup.add(label)
        
        this.spacecraft = spacecraftGroup
        this.spacecraft.position.copy(this.spacecraftData.position)
        this.scene.add(this.spacecraft)
        
        // Add orbital trail
        this.createOrbitalTrail()
        
        // Store reference to panels for animation
        this.panelsDeployed = true
    }
    
    /**
     * Create spacecraft configuration panel
     */
    createSpacecraftConfigPanel() {
        const panel = document.createElement('div')
        panel.id = 'spacecraft-config-panel'
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(5, 10, 20, 0.95) 100%);
            border: 3px solid rgba(0, 200, 255, 0.6);
            border-radius: 15px;
            padding: 25px;
            width: 900px;
            max-height: 85vh;
            overflow-y: auto;
            z-index: 2000;
            box-shadow: 0 0 50px rgba(0, 200, 255, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            display: none;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 200, 255, 0.5) rgba(10, 15, 30, 0.8);
        `
        
        panel.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00c8ff; font-size: 24px; margin: 0; text-shadow: 0 0 10px rgba(0, 200, 255, 0.6);">
                    🚀 航天器配置面板 | Spacecraft Configuration
                </h2>
                <p style="color: #88aacc; font-size: 12px; margin: 5px 0 0 0;">配置航天器参数，点击“应用”后生效</p>
            </div>
            
            <!-- 基本信息 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #00c8ff; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(0, 200, 255, 0.3); padding-bottom: 8px;">
                    📋 基本信息 | Basic Information
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">航天器名称 | Name</label>
                        <input id="sc-name" type="text" value="探索者一号" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">航天器类型 | Type</label>
                        <select id="sc-type" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                            <option value="载人飞船" selected>载人飞船 | Crew Vehicle</option>
                            <option value="货运飞船">货运飞船 | Cargo Vehicle</option>
                            <option value="探测器">探测器 | Probe</option>
                            <option value="空间站">空间站 | Space Station</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- 质量参数 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #00c8ff; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(0, 200, 255, 0.3); padding-bottom: 8px;">
                    ⚖️ 质量参数 | Mass Parameters (kg)
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">干质量 | Dry Mass</label>
                        <input id="sc-dry-mass" type="number" value="850" min="100" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">燃料质量 | Fuel Mass</label>
                        <input id="sc-fuel-mass" type="number" value="450" min="50" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">总质量 | Total Mass</label>
                        <input id="sc-total-mass" type="number" value="1300" readonly style="width: 100%; padding: 8px; background: rgba(0, 20, 40, 0.8); border: 2px solid rgba(0, 150, 200, 0.3); border-radius: 5px; color: #00ff88; font-size: 14px; font-weight: bold;">
                    </div>
                </div>
            </div>
            
            <!-- 发动机参数 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #ff6644; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(255, 100, 68, 0.3); padding-bottom: 8px;">
                    🔥 主发动机 | Main Engine
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">发动机类型 | Engine Type</label>
                        <select id="sc-engine-type" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 5px; color: #ff6644; font-size: 14px;">
                            <option value="液氧煤油发动机" selected>液氧煤油发动机 | LOX/Kerosene</option>
                            <option value="液氢液氧发动机">液氢液氧发动机 | LH2/LOX</option>
                            <option value="固体火箭发动机">固体火箭发动机 | Solid Rocket</option>
                            <option value="离子发动机">离子发动机 | Ion Engine</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">推力 | Thrust (kN)</label>
                        <input id="sc-thrust" type="number" value="3500" min="100" step="100" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 5px; color: #ff6644; font-size: 14px; font-weight: bold;">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">比冲 | ISP (s)</label>
                        <input id="sc-isp" type="number" value="311" min="50" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">燃烧时间 | Burn Time (s)</label>
                        <input id="sc-burn-time" type="number" value="380" min="10" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">燃料消耗率 | Consumption (kg/s)</label>
                        <input id="sc-consumption" type="number" value="12" min="1" step="0.1" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 100, 68, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                </div>
            </div>
            
            <!-- RCS参数 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #00ffff; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(0, 255, 255, 0.3); padding-bottom: 8px;">
                    🎯 RCS姿态控制系统 | Reaction Control System
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">单组推力 | Thrust per Cluster (kN)</label>
                        <input id="sc-rcs-thrust" type="number" value="0.5" min="0.1" step="0.1" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">比冲 | ISP (s)</label>
                        <input id="sc-rcs-isp" type="number" value="70" min="20" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">推进剂 | Monopropellant (kg)</label>
                        <input id="sc-rcs-mass" type="number" value="50" min="10" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 5px; color: #00ffff; font-size: 14px;">
                    </div>
                </div>
            </div>
            
            <!-- 尺寸参数 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(255, 170, 0, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #ffaa00; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(255, 170, 0, 0.3); padding-bottom: 8px;">
                    📏 尺寸参数 | Dimensions (m)
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">总长度 | Length</label>
                        <input id="sc-length" type="number" value="8.5" min="1" step="0.1" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 170, 0, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">直径 | Diameter</label>
                        <input id="sc-diameter" type="number" value="2.8" min="0.5" step="0.1" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 170, 0, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">太阳能板展宽 | Span</label>
                        <input id="sc-span" type="number" value="12.0" min="2" step="0.5" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(255, 170, 0, 0.3); border-radius: 5px; color: #ffaa00; font-size: 14px;">
                    </div>
                </div>
            </div>
            
            <!-- 电力系统 -->
            <div style="background: rgba(0, 20, 40, 0.6); border: 2px solid rgba(0, 255, 136, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #00ff88; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid rgba(0, 255, 136, 0.3); padding-bottom: 8px;">
                     电力系统 | Power System
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">太阳能板输出 | Solar Output (kW)</label>
                        <input id="sc-solar" type="number" value="4.5" min="0.5" step="0.5" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 136, 0.3); border-radius: 5px; color: #00ff88; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">电池容量 | Battery (kWh)</label>
                        <input id="sc-battery" type="number" value="50" min="10" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 136, 0.3); border-radius: 5px; color: #00ff88; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #88aacc; font-size: 12px; display: block; margin-bottom: 5px;">当前电量 | Current Power (%)</label>
                        <input id="sc-power" type="number" value="100" min="0" max="100" style="width: 100%; padding: 8px; background: rgba(0, 10, 20, 0.8); border: 2px solid rgba(0, 255, 136, 0.3); border-radius: 5px; color: #00ff88; font-size: 14px;">
                    </div>
                </div>
            </div>
            
            <!-- 按钮组 -->
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                <button id="sc-apply-btn" style="padding: 12px 40px; background: linear-gradient(135deg, #00c8ff 0%, #0088cc 100%); border: 2px solid #00ffff; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 0 20px rgba(0, 200, 255, 0.4); transition: all 0.3s ease;">
                    ✅ 应用配置 | Apply
                </button>
                <button id="sc-reset-btn" style="padding: 12px 40px; background: linear-gradient(135deg, #666666 0%, #444444 100%); border: 2px solid #888888; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s ease;">
                    🔄 重置默认 | Reset
                </button>
                <button id="sc-close-btn" style="padding: 12px 40px; background: linear-gradient(135deg, #ff4444 0%, #cc2222 100%); border: 2px solid #ff6666; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s ease;">
                    ❌ 关闭 | Close
                </button>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: rgba(0, 20, 40, 0.4); border-radius: 5px; text-align: center;">
                <p style="color: #88aacc; font-size: 11px; margin: 0;">
                    💡 提示：修改参数后点击“应用”按钮，航天器将使用新配置重新生成
                </p>
            </div>
        `
        
        document.body.appendChild(panel)
        this.configPanel = panel
        
        // Setup event listeners
        this.setupConfigPanelEvents()
    }
    
    /**
     * Setup configuration panel event listeners
     */
    setupConfigPanelEvents() {
        if (!this.configPanel) return
        
        // 自动计算总质量
        const dryMassInput = document.getElementById('sc-dry-mass')
        const fuelMassInput = document.getElementById('sc-fuel-mass')
        const totalMassInput = document.getElementById('sc-total-mass')
        
        const updateTotalMass = () => {
            const dry = parseFloat(dryMassInput.value) || 0
            const fuel = parseFloat(fuelMassInput.value) || 0
            totalMassInput.value = dry + fuel
        }
        
        dryMassInput.addEventListener('input', updateTotalMass)
        fuelMassInput.addEventListener('input', updateTotalMass)
        
        // 应用配置按钮
        document.getElementById('sc-apply-btn').addEventListener('click', () => {
            this.applySpacecraftConfig()
        })
        
        // 重置按钮
        document.getElementById('sc-reset-btn').addEventListener('click', () => {
            this.resetSpacecraftConfig()
        })
        
        // 关闭按钮
        document.getElementById('sc-close-btn').addEventListener('click', () => {
            this.toggleConfigPanel()
        })
    }
    
    /**
     * Apply spacecraft configuration
     */
    applySpacecraftConfig() {
        // 读取所有配置值
        this.spacecraftConfig.name = document.getElementById('sc-name').value
        this.spacecraftConfig.type = document.getElementById('sc-type').value
        
        this.spacecraftConfig.dryMass = parseFloat(document.getElementById('sc-dry-mass').value)
        this.spacecraftConfig.fuelMass = parseFloat(document.getElementById('sc-fuel-mass').value)
        this.spacecraftConfig.totalMass = this.spacecraftConfig.dryMass + this.spacecraftConfig.fuelMass
        
        this.spacecraftConfig.engine.type = document.getElementById('sc-engine-type').value
        this.spacecraftConfig.engine.thrust = parseFloat(document.getElementById('sc-thrust').value)
        this.spacecraftConfig.engine.isp = parseFloat(document.getElementById('sc-isp').value)
        this.spacecraftConfig.engine.burnTime = parseFloat(document.getElementById('sc-burn-time').value)
        this.spacecraftConfig.engine.fuelConsumption = parseFloat(document.getElementById('sc-consumption').value)
        
        this.spacecraftConfig.rcs.thrust = parseFloat(document.getElementById('sc-rcs-thrust').value)
        this.spacecraftConfig.rcs.isp = parseFloat(document.getElementById('sc-rcs-isp').value)
        this.spacecraftConfig.rcs.monopropellant = parseFloat(document.getElementById('sc-rcs-mass').value)
        
        this.spacecraftConfig.dimensions.length = parseFloat(document.getElementById('sc-length').value)
        this.spacecraftConfig.dimensions.diameter = parseFloat(document.getElementById('sc-diameter').value)
        this.spacecraftConfig.dimensions.span = parseFloat(document.getElementById('sc-span').value)
        
        this.spacecraftConfig.power.solarPanelOutput = parseFloat(document.getElementById('sc-solar').value)
        this.spacecraftConfig.power.batteryCapacity = parseFloat(document.getElementById('sc-battery').value)
        this.spacecraftConfig.power.currentPower = parseFloat(document.getElementById('sc-power').value)
        
        // 更新物理参数
        this.spacecraftData.mass = this.spacecraftConfig.totalMass
        this.spacecraftData.fuel = 100
        this.spacecraftData.monopropellant = 100
        
        // 重新生成航天器
        this.scene.remove(this.spacecraft)
        if (this.orbitalTrail) this.scene.remove(this.orbitalTrail)
        
        this.initSpacecraft()
        
        console.log('Spacecraft configuration applied:', this.spacecraftConfig)
        
        // 显示成功消息
        this.showNotification('✅ 航天器配置已应用！', '#00ff88')
    }
    
    /**
     * Reset spacecraft configuration to defaults
     */
    resetSpacecraftConfig() {
        document.getElementById('sc-name').value = '探索者一号'
        document.getElementById('sc-type').value = '载人飞船'
        document.getElementById('sc-dry-mass').value = 850
        document.getElementById('sc-fuel-mass').value = 450
        document.getElementById('sc-engine-type').value = '液氧煤油发动机'
        document.getElementById('sc-thrust').value = 3500
        document.getElementById('sc-isp').value = 311
        document.getElementById('sc-burn-time').value = 380
        document.getElementById('sc-consumption').value = 12
        document.getElementById('sc-rcs-thrust').value = 0.5
        document.getElementById('sc-rcs-isp').value = 70
        document.getElementById('sc-rcs-mass').value = 50
        document.getElementById('sc-length').value = 8.5
        document.getElementById('sc-diameter').value = 2.8
        document.getElementById('sc-span').value = 12.0
        document.getElementById('sc-solar').value = 4.5
        document.getElementById('sc-battery').value = 50
        document.getElementById('sc-power').value = 100
        
        document.getElementById('sc-total-mass').value = 1300
        
        this.showNotification('🔄 已重置为默认配置', '#ffaa00')
    }
    
    /**
     * Toggle configuration panel visibility
     */
    toggleConfigPanel() {
        if (!this.configPanel) {
            this.createSpacecraftConfigPanel()
        }
        
        if (this.configPanel.style.display === 'none' || !this.configPanel.style.display) {
            this.configPanel.style.display = 'block'
        } else {
            this.configPanel.style.display = 'none'
        }
    }
    
    /**
     * Show notification message
     */
    showNotification(message, color = '#00c8ff') {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(5, 10, 20, 0.9) 100%);
            border: 2px solid ${color};
            border-radius: 10px;
            padding: 20px 40px;
            color: ${color};
            font-size: 18px;
            font-weight: bold;
            z-index: 3000;
            box-shadow: 0 0 30px ${color}40;
            backdrop-filter: blur(10px);
            animation: fadeInOut 2s ease-in-out;
        `
        notification.textContent = message
        document.body.appendChild(notification)
        
        // Add animation
        const style = document.createElement('style')
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `
        document.head.appendChild(style)
        
        setTimeout(() => {
            document.body.removeChild(notification)
        }, 2000)
    }
    
    /**
     * Create orbital path visualization
     */
    createOrbitalTrail() {
        const trailLength = 300
        const trailGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(trailLength * 3)
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        })
        
        this.orbitalTrail = new THREE.Line(trailGeometry, trailMaterial)
        this.trailPositions = []
        this.maxTrailLength = trailLength
        this.scene.add(this.orbitalTrail)
    }
    
    /**
     * Create Professional Navball (attitude indicator)
     */
    createNavball() {
        const navballContainer = document.createElement('div')
        navballContainer.id = 'navball-container'
        navballContainer.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle at center, #0a0e1a 0%, #050810 100%);
            border: 4px solid rgba(0, 200, 255, 0.6);
            box-shadow: 
                0 0 30px rgba(0, 200, 255, 0.4),
                inset 0 0 40px rgba(0, 0, 0, 0.8),
                0 0 60px rgba(0, 150, 255, 0.2);
            overflow: hidden;
            z-index: 1000;
        `
        
        // Inner rotating sphere with pitch lines
        const navballInner = document.createElement('div')
        navballInner.id = 'navball-inner'
        navballInner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 180px;
            height: 180px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: 
                radial-gradient(circle at 50% 0%, rgba(0, 100, 255, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 50% 100%, rgba(255, 100, 0, 0.3) 0%, transparent 50%);
            opacity: 0.9;
            transition: transform 0.1s ease-out;
        `
        navballContainer.appendChild(navballInner)
        
        // Add pitch ladder lines
        for (let i = -90; i <= 90; i += 10) {
            if (i === 0) continue
            const line = document.createElement('div')
            const yOffset = (i / 90) * 80
            const lineWidth = i % 30 === 0 ? 60 : 40
            
            line.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, calc(-50% + ${yOffset}px));
                width: ${lineWidth}px;
                height: 2px;
                background: rgba(255, 255, 255, 0.6);
                box-shadow: 0 0 3px rgba(255, 255, 255, 0.4);
            `
            navballInner.appendChild(line)
        }
        
        // Horizon line
        const horizonLine = document.createElement('div')
        horizonLine.style.cssText = `
            position: absolute;
            top: 50%;
            left: 10%;
            width: 80%;
            height: 3px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.8) 20%, 
                rgba(255, 255, 255, 0.9) 50%, 
                rgba(255, 255, 255, 0.8) 80%, 
                transparent 100%);
            transform: translateY(-50%);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        `
        navballInner.appendChild(horizonLine)
        
        // Center aircraft symbol (fixed)
        const aircraftSymbol = document.createElement('div')
        aircraftSymbol.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            z-index: 10;
        `
        
        // Wings
        const leftWing = document.createElement('div')
        leftWing.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            width: 18px;
            height: 3px;
            background: #ffff00;
            transform: translateY(-50%);
            box-shadow: 0 0 8px rgba(255, 255, 0, 0.8);
        `
        
        const rightWing = document.createElement('div')
        rightWing.style.cssText = `
            position: absolute;
            top: 50%;
            right: 0;
            width: 18px;
            height: 3px;
            background: #ffff00;
            transform: translateY(-50%);
            box-shadow: 0 0 8px rgba(255, 255, 0, 0.8);
        `
        
        // Center dot
        const centerDot = document.createElement('div')
        centerDot.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            background: #ffff00;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255, 255, 0, 1);
        `
        
        aircraftSymbol.appendChild(leftWing)
        aircraftSymbol.appendChild(rightWing)
        aircraftSymbol.appendChild(centerDot)
        navballContainer.appendChild(aircraftSymbol)
        
        // Prograde marker
        const progradeMarker = document.createElement('div')
        progradeMarker.id = 'navball-prograde'
        progradeMarker.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            transform: translate(-50%, -50%);
            border: 2px solid #00ff88;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
            display: none;
        `
        navballContainer.appendChild(progradeMarker)
        
        // Degree markers around edge
        for (let i = 0; i < 360; i += 30) {
            const marker = document.createElement('div')
            const angle = (i - 90) * Math.PI / 180
            const radius = 90
            const x = Math.cos(angle) * radius + 100 - 3
            const y = Math.sin(angle) * radius + 100 - 3
            
            marker.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                color: rgba(0, 200, 255, 0.8);
                font-size: 10px;
                font-weight: bold;
                transform: translate(-50%, -50%);
                text-shadow: 0 0 5px rgba(0, 200, 255, 0.6);
            `
            marker.textContent = i
            navballContainer.appendChild(marker)
        }
        
        document.body.appendChild(navballContainer)
        this.navball = { 
            container: navballContainer, 
            inner: navballInner,
            prograde: progradeMarker
        }
    }
    
    /**
     * Add detailed RCS thrusters
     */
    addRCSThrustersDetailed(spacecraftGroup) {
        const rcsThrusterGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8)
        const rcsMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.9,
            roughness: 0.2
        })
        
        // 8个RCS推进器分布在航天器周围
        const positions = [
            { pos: [0.16, 0.1, 0.5], rot: [0, 0, Math.PI / 2] },   // 前上
            { pos: [-0.16, 0.1, 0.5], rot: [0, 0, Math.PI / 2] },  // 前上
            { pos: [0.16, -0.1, 0.5], rot: [0, 0, Math.PI / 2] },  // 前下
            { pos: [-0.16, -0.1, 0.5], rot: [0, 0, Math.PI / 2] }, // 前下
            { pos: [0.16, 0, -0.3], rot: [0, 0, -Math.PI / 2] },   // 后上
            { pos: [-0.16, 0, -0.3], rot: [0, 0, -Math.PI / 2] },  // 后上
            { pos: [0.16, 0, -0.5], rot: [0, 0, -Math.PI / 2] },   // 后下
            { pos: [-0.16, 0, -0.5], rot: [0, 0, -Math.PI / 2] }   // 后下
        ]
        
        this.rcsThrusters = []
        positions.forEach((data, index) => {
            const thruster = new THREE.Mesh(rcsThrusterGeometry, rcsMaterial)
            thruster.position.set(...data.pos)
            thruster.rotation.set(...data.rot)
            spacecraftGroup.add(thruster)
            
            // 添加火焰效果
            const flameGeometry = new THREE.SphereGeometry(0.015, 8, 8)
            const flameMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0
            })
            const flame = new THREE.Mesh(flameGeometry, flameMaterial)
            flame.position.set(0, 0, data.pos[2] > 0 ? 0.04 : -0.04)
            thruster.add(flame)
            
            this.rcsThrusters.push({ mesh: thruster, flame: flame })
        })
    }
    
    /**
     * Create Professional HUD with KSP-style instruments
     */
    createHUD() {
        // Main HUD container
        const hudContainer = document.createElement('div')
        hudContainer.id = 'ksp-hud'
        hudContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            font-family: 'Consolas', 'Courier New', monospace;
        `
        
        // Top bar - Mission time and status
        const topBar = document.createElement('div')
        topBar.id = 'hud-top-bar'
        topBar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(180deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 10, 20, 0.85) 100%);
            border: 2px solid rgba(0, 255, 255, 0.6);
            border-radius: 8px;
            padding: 12px 30px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        `
        topBar.innerHTML = `
            <div style="color: #00ffff; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px;">MISSION ELAPSED TIME</div>
            <div id="hud-mission-time" style="color: #ffffff; font-size: 28px; font-weight: bold; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); font-family: 'Courier New', monospace;">T+ 00:00:00</div>
        `
        hudContainer.appendChild(topBar)
        
        // Left panel - Orbital parameters
        const leftPanel = document.createElement('div')
        leftPanel.id = 'hud-orbital-panel'
        leftPanel.style.cssText = `
            position: absolute;
            top: 100px;
            left: 15px;
            background: linear-gradient(135deg, rgba(0, 15, 30, 0.95) 0%, rgba(0, 10, 20, 0.9) 100%);
            border: 2px solid rgba(0, 200, 255, 0.5);
            border-radius: 10px;
            padding: 15px;
            min-width: 220px;
            box-shadow: 0 4px 20px rgba(0, 150, 255, 0.2);
            backdrop-filter: blur(10px);
        `
        leftPanel.innerHTML = `
            <div style="color: #00c8ff; font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid rgba(0, 200, 255, 0.3); padding-bottom: 8px; letter-spacing: 1px;">
                🛰️ ORBITAL PARAMETERS
            </div>
            <div style="display: grid; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">APOAPSIS</span>
                    <span id="hud-apoapsis" style="color: #00ff88; font-size: 16px; font-weight: bold; text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);">-- km</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">PERIAPSIS</span>
                    <span id="hud-periapsis" style="color: #00ff88; font-size: 16px; font-weight: bold; text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);">-- km</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">INCLINATION</span>
                    <span id="hud-inclination" style="color: #ffaa00; font-size: 16px; font-weight: bold;">--°</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">PERIOD</span>
                    <span id="hud-period" style="color: #ffaa00; font-size: 16px; font-weight: bold;">-- s</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">ECCENTRICITY</span>
                    <span id="hud-eccentricity" style="color: #ff66aa; font-size: 16px; font-weight: bold;">--</span>
                </div>
            </div>
        `
        hudContainer.appendChild(leftPanel)
        
        // Right panel - Vessel status with gauges
        const rightPanel = document.createElement('div')
        rightPanel.id = 'hud-vessel-panel'
        rightPanel.style.cssText = `
            position: absolute;
            top: 100px;
            right: 15px;
            background: linear-gradient(135deg, rgba(0, 15, 30, 0.95) 0%, rgba(0, 10, 20, 0.9) 100%);
            border: 2px solid rgba(0, 200, 255, 0.5);
            border-radius: 10px;
            padding: 15px;
            min-width: 240px;
            box-shadow: 0 4px 20px rgba(0, 150, 255, 0.2);
            backdrop-filter: blur(10px);
        `
        rightPanel.innerHTML = `
            <div style="color: #00c8ff; font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid rgba(0, 200, 255, 0.3); padding-bottom: 8px; letter-spacing: 1px;">
                 VESSEL STATUS
            </div>
            
            <!-- Altitude and Velocity -->
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #88aacc; font-size: 12px;">ALTITUDE</span>
                    <span id="hud-altitude" style="color: #00ffff; font-size: 18px; font-weight: bold; text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);">-- km</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #88aacc; font-size: 12px;">VELOCITY</span>
                    <span id="hud-velocity" style="color: #00ffff; font-size: 18px; font-weight: bold; text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);">-- m/s</span>
                </div>
            </div>
            
            <!-- Fuel gauge with progress bar -->
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: #88aacc; font-size: 12px;">FUEL LEVEL</span>
                    <span id="hud-fuel" style="color: #00ff88; font-size: 16px; font-weight: bold;">100%</span>
                </div>
                <div style="width: 100%; height: 16px; background: rgba(0, 50, 100, 0.6); border: 2px solid rgba(0, 255, 136, 0.4); border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);">
                    <div id="hud-fuel-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #00ff88 0%, #00cc66 100%); box-shadow: 0 0 10px rgba(0, 255, 136, 0.6); transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <!-- Throttle gauge -->
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: #88aacc; font-size: 12px;">THROTTLE</span>
                    <span id="hud-throttle" style="color: #ffaa00; font-size: 16px; font-weight: bold;">0%</span>
                </div>
                <div style="width: 100%; height: 16px; background: rgba(0, 50, 100, 0.6); border: 2px solid rgba(255, 170, 0, 0.4); border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);">
                    <div id="hud-throttle-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ffaa00 0%, #ff6600 100%); box-shadow: 0 0 10px rgba(255, 170, 0, 0.6); transition: width 0.2s ease;"></div>
                </div>
            </div>
            
            <!-- Thrust indicator -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: #88aacc; font-size: 12px;">ENGINE THRUST</span>
                    <span id="hud-thrust" style="color: #ff6644; font-size: 16px; font-weight: bold;">0 kN</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(0, 50, 100, 0.6); border: 1px solid rgba(255, 100, 68, 0.4); border-radius: 4px; overflow: hidden;">
                    <div id="hud-thrust-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ff6644 0%, #ff3322 100%); transition: width 0.2s ease;"></div>
                </div>
            </div>
        `
        hudContainer.appendChild(rightPanel)
        
        // Bottom panel - SAS, RCS and controls
        const bottomPanel = document.createElement('div')
        bottomPanel.id = 'hud-controls-panel'
        bottomPanel.style.cssText = `
            position: absolute;
            bottom: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(180deg, rgba(0, 15, 30, 0.95) 0%, rgba(0, 10, 20, 0.9) 100%);
            border: 2px solid rgba(0, 200, 255, 0.5);
            border-radius: 10px;
            padding: 12px 20px;
            box-shadow: 0 4px 20px rgba(0, 150, 255, 0.2);
            backdrop-filter: blur(10px);
            text-align: center;
        `
        bottomPanel.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                <!-- SAS indicator -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 15px; background: rgba(0, 50, 100, 0.4); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 6px;">
                    <div id="hud-sas-indicator" style="width: 12px; height: 12px; background: #666666; border-radius: 50%; box-shadow: 0 0 5px rgba(0, 0, 0, 0.5); transition: all 0.3s ease;"></div>
                    <span style="color: #00c8ff; font-size: 12px; font-weight: bold;">SAS</span>
                </div>
                
                <!-- RCS indicator -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 15px; background: rgba(0, 50, 100, 0.4); border: 2px solid rgba(0, 255, 255, 0.3); border-radius: 6px;">
                    <div id="hud-rcs-indicator" style="width: 12px; height: 12px; background: #666666; border-radius: 50%; box-shadow: 0 0 5px rgba(0, 0, 0, 0.5); transition: all 0.3s ease;"></div>
                    <span style="color: #00c8ff; font-size: 12px; font-weight: bold;">RCS</span>
                </div>
                
                <!-- Time warp indicator -->
                <div style="padding: 8px 15px; background: rgba(0, 50, 100, 0.4); border: 2px solid rgba(255, 170, 0, 0.3); border-radius: 6px;">
                    <span style="color: #ffaa00; font-size: 12px; font-weight: bold;">⏱️ TIME WARP: </span>
                    <span id="hud-timewarp" style="color: #ffaa00; font-size: 14px; font-weight: bold;">1x</span>
                </div>
                
                <!-- Camera mode -->
                <div style="padding: 8px 15px; background: rgba(0, 50, 100, 0.4); border: 2px solid rgba(255, 100, 200, 0.3); border-radius: 6px;">
                    <span style="color: #ff66cc; font-size: 12px; font-weight: bold;">📷 </span>
                    <span id="hud-camera-mode" style="color: #ff66cc; font-size: 12px;">FREE ROAM</span>
                </div>
            </div>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0, 200, 255, 0.2); font-size: 11px; color: #668899;">
                <span style="margin: 0 8px;">W/S - Pitch</span>
                <span style="margin: 0 8px;">A/D - Yaw</span>
                <span style="margin: 0 8px;">Q/E - Roll</span>
                <span style="margin: 0 8px;">SHIFT/CTRL - Throttle</span>
                <span style="margin: 0 8px;">Z - SAS</span>
                <span style="margin: 0 8px;">X - RCS</span>
                <span style="margin: 0 8px;">SPACE - Camera</span>
                <span style="margin: 0 8px;">T - Time Warp</span>
                <span style="margin: 0 8px;">R - Reset</span>
            </div>
        `
        hudContainer.appendChild(bottomPanel)
        
        document.body.appendChild(hudContainer)
        
        this.hudElements = {
            missionTime: document.getElementById('hud-mission-time'),
            apoapsis: document.getElementById('hud-apoapsis'),
            periapsis: document.getElementById('hud-periapsis'),
            inclination: document.getElementById('hud-inclination'),
            period: document.getElementById('hud-period'),
            eccentricity: document.getElementById('hud-eccentricity'),
            altitude: document.getElementById('hud-altitude'),
            velocity: document.getElementById('hud-velocity'),
            thrust: document.getElementById('hud-thrust'),
            thrustBar: document.getElementById('hud-thrust-bar'),
            throttle: document.getElementById('hud-throttle'),
            throttleBar: document.getElementById('hud-throttle-bar'),
            fuel: document.getElementById('hud-fuel'),
            fuelBar: document.getElementById('hud-fuel-bar'),
            sasIndicator: document.getElementById('hud-sas-indicator'),
            rcsIndicator: document.getElementById('hud-rcs-indicator'),
            timeWarp: document.getElementById('hud-timewarp'),
            cameraMode: document.getElementById('hud-camera-mode')
        }
    }
    
    /**
     * Setup keyboard controls
     */
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true
            
            if (e.code === 'Space') {
                this.toggleCameraMode()
            }
            
            if (e.code === 'KeyT') {
                this.cycleTimeWarp()
            }
            
            if (e.code === 'KeyR') {
                this.resetSpacecraft()
            }
            
            // SAS toggle
            if (e.code === 'KeyZ') {
                this.toggleSAS()
            }
            
            // RCS toggle
            if (e.code === 'KeyX') {
                this.toggleRCS()
            }
            
            // Throttle controls
            if (e.code === 'ShiftLeft') {
                e.preventDefault()
            }
        })
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false
        })
    }
    
    /**
     * Toggle SAS (Stability Assist System)
     */
    toggleSAS() {
        this.controlSystems.sasEnabled = !this.controlSystems.sasEnabled
        if (this.controlSystems.sasEnabled) {
            // Lock current orientation as target
            this.controlSystems.targetOrientation.copy(this.spacecraft.quaternion)
            console.log('SAS Enabled - Stability locked')
        } else {
            console.log('SAS Disabled')
        }
    }
    
    /**
     * Toggle RCS (Reaction Control System)
     */
    toggleRCS() {
        this.controlSystems.rcsEnabled = !this.controlSystems.rcsEnabled
        console.log(`RCS ${this.controlSystems.rcsEnabled ? 'Enabled' : 'Disabled'}`)
    }
    
    /**
     * Handle spacecraft controls with enhanced features
     */
    handleControls(deltaTime) {
        if (!this.spacecraft) return
        
        const pitchSpeed = 1.0 * deltaTime
        const yawSpeed = 1.0 * deltaTime
        const rollSpeed = 1.2 * deltaTime
        
        // Manual rotation controls (only when SAS is off)
        if (!this.controlSystems.sasEnabled) {
            if (this.keys['KeyW']) this.spacecraft.rotateX(pitchSpeed)
            if (this.keys['KeyS']) this.spacecraft.rotateX(-pitchSpeed)
            if (this.keys['KeyA']) this.spacecraft.rotateY(yawSpeed)
            if (this.keys['KeyD']) this.spacecraft.rotateY(-yawSpeed)
            if (this.keys['KeyQ']) this.spacecraft.rotateZ(rollSpeed)
            if (this.keys['KeyE']) this.spacecraft.rotateZ(-rollSpeed)
        } else {
            // SAS auto-stabilization
            this.applySAS(deltaTime)
        }
        
        // RCS attitude control (uses monopropellant)
        if (this.controlSystems.rcsEnabled && this.spacecraftData.monopropellant > 0) {
            this.applyRCS(deltaTime)
        }
        
        // Throttle control (Z/X keys or Shift/Ctrl)
        let throttleChange = 0
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            throttleChange = 0.5 * deltaTime // Increase throttle
        } else if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            throttleChange = -0.5 * deltaTime // Decrease throttle
        }
        
        this.spacecraftData.throttle = Math.max(0, Math.min(1, this.spacecraftData.throttle + throttleChange))
        
        // Apply main engine thrust based on throttle
        if (this.spacecraftData.fuel > 0 && this.spacecraftData.throttle > 0.01) {
            const thrustForce = this.spacecraftData.throttle * 50 * deltaTime
            
            const forward = new THREE.Vector3(0, 0, 1)
            forward.applyQuaternion(this.spacecraft.quaternion)
            
            this.spacecraftData.velocity.add(forward.multiplyScalar(thrustForce))
            
            // Fuel consumption proportional to throttle
            this.spacecraftData.fuel -= this.spacecraftData.throttle * 2 * deltaTime
            this.spacecraftData.fuel = Math.max(0, this.spacecraftData.fuel)
            
            // Engine glow intensity based on throttle (only if engineGlow exists)
            if (this.engineGlow) {
                this.engineGlow.material.opacity = this.spacecraftData.throttle * 0.8
                this.engineGlow.scale.setScalar(1 + this.spacecraftData.throttle * 0.5)
            }
        } else {
            // Only update engineGlow if it exists
            if (this.engineGlow) {
                this.engineGlow.material.opacity = 0
                this.engineGlow.scale.setScalar(1)
            }
        }
    }
    
    /**
     * Apply SAS stabilization
     */
    applySAS(deltaTime) {
        const target = this.controlSystems.targetOrientation
        const current = this.spacecraft.quaternion
        
        // Calculate difference
        const diff = new THREE.Quaternion().copy(target).invert().multiply(current)
        
        // Convert to axis-angle for easier interpolation
        const angle = 2 * Math.acos(Math.abs(diff.w))
        
        // Only stabilize if deviation is significant
        if (angle > 0.01) {
            const stabilityStrength = 2.0 * (this.controlSystems.stabilityLevel + 1)
            current.slerp(target, stabilityStrength * deltaTime)
            current.normalize()
        }
    }
    
    /**
     * Apply RCS thruster forces
     */
    applyRCS(deltaTime) {
        const rcsForce = 10 * deltaTime // RCS is weaker than main engine
        
        // Pitch control
        if (this.keys['KeyW']) {
            this.spacecraft.rotateX(0.5 * deltaTime)
            this.animateRCSThruster([0, 1, 0])
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        if (this.keys['KeyS']) {
            this.spacecraft.rotateX(-0.5 * deltaTime)
            this.animateRCSThruster([0, -1, 0])
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        
        // Yaw control
        if (this.keys['KeyA']) {
            this.spacecraft.rotateY(0.5 * deltaTime)
            this.animateRCSThruster([0, 0, 1])
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        if (this.keys['KeyD']) {
            this.spacecraft.rotateY(-0.5 * deltaTime)
            this.animateRCSThruster([0, 0, -1])
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        
        // Roll control
        if (this.keys['KeyQ']) {
            this.spacecraft.rotateZ(0.6 * deltaTime)
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        if (this.keys['KeyE']) {
            this.spacecraft.rotateZ(-0.6 * deltaTime)
            this.spacecraftData.monopropellant -= 0.5 * deltaTime
        }
        
        this.spacecraftData.monopropellant = Math.max(0, this.spacecraftData.monopropellant)
    }
    
    /**
     * Animate RCS thruster firing
     */
    animateRCSThruster(direction) {
        if (!this.rcsThrusters) return
        
        // Flash random RCS thrusters
        const activeThruster = this.rcsThrusters[Math.floor(Math.random() * this.rcsThrusters.length)]
        if (activeThruster) {
            activeThruster.material.opacity = 1.0
            setTimeout(() => {
                activeThruster.material.opacity = 0
            }, 100)
        }
    }
    
    /**
     * Update spacecraft physics
     */
    updatePhysics(deltaTime) {
        if (!this.spacecraft) return
        
        const GM = 398600 // Earth's gravitational parameter (scaled)
        
        const distance = this.spacecraft.position.length()
        const gravityMagnitude = GM / (distance * distance)
        const gravityDirection = this.spacecraft.position.clone().normalize().negate()
        
        const gravityAcceleration = gravityDirection.multiplyScalar(gravityMagnitude * deltaTime)
        this.spacecraftData.velocity.add(gravityAcceleration)
        
        const displacement = this.spacecraftData.velocity.clone().multiplyScalar(deltaTime)
        this.spacecraftData.position.add(displacement)
        this.spacecraft.position.copy(this.spacecraftData.position)
        
        this.updateOrbitalTrail()
        this.calculateOrbitalParameters()
    }
    
    /**
     * Update orbital trail
     */
    updateOrbitalTrail() {
        if (!this.orbitalTrail) return
        
        this.trailPositions.push(this.spacecraft.position.clone())
        
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift()
        }
        
        const positions = this.orbitalTrail.geometry.attributes.position.array
        for (let i = 0; i < this.trailPositions.length; i++) {
            positions[i * 3] = this.trailPositions[i].x
            positions[i * 3 + 1] = this.trailPositions[i].y
            positions[i * 3 + 2] = this.trailPositions[i].z
        }
        
        this.orbitalTrail.geometry.attributes.position.needsUpdate = true
        this.orbitalTrail.geometry.setDrawRange(0, this.trailPositions.length)
    }
    
    /**
     * Calculate orbital parameters
     */
    calculateOrbitalParameters() {
        const r = this.spacecraftData.position.length()
        const v = this.spacecraftData.velocity.length()
        
        const GM = 398600
        const earthRadius = 2
        
        const energy = (v * v) / 2 - GM / r
        const a = -GM / (2 * energy)
        
        const h = this.spacecraftData.position.clone().cross(this.spacecraftData.velocity)
        const e_vec = this.spacecraftData.velocity.clone().cross(h).divideScalar(GM)
            .sub(this.spacecraftData.position.clone().normalize())
        const e = e_vec.length()
        
        const apoapsis = a * (1 + e) - earthRadius
        const periapsis = a * (1 - e) - earthRadius
        const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / GM)
        const inclination = Math.acos(h.z / h.length()) * 180 / Math.PI
        
        this.orbitalData = {
            apoapsis: apoapsis,
            periapsis: periapsis,
            inclination: inclination,
            period: period,
            eccentricity: e
        }
    }
    
    /**
     * Update HUD display
     */
    updateHUD(elapsedTime) {
        if (!this.hudElements) return
        
        const totalSeconds = Math.floor(elapsedTime)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        this.hudElements.missionTime.textContent = 
            `T+ ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        
        // Update orbital parameters
        this.hudElements.apoapsis.textContent = `${this.orbitalData.apoapsis.toFixed(1)} km`
        this.hudElements.periapsis.textContent = `${this.orbitalData.periapsis.toFixed(1)} km`
        this.hudElements.inclination.textContent = `${this.orbitalData.inclination.toFixed(1)}°`
        this.hudElements.period.textContent = `${this.orbitalData.period.toFixed(0)} s`
        this.hudElements.eccentricity.textContent = this.orbitalData.eccentricity.toFixed(3)
        
        const altitude = this.spacecraftData.position.length() - 2
        const velocity = this.spacecraftData.velocity.length()
        
        this.hudElements.altitude.textContent = `${altitude.toFixed(1)} km`
        this.hudElements.velocity.textContent = `${velocity.toFixed(0)} m/s`
        
        // Update throttle and thrust bars
        const throttlePercent = this.spacecraftData.throttle * 100
        this.hudElements.throttle.textContent = `${throttlePercent.toFixed(0)}%`
        this.hudElements.throttleBar.style.width = `${throttlePercent}%`
        
        this.hudElements.thrust.textContent = `${throttlePercent.toFixed(0)} kN`
        this.hudElements.thrustBar.style.width = `${throttlePercent}%`
        
        // Update fuel gauge
        this.hudElements.fuel.textContent = `${this.spacecraftData.fuel.toFixed(1)}%`
        this.hudElements.fuelBar.style.width = `${this.spacecraftData.fuel}%`
        
        if (this.spacecraftData.fuel < 20) {
            this.hudElements.fuelBar.style.background = 'linear-gradient(90deg, #ff4444 0%, #cc0000 100%)'
            this.hudElements.fuelBar.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.8)'
        } else if (this.spacecraftData.fuel < 50) {
            this.hudElements.fuelBar.style.background = 'linear-gradient(90deg, #ffaa00 0%, #cc8800 100%)'
            this.hudElements.fuelBar.style.boxShadow = '0 0 15px rgba(255, 170, 0, 0.6)'
        } else {
            this.hudElements.fuelBar.style.background = 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)'
            this.hudElements.fuelBar.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.6)'
        }
        
        // Update SAS indicator
        if (this.hudElements.sasIndicator) {
            if (this.controlSystems.sasEnabled) {
                this.hudElements.sasIndicator.style.background = '#00ff88'
                this.hudElements.sasIndicator.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.8)'
            } else {
                this.hudElements.sasIndicator.style.background = '#666666'
                this.hudElements.sasIndicator.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)'
            }
        }
        
        // Update RCS indicator
        if (this.hudElements.rcsIndicator) {
            if (this.controlSystems.rcsEnabled) {
                this.hudElements.rcsIndicator.style.background = '#00ffff'
                this.hudElements.rcsIndicator.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.8)'
            } else {
                this.hudElements.rcsIndicator.style.background = '#666666'
                this.hudElements.rcsIndicator.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)'
            }
        }
        
        // Update time warp display
        if (this.hudElements.timeWarp) {
            this.hudElements.timeWarp.textContent = `${this.gameState.timeWarp}x`
        }
        
        // Update camera mode display
        if (this.hudElements.cameraMode) {
            this.hudElements.cameraMode.textContent = this.gameState.mode.replace('_', ' ')
        }
        
        // Update navball rotation based on spacecraft orientation
        this.updateNavball()
        
        // Update attitude panel if exists
        if (this.attitudePanel) {
            this.updateAttitudePanel()
        }
        
        // Update 3D attitude indicator if exists
        if (this.attitudeIndicator3D) {
            this.update3DAttitudeIndicator()
        }
    }
    
    /**
     * Update Navball display
     */
    updateNavball() {
        if (!this.navball) return
        
        // Get spacecraft orientation as Euler angles
        const euler = new THREE.Euler().setFromQuaternion(this.spacecraft.quaternion)
        
        // Rotate the inner navball sphere
        const pitch = -euler.x * (180 / Math.PI) // Invert for correct display
        const roll = -euler.z * (180 / Math.PI)
        
        this.navball.inner.style.transform = `translate(-50%, -50%) rotate(${-roll}deg)`
        
        // Adjust vertical position based on pitch
        const pitchOffset = pitch * 0.4 // Scale factor for visual effect
        this.navball.inner.style.top = `calc(50% + ${pitchOffset}px)`
    }
    
    /**
     * Toggle camera modes
     */
    toggleCameraMode() {
        const modes = ['FREE_ROAM', 'FOLLOW_SPACECRAFT', 'ORBIT_VIEW']
        const currentIndex = modes.indexOf(this.gameState.mode)
        const nextIndex = (currentIndex + 1) % modes.length
        this.gameState.mode = modes[nextIndex]
        console.log(`Camera mode: ${this.gameState.mode}`)
    }
    
    /**
     * Update camera based on mode
     */
    updateCamera() {
        if (!this.spacecraft) return
        
        switch (this.gameState.mode) {
            case 'FOLLOW_SPACECRAFT':
                const offset = new THREE.Vector3(0, 2, -5)
                offset.applyQuaternion(this.spacecraft.quaternion)
                const targetPosition = this.spacecraft.position.clone().add(offset)
                this.camera.position.lerp(targetPosition, 0.1)
                this.camera.lookAt(this.spacecraft.position)
                break
                
            case 'ORBIT_VIEW':
                // Show full orbit view
                break
                
            case 'FREE_ROAM':
            default:
                // Let OrbitControls handle it
                break
        }
    }
    
    /**
     * Cycle time warp speeds
     */
    cycleTimeWarp() {
        const warpLevels = [1, 2, 5, 10, 50, 100, 1000]
        const currentIndex = warpLevels.indexOf(this.gameState.timeWarp)
        const nextIndex = (currentIndex + 1) % warpLevels.length
        this.gameState.timeWarp = warpLevels[nextIndex]
        console.log(`Time warp: ${this.gameState.timeWarp}x`)
    }
    
    /**
     * Create professional spacecraft configuration panel
     */
    createSpacecraftConfigPanel() {
        const panel = document.createElement('div')
        panel.id = 'spacecraft-config-panel'
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(5, 10, 20, 0.95) 100%);
            border: 3px solid rgba(0, 200, 255, 0.6);
            border-radius: 15px;
            padding: 25px;
            width: 900px;
            max-height: 85vh;
            overflow-y: auto;
            z-index: 2000;
            box-shadow: 0 0 50px rgba(0, 200, 255, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            display: none;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 200, 255, 0.5) rgba(10, 15, 30, 0.8);
        `
        
        // Header
        const header = document.createElement('div')
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(0, 200, 255, 0.3);
        `
        header.innerHTML = `
            <h2 style="color: #00ffff; font-size: 24px; margin: 0 0 5px 0; letter-spacing: 3px;">航天器配置面板</h2>
            <p style="color: #88aaff; font-size: 13px; margin: 0;">Spacecraft Configuration Panel - 参考真实航天器设计参数</p>
        `
        panel.appendChild(header)
        
        // Basic Info Section
        const basicSection = this.createConfigSection('基本信息', [
            { id: 'sc-name', label: '航天器名称', type: 'text', value: this.spacecraftConfig.name },
            { id: 'sc-type', label: '航天器类型', type: 'select', value: this.spacecraftConfig.type, 
              options: ['载人飞船', '货运飞船', '空间站模块', '卫星', '探测器'] }
        ])
        panel.appendChild(basicSection)
        
        // Mass Parameters Section
        const massSection = this.createConfigSection('质量参数 (kg)', [
            { id: 'sc-dry-mass', label: '干质量（不含燃料）', type: 'number', value: this.spacecraftConfig.dryMass, step: 10 },
            { id: 'sc-fuel-mass', label: '燃料质量', type: 'number', value: this.spacecraftConfig.fuelMass, step: 10 },
            { id: 'sc-total-mass', label: '总质量（自动计算）', type: 'number', value: this.spacecraftConfig.totalMass, readonly: true }
        ])
        panel.appendChild(massSection)
        
        // Engine Parameters Section
        const engineSection = this.createConfigSection('发动机参数', [
            { id: 'sc-engine-type', label: '发动机类型', type: 'select', value: this.spacecraftConfig.engine.type,
              options: ['液氧煤油发动机', '液氢液氧发动机', '固体火箭发动机', '离子推进器', '核热火箭'] },
            { id: 'sc-engine-thrust', label: '推力 (kN)', type: 'number', value: this.spacecraftConfig.engine.thrust, step: 100 },
            { id: 'sc-engine-isp', label: '比冲 Isp (秒)', type: 'number', value: this.spacecraftConfig.engine.isp, step: 5 },
            { id: 'sc-engine-burn-time', label: '燃烧时间 (秒)', type: 'number', value: this.spacecraftConfig.engine.burnTime, step: 10 },
            { id: 'sc-engine-consumption', label: '燃料消耗率 (kg/s)', type: 'number', value: this.spacecraftConfig.engine.fuelConsumption, step: 0.5 }
        ])
        panel.appendChild(engineSection)
        
        // RCS Parameters Section
        const rcsSection = this.createConfigSection('RCS姿态控制系统', [
            { id: 'sc-rcs-thrust', label: '单组推力 (kN)', type: 'number', value: this.spacecraftConfig.rcs.thrust, step: 0.1 },
            { id: 'sc-rcs-isp', label: '比冲 Isp (秒)', type: 'number', value: this.spacecraftConfig.rcs.isp, step: 5 },
            { id: 'sc-rcs-monoprop', label: '单组推进剂 (kg)', type: 'number', value: this.spacecraftConfig.rcs.monopropellant, step: 5 }
        ])
        panel.appendChild(rcsSection)
        
        // Dimensions Section
        const dimensionsSection = this.createConfigSection('尺寸参数 (m)', [
            { id: 'sc-length', label: '总长度', type: 'number', value: this.spacecraftConfig.dimensions.length, step: 0.1 },
            { id: 'sc-diameter', label: '直径', type: 'number', value: this.spacecraftConfig.dimensions.diameter, step: 0.1 },
            { id: 'sc-span', label: '太阳能板展开宽度', type: 'number', value: this.spacecraftConfig.dimensions.span, step: 0.5 }
        ])
        panel.appendChild(dimensionsSection)
        
        // Power System Section
        const powerSection = this.createConfigSection('电力系统', [
            { id: 'sc-solar-output', label: '太阳能板输出 (kW)', type: 'number', value: this.spacecraftConfig.power.solarPanelOutput, step: 0.5 },
            { id: 'sc-battery-capacity', label: '电池容量 (kWh)', type: 'number', value: this.spacecraftConfig.power.batteryCapacity, step: 5 },
            { id: 'sc-current-power', label: '当前电量 (%)', type: 'number', value: this.spacecraftConfig.power.currentPower, step: 1, min: 0, max: 100 }
        ])
        panel.appendChild(powerSection)
        
        // Preset Templates Section
        const presetsSection = document.createElement('div')
        presetsSection.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: rgba(0, 50, 100, 0.2);
            border: 2px solid rgba(0, 200, 255, 0.3);
            border-radius: 8px;
        `
        presetsSection.innerHTML = `
            <h3 style="color: #00ffff; font-size: 16px; margin: 0 0 12px 0;">预设模板 - 真实航天器</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <button id="preset-shenzhou" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">神舟飞船</button>
                <button id="preset-dragon" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">龙飞船</button>
                <button id="preset-soyuz" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">联盟号</button>
                <button id="preset-iss" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">国际空间站</button>
                <button id="preset-hubble" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">哈勃望远镜</button>
                <button id="preset-voyager" class="preset-btn" style="padding: 10px; background: rgba(0, 100, 200, 0.3); border: 2px solid rgba(0, 200, 255, 0.5); border-radius: 6px; color: #ffffff; cursor: pointer; transition: all 0.2s;">旅行者号</button>
            </div>
        `
        panel.appendChild(presetsSection)
        
        // Buttons
        const buttonContainer = document.createElement('div')
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid rgba(0, 200, 255, 0.3);
        `
        
        const applyBtn = document.createElement('button')
        applyBtn.id = 'sc-apply-btn'
        applyBtn.textContent = '✓ 应用配置'
        applyBtn.style.cssText = `
            padding: 12px 30px;
            background: linear-gradient(135deg, rgba(0, 200, 100, 0.6) 0%, rgba(0, 150, 80, 0.8) 100%);
            border: 2px solid rgba(0, 255, 150, 0.6);
            border-radius: 8px;
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(0, 255, 150, 0.3);
        `
        applyBtn.onmouseover = () => {
            applyBtn.style.background = 'linear-gradient(135deg, rgba(0, 220, 120, 0.7) 0%, rgba(0, 170, 100, 0.9) 100%)'
            applyBtn.style.boxShadow = '0 6px 20px rgba(0, 255, 150, 0.5)'
        }
        applyBtn.onmouseout = () => {
            applyBtn.style.background = 'linear-gradient(135deg, rgba(0, 200, 100, 0.6) 0%, rgba(0, 150, 80, 0.8) 100%)'
            applyBtn.style.boxShadow = '0 4px 15px rgba(0, 255, 150, 0.3)'
        }
        
        const resetBtn = document.createElement('button')
        resetBtn.id = 'sc-reset-btn'
        resetBtn.textContent = '↺ 重置为默认'
        resetBtn.style.cssText = `
            padding: 12px 30px;
            background: linear-gradient(135deg, rgba(200, 100, 0, 0.6) 0%, rgba(150, 80, 0, 0.8) 100%);
            border: 2px solid rgba(255, 150, 0, 0.6);
            border-radius: 8px;
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(255, 150, 0, 0.3);
        `
        resetBtn.onmouseover = () => {
            resetBtn.style.background = 'linear-gradient(135deg, rgba(220, 120, 0, 0.7) 0%, rgba(170, 100, 0, 0.9) 100%)'
            resetBtn.style.boxShadow = '0 6px 20px rgba(255, 150, 0, 0.5)'
        }
        resetBtn.onmouseout = () => {
            resetBtn.style.background = 'linear-gradient(135deg, rgba(200, 100, 0, 0.6) 0%, rgba(150, 80, 0, 0.8) 100%)'
            resetBtn.style.boxShadow = '0 4px 15px rgba(255, 150, 0, 0.3)'
        }
        
        const closeBtn = document.createElement('button')
        closeBtn.id = 'sc-close-btn'
        closeBtn.textContent = '✕ 关闭'
        closeBtn.style.cssText = `
            padding: 12px 30px;
            background: linear-gradient(135deg, rgba(200, 50, 50, 0.6) 0%, rgba(150, 40, 40, 0.8) 100%);
            border: 2px solid rgba(255, 100, 100, 0.6);
            border-radius: 8px;
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(255, 100, 100, 0.3);
        `
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'linear-gradient(135deg, rgba(220, 70, 70, 0.7) 0%, rgba(170, 60, 60, 0.9) 100%)'
            closeBtn.style.boxShadow = '0 6px 20px rgba(255, 100, 100, 0.5)'
        }
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'linear-gradient(135deg, rgba(200, 50, 50, 0.6) 0%, rgba(150, 40, 40, 0.8) 100%)'
            closeBtn.style.boxShadow = '0 4px 15px rgba(255, 100, 100, 0.3)'
        }
        
        buttonContainer.appendChild(resetBtn)
        buttonContainer.appendChild(applyBtn)
        buttonContainer.appendChild(closeBtn)
        panel.appendChild(buttonContainer)
        
        document.body.appendChild(panel)
        this.configPanel = panel
        
        // Setup event listeners
        this.setupConfigPanelEvents()
    }
    
    /**
     * Create a configuration section
     */
    createConfigSection(title, fields) {
        const section = document.createElement('div')
        section.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(0, 30, 60, 0.3);
            border: 2px solid rgba(0, 150, 255, 0.3);
            border-radius: 8px;
        `
        
        const sectionTitle = document.createElement('h3')
        sectionTitle.textContent = title
        sectionTitle.style.cssText = `
            color: #00ccff;
            font-size: 16px;
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0, 200, 255, 0.2);
        `
        section.appendChild(sectionTitle)
        
        const grid = document.createElement('div')
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        `
        
        fields.forEach(field => {
            const fieldContainer = document.createElement('div')
            fieldContainer.style.cssText = `
                display: flex;
                flex-direction: column;
            `
            
            const label = document.createElement('label')
            label.textContent = field.label
            label.style.cssText = `
                color: #88aaff;
                font-size: 13px;
                margin-bottom: 5px;
            `
            
            let input
            if (field.type === 'select') {
                input = document.createElement('select')
                input.id = field.id
                field.options.forEach(opt => {
                    const option = document.createElement('option')
                    option.value = opt
                    option.textContent = opt
                    if (opt === field.value) option.selected = true
                    input.appendChild(option)
                })
            } else {
                input = document.createElement('input')
                input.id = field.id
                input.type = field.type
                input.value = field.value
                if (field.step) input.step = field.step
                if (field.readonly) input.readOnly = true
                if (field.min !== undefined) input.min = field.min
                if (field.max !== undefined) input.max = field.max
            }
            
            input.style.cssText = `
                padding: 8px 12px;
                background: rgba(0, 20, 40, 0.8);
                border: 2px solid rgba(0, 150, 255, 0.4);
                border-radius: 5px;
                color: #ffffff;
                font-size: 14px;
                font-family: 'Consolas', monospace;
            `
            
            fieldContainer.appendChild(label)
            fieldContainer.appendChild(input)
            grid.appendChild(fieldContainer)
        })
        
        section.appendChild(grid)
        return section
    }
    
    /**
     * Setup configuration panel event listeners
     */
    setupConfigPanelEvents() {
        if (!this.configPanel) return
        
        // Auto-calculate total mass
        const dryMassInput = document.getElementById('sc-dry-mass')
        const fuelMassInput = document.getElementById('sc-fuel-mass')
        const totalMassInput = document.getElementById('sc-total-mass')
        
        const updateTotalMass = () => {
            const dry = parseFloat(dryMassInput.value) || 0
            const fuel = parseFloat(fuelMassInput.value) || 0
            totalMassInput.value = dry + fuel
        }
        
        dryMassInput.addEventListener('input', updateTotalMass)
        fuelMassInput.addEventListener('input', updateTotalMass)
        
        // Apply configuration button
        document.getElementById('sc-apply-btn').addEventListener('click', () => {
            this.applySpacecraftConfig()
        })
        
        // Reset to default button
        document.getElementById('sc-reset-btn').addEventListener('click', () => {
            this.resetToDefaultConfig()
        })
        
        // Close button
        document.getElementById('sc-close-btn').addEventListener('click', () => {
            this.toggleConfigPanel()
        })
        
        // Preset templates
        document.getElementById('preset-shenzhou').addEventListener('click', () => {
            this.loadPresetConfig('shenzhou')
        })
        document.getElementById('preset-dragon').addEventListener('click', () => {
            this.loadPresetConfig('dragon')
        })
        document.getElementById('preset-soyuz').addEventListener('click', () => {
            this.loadPresetConfig('soyuz')
        })
        document.getElementById('preset-iss').addEventListener('click', () => {
            this.loadPresetConfig('iss')
        })
        document.getElementById('preset-hubble').addEventListener('click', () => {
            this.loadPresetConfig('hubble')
        })
        document.getElementById('preset-voyager').addEventListener('click', () => {
            this.loadPresetConfig('voyager')
        })
    }
    
    /**
     * Toggle configuration panel visibility
     */
    toggleConfigPanel() {
        if (!this.configPanel) return
        
        if (this.configPanel.style.display === 'none' || !this.configPanel.style.display) {
            this.configPanel.style.display = 'block'
            this.gameState.paused = true
        } else {
            this.configPanel.style.display = 'none'
            this.gameState.paused = false
        }
    }
    
    /**
     * Apply spacecraft configuration from panel
     */
    applySpacecraftConfig() {
        // Update basic info
        this.spacecraftConfig.name = document.getElementById('sc-name').value
        this.spacecraftConfig.type = document.getElementById('sc-type').value
        
        // Update mass parameters
        this.spacecraftConfig.dryMass = parseFloat(document.getElementById('sc-dry-mass').value)
        this.spacecraftConfig.fuelMass = parseFloat(document.getElementById('sc-fuel-mass').value)
        this.spacecraftConfig.totalMass = this.spacecraftConfig.dryMass + this.spacecraftConfig.fuelMass
        
        // Update engine parameters
        this.spacecraftConfig.engine.type = document.getElementById('sc-engine-type').value
        this.spacecraftConfig.engine.thrust = parseFloat(document.getElementById('sc-engine-thrust').value)
        this.spacecraftConfig.engine.isp = parseFloat(document.getElementById('sc-engine-isp').value)
        this.spacecraftConfig.engine.burnTime = parseFloat(document.getElementById('sc-engine-burn-time').value)
        this.spacecraftConfig.engine.fuelConsumption = parseFloat(document.getElementById('sc-engine-consumption').value)
        
        // Update RCS parameters
        this.spacecraftConfig.rcs.thrust = parseFloat(document.getElementById('sc-rcs-thrust').value)
        this.spacecraftConfig.rcs.isp = parseFloat(document.getElementById('sc-rcs-isp').value)
        this.spacecraftConfig.rcs.monopropellant = parseFloat(document.getElementById('sc-rcs-monoprop').value)
        
        // Update dimensions
        this.spacecraftConfig.dimensions.length = parseFloat(document.getElementById('sc-length').value)
        this.spacecraftConfig.dimensions.diameter = parseFloat(document.getElementById('sc-diameter').value)
        this.spacecraftConfig.dimensions.span = parseFloat(document.getElementById('sc-span').value)
        
        // Update power system
        this.spacecraftConfig.power.solarPanelOutput = parseFloat(document.getElementById('sc-solar-output').value)
        this.spacecraftConfig.power.batteryCapacity = parseFloat(document.getElementById('sc-battery-capacity').value)
        this.spacecraftConfig.power.currentPower = parseFloat(document.getElementById('sc-current-power').value)
        
        // Update spacecraft data
        this.spacecraftData.mass = this.spacecraftConfig.totalMass
        this.spacecraftData.fuel = (this.spacecraftConfig.fuelSystem.fuel / 100) * this.spacecraftConfig.fuelSystem.maxFuel
        this.spacecraftData.monopropellant = (this.spacecraftConfig.fuelSystem.monopropellant / 100) * this.spacecraftConfig.fuelSystem.maxMonoprop
        
        console.log('✅ Spacecraft configuration applied successfully!')
        console.log(`   Name: ${this.spacecraftConfig.name}`)
        console.log(`   Type: ${this.spacecraftConfig.type}`)
        console.log(`   Total Mass: ${this.spacecraftConfig.totalMass} kg`)
        console.log(`   Engine Thrust: ${this.spacecraftConfig.engine.thrust} kN`)
        console.log(`   Engine Isp: ${this.spacecraftConfig.engine.isp} s`)
        
        // Show success message
        this.showNotification('配置已应用！', 'success')
        
        // Close panel after applying
        setTimeout(() => {
            this.toggleConfigPanel()
        }, 1000)
    }
    
    /**
     * Reset to default configuration
     */
    resetToDefaultConfig() {
        const defaultConfig = {
            name: '探索者一号',
            type: '载人飞船',
            dryMass: 850,
            fuelMass: 450,
            totalMass: 1300,
            engine: {
                type: '液氧煤油发动机',
                thrust: 3500,
                isp: 311,
                burnTime: 380,
                fuelConsumption: 12
            },
            rcs: {
                thrust: 0.5,
                isp: 70,
                monopropellant: 50
            },
            dimensions: {
                length: 8.5,
                diameter: 2.8,
                span: 12.0
            },
            power: {
                solarPanelOutput: 4.5,
                batteryCapacity: 50,
                currentPower: 100
            }
        }
        
        this.spacecraftConfig = JSON.parse(JSON.stringify(defaultConfig))
        this.updateConfigPanelFields()
        this.showNotification('已重置为默认配置', 'info')
    }
    
    /**
     * Load preset configuration for real spacecraft
     */
    loadPresetConfig(preset) {
        const presets = {
            shenzhou: {
                name: '神舟飞船',
                type: '载人飞船',
                dryMass: 8000,
                fuelMass: 1200,
                totalMass: 9200,
                engine: {
                    type: '液氧煤油发动机',
                    thrust: 7500,
                    isp: 300,
                    burnTime: 500,
                    fuelConsumption: 25
                },
                rcs: {
                    thrust: 1.0,
                    isp: 75,
                    monopropellant: 80
                },
                dimensions: {
                    length: 9.0,
                    diameter: 2.8,
                    span: 17.0
                },
                power: {
                    solarPanelOutput: 6.0,
                    batteryCapacity: 80,
                    currentPower: 100
                }
            },
            dragon: {
                name: '龙飞船 (Crew Dragon)',
                type: '载人飞船',
                dryMass: 6350,
                fuelMass: 1500,
                totalMass: 7850,
                engine: {
                    type: '液氧煤油发动机',
                    thrust: 8000,
                    isp: 282,
                    burnTime: 450,
                    fuelConsumption: 28
                },
                rcs: {
                    thrust: 0.8,
                    isp: 72,
                    monopropellant: 60
                },
                dimensions: {
                    length: 8.1,
                    diameter: 4.0,
                    span: 12.0
                },
                power: {
                    solarPanelOutput: 5.5,
                    batteryCapacity: 70,
                    currentPower: 100
                }
            },
            soyuz: {
                name: '联盟号飞船',
                type: '载人飞船',
                dryMass: 7200,
                fuelMass: 900,
                totalMass: 8100,
                engine: {
                    type: '液氧煤油发动机',
                    thrust: 6000,
                    isp: 295,
                    burnTime: 480,
                    fuelConsumption: 20
                },
                rcs: {
                    thrust: 0.7,
                    isp: 70,
                    monopropellant: 70
                },
                dimensions: {
                    length: 7.5,
                    diameter: 2.7,
                    span: 10.0
                },
                power: {
                    solarPanelOutput: 4.0,
                    batteryCapacity: 60,
                    currentPower: 100
                }
            },
            iss: {
                name: '国际空间站',
                type: '空间站模块',
                dryMass: 420000,
                fuelMass: 5000,
                totalMass: 425000,
                engine: {
                    type: '离子推进器',
                    thrust: 50,
                    isp: 3000,
                    burnTime: 10000,
                    fuelConsumption: 0.5
                },
                rcs: {
                    thrust: 2.0,
                    isp: 80,
                    monopropellant: 500
                },
                dimensions: {
                    length: 109.0,
                    diameter: 73.0,
                    span: 73.0
                },
                power: {
                    solarPanelOutput: 120.0,
                    batteryCapacity: 500,
                    currentPower: 100
                }
            },
            hubble: {
                name: '哈勃太空望远镜',
                type: '卫星',
                dryMass: 11110,
                fuelMass: 0,
                totalMass: 11110,
                engine: {
                    type: '离子推进器',
                    thrust: 10,
                    isp: 2500,
                    burnTime: 5000,
                    fuelConsumption: 0.1
                },
                rcs: {
                    thrust: 0.3,
                    isp: 65,
                    monopropellant: 30
                },
                dimensions: {
                    length: 13.2,
                    diameter: 4.2,
                    span: 12.0
                },
                power: {
                    solarPanelOutput: 5.0,
                    batteryCapacity: 40,
                    currentPower: 100
                }
            },
            voyager: {
                name: '旅行者号探测器',
                type: '探测器',
                dryMass: 825,
                fuelMass: 105,
                totalMass: 930,
                engine: {
                    type: '离子推进器',
                    thrust: 5,
                    isp: 2000,
                    burnTime: 2000,
                    fuelConsumption: 0.05
                },
                rcs: {
                    thrust: 0.2,
                    isp: 60,
                    monopropellant: 20
                },
                dimensions: {
                    length: 3.7,
                    diameter: 3.7,
                    span: 13.0
                },
                power: {
                    solarPanelOutput: 0.5,
                    batteryCapacity: 10,
                    currentPower: 100
                }
            }
        }
        
        if (presets[preset]) {
            this.spacecraftConfig = JSON.parse(JSON.stringify(presets[preset]))
            this.updateConfigPanelFields()
            this.showNotification(`已加载预设: ${this.spacecraftConfig.name}`, 'success')
        }
    }
    
    /**
     * Update config panel fields with current values
     */
    updateConfigPanelFields() {
        document.getElementById('sc-name').value = this.spacecraftConfig.name
        document.getElementById('sc-type').value = this.spacecraftConfig.type
        document.getElementById('sc-dry-mass').value = this.spacecraftConfig.dryMass
        document.getElementById('sc-fuel-mass').value = this.spacecraftConfig.fuelMass
        document.getElementById('sc-total-mass').value = this.spacecraftConfig.totalMass
        document.getElementById('sc-engine-type').value = this.spacecraftConfig.engine.type
        document.getElementById('sc-engine-thrust').value = this.spacecraftConfig.engine.thrust
        document.getElementById('sc-engine-isp').value = this.spacecraftConfig.engine.isp
        document.getElementById('sc-engine-burn-time').value = this.spacecraftConfig.engine.burnTime
        document.getElementById('sc-engine-consumption').value = this.spacecraftConfig.engine.fuelConsumption
        document.getElementById('sc-rcs-thrust').value = this.spacecraftConfig.rcs.thrust
        document.getElementById('sc-rcs-isp').value = this.spacecraftConfig.rcs.isp
        document.getElementById('sc-rcs-monoprop').value = this.spacecraftConfig.rcs.monopropellant
        document.getElementById('sc-length').value = this.spacecraftConfig.dimensions.length
        document.getElementById('sc-diameter').value = this.spacecraftConfig.dimensions.diameter
        document.getElementById('sc-span').value = this.spacecraftConfig.dimensions.span
        document.getElementById('sc-solar-output').value = this.spacecraftConfig.power.solarPanelOutput
        document.getElementById('sc-battery-capacity').value = this.spacecraftConfig.power.batteryCapacity
        document.getElementById('sc-current-power').value = this.spacecraftConfig.power.currentPower
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? 'rgba(0, 200, 100, 0.9)' : type === 'error' ? 'rgba(200, 50, 50, 0.9)' : 'rgba(0, 150, 255, 0.9)'};
            border: 2px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#00ccff'};
            border-radius: 8px;
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
            z-index: 3000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease-out;
        `
        notification.textContent = message
        document.body.appendChild(notification)
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in'
            setTimeout(() => notification.remove(), 300)
        }, 2000)
    }
    
    /**
     * Main update loop
     */
    update(deltaTime, elapsedTime) {
        const scaledDeltaTime = deltaTime * this.gameState.timeWarp
        
        if (!this.gameState.paused) {
            // Update mission time
            this.gameState.missionTime += scaledDeltaTime
            
            // Handle different game modes
            switch (this.gameState.mode) {
                case 'GROUND':
                    // Ground mode - waiting for launch
                    if (this.gameState.launchPhase === 'COUNTDOWN') {
                        this.updateCountdown(scaledDeltaTime)
                    }
                    break
                    
                case 'LAUNCH':
                    // Launch phase - ascending
                    this.animateLaunch(scaledDeltaTime)
                    this.updateEngineParticles(scaledDeltaTime)
                    this.handleControls(scaledDeltaTime)
                    this.updatePhysics(scaledDeltaTime)
                    break
                    
                case 'ORBITAL':
                    // Orbital flight
                    this.handleControls(scaledDeltaTime)
                    this.updatePhysics(scaledDeltaTime)
                    break
                    
                case 'FREE_ROAM':
                    // Free roam mode (existing)
                    this.handleControls(scaledDeltaTime)
                    this.updatePhysics(scaledDeltaTime)
                    break
            }
            
            // Always update HUD and camera
            this.updateHUD(elapsedTime)
            this.updateCamera()
            
            // Update 2D compass if panel is visible
            if (this.attitude2DPanel && this.attitude2DPanel.style.display !== 'none') {
                this.update2DCompass()
            }
            
            // Update map view if visible
            if (this.mapCanvas && this.mapCanvas.style.display !== 'none') {
                this.updateMapView()
            }
        }
    }
    
    /**
     * Create complete space center with all facilities
     */
    createSpaceCenter() {
        this.spaceCenterGroup = new THREE.Group()
        
        // Create all facilities
        this.createLaunchPad()
        this.createMissionControl()
        this.createFuelStorage()
        this.createAssemblyBuilding()
        this.createRoadsAndInfrastructure()
        
        this.scene.add(this.spaceCenterGroup)
        console.log('✅ Space Center created!')
    }
    
    /**
     * Create launch pad with tower and flame trench - Enhanced version
     */
    createLaunchPad() {
        const launchPadGroup = new THREE.Group()
        
        // === 1. Main Launch Platform ===
        const platformGeometry = new THREE.CylinderGeometry(10, 10, 0.8, 32)
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.95,
            metalness: 0.05
        })
        const platform = new THREE.Mesh(platformGeometry, platformMaterial)
        platform.position.y = 0.4
        launchPadGroup.add(platform)
        
        // Platform edge markings (yellow safety lines)
        const edgeGeometry = new THREE.RingGeometry(9.5, 10, 32)
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            side: THREE.DoubleSide
        })
        const edgeRing = new THREE.Mesh(edgeGeometry, edgeMaterial)
        edgeRing.rotation.x = -Math.PI / 2
        edgeRing.position.y = 0.81
        launchPadGroup.add(edgeRing)
        
        // === 2. Enhanced Launch Tower Structure ===
        const towerHeight = 30
        
        // Main tower columns (8 columns for more stability)
        for (let i = 0; i < 8; i++) {
            const columnGeometry = new THREE.BoxGeometry(0.4, towerHeight, 0.4)
            const columnMaterial = new THREE.MeshStandardMaterial({
                color: 0x777777,
                metalness: 0.75,
                roughness: 0.25
            })
            const column = new THREE.Mesh(columnGeometry, columnMaterial)
            const angle = (i / 8) * Math.PI * 2
            column.position.set(
                Math.cos(angle) * 4,
                towerHeight / 2,
                Math.sin(angle) * 4
            )
            launchPadGroup.add(column)
        }
        
        // Horizontal beams (more levels)
        for (let h = 4; h < towerHeight; h += 4) {
            const beamSize = 8.5
            const beamGeometry = new THREE.BoxGeometry(beamSize, 0.25, beamSize)
            const beamMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.65,
                roughness: 0.35
            })
            const beam = new THREE.Mesh(beamGeometry, beamMaterial)
            beam.position.y = h
            launchPadGroup.add(beam)
            
            // Diagonal cross-bracing
            if (h % 8 === 0) {
                const braceGeometry = new THREE.BoxGeometry(beamSize * 1.4, 0.15, 0.15)
                const brace1 = new THREE.Mesh(braceGeometry, beamMaterial)
                brace1.position.y = h
                brace1.rotation.y = Math.PI / 4
                launchPadGroup.add(brace1)
                
                const brace2 = new THREE.Mesh(braceGeometry, beamMaterial)
                brace2.position.y = h
                brace2.rotation.y = -Math.PI / 4
                launchPadGroup.add(brace2)
            }
        }
        
        // === 3. Umbilical Tower System ===
        // Multiple service arms at different heights
        const armHeights = [10, 18, 24]
        armHeights.forEach((height, index) => {
            const armLength = 5 + index * 0.5
            const armGeometry = new THREE.BoxGeometry(armLength, 0.4, 0.6)
            const armMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.8,
                roughness: 0.2
            })
            const arm = new THREE.Mesh(armGeometry, armMaterial)
            arm.position.set(armLength / 2 - 1, height, 0)
            launchPadGroup.add(arm)
            
            // Arm support cables
            const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 8, 8)
            const cableMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.9
            })
            const cable = new THREE.Mesh(cableGeometry, cableMaterial)
            cable.position.set(armLength - 1, height + 4, 0)
            launchPadGroup.add(cable)
        })
        
        // === 4. Enhanced Flame Trench System ===
        // Main trench
        const trenchGeometry = new THREE.BoxGeometry(8, 1.5, 15)
        const trenchMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 1.0,
            metalness: 0.1
        })
        const trench = new THREE.Mesh(trenchGeometry, trenchMaterial)
        trench.position.set(0, -0.75, -10)
        launchPadGroup.add(trench)
        
        // Trench walls
        const wallGeometry = new THREE.BoxGeometry(1, 2, 15)
        const leftWall = new THREE.Mesh(wallGeometry, trenchMaterial)
        leftWall.position.set(-4.5, 0.25, -10)
        launchPadGroup.add(leftWall)
        
        const rightWall = new THREE.Mesh(wallGeometry, trenchMaterial)
        rightWall.position.set(4.5, 0.25, -10)
        launchPadGroup.add(rightWall)
        
        // Water deluge system pipes
        for (let i = 0; i < 3; i++) {
            const pipeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6, 12)
            const pipeMaterial = new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.85,
                roughness: 0.15
            })
            const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial)
            pipe.rotation.z = Math.PI / 2
            pipe.position.set(0, 0.5, -7 + i * 3)
            launchPadGroup.add(pipe)
        }
        
        // === 5. Safety Fence ===
        const fenceRadius = 15
        const fenceSegments = 32
        for (let i = 0; i < fenceSegments; i++) {
            const angle = (i / fenceSegments) * Math.PI * 2
            const x = Math.cos(angle) * fenceRadius
            const z = Math.sin(angle) * fenceRadius
            
            // Fence post
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8)
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.7
            })
            const post = new THREE.Mesh(postGeometry, postMaterial)
            post.position.set(x, 1.25, z)
            launchPadGroup.add(post)
            
            // Warning stripes on posts
            if (i % 4 === 0) {
                const stripeGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8)
                const stripeMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffcc00
                })
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
                stripe.position.set(x, 2, z)
                launchPadGroup.add(stripe)
            }
        }
        
        // === 6. Lighting System ===
        const lightPositions = [
            { x: 12, z: 12 },
            { x: -12, z: 12 },
            { x: 12, z: -12 },
            { x: -12, z: -12 }
        ]
        
        lightPositions.forEach(pos => {
            // Light pole
            const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 12, 8)
            const poleMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                metalness: 0.8
            })
            const pole = new THREE.Mesh(poleGeometry, poleMaterial)
            pole.position.set(pos.x, 6, pos.z)
            launchPadGroup.add(pole)
            
            // Light fixture
            const lightGeometry = new THREE.BoxGeometry(1.5, 0.5, 1.5)
            const lightMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffffaa,
                emissiveIntensity: 0.5
            })
            const lightFixture = new THREE.Mesh(lightGeometry, lightMaterial)
            lightFixture.position.set(pos.x, 12, pos.z)
            launchPadGroup.add(lightFixture)
            
            // Actual point light
            const pointLight = new THREE.PointLight(0xffffee, 0.8, 30)
            pointLight.position.set(pos.x, 11.5, pos.z)
            launchPadGroup.add(pointLight)
        })
        
        // === 7. Ground Markings ===
        // Directional arrows
        for (let i = 0; i < 4; i++) {
            const arrowGeometry = new THREE.ConeGeometry(0.5, 1.5, 3)
            const arrowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff
            })
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
            const angle = (i / 4) * Math.PI * 2
            arrow.position.set(
                Math.cos(angle) * 6,
                0.82,
                Math.sin(angle) * 6
            )
            arrow.rotation.x = Math.PI / 2
            arrow.rotation.z = angle + Math.PI / 2
            launchPadGroup.add(arrow)
        }
        
        // Position launch pad at space center
        launchPadGroup.position.set(6378, 0, 0)
        this.spaceCenterGroup.add(launchPadGroup)
        
        this.launchPad = launchPadGroup
        console.log('🚀 Enhanced launch pad created')
    }
    
    /**
     * Create mission control building - Enhanced version
     */
    createMissionControl() {
        const controlGroup = new THREE.Group()
        
        // === 1. Main Building Structure ===
        const buildingGeometry = new THREE.BoxGeometry(18, 10, 12)
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0xe8e8e8,
            roughness: 0.65,
            metalness: 0.25
        })
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
        building.position.y = 5
        controlGroup.add(building)
        
        // Building base/foundation
        const baseGeometry = new THREE.BoxGeometry(20, 1, 14)
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.85,
            metalness: 0.15
        })
        const base = new THREE.Mesh(baseGeometry, baseMaterial)
        base.position.y = 0.5
        controlGroup.add(base)
        
        // === 2. Enhanced Window System ===
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            emissive: 0x336699,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.85,
            metalness: 0.9,
            roughness: 0.1
        })
        
        // Front windows (3 floors)
        for (let floor = 0; floor < 3; floor++) {
            const yPos = 2.5 + floor * 3
            
            // Large control room windows
            for (let x = -7; x <= 7; x += 2.5) {
                const windowGeometry = new THREE.PlaneGeometry(1.8, 1.5)
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial)
                windowMesh.position.set(x, yPos, 6.01)
                controlGroup.add(windowMesh)
                
                // Window frames
                const frameGeometry = new THREE.BoxGeometry(2, 1.7, 0.1)
                const frameMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.8
                })
                const frame = new THREE.Mesh(frameGeometry, frameMaterial)
                frame.position.set(x, yPos, 6.02)
                controlGroup.add(frame)
            }
        }
        
        // Side windows
        for (let floor = 0; floor < 3; floor++) {
            const yPos = 2.5 + floor * 3
            for (let z = -4; z <= 4; z += 2.5) {
                const windowGeometry = new THREE.PlaneGeometry(1.8, 1.5)
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial)
                windowMesh.position.set(9.01, yPos, z)
                windowMesh.rotation.y = Math.PI / 2
                controlGroup.add(windowMesh)
                
                const windowMesh2 = new THREE.Mesh(windowGeometry, windowMaterial)
                windowMesh2.position.set(-9.01, yPos, z)
                windowMesh2.rotation.y = -Math.PI / 2
                controlGroup.add(windowMesh2)
            }
        }
        
        // === 3. Entrance and Canopy ===
        const entranceGeometry = new THREE.BoxGeometry(4, 3, 2)
        const entranceMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.7,
            roughness: 0.3
        })
        const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial)
        entrance.position.set(0, 1.5, 7)
        controlGroup.add(entrance)
        
        // Glass doors
        const doorGeometry = new THREE.PlaneGeometry(1.5, 2.5)
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaddff,
            emissive: 0x224466,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.7
        })
        const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial)
        leftDoor.position.set(-0.8, 1.5, 8.01)
        controlGroup.add(leftDoor)
        
        const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial)
        rightDoor.position.set(0.8, 1.5, 8.01)
        controlGroup.add(rightDoor)
        
        // Entrance canopy
        const canopyGeometry = new THREE.BoxGeometry(6, 0.3, 4)
        const canopyMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.6
        })
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial)
        canopy.position.set(0, 3.5, 8)
        controlGroup.add(canopy)
        
        // Canopy support columns
        const columnGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 8)
        const columnMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.8
        })
        const leftColumn = new THREE.Mesh(columnGeometry, columnMaterial)
        leftColumn.position.set(-2.5, 2, 8)
        controlGroup.add(leftColumn)
        
        const rightColumn = new THREE.Mesh(columnGeometry, columnMaterial)
        rightColumn.position.set(2.5, 2, 8)
        controlGroup.add(rightColumn)
        
        // === 4. Radar and Communication Array ===
        // Main radar dish
        const dishGeometry = new THREE.SphereGeometry(2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
        const dishMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.95,
            roughness: 0.05,
            side: THREE.DoubleSide
        })
        const dish = new THREE.Mesh(dishGeometry, dishMaterial)
        dish.position.set(0, 13, 0)
        dish.rotation.x = -Math.PI / 3
        controlGroup.add(dish)
        
        // Dish support structure
        const supportPoleGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3.5, 12)
        const supportPoleMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.85
        })
        const supportPole = new THREE.Mesh(supportPoleGeometry, supportPoleMaterial)
        supportPole.position.set(0, 11.5, 0)
        controlGroup.add(supportPole)
        
        // Additional satellite dishes
        const smallDishPositions = [
            { x: -6, z: -4, rotY: Math.PI / 4 },
            { x: 6, z: -4, rotY: -Math.PI / 4 }
        ]
        
        smallDishPositions.forEach(pos => {
            const smallDishGeometry = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
            const smallDish = new THREE.Mesh(smallDishGeometry, dishMaterial)
            smallDish.position.set(pos.x, 11, pos.z)
            smallDish.rotation.x = -Math.PI / 4
            smallDish.rotation.y = pos.rotY
            controlGroup.add(smallDish)
            
            const smallPoleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8)
            const smallPole = new THREE.Mesh(smallPoleGeometry, supportPoleMaterial)
            smallPole.position.set(pos.x, 10.5, pos.z)
            controlGroup.add(smallPole)
        })
        
        // Communication antennas
        for (let i = 0; i < 4; i++) {
            const antennaHeight = 8 + Math.random() * 4
            const antennaGeometry = new THREE.CylinderGeometry(0.08, 0.1, antennaHeight, 8)
            const antennaMaterial = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.9
            })
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
            const angle = (i / 4) * Math.PI * 2
            antenna.position.set(
                Math.cos(angle) * 7,
                10 + antennaHeight / 2,
                Math.sin(angle) * 5
            )
            controlGroup.add(antenna)
            
            // Antenna tip light
            const tipLight = new THREE.PointLight(0xff0000, 0.5, 5)
            tipLight.position.set(
                Math.cos(angle) * 7,
                10 + antennaHeight,
                Math.sin(angle) * 5
            )
            controlGroup.add(tipLight)
        }
        
        // === 5. Rooftop Equipment ===
        // HVAC units
        for (let i = 0; i < 3; i++) {
            const hvacGeometry = new THREE.BoxGeometry(2, 1.5, 2)
            const hvacMaterial = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                metalness: 0.7,
                roughness: 0.4
            })
            const hvac = new THREE.Mesh(hvacGeometry, hvacMaterial)
            hvac.position.set(-5 + i * 5, 10.75, -3)
            controlGroup.add(hvac)
        }
        
        // === 6. Parking Lot ===
        const parkingLotGeometry = new THREE.PlaneGeometry(25, 20)
        const parkingLotMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.95,
            metalness: 0.05
        })
        const parkingLot = new THREE.Mesh(parkingLotGeometry, parkingLotMaterial)
        parkingLot.rotation.x = -Math.PI / 2
        parkingLot.position.set(15, 0.02, 5)
        controlGroup.add(parkingLot)
        
        // Parking space markings
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const lineGeometry = new THREE.PlaneGeometry(0.15, 4)
                const lineMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff
                })
                const line = new THREE.Mesh(lineGeometry, lineMaterial)
                line.rotation.x = -Math.PI / 2
                line.position.set(
                    5 + col * 4,
                    0.03,
                    -5 + row * 4
                )
                controlGroup.add(line)
            }
        }
        
        // Parked vehicles
        const vehicleColors = [0xffffff, 0x333333, 0xcc0000, 0x0066cc, 0x00aa00]
        for (let i = 0; i < 8; i++) {
            const vehicleGroup = new THREE.Group()
            
            // Car body
            const bodyGeometry = new THREE.BoxGeometry(2.2, 0.8, 1.2)
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: vehicleColors[i % vehicleColors.length],
                metalness: 0.6,
                roughness: 0.3
            })
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
            body.position.y = 0.6
            vehicleGroup.add(body)
            
            // Car top
            const topGeometry = new THREE.BoxGeometry(1.2, 0.6, 1)
            const topMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.8
            })
            const top = new THREE.Mesh(topGeometry, topMaterial)
            top.position.y = 1.3
            vehicleGroup.add(top)
            
            // Wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12)
            const wheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111
            })
            
            const wheelPositions = [
                { x: -0.7, z: 0.5 },
                { x: 0.7, z: 0.5 },
                { x: -0.7, z: -0.5 },
                { x: 0.7, z: -0.5 }
            ]
            
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
                wheel.rotation.z = Math.PI / 2
                wheel.position.set(pos.x, 0.3, pos.z)
                vehicleGroup.add(wheel)
            })
            
            vehicleGroup.position.set(
                7 + (i % 4) * 4,
                0,
                -3 + Math.floor(i / 4) * 4
            )
            vehicleGroup.rotation.y = Math.random() * 0.2 - 0.1
            controlGroup.add(vehicleGroup)
        }
        
        // === 7. Landscaping ===
        // Trees around building
        const treePositions = [
            { x: -12, z: 8 },
            { x: -12, z: 0 },
            { x: -12, z: -8 },
            { x: 12, z: 8 },
            { x: 12, z: -8 }
        ]
        
        treePositions.forEach(pos => {
            const treeGroup = new THREE.Group()
            
            // Trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8)
            const trunkMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 0.9
            })
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
            trunk.position.y = 1
            treeGroup.add(trunk)
            
            // Foliage
            const foliageGeometry = new THREE.SphereGeometry(1.5, 8, 8)
            const foliageMaterial = new THREE.MeshStandardMaterial({
                color: 0x228B22,
                roughness: 0.8
            })
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
            foliage.position.y = 3
            treeGroup.add(foliage)
            
            treeGroup.position.set(pos.x, 0, pos.z)
            controlGroup.add(treeGroup)
        })
        
        // Position mission control
        controlGroup.position.set(6378 + 55, 0, 35)
        this.spaceCenterGroup.add(controlGroup)
        
        console.log('🏢 Enhanced mission control created')
    }
    
    /**
     * Create fuel storage tanks - Enhanced version
     */
    createFuelStorage() {
        const storageGroup = new THREE.Group()
        
        // === 1. Enhanced Fuel Tanks ===
        const tankConfigs = [
            { x: -12, z: 0, type: 'LOX', height: 10, radius: 3.5 },
            { x: 0, z: 0, type: 'RP-1', height: 10, radius: 3.5 },
            { x: 12, z: 0, type: 'LH2', height: 12, radius: 4 }
        ]
        
        tankConfigs.forEach((config, index) => {
            const tankGroup = new THREE.Group()
            
            // Main tank cylinder
            const tankGeometry = new THREE.CylinderGeometry(config.radius, config.radius, config.height, 32)
            const tankMaterial = new THREE.MeshStandardMaterial({
                color: index === 0 ? 0xdddddd : index === 1 ? 0xcccccc : 0xeeeeee,
                metalness: 0.65,
                roughness: 0.25
            })
            const tank = new THREE.Mesh(tankGeometry, tankMaterial)
            tank.position.y = config.height / 2
            tankGroup.add(tank)
            
            // Tank dome top
            const domeGeometry = new THREE.SphereGeometry(config.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
            const dome = new THREE.Mesh(domeGeometry, tankMaterial)
            dome.position.y = config.height
            tankGroup.add(dome)
            
            // Tank bottom
            const bottomGeometry = new THREE.SphereGeometry(config.radius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
            const bottom = new THREE.Mesh(bottomGeometry, tankMaterial)
            tankGroup.add(bottom)
            
            // Tank label/identification
            const labelGeometry = new THREE.PlaneGeometry(3, 1.5)
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 128
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 256, 128)
            ctx.fillStyle = '#000000'
            ctx.font = 'bold 48px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(config.type, 128, 80)
            
            const labelTexture = new THREE.CanvasTexture(canvas)
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: labelTexture,
                transparent: true
            })
            const label = new THREE.Mesh(labelGeometry, labelMaterial)
            label.position.set(0, config.height / 2, config.radius + 0.1)
            tankGroup.add(label)
            
            // Safety railing around tank
            const railingRadius = config.radius + 1
            const railingSegments = 32
            for (let i = 0; i < railingSegments; i++) {
                const angle = (i / railingSegments) * Math.PI * 2
                const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8)
                const postMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffcc00,
                    metalness: 0.7
                })
                const post = new THREE.Mesh(postGeometry, postMaterial)
                post.position.set(
                    Math.cos(angle) * railingRadius,
                    0.6,
                    Math.sin(angle) * railingRadius
                )
                tankGroup.add(post)
            }
            
            // Horizontal railing bars
            const railBarGeometry = new THREE.TorusGeometry(railingRadius, 0.05, 8, railingSegments)
            const railBarMaterial = new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                metalness: 0.7
            })
            const lowerRail = new THREE.Mesh(railBarGeometry, railBarMaterial)
            lowerRail.rotation.x = Math.PI / 2
            lowerRail.position.y = 0.4
            tankGroup.add(lowerRail)
            
            const upperRail = new THREE.Mesh(railBarGeometry, railBarMaterial)
            upperRail.rotation.x = Math.PI / 2
            upperRail.position.y = 1.0
            tankGroup.add(upperRail)
            
            tankGroup.position.set(config.x, 0, config.z)
            storageGroup.add(tankGroup)
        })
        
        // === 2. Pipeline Network ===
        // Main pipeline to launch pad
        const mainPipelinePath = [
            new THREE.Vector3(-20, 1, 0),
            new THREE.Vector3(-30, 1, 0),
            new THREE.Vector3(-40, 1, 5),
            new THREE.Vector3(-50, 1, 10)
        ]
        
        const pipelineCurve = new THREE.CatmullRomCurve3(mainPipelinePath)
        const pipelineGeometry = new THREE.TubeGeometry(pipelineCurve, 20, 0.4, 12, false)
        const pipelineMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            metalness: 0.85,
            roughness: 0.15
        })
        const mainPipeline = new THREE.Mesh(pipelineGeometry, pipelineMaterial)
        storageGroup.add(mainPipeline)
        
        // Secondary pipelines connecting tanks
        for (let i = 0; i < tankConfigs.length - 1; i++) {
            const pipeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 12, 12)
            const pipe = new THREE.Mesh(pipeGeometry, pipelineMaterial)
            pipe.rotation.z = Math.PI / 2
            pipe.position.set(
                (tankConfigs[i].x + tankConfigs[i + 1].x) / 2,
                2,
                0
            )
            storageGroup.add(pipe)
        }
        
        // === 3. Pump Station ===
        const pumpStationGeometry = new THREE.BoxGeometry(6, 4, 4)
        const pumpStationMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            metalness: 0.7,
            roughness: 0.3
        })
        const pumpStation = new THREE.Mesh(pumpStationGeometry, pumpStationMaterial)
        pumpStation.position.set(-20, 2, 5)
        storageGroup.add(pumpStation)
        
        // Pump station roof
        const roofGeometry = new THREE.BoxGeometry(7, 0.3, 5)
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.6
        })
        const roof = new THREE.Mesh(roofGeometry, roofMaterial)
        roof.position.set(-20, 4.15, 5)
        storageGroup.add(roof)
        
        // === 4. Safety Equipment ===
        // Fire suppression system
        for (let i = 0; i < 3; i++) {
            const hydrantGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1, 12)
            const hydrantMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                metalness: 0.5
            })
            const hydrant = new THREE.Mesh(hydrantGeometry, hydrantMaterial)
            hydrant.position.set(-15 + i * 15, 0.5, 8)
            storageGroup.add(hydrant)
            
            // Hydrant cap
            const capGeometry = new THREE.SphereGeometry(0.35, 8, 8)
            const cap = new THREE.Mesh(capGeometry, hydrantMaterial)
            cap.position.set(-15 + i * 15, 1.1, 8)
            storageGroup.add(cap)
        }
        
        // Warning signs
        const signPositions = [
            { x: -18, z: 10 },
            { x: -6, z: 10 },
            { x: 6, z: 10 }
        ]
        
        signPositions.forEach(pos => {
            const signGeometry = new THREE.BoxGeometry(1.5, 1, 0.1)
            const signCanvas = document.createElement('canvas')
            signCanvas.width = 128
            signCanvas.height = 128
            const sCtx = signCanvas.getContext('2d')
            sCtx.fillStyle = '#ffcc00'
            sCtx.fillRect(0, 0, 128, 128)
            sCtx.fillStyle = '#000000'
            sCtx.font = 'bold 20px Arial'
            sCtx.textAlign = 'center'
            sCtx.fillText('DANGER', 64, 50)
            sCtx.fillText('HIGH PRESSURE', 64, 80)
            
            const signTexture = new THREE.CanvasTexture(signCanvas)
            const signMaterial = new THREE.MeshBasicMaterial({
                map: signTexture
            })
            const sign = new THREE.Mesh(signGeometry, signMaterial)
            sign.position.set(pos.x, 2, pos.z)
            storageGroup.add(sign)
            
            // Sign post
            const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 8)
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.7
            })
            const post = new THREE.Mesh(postGeometry, postMaterial)
            post.position.set(pos.x, 1, pos.z)
            storageGroup.add(post)
        })
        
        // === 5. Concrete Pad ===
        const padGeometry = new THREE.BoxGeometry(40, 0.3, 20)
        const padMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        })
        const pad = new THREE.Mesh(padGeometry, padMaterial)
        pad.position.set(0, 0.15, 0)
        storageGroup.add(pad)
        
        // Position fuel storage
        storageGroup.position.set(6378 - 45, 0, 25)
        this.spaceCenterGroup.add(storageGroup)
        
        console.log('⛽ Enhanced fuel storage created')
    }
    
    /**
     * Create vehicle assembly building (VAB) - Enhanced version
     */
    createAssemblyBuilding() {
        const vabGroup = new THREE.Group()
        
        // === 1. Main Building Structure ===
        const buildingGeometry = new THREE.BoxGeometry(25, 50, 18)
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.6,
            metalness: 0.3
        })
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
        building.position.y = 25
        vabGroup.add(building)
        
        // Building foundation
        const foundationGeometry = new THREE.BoxGeometry(27, 2, 20)
        const foundationMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.85,
            metalness: 0.15
        })
        const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial)
        foundation.position.y = 1
        vabGroup.add(foundation)
        
        // === 2. Massive Roll-up Doors ===
        const doorPositions = [
            { x: 0, z: 9.1, width: 10, height: 15 },
            { x: -8, z: 9.1, width: 6, height: 10 }
        ]
        
        doorPositions.forEach((doorConfig, index) => {
            // Door frame
            const frameGeometry = new THREE.BoxGeometry(doorConfig.width + 1, doorConfig.height + 1, 0.5)
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.2
            })
            const frame = new THREE.Mesh(frameGeometry, frameMaterial)
            frame.position.set(doorConfig.x, doorConfig.height / 2, doorConfig.z)
            vabGroup.add(frame)
            
            // Door panels (segmented)
            const panelCount = Math.floor(doorConfig.height / 2)
            for (let i = 0; i < panelCount; i++) {
                const panelGeometry = new THREE.BoxGeometry(doorConfig.width - 0.5, 1.8, 0.3)
                const panelMaterial = new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    metalness: 0.75,
                    roughness: 0.25
                })
                const panel = new THREE.Mesh(panelGeometry, panelMaterial)
                panel.position.set(doorConfig.x, 1 + i * 2, doorConfig.z)
                vabGroup.add(panel)
                
                // Panel seams
                const seamGeometry = new THREE.BoxGeometry(doorConfig.width, 0.1, 0.35)
                const seamMaterial = new THREE.MeshBasicMaterial({
                    color: 0x333333
                })
                const seam = new THREE.Mesh(seamGeometry, seamMaterial)
                seam.position.set(doorConfig.x, 1.9 + i * 2, doorConfig.z)
                vabGroup.add(seam)
            }
        })
        
        // === 3. Windows (multiple levels) ===
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            emissive: 0x336699,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        })
        
        // Side windows (5 floors)
        for (let floor = 0; floor < 5; floor++) {
            const yPos = 8 + floor * 8
            
            // Left side
            for (let z = -6; z <= 6; z += 3) {
                const windowGeometry = new THREE.PlaneGeometry(2, 2.5)
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial)
                windowMesh.position.set(-12.51, yPos, z)
                windowMesh.rotation.y = Math.PI / 2
                vabGroup.add(windowMesh)
            }
            
            // Right side
            for (let z = -6; z <= 6; z += 3) {
                const windowGeometry = new THREE.PlaneGeometry(2, 2.5)
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial)
                windowMesh.position.set(12.51, yPos, z)
                windowMesh.rotation.y = -Math.PI / 2
                vabGroup.add(windowMesh)
            }
        }
        
        // === 4. Overhead Crane System ===
        // Main crane beam
        const craneBeamGeometry = new THREE.BoxGeometry(24, 1.5, 1.5)
        const craneBeamMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            metalness: 0.9,
            roughness: 0.1
        })
        const craneBeam = new THREE.Mesh(craneBeamGeometry, craneBeamMaterial)
        craneBeam.position.set(0, 48, 0)
        vabGroup.add(craneBeam)
        
        // Crane wheels/rails
        const railGeometry = new THREE.BoxGeometry(26, 0.5, 0.5)
        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.85
        })
        const leftRail = new THREE.Mesh(railGeometry, railMaterial)
        leftRail.position.set(0, 49, -7)
        vabGroup.add(leftRail)
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial)
        rightRail.position.set(0, 49, 7)
        vabGroup.add(rightRail)
        
        // Crane trolley
        const trolleyGeometry = new THREE.BoxGeometry(3, 2, 2)
        const trolleyMaterial = new THREE.MeshStandardMaterial({
            color: 0xdd8800,
            metalness: 0.85
        })
        const trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial)
        trolley.position.set(5, 46.5, 0)
        vabGroup.add(trolley)
        
        // Crane hook and cable
        const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 8, 8)
        const cableMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9
        })
        const cable = new THREE.Mesh(cableGeometry, cableMaterial)
        cable.position.set(5, 42, 0)
        vabGroup.add(cable)
        
        const hookGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16, Math.PI)
        const hookMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.9
        })
        const hook = new THREE.Mesh(hookGeometry, hookMaterial)
        hook.position.set(5, 37.5, 0)
        hook.rotation.z = Math.PI / 2
        vabGroup.add(hook)
        
        // === 5. Internal Work Platforms ===
        const platformLevels = [10, 20, 30, 40]
        platformLevels.forEach(level => {
            // Platform floor
            const platformGeometry = new THREE.BoxGeometry(22, 0.5, 15)
            const platformMaterial = new THREE.MeshStandardMaterial({
                color: 0x777777,
                metalness: 0.7,
                roughness: 0.3
            })
            const platform = new THREE.Mesh(platformGeometry, platformMaterial)
            platform.position.set(0, level, 0)
            vabGroup.add(platform)
            
            // Safety railing
            const railingGeometry = new THREE.BoxGeometry(22, 1, 0.1)
            const railingMaterial = new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                metalness: 0.6
            })
            const frontRailing = new THREE.Mesh(railingGeometry, railingMaterial)
            frontRailing.position.set(0, level + 0.5, 7.5)
            vabGroup.add(frontRailing)
            
            const backRailing = new THREE.Mesh(railingGeometry, railingMaterial)
            backRailing.position.set(0, level + 0.5, -7.5)
            vabGroup.add(backRailing)
        })
        
        // === 6. Rooftop Equipment ===
        // Ventilation systems
        for (let i = 0; i < 4; i++) {
            const ventGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 16)
            const ventMaterial = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                metalness: 0.7,
                roughness: 0.3
            })
            const vent = new THREE.Mesh(ventGeometry, ventMaterial)
            vent.position.set(-8 + i * 5, 51.5, -5)
            vabGroup.add(vent)
            
            // Vent cap
            const capGeometry = new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
            const cap = new THREE.Mesh(capGeometry, ventMaterial)
            cap.position.set(-8 + i * 5, 53, -5)
            vabGroup.add(cap)
        }
        
        // Antenna array on roof
        for (let i = 0; i < 3; i++) {
            const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.15, 6, 8)
            const antennaMaterial = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.9
            })
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
            antenna.position.set(-6 + i * 6, 53, 5)
            vabGroup.add(antenna)
            
            // Warning light
            const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8)
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000
            })
            const light = new THREE.Mesh(lightGeometry, lightMaterial)
            light.position.set(-6 + i * 6, 56, 5)
            vabGroup.add(light)
        }
        
        // === 7. American Flag (or mission emblem) ===
        const flagPoleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 8, 8)
        const flagPoleMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.8
        })
        const flagPole = new THREE.Mesh(flagPoleGeometry, flagPoleMaterial)
        flagPole.position.set(10, 4, 9.5)
        vabGroup.add(flagPole)
        
        const flagGeometry = new THREE.PlaneGeometry(3, 2)
        const flagCanvas = document.createElement('canvas')
        flagCanvas.width = 256
        flagCanvas.height = 128
        const fCtx = flagCanvas.getContext('2d')
        fCtx.fillStyle = '#B22234'
        fCtx.fillRect(0, 0, 256, 128)
        for (let i = 0; i < 7; i++) {
            fCtx.fillStyle = '#FFFFFF'
            fCtx.fillRect(0, i * 18.3, 256, 9.15)
        }
        fCtx.fillStyle = '#3C3B6E'
        fCtx.fillRect(0, 0, 102.4, 73.2)
        
        const flagTexture = new THREE.CanvasTexture(flagCanvas)
        const flagMaterial = new THREE.MeshBasicMaterial({
            map: flagTexture,
            side: THREE.DoubleSide
        })
        const flag = new THREE.Mesh(flagGeometry, flagMaterial)
        flag.position.set(11.5, 7, 9.5)
        vabGroup.add(flag)
        
        // === 8. Ground Apron ===
        const apronGeometry = new THREE.BoxGeometry(35, 0.4, 25)
        const apronMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.9,
            metalness: 0.1
        })
        const apron = new THREE.Mesh(apronGeometry, apronMaterial)
        apron.position.set(0, 0.2, 0)
        vabGroup.add(apron)
        
        // Position VAB
        vabGroup.position.set(6378, 0, -65)
        this.spaceCenterGroup.add(vabGroup)
        
        console.log('🏭 Enhanced assembly building created')
    }
    
    /**
     * Create roads and infrastructure - Enhanced version
     */
    createRoadsAndInfrastructure() {
        const roadGroup = new THREE.Group()
        
        // === 1. Main Road Network ===
        // Primary road connecting all facilities
        const mainRoadGeometry = new THREE.PlaneGeometry(150, 10)
        const roadMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.95,
            metalness: 0.05
        })
        const mainRoad = new THREE.Mesh(mainRoadGeometry, roadMaterial)
        mainRoad.rotation.x = -Math.PI / 2
        mainRoad.position.set(0, 0.02, 0)
        roadGroup.add(mainRoad)
        
        // Road center line markings
        for (let x = -70; x < 70; x += 4) {
            const lineGeometry = new THREE.PlaneGeometry(2, 0.3)
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00
            })
            const line = new THREE.Mesh(lineGeometry, lineMaterial)
            line.rotation.x = -Math.PI / 2
            line.position.set(x, 0.03, 0)
            roadGroup.add(line)
        }
        
        // Road edge lines
        const leftEdgeGeometry = new THREE.PlaneGeometry(150, 0.2)
        const rightEdgeGeometry = new THREE.PlaneGeometry(150, 0.2)
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        })
        
        const leftEdge = new THREE.Mesh(leftEdgeGeometry, edgeMaterial)
        leftEdge.rotation.x = -Math.PI / 2
        leftEdge.position.set(0, 0.03, -4.9)
        roadGroup.add(leftEdge)
        
        const rightEdge = new THREE.Mesh(rightEdgeGeometry, edgeMaterial)
        rightEdge.rotation.x = -Math.PI / 2
        rightEdge.position.set(0, 0.03, 4.9)
        roadGroup.add(rightEdge)
        
        // === 2. Secondary Roads ===
        // Road to fuel storage
        const fuelRoadGeometry = new THREE.PlaneGeometry(30, 8)
        const fuelRoad = new THREE.Mesh(fuelRoadGeometry, roadMaterial)
        fuelRoad.rotation.x = -Math.PI / 2
        fuelRoad.position.set(-60, 0.02, 15)
        roadGroup.add(fuelRoad)
        
        // Road to VAB
        const vabRoadGeometry = new THREE.PlaneGeometry(20, 8)
        const vabRoad = new THREE.Mesh(vabRoadGeometry, roadMaterial)
        vabRoad.rotation.x = -Math.PI / 2
        vabRoad.rotation.z = Math.PI / 2
        vabRoad.position.set(0, 0.02, -45)
        roadGroup.add(vabRoad)
        
        // === 3. Intersection Markings ===
        // Crosswalk at main intersection
        for (let i = 0; i < 8; i++) {
            const stripeGeometry = new THREE.PlaneGeometry(0.8, 4)
            const stripeMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff
            })
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
            stripe.rotation.x = -Math.PI / 2
            stripe.position.set(-5 + i * 1.2, 0.03, 0)
            roadGroup.add(stripe)
        }
        
        // === 4. Enhanced Parking Areas ===
        // Main parking lot near mission control
        const mainParkingGeometry = new THREE.PlaneGeometry(35, 25)
        const parkingMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.92,
            metalness: 0.08
        })
        const mainParking = new THREE.Mesh(mainParkingGeometry, parkingMaterial)
        mainParking.rotation.x = -Math.PI / 2
        mainParking.position.set(60, 0.02, 35)
        roadGroup.add(mainParking)
        
        // Parking space lines
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 7; col++) {
                // Vertical dividers
                if (col < 6) {
                    const dividerGeometry = new THREE.PlaneGeometry(0.15, 4.5)
                    const dividerMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff
                    })
                    const divider = new THREE.Mesh(dividerGeometry, dividerMaterial)
                    divider.rotation.x = -Math.PI / 2
                    divider.position.set(
                        45 + col * 4.5,
                        0.03,
                        25 + row * 4.5
                    )
                    roadGroup.add(divider)
                }
            }
        }
        
        // === 5. Detailed Vehicles ===
        const vehicleConfigs = [
            { type: 'sedan', x: 48, z: 27, color: 0xffffff },
            { type: 'sedan', x: 52, z: 27, color: 0x333333 },
            { type: 'truck', x: 56, z: 27, color: 0xcc0000 },
            { type: 'sedan', x: 60, z: 27, color: 0x0066cc },
            { type: 'van', x: 64, z: 27, color: 0x00aa00 },
            { type: 'sedan', x: 48, z: 31, color: 0x666666 },
            { type: 'truck', x: 52, z: 31, color: 0xff6600 },
            { type: 'sedan', x: 56, z: 31, color: 0x9900cc }
        ]
        
        vehicleConfigs.forEach(config => {
            const vehicleGroup = new THREE.Group()
            
            if (config.type === 'sedan') {
                // Sedan body
                const bodyGeometry = new THREE.BoxGeometry(2.5, 0.9, 1.3)
                const bodyMaterial = new THREE.MeshStandardMaterial({
                    color: config.color,
                    metalness: 0.65,
                    roughness: 0.25
                })
                const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
                body.position.y = 0.65
                vehicleGroup.add(body)
                
                // Cabin
                const cabinGeometry = new THREE.BoxGeometry(1.3, 0.7, 1.1)
                const cabinMaterial = new THREE.MeshStandardMaterial({
                    color: 0x222222,
                    metalness: 0.85,
                    roughness: 0.1
                })
                const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial)
                cabin.position.y = 1.45
                vehicleGroup.add(cabin)
                
            } else if (config.type === 'truck') {
                // Truck cab
                const cabGeometry = new THREE.BoxGeometry(1.5, 1.2, 1.4)
                const cabMaterial = new THREE.MeshStandardMaterial({
                    color: config.color,
                    metalness: 0.6,
                    roughness: 0.3
                })
                const cab = new THREE.Mesh(cabGeometry, cabMaterial)
                cab.position.set(-0.5, 0.9, 0)
                vehicleGroup.add(cab)
                
                // Truck bed
                const bedGeometry = new THREE.BoxGeometry(1.8, 0.8, 1.3)
                const bedMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.5
                })
                const bed = new THREE.Mesh(bedGeometry, bedMaterial)
                bed.position.set(1, 0.7, 0)
                vehicleGroup.add(bed)
                
            } else if (config.type === 'van') {
                // Van body
                const vanGeometry = new THREE.BoxGeometry(2.8, 1.5, 1.4)
                const vanMaterial = new THREE.MeshStandardMaterial({
                    color: config.color,
                    metalness: 0.6,
                    roughness: 0.3
                })
                const van = new THREE.Mesh(vanGeometry, vanMaterial)
                van.position.y = 0.95
                vehicleGroup.add(van)
            }
            
            // Wheels for all vehicles
            const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12)
            const wheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.8
            })
            
            const wheelPositions = [
                { x: -0.8, z: 0.6 },
                { x: 0.8, z: 0.6 },
                { x: -0.8, z: -0.6 },
                { x: 0.8, z: -0.6 }
            ]
            
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
                wheel.rotation.z = Math.PI / 2
                wheel.position.set(pos.x, 0.35, pos.z)
                vehicleGroup.add(wheel)
            })
            
            vehicleGroup.position.set(config.x, 0, config.z)
            vehicleGroup.rotation.y = (Math.random() - 0.5) * 0.3
            roadGroup.add(vehicleGroup)
        })
        
        // === 6. Street Lighting ===
        const streetLightPositions = [
            { x: -60, z: 6 },
            { x: -40, z: 6 },
            { x: -20, z: 6 },
            { x: 0, z: 6 },
            { x: 20, z: 6 },
            { x: 40, z: 6 },
            { x: 60, z: 6 }
        ]
        
        streetLightPositions.forEach(pos => {
            // Light pole
            const poleGeometry = new THREE.CylinderGeometry(0.12, 0.18, 8, 8)
            const poleMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                metalness: 0.8,
                roughness: 0.2
            })
            const pole = new THREE.Mesh(poleGeometry, poleMaterial)
            pole.position.set(pos.x, 4, pos.z)
            roadGroup.add(pole)
            
            // Light fixture arm
            const armGeometry = new THREE.BoxGeometry(2, 0.15, 0.15)
            const armMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.75
            })
            const arm = new THREE.Mesh(armGeometry, armMaterial)
            arm.position.set(pos.x + 1, 7.8, pos.z)
            roadGroup.add(arm)
            
            // Light head
            const lightHeadGeometry = new THREE.BoxGeometry(1, 0.4, 0.6)
            const lightHeadMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffffaa,
                emissiveIntensity: 0.6
            })
            const lightHead = new THREE.Mesh(lightHeadGeometry, lightHeadMaterial)
            lightHead.position.set(pos.x + 1.8, 7.6, pos.z)
            roadGroup.add(lightHead)
            
            // Actual point light
            const streetLight = new THREE.PointLight(0xffffee, 0.6, 25)
            streetLight.position.set(pos.x + 1.8, 7.4, pos.z)
            roadGroup.add(streetLight)
        })
        
        // === 7. Landscaping and Greenery ===
        // Grass areas
        const grassGeometry = new THREE.PlaneGeometry(200, 100)
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a7c3f,
            roughness: 1.0,
            metalness: 0.0
        })
        const grass = new THREE.Mesh(grassGeometry, grassMaterial)
        grass.rotation.x = -Math.PI / 2
        grass.position.set(0, -0.01, 0)
        roadGroup.add(grass)
        
        // Trees along roads
        const treeLinePositions = []
        for (let x = -70; x <= 70; x += 15) {
            treeLinePositions.push({ x, z: -8 })
            treeLinePositions.push({ x, z: 8 })
        }
        
        treeLinePositions.forEach((pos, index) => {
            const treeGroup = new THREE.Group()
            
            // Trunk
            const trunkHeight = 2 + Math.random() * 1.5
            const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.35, trunkHeight, 8)
            const trunkMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 0.95
            })
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
            trunk.position.y = trunkHeight / 2
            treeGroup.add(trunk)
            
            // Foliage (multiple layers for fuller look)
            const foliageLayers = [
                { y: trunkHeight + 0.5, radius: 1.8 },
                { y: trunkHeight + 1.5, radius: 1.4 },
                { y: trunkHeight + 2.3, radius: 1.0 }
            ]
            
            foliageLayers.forEach(layer => {
                const foliageGeometry = new THREE.SphereGeometry(layer.radius, 8, 8)
                const foliageMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.7, 0.3 + Math.random() * 0.15),
                    roughness: 0.85
                })
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
                foliage.position.y = layer.y
                treeGroup.add(foliage)
            })
            
            treeGroup.position.set(pos.x, 0, pos.z)
            treeGroup.scale.setScalar(0.8 + Math.random() * 0.4)
            roadGroup.add(treeGroup)
        })
        
        // === 8. Signage ===
        // Directional signs
        const signData = [
            { text: 'LAUNCH PAD →', x: -30, z: -6 },
            { text: '← MISSION CONTROL', x: 30, z: -6 },
            { text: 'VAB ↑', x: 0, z: -35 }
        ]
        
        signData.forEach(sign => {
            const signGroup = new THREE.Group()
            
            // Sign post
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.12, 3, 8)
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.7
            })
            const post = new THREE.Mesh(postGeometry, postMaterial)
            post.position.y = 1.5
            signGroup.add(post)
            
            // Sign board
            const boardGeometry = new THREE.BoxGeometry(4, 1.5, 0.1)
            const boardCanvas = document.createElement('canvas')
            boardCanvas.width = 512
            boardCanvas.height = 128
            const bCtx = boardCanvas.getContext('2d')
            bCtx.fillStyle = '#0066cc'
            bCtx.fillRect(0, 0, 512, 128)
            bCtx.fillStyle = '#ffffff'
            bCtx.font = 'bold 48px Arial'
            bCtx.textAlign = 'center'
            bCtx.fillText(sign.text, 256, 85)
            
            const boardTexture = new THREE.CanvasTexture(boardCanvas)
            const boardMaterial = new THREE.MeshBasicMaterial({
                map: boardTexture
            })
            const board = new THREE.Mesh(boardGeometry, boardMaterial)
            board.position.y = 3
            signGroup.add(board)
            
            signGroup.position.set(sign.x, 0, sign.z)
            roadGroup.add(signGroup)
        })
        
        // Position infrastructure
        roadGroup.position.set(6378, 0, 0)
        this.spaceCenterGroup.add(roadGroup)
        
        console.log('🛣️ Enhanced infrastructure created')
    }
    
    /**
     * Initialize ground scene - position spacecraft and camera
     */
    initGroundScene() {
        // Position spacecraft on launch pad
        if (this.spacecraft) {
            this.spacecraft.position.set(6378, 1, 0)
            this.spacecraftData.position.copy(this.spacecraft.position)
            this.spacecraftData.velocity.set(0, 0, 0)
        }
        
        // Set camera to viewing position
        if (this.camera) {
            this.camera.position.set(6378 + 30, 15, 30)
            this.camera.lookAt(6378, 10, 0)
        }
        
        console.log('🌍 Ground scene initialized')
    }
    
    /**
     * Start launch sequence with enhanced countdown and systems check
     */
    startLaunchSequence() {
        if (this.gameState.mode !== 'GROUND') {
            console.warn('Can only launch from GROUND mode')
            return
        }
        
        this.gameState.launchPhase = 'PRE_LAUNCH'
        this.gameState.countdownTime = 10
        this.gameState.missionTime = 0
        
        // Initialize launch systems
        this.initializeLaunchSystems()
        
        // Create enhanced countdown UI
        this.createEnhancedCountdownUI()
        
        // Start pre-launch checks
        setTimeout(() => {
            this.gameState.launchPhase = 'COUNTDOWN'
            console.log('🚀 Launch sequence initiated! T-10 seconds')
            this.showNotification('Launch Sequence Started - All Systems Go!', 'info')
        }, 2000)
    }
    
    /**
     * Initialize launch systems before countdown
     */
    initializeLaunchSystems() {
        // Retract umbilical arms
        this.retractUmbilicalArms()
        
        // Pressurize fuel tanks
        this.pressurizeTanks()
        
        // Activate ground support equipment
        this.activateGroundSupport()
        
        console.log('✅ Launch systems initialized')
    }
    
    /**
     * Retract umbilical service arms
     */
    retractUmbilicalArms() {
        // Animate arm retraction (visual effect)
        if (this.launchPad) {
            // Find and animate service arms
            const arms = []
            this.launchPad.traverse((child) => {
                if (child.isMesh && child.position.y > 8 && child.position.y < 26) {
                    if (child.geometry.type === 'BoxGeometry' && child.position.x > 0) {
                        arms.push(child)
                    }
                }
            })
            
            // Store original positions for animation
            this.umbilicalArms = arms.map(arm => ({
                mesh: arm,
                originalX: arm.position.x
            }))
            
            console.log('🔧 Umbilical arms retracting...')
        }
    }
    
    /**
     * Pressurize fuel tanks
     */
    pressurizeTanks() {
        // Visual indicator of tank pressurization
        this.tankPressurized = true
        console.log('⛽ Fuel tanks pressurized')
    }
    
    /**
     * Activate ground support equipment
     */
    activateGroundSupport() {
        // Enable water deluge system
        this.delugeSystemActive = true
        
        // Activate flame trench cooling
        this.flameTrenchCooling = true
        
        console.log('🌊 Ground support systems activated')
    }
    
    /**
     * Create enhanced countdown display UI with system status
     */
    createEnhancedCountdownUI() {
        // Remove existing countdown if any
        const existingCountdown = document.getElementById('launch-countdown-container')
        if (existingCountdown) {
            existingCountdown.remove()
        }
        
        // Main container
        const container = document.createElement('div')
        container.id = 'launch-countdown-container'
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 5000;
            text-align: center;
            font-family: 'Courier New', monospace;
        `
        
        // Countdown number
        const countdownDiv = document.createElement('div')
        countdownDiv.id = 'launch-countdown'
        countdownDiv.style.cssText = `
            font-size: 140px;
            font-weight: bold;
            color: #ff4444;
            text-shadow: 0 0 30px rgba(255, 68, 68, 0.9), 0 0 60px rgba(255, 68, 68, 0.6);
            margin-bottom: 20px;
            transition: all 0.3s ease;
        `
        countdownDiv.textContent = '10'
        container.appendChild(countdownDiv)
        
        // Phase indicator
        const phaseDiv = document.createElement('div')
        phaseDiv.id = 'launch-phase'
        phaseDiv.style.cssText = `
            font-size: 24px;
            color: #00ccff;
            text-shadow: 0 0 10px rgba(0, 204, 255, 0.8);
            margin-bottom: 15px;
            font-weight: bold;
        `
        phaseDiv.textContent = 'FINAL COUNTDOWN'
        container.appendChild(phaseDiv)
        
        // System status panel
        const statusPanel = document.createElement('div')
        statusPanel.id = 'launch-status-panel'
        statusPanel.style.cssText = `
            background: rgba(0, 20, 40, 0.9);
            border: 2px solid #00ccff;
            border-radius: 10px;
            padding: 15px 25px;
            min-width: 300px;
            box-shadow: 0 0 30px rgba(0, 204, 255, 0.4);
        `
        
        statusPanel.innerHTML = `
            <div style="margin: 8px 0; color: #00ff88;">
                <span style="display: inline-block; width: 20px;">✅</span>
                <span>Fuel Systems: PRESSURIZED</span>
            </div>
            <div style="margin: 8px 0; color: #00ff88;">
                <span style="display: inline-block; width: 20px;">✅</span>
                <span>Guidance: ALIGNED</span>
            </div>
            <div style="margin: 8px 0; color: #00ff88;">
                <span style="display: inline-block; width: 20px;">✅</span>
                <span>Life Support: NOMINAL</span>
            </div>
            <div style="margin: 8px 0; color: #ffaa00;">
                <span style="display: inline-block; width: 20px;">⚠️</span>
                <span>Umbilicals: RETRACTING...</span>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #006688; color: #ffffff; font-size: 12px;">
                T-<span id="countdown-seconds">10</span>s TO LIFTOFF
            </div>
        `
        
        container.appendChild(statusPanel)
        document.body.appendChild(container)
        
        this.countdownElement = countdownDiv
        this.phaseElement = phaseDiv
        this.statusPanel = statusPanel
        
        console.log('📊 Enhanced countdown UI created')
    }
    
    /**
     * Update countdown timer with enhanced phases
     */
    updateCountdown(deltaTime) {
        if (this.gameState.launchPhase !== 'COUNTDOWN' || !this.countdownElement) {
            return
        }
        
        this.gameState.countdownTime -= deltaTime
        const remainingTime = Math.ceil(this.gameState.countdownTime)
        
        // Update main countdown number display
        if (this.countdownElement) {
            this.countdownElement.textContent = remainingTime > 0 ? remainingTime : '0'
        }
        
        // Update seconds display in status panel
        const secondsElement = document.getElementById('countdown-seconds')
        if (secondsElement) {
            secondsElement.textContent = remainingTime > 0 ? remainingTime : '0'
        }
        
        // Phase-based announcements and effects
        if (remainingTime === 10) {
            this.phaseElement.textContent = 'FINAL COUNTDOWN'
            this.updateUmbilicalStatus('RETRACTING...')
        } else if (remainingTime === 7) {
            this.phaseElement.textContent = 'UMBILICALS RETRACTED'
            this.updateUmbilicalStatus('RETRACTED ✅')
            this.completeUmbilicalRetraction()
        } else if (remainingTime === 5) {
            this.phaseElement.textContent = 'ENGINE START SEQUENCE'
            this.startEngineIgnitionSequence()
        } else if (remainingTime === 3) {
            this.phaseElement.textContent = 'MAIN ENGINE IGNITION'
            this.igniteMainEngines()
        } else if (remainingTime === 1) {
            this.phaseElement.textContent = 'LIFTOFF IMMINENT'
            this.countdownElement.style.color = '#ffaa00'
        }
        
        if (this.gameState.countdownTime <= 0) {
            // Countdown complete - liftoff!
            this.gameState.countdownTime = 0
            this.gameState.launchPhase = 'LIFTOFF'
            this.gameState.mode = 'LAUNCH'  // Switch to LAUNCH mode for animation
            
            // Visual effects
            this.countdownElement.textContent = 'LIFTOFF!'
            this.countdownElement.style.color = '#00ff88'
            this.countdownElement.style.textShadow = '0 0 40px rgba(0, 255, 136, 1), 0 0 80px rgba(0, 255, 136, 0.8)'
            this.phaseElement.textContent = 'VEHICLE IS AIRBORNE'
            this.phaseElement.style.color = '#00ff88'
            
            // Update status panel
            if (this.statusPanel) {
                this.statusPanel.innerHTML = `
                    <div style="margin: 8px 0; color: #00ff88; font-size: 18px; font-weight: bold;">
                         LIFTOFF CONFIRMED
                    </div>
                    <div style="margin: 8px 0; color: #ffffff;">
                        Altitude: <span id="live-altitude">0</span> m
                    </div>
                    <div style="margin: 8px 0; color: #ffffff;">
                        Velocity: <span id="live-velocity">0</span> m/s
                    </div>
                `
            }
            
            setTimeout(() => {
                const container = document.getElementById('launch-countdown-container')
                if (container) {
                    container.style.animation = 'fadeOut 1s ease-out'
                    setTimeout(() => container.remove(), 1000)
                }
                this.countdownElement = null
                this.phaseElement = null
                this.statusPanel = null
            }, 3000)
            
            // Create enhanced engine particles
            this.createEnhancedEngineParticles()
            
            // Activate launch pad effects
            this.activateLaunchPadEffects()
            
            console.log('🚀 LIFTOFF!')
            this.showNotification('Liftoff Confirmed! Vehicle is airborne!', 'success')
        } else {
            // Pulsing effect for last 3 seconds
            if (remainingTime <= 3) {
                const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7
                this.countdownElement.style.opacity = pulse
            }
        }
    }
    
    /**
     * Update umbilical status in UI
     */
    updateUmbilicalStatus(status) {
        if (!this.statusPanel) return
        
        const umbilicalDiv = this.statusPanel.querySelector('div:nth-child(4)')
        if (umbilicalDiv) {
            umbilicalDiv.innerHTML = `
                <span style="display: inline-block; width: 20px;">${status.includes('✅') ? '✅' : '⚠️'}</span>
                <span>Umbilicals: ${status}</span>
            `
        }
    }
    
    /**
     * Complete umbilical arm retraction animation
     */
    completeUmbilicalRetraction() {
        if (this.umbilicalArms) {
            this.umbilicalArms.forEach(armData => {
                // Animate arm moving away
                const targetX = armData.originalX + 3
                const duration = 1000 // ms
                const startTime = Date.now()
                
                const animate = () => {
                    const elapsed = Date.now() - startTime
                    const progress = Math.min(elapsed / duration, 1)
                    const eased = progress * progress // Ease out
                    
                    armData.mesh.position.x = armData.originalX + (3 * eased)
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate)
                    }
                }
                
                animate()
            })
            
            console.log('✅ Umbilical arms fully retracted')
        }
    }
    
    /**
     * Start engine ignition sequence at T-5
     */
    startEngineIgnitionSequence() {
        // Pre-ignition checks
        this.enginePreIgnition = true
        
        // Small pre-ignition flame
        this.createPreIgnitionFlame()
        
        console.log('🔥 Engine ignition sequence started')
    }
    
    /**
     * Create pre-ignition flame at T-5
     */
    createPreIgnitionFlame() {
        if (!this.spacecraft) return
        
        // Small initial flame
        const flameGeometry = new THREE.BufferGeometry()
        const flameCount = 50
        const positions = new Float32Array(flameCount * 3)
        const colors = new Float32Array(flameCount * 3)
        
        for (let i = 0; i < flameCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.3
            positions[i * 3 + 1] = -Math.random() * 2
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3
            
            colors[i * 3] = 1.0
            colors[i * 3 + 1] = 0.5
            colors[i * 3 + 2] = 0.0
        }
        
        flameGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        flameGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        const flameMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        })
        
        this.preIgnitionFlame = new THREE.Points(flameGeometry, flameMaterial)
        this.preIgnitionFlame.position.y = -0.3
        this.spacecraft.add(this.preIgnitionFlame)
    }
    
    /**
     * Ignite main engines at T-3
     */
    igniteMainEngines() {
        // Full engine power buildup
        this.mainEnginesIgnited = true
        
        // Remove pre-ignition flame
        if (this.preIgnitionFlame && this.spacecraft) {
            this.spacecraft.remove(this.preIgnitionFlame)
            this.preIgnitionFlame = null
        }
        
        console.log('🔥 Main engines at full thrust')
    }
    
    /**
     * Activate launch pad visual effects
     */
    activateLaunchPadEffects() {
        // Water deluge spray
        this.createWaterDelugeEffect()
        
        // Launch pad shake
        this.startLaunchPadShake()
        
        // Intense lighting from engines
        this.createEngineGlowLight()
        
        console.log('💥 Launch pad effects activated')
    }
    
    /**
     * Create water deluge spray effect
     */
    createWaterDelugeEffect() {
        if (!this.launchPad) return
        
        // Water spray particles around launch pad
        const waterGeometry = new THREE.BufferGeometry()
        const waterCount = 300
        const positions = new Float32Array(waterCount * 3)
        
        for (let i = 0; i < waterCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = 5 + Math.random() * 10
            positions[i * 3] = Math.cos(angle) * radius
            positions[i * 3 + 1] = Math.random() * 5
            positions[i * 3 + 2] = Math.sin(angle) * radius
        }
        
        waterGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        const waterMaterial = new THREE.PointsMaterial({
            size: 0.4,
            color: 0xaaddff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        })
        
        this.waterDeluge = new THREE.Points(waterGeometry, waterMaterial)
        this.waterDeluge.position.set(6378, 0, 0)
        this.scene.add(this.waterDeluge)
    }
    
    /**
     * Start launch pad shaking effect
     */
    startLaunchPadShake() {
        if (!this.launchPad) return
        
        this.launchPadShakeActive = true
        this.launchPadShakeIntensity = 0.5
        
        // Gradually reduce shake over time
        setTimeout(() => {
            this.launchPadShakeActive = false
        }, 5000)
    }
    
    /**
     * Update launch pad shake animation
     */
    updateLaunchPadShake(deltaTime) {
        if (!this.launchPadShakeActive || !this.launchPad) return
        
        // Reduce intensity over time
        this.launchPadShakeIntensity *= 0.98
        
        if (this.launchPadShakeIntensity < 0.01) {
            this.launchPadShakeActive = false
            return
        }
        
        // Apply random shake
        const shakeX = (Math.random() - 0.5) * this.launchPadShakeIntensity
        const shakeZ = (Math.random() - 0.5) * this.launchPadShakeIntensity
        
        this.launchPad.position.x = 6378 + shakeX
        this.launchPad.position.z = shakeZ
    }
    
    /**
     * Create intense engine glow light
     */
    createEngineGlowLight() {
        if (!this.spacecraft) return
        
        // Bright orange light under rocket
        const engineLight = new THREE.PointLight(0xff6600, 3, 50)
        engineLight.position.set(0, -2, 0)
        this.spacecraft.add(engineLight)
        
        this.engineGlowLight = engineLight
        
        // Fade out as rocket gains altitude
        setTimeout(() => {
            const fadeInterval = setInterval(() => {
                if (engineLight.intensity > 0.1) {
                    engineLight.intensity *= 0.95
                } else {
                    clearInterval(fadeInterval)
                }
            }, 100)
        }, 2000)
    }
    
    /**
     * Create enhanced multi-layer engine particle effects
     */
    createEnhancedEngineParticles() {
        // === Layer 1: Core Flame (hottest, brightest) ===
        const coreFlameGeometry = new THREE.BufferGeometry()
        const coreFlameCount = 300
        const corePositions = new Float32Array(coreFlameCount * 3)
        const coreColors = new Float32Array(coreFlameCount * 3)
        
        for (let i = 0; i < coreFlameCount; i++) {
            corePositions[i * 3] = (Math.random() - 0.5) * 0.4
            corePositions[i * 3 + 1] = -Math.random() * 6
            corePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
            
            // White-hot core transitioning to yellow
            coreColors[i * 3] = 1.0
            coreColors[i * 3 + 1] = 0.8 + Math.random() * 0.2
            coreColors[i * 3 + 2] = 0.3 + Math.random() * 0.3
        }
        
        coreFlameGeometry.setAttribute('position', new THREE.BufferAttribute(corePositions, 3))
        coreFlameGeometry.setAttribute('color', new THREE.BufferAttribute(coreColors, 3))
        
        const coreFlameMaterial = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        })
        
        this.coreFlame = new THREE.Points(coreFlameGeometry, coreFlameMaterial)
        this.coreFlame.position.y = -0.5
        this.spacecraft.add(this.coreFlame)
        
        // === Layer 2: Main Flame (orange-red) ===
        const mainFlameGeometry = new THREE.BufferGeometry()
        const mainFlameCount = 400
        const mainPositions = new Float32Array(mainFlameCount * 3)
        const mainColors = new Float32Array(mainFlameCount * 3)
        
        for (let i = 0; i < mainFlameCount; i++) {
            mainPositions[i * 3] = (Math.random() - 0.5) * 0.8
            mainPositions[i * 3 + 1] = -Math.random() * 8
            mainPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8
            
            // Orange to red gradient
            mainColors[i * 3] = 1.0
            mainColors[i * 3 + 1] = 0.3 + Math.random() * 0.3
            mainColors[i * 3 + 2] = 0.0
        }
        
        mainFlameGeometry.setAttribute('position', new THREE.BufferAttribute(mainPositions, 3))
        mainFlameGeometry.setAttribute('color', new THREE.BufferAttribute(mainColors, 3))
        
        const mainFlameMaterial = new THREE.PointsMaterial({
            size: 0.35,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        })
        
        this.mainFlame = new THREE.Points(mainFlameGeometry, mainFlameMaterial)
        this.mainFlame.position.y = -0.6
        this.spacecraft.add(this.mainFlame)
        
        // === Layer 3: Outer Flame (darker, wider) ===
        const outerFlameGeometry = new THREE.BufferGeometry()
        const outerFlameCount = 250
        const outerPositions = new Float32Array(outerFlameCount * 3)
        const outerColors = new Float32Array(outerFlameCount * 3)
        
        for (let i = 0; i < outerFlameCount; i++) {
            outerPositions[i * 3] = (Math.random() - 0.5) * 1.2
            outerPositions[i * 3 + 1] = -Math.random() * 10
            outerPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.2
            
            // Dark orange/red
            outerColors[i * 3] = 1.0
            outerColors[i * 3 + 1] = 0.2 + Math.random() * 0.2
            outerColors[i * 3 + 2] = 0.0
        }
        
        outerFlameGeometry.setAttribute('position', new THREE.BufferAttribute(outerPositions, 3))
        outerFlameGeometry.setAttribute('color', new THREE.BufferAttribute(outerColors, 3))
        
        const outerFlameMaterial = new THREE.PointsMaterial({
            size: 0.45,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        })
        
        this.outerFlame = new THREE.Points(outerFlameGeometry, outerFlameMaterial)
        this.outerFlame.position.y = -0.7
        this.spacecraft.add(this.outerFlame)
        
        // === Layer 4: Thick Smoke (gray-black) ===
        const smokeGeometry = new THREE.BufferGeometry()
        const smokeCount = 500
        const smokePositions = new Float32Array(smokeCount * 3)
        const smokeSizes = new Float32Array(smokeCount)
        
        for (let i = 0; i < smokeCount; i++) {
            smokePositions[i * 3] = (Math.random() - 0.5) * 3
            smokePositions[i * 3 + 1] = -Math.random() * 15
            smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 3
            smokeSizes[i] = 0.5 + Math.random() * 1.5
        }
        
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3))
        smokeGeometry.setAttribute('size', new THREE.BufferAttribute(smokeSizes, 1))
        
        const smokeMaterial = new THREE.PointsMaterial({
            size: 1.0,
            color: 0x444444,
            transparent: true,
            opacity: 0.6,
            blending: THREE.NormalBlending
        })
        
        this.thickSmoke = new THREE.Points(smokeGeometry, smokeMaterial)
        this.thickSmoke.position.y = -2
        this.spacecraft.add(this.thickSmoke)
        
        // === Layer 5: Steam/Vapor (white, from water deluge) ===
        const steamGeometry = new THREE.BufferGeometry()
        const steamCount = 200
        const steamPositions = new Float32Array(steamCount * 3)
        
        for (let i = 0; i < steamCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = 2 + Math.random() * 4
            steamPositions[i * 3] = Math.cos(angle) * radius
            steamPositions[i * 3 + 1] = -Math.random() * 8
            steamPositions[i * 3 + 2] = Math.sin(angle) * radius
        }
        
        steamGeometry.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3))
        
        const steamMaterial = new THREE.PointsMaterial({
            size: 0.8,
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        })
        
        this.steamVapor = new THREE.Points(steamGeometry, steamMaterial)
        this.steamVapor.position.y = -1
        this.spacecraft.add(this.steamVapor)
        
        console.log('🔥 Enhanced multi-layer engine particles created')
    }
    
    /**
     * Update enhanced engine particles animation
     */
    updateEngineParticles(deltaTime) {
        // Animate core flame (fastest, hottest)
        if (this.coreFlame) {
            const positions = this.coreFlame.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 4 * deltaTime // Fast downward movement
                positions[i] += (Math.random() - 0.5) * 0.05 // Slight turbulence
                positions[i + 2] += (Math.random() - 0.5) * 0.05
                
                if (positions[i + 1] < -6) {
                    positions[i + 1] = 0
                    positions[i] = (Math.random() - 0.5) * 0.4
                    positions[i + 2] = (Math.random() - 0.5) * 0.4
                }
            }
            this.coreFlame.geometry.attributes.position.needsUpdate = true
        }
        
        // Animate main flame
        if (this.mainFlame) {
            const positions = this.mainFlame.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 3 * deltaTime
                positions[i] += (Math.random() - 0.5) * 0.08
                positions[i + 2] += (Math.random() - 0.5) * 0.08
                
                if (positions[i + 1] < -8) {
                    positions[i + 1] = 0
                    positions[i] = (Math.random() - 0.5) * 0.8
                    positions[i + 2] = (Math.random() - 0.5) * 0.8
                }
            }
            this.mainFlame.geometry.attributes.position.needsUpdate = true
        }
        
        // Animate outer flame
        if (this.outerFlame) {
            const positions = this.outerFlame.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 2.5 * deltaTime
                positions[i] += (Math.random() - 0.5) * 0.1
                positions[i + 2] += (Math.random() - 0.5) * 0.1
                
                if (positions[i + 1] < -10) {
                    positions[i + 1] = 0
                    positions[i] = (Math.random() - 0.5) * 1.2
                    positions[i + 2] = (Math.random() - 0.5) * 1.2
                }
            }
            this.outerFlame.geometry.attributes.position.needsUpdate = true
        }
        
        // Animate thick smoke (slower, spreads out)
        if (this.thickSmoke) {
            const positions = this.thickSmoke.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 1.8 * deltaTime
                positions[i] += (Math.random() - 0.5) * 0.15 // More spread
                positions[i + 2] += (Math.random() - 0.5) * 0.15
                
                if (positions[i + 1] < -15) {
                    positions[i + 1] = 0
                    positions[i] = (Math.random() - 0.5) * 3
                    positions[i + 2] = (Math.random() - 0.5) * 3
                }
            }
            this.thickSmoke.geometry.attributes.position.needsUpdate = true
        }
        
        // Animate steam/vapor (from water deluge)
        if (this.steamVapor) {
            const positions = this.steamVapor.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 1.2 * deltaTime
                
                // Steam spreads outward more
                const currentRadius = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2)
                if (currentRadius < 8) {
                    const angle = Math.atan2(positions[i + 2], positions[i])
                    const newRadius = currentRadius + 0.1
                    positions[i] = Math.cos(angle) * newRadius
                    positions[i + 2] = Math.sin(angle) * newRadius
                }
                
                if (positions[i + 1] < -8) {
                    const angle = Math.random() * Math.PI * 2
                    const radius = 2 + Math.random() * 4
                    positions[i] = Math.cos(angle) * radius
                    positions[i + 1] = 0
                    positions[i + 2] = Math.sin(angle) * radius
                }
            }
            this.steamVapor.geometry.attributes.position.needsUpdate = true
        }
        
        // Animate water deluge effect on launch pad
        if (this.waterDeluge) {
            const positions = this.waterDeluge.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 2 * deltaTime
                
                if (positions[i + 1] < 0) {
                    positions[i + 1] = Math.random() * 5
                }
            }
            this.waterDeluge.geometry.attributes.position.needsUpdate = true
        }
        
        // Update launch pad shake
        this.updateLaunchPadShake(deltaTime)
    }
    
    /**
     * Animate launch ascent with enhanced camera and effects
     */
    animateLaunch(deltaTime) {
        if (this.gameState.launchPhase === 'LIFTOFF' || this.gameState.launchPhase === 'ASCENT' || this.gameState.launchPhase === 'FALLING') {
            
            // === Physics Constants ===
            const earthRadius = 6371 // km
            const GM = 398600.4418 // Earth's gravitational parameter (km³/s²)
            const gravityAtSurface = 0.00981 // km/s² (9.81 m/s²)
            
            // Calculate current altitude above surface
            const distanceFromCenter = this.spacecraftData.position.length()
            const altitude = distanceFromCenter - earthRadius
            this.gameState.altitude = Math.max(0, altitude)
            
            // === Gravity Simulation ===
            // Calculate gravity based on altitude (inverse square law)
            const gravityFactor = (earthRadius / distanceFromCenter) ** 2
            const currentGravity = gravityAtSurface * gravityFactor
            
            // Gravity acts downward (towards Earth center)
            const gravityVector = this.spacecraftData.position.clone().normalize().negate().multiplyScalar(currentGravity)
            
            // === Thrust Application ===
            if (this.gameState.launchPhase !== 'FALLING' && this.spacecraftData.fuel > 0) {
                // Engine is working - apply thrust
                this.gameState.launchPhase = 'ASCENT'
                
                // Thrust ramp up over first 2 seconds
                const thrustRampUp = Math.min(this.gameState.missionTime / 2, 1)
                const baseThrust = 0.025 // km/s² (25 m/s²)
                const currentThrust = baseThrust * (0.5 + 0.5 * thrustRampUp)
                
                // Apply thrust in current orientation (upward relative to rocket)
                const thrustDirection = new THREE.Vector3(0, 1, 0)
                thrustDirection.applyQuaternion(this.spacecraft.quaternion)
                
                this.spacecraftData.velocity.add(thrustDirection.multiplyScalar(currentThrust * deltaTime))
                
                // Consume fuel
                const fuelConsumptionRate = 0.02 // fuel units per second
                this.spacecraftData.fuel = Math.max(0, this.spacecraftData.fuel - fuelConsumptionRate * deltaTime)
                
                // Check if fuel depleted
                if (this.spacecraftData.fuel <= 0) {
                    console.log('⚠️ FUEL DEPLETED! Engine shutdown!')
                    this.showNotification('⚠️ FUEL DEPLETED - Engine Shutdown!', 'error')
                    this.gameState.launchPhase = 'FALLING'
                }
            } else if (this.spacecraftData.fuel <= 0) {
                // Fuel depleted - engine off
                this.gameState.launchPhase = 'FALLING'
                
                // Fade engine particles
                if (this.coreFlame) this.coreFlame.material.opacity *= 0.95
                if (this.mainFlame) this.mainFlame.material.opacity *= 0.95
                if (this.smokeParticles) this.smokeParticles.material.opacity *= 0.95
            }
            
            // === Apply Physics ===
            // Add gravity to velocity
            this.spacecraftData.velocity.add(gravityVector.multiplyScalar(deltaTime))
            
            // Update position
            this.spacecraftData.position.add(this.spacecraftData.velocity.clone().multiplyScalar(deltaTime))
            this.spacecraft.position.copy(this.spacecraftData.position)
            
            // Calculate velocity magnitude
            const velocityMagnitude = this.spacecraftData.velocity.length()
            this.gameState.velocity = velocityMagnitude
            
            // Debug logging (every second)
            if (Math.floor(this.gameState.missionTime * 10) % 10 === 0) {
                console.log(` Phase: ${this.gameState.launchPhase}, Alt: ${altitude.toFixed(2)} km, Vel: ${velocityMagnitude.toFixed(3)} km/s, Fuel: ${this.spacecraftData.fuel.toFixed(1)}%, Gravity: ${(currentGravity * 1000).toFixed(2)} m/s²`)
            }
            
            // Update live telemetry in UI
            this.updateLiveTelemetry()
            
            // Enhanced camera system
            this.updateLaunchCamera(deltaTime)
            
            // Gravity turn after 5 seconds (if still ascending)
            if (this.gameState.missionTime > 5 && this.gameState.launchPhase === 'ASCENT') {
                this.performGravityTurn(deltaTime)
            }
            
            // Update engine particle intensity
            this.updateEngineParticleIntensity()
            
            // Check if crashed back to ground
            if (altitude <= 0 && this.gameState.missionTime > 5) {
                console.log(' ROCKET CRASHED!')
                this.showNotification(' ROCKET CRASHED - Mission Failed!', 'error')
                this.gameState.launchPhase = 'CRASHED'
                
                // Slow down and stop
                this.spacecraftData.velocity.multiplyScalar(0.9)
                if (this.spacecraftData.velocity.length() < 0.001) {
                    this.spacecraftData.velocity.set(0, 0, 0)
                }
            }
            
            // Check if reached orbit altitude (before fuel depletion)
            if (altitude > 100 && this.spacecraftData.fuel > 0) {
                console.log(' Orbital insertion altitude reached!')
                this.gameState.launchPhase = 'ORBIT_INSERTION'
                this.switchToOrbitalMode()
            }
        }
    }
    
    /**
     * Update live telemetry display
     */
    updateLiveTelemetry() {
        const altElement = document.getElementById('live-altitude')
        const velElement = document.getElementById('live-velocity')
        
        if (altElement) {
            altElement.textContent = this.gameState.altitude.toFixed(1)
        }
        if (velElement) {
            velElement.textContent = this.gameState.velocity.toFixed(1)
        }
    }
    
    /**
     * Enhanced camera system with multiple launch views - Smooth tracking
     */
    updateLaunchCamera(deltaTime) {
        if (!this.camera || !this.spacecraftData) {
            console.warn('⚠️ Camera or spacecraftData not available')
            return
        }
        
        const missionTime = this.gameState.missionTime
        const altitude = this.gameState.altitude
        const rocketPos = this.spacecraftData.position.clone() // Clone to avoid modification
        
        let targetPosition
        let lookAtTarget
        let lerpFactor
        
        // Camera view phases with smooth transitions
        if (missionTime < 2) {
            // Phase 1: Dramatic low-angle close-up (0-2s)
            targetPosition = new THREE.Vector3(
                rocketPos.x + 10,
                rocketPos.y - 2,
                rocketPos.z + 10
            )
            lookAtTarget = new THREE.Vector3(
                rocketPos.x,
                rocketPos.y,
                rocketPos.z
            )
            lerpFactor = 0.08
            
        } else if (missionTime < 5) {
            // Phase 2: Side tracking shot (2-5s)
            const sideOffset = 30
            targetPosition = new THREE.Vector3(
                rocketPos.x + sideOffset,
                rocketPos.y + 8,
                rocketPos.z + 5
            )
            lookAtTarget = rocketPos.clone()
            lerpFactor = 0.05
            
        } else if (altitude < 30) {
            // Phase 3: Following from below and behind (until 30m)
            const followDistance = 35
            targetPosition = new THREE.Vector3(
                rocketPos.x + 20,
                rocketPos.y - followDistance * 0.3,
                rocketPos.z + 20
            )
            lookAtTarget = rocketPos.clone()
            lerpFactor = 0.04
            
        } else if (altitude < 80) {
            // Phase 4: Classic KSP follow cam (30-80m)
            const cameraOffset = new THREE.Vector3(30, 15, 30)
            targetPosition = rocketPos.clone().add(cameraOffset)
            lookAtTarget = rocketPos.clone()
            lerpFactor = 0.05
            
        } else {
            // Phase 5: High altitude orbit prep (>80m)
            const cameraOffset = new THREE.Vector3(40, 20, 40)
            targetPosition = rocketPos.clone().add(cameraOffset)
            lookAtTarget = rocketPos.clone()
            lerpFactor = 0.03
        }
        
        // Smooth camera movement
        this.camera.position.lerp(targetPosition, lerpFactor)
        
        // Always look directly at the rocket center
        if (lookAtTarget) {
            this.camera.lookAt(lookAtTarget)
        }
    }
    
    /**
     * Update engine particle intensity based on altitude
     */
    updateEngineParticleIntensity() {
        const altitude = this.gameState.altitude
        
        // Reduce particle opacity with altitude (thinner atmosphere)
        const opacityFactor = Math.max(0.3, 1 - altitude / 200)
        
        if (this.coreFlame) {
            this.coreFlame.material.opacity = 0.95 * opacityFactor
        }
        if (this.mainFlame) {
            this.mainFlame.material.opacity = 0.85 * opacityFactor
        }
        if (this.outerFlame) {
            this.outerFlame.material.opacity = 0.7 * opacityFactor
        }
        if (this.thickSmoke) {
            this.thickSmoke.material.opacity = 0.6 * opacityFactor
        }
        if (this.steamVapor) {
            this.steamVapor.material.opacity = 0.4 * opacityFactor
        }
    }
    
    /**
     * Perform gravity turn maneuver
     */
    performGravityTurn(deltaTime) {
        // Gradually pitch over
        const turnRate = 0.1 * deltaTime
        this.spacecraft.rotateX(turnRate)
        
        // Add horizontal velocity component
        const horizontalThrust = 5 * deltaTime
        this.spacecraftData.velocity.x += horizontalThrust
    }
    
    /**
     * Switch to orbital flight mode
     */
    switchToOrbitalMode() {
        this.gameState.mode = 'ORBITAL'
        this.gameState.launchPhase = 'ORBIT_INSERTION'
        
        // Clean up launch effects
        if (this.engineFlame) {
            this.spacecraft.remove(this.engineFlame)
            this.engineFlame = null
        }
        if (this.engineSmoke) {
            this.spacecraft.remove(this.engineSmoke)
            this.engineSmoke = null
        }
        
        console.log('🛰️ Orbital insertion complete!')
        this.showNotification('Orbital Insertion Complete!', 'success')
    }
    
    /**
     * Create enhanced attitude indicator panel
     */
    createAttitudePanel() {
        const panelDiv = document.createElement('div')
        panelDiv.id = 'attitude-panel'
        panelDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: rgba(0, 20, 40, 0.85);
            border: 2px solid #00ccff;
            border-radius: 10px;
            padding: 15px;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            z-index: 2000;
            min-width: 220px;
            box-shadow: 0 4px 20px rgba(0, 204, 255, 0.3);
        `
        
        panelDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #00ccff; border-bottom: 1px solid #00ccff; padding-bottom: 5px;">
                🎯 ATTITUDE DATA
            </div>
            <div id="att-pitch" style="margin: 5px 0;">Pitch: 0.0°</div>
            <div id="att-yaw" style="margin: 5px 0;">Yaw: 0.0°</div>
            <div id="att-roll" style="margin: 5px 0;">Roll: 0.0°</div>
            <div style="margin-top: 10px; border-top: 1px solid #006688; padding-top: 10px;">
                <div id="att-pitch-rate" style="margin: 3px 0; font-size: 11px; color: #aaaaaa;">Pitch Rate: 0.0°/s</div>
                <div id="att-yaw-rate" style="margin: 3px 0; font-size: 11px; color: #aaaaaa;">Yaw Rate: 0.0°/s</div>
                <div id="att-roll-rate" style="margin: 3px 0; font-size: 11px; color: #aaaaaa;">Roll Rate: 0.0°/s</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #006688; padding-top: 10px;">
                <div id="sas-status" style="margin: 3px 0; font-size: 12px; color: #ff6600;">SAS: OFF</div>
                <div id="rcs-status" style="margin: 3px 0; font-size: 12px; color: #ff6600;">RCS: OFF</div>
            </div>
        `
        
        document.body.appendChild(panelDiv)
        this.attitudePanel = panelDiv
        
        console.log('📊 Attitude panel created')
    }
    
    /**
     * Update attitude panel with current data
     */
    updateAttitudePanel() {
        if (!this.attitudePanel || !this.spacecraft) return
        
        // Get Euler angles from quaternion
        const euler = new THREE.Euler().setFromQuaternion(this.spacecraft.quaternion)
        
        const pitchDeg = THREE.MathUtils.radToDeg(euler.x).toFixed(1)
        const yawDeg = THREE.MathUtils.radToDeg(euler.y).toFixed(1)
        const rollDeg = THREE.MathUtils.radToDeg(euler.z).toFixed(1)
        
        // Update display
        document.getElementById('att-pitch').textContent = `Pitch: ${pitchDeg}°`
        document.getElementById('att-yaw').textContent = `Yaw: ${yawDeg}°`
        document.getElementById('att-roll').textContent = `Roll: ${rollDeg}°`
        
        // Angular rates (simplified - would need actual angular velocity tracking)
        document.getElementById('att-pitch-rate').textContent = `Pitch Rate: ${(Math.random() * 0.5).toFixed(1)}°/s`
        document.getElementById('att-yaw-rate').textContent = `Yaw Rate: ${(Math.random() * 0.5).toFixed(1)}°/s`
        document.getElementById('att-roll-rate').textContent = `Roll Rate: ${(Math.random() * 0.5).toFixed(1)}°/s`
        
        // SAS and RCS status
        const sasElement = document.getElementById('sas-status')
        const rcsElement = document.getElementById('rcs-status')
        
        sasElement.textContent = `SAS: ${this.controlSystems.sasEnabled ? 'ON' : 'OFF'}`
        sasElement.style.color = this.controlSystems.sasEnabled ? '#00ff88' : '#ff6600'
        
        rcsElement.textContent = `RCS: ${this.controlSystems.rcsEnabled ? 'ON' : 'OFF'}`
        rcsElement.style.color = this.controlSystems.rcsEnabled ? '#00ff88' : '#ff6600'
    }
    
    /**
     * Create 3D spacecraft model for attitude visualization
     */
    create3DAttitudeIndicator() {
        const indicatorGroup = new THREE.Group()
        
        // Simplified spacecraft model
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16)
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.7,
            roughness: 0.3
        })
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
        body.rotation.x = Math.PI / 2
        indicatorGroup.add(body)
        
        // Axis indicators
        const axisLength = 2
        const axisThickness = 0.05
        
        // X axis (red - roll)
        const xAxisGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
        const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial)
        xAxis.position.set(axisLength / 2, 0, 0)
        xAxis.rotation.z = Math.PI / 2
        indicatorGroup.add(xAxis)
        
        // Y axis (green - pitch)
        const yAxisGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
        const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial)
        yAxis.position.set(0, axisLength / 2, 0)
        indicatorGroup.add(yAxis)
        
        // Z axis (blue - yaw)
        const zAxisGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
        const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
        const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial)
        zAxis.position.set(0, 0, axisLength / 2)
        indicatorGroup.add(zAxis)
        
        // Position in bottom-left corner
        indicatorGroup.position.set(-3, -2, -5)
        indicatorGroup.scale.set(0.5, 0.5, 0.5)
        
        this.scene.add(indicatorGroup)
        this.attitudeIndicator3D = indicatorGroup
        
        console.log('🎨 3D attitude indicator created')
    }
    
    /**
     * Update 3D attitude indicator
     */
    update3DAttitudeIndicator() {
        if (!this.attitudeIndicator3D || !this.spacecraft) return
        
        // Mirror the spacecraft rotation
        this.attitudeIndicator3D.quaternion.copy(this.spacecraft.quaternion)
    }
    
    /**
     * Calculate orbital parameters from position and velocity
     */
    calculateOrbit() {
        const pos = this.spacecraftData.position.clone()
        const vel = this.spacecraftData.velocity.clone()
        
        // Gravitational parameter (GM) for Earth
        const mu = 398600.4418 // km³/s²
        
        // Position magnitude (distance from center)
        const r = pos.length()
        
        // Velocity magnitude
        const v = vel.length()
        
        // Specific orbital energy
        const energy = (v * v) / 2 - mu / r
        
        // Semi-major axis
        const a = -mu / (2 * energy)
        
        // Specific angular momentum
        const h = new THREE.Vector3().crossVectors(pos, vel)
        const hMag = h.length()
        
        // Eccentricity vector
        const eccVector = new THREE.Vector3()
            .subVectors(
                new THREE.Vector3().multiplyScalar(v * v / mu - 1 / r).multiplyVectors(pos, new THREE.Vector3(1, 1, 1)),
                new THREE.Vector3().multiplyScalar(pos.dot(vel) / mu).copy(vel)
            )
        
        // Simplified eccentricity calculation
        const e = Math.sqrt(1 + (2 * energy * hMag * hMag) / (mu * mu))
        
        // Periapsis and Apoapsis
        const periapsis = a * (1 - e)
        const apoapsis = a * (1 + e)
        
        // Orbital period
        const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu)
        
        // Inclination
        const inclination = Math.acos(h.z / hMag)
        
        // Update orbital data
        this.orbitalData.apoapsis = apoapsis - 6371 // Subtract Earth radius for altitude
        this.orbitalData.periapsis = periapsis - 6371
        this.orbitalData.eccentricity = e
        this.orbitalData.period = period
        this.orbitalData.inclination = THREE.MathUtils.radToDeg(inclination)
        
        console.log('🛰️ Orbit calculated:', {
            apoapsis: this.orbitalData.apoapsis.toFixed(1) + ' km',
            periapsis: this.orbitalData.periapsis.toFixed(1) + ' km',
            eccentricity: e.toFixed(3),
            period: period.toFixed(0) + ' s',
            inclination: this.orbitalData.inclination.toFixed(1) + '°'
        })
    }
    
    /**
     * Draw predicted orbit trajectory
     */
    drawPredictedOrbit() {
        // Remove existing orbit line
        if (this.predictedOrbitLine) {
            this.scene.remove(this.predictedOrbitLine)
        }
        
        // Calculate orbit points
        const orbitPoints = []
        const steps = 360
        
        const a = -398600.4418 / (2 * ((this.spacecraftData.velocity.length() ** 2) / 2 - 398600.4418 / this.spacecraftData.position.length()))
        const e = this.orbitalData.eccentricity
        
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * 2 * Math.PI
            
            // Elliptical orbit equation
            const r = a * (1 - e * e) / (1 + e * Math.cos(theta))
            
            // Convert to Cartesian coordinates
            const x = r * Math.cos(theta)
            const z = r * Math.sin(theta)
            
            orbitPoints.push(new THREE.Vector3(x, 0, z))
        }
        
        // Create orbit line
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints)
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        })
        
        this.predictedOrbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial)
        this.scene.add(this.predictedOrbitLine)
        
        console.log('🌈 Predicted orbit drawn')
    }
    
    /**
     * Create maneuver node system
     */
    createManeuverNode() {
        // Maneuver node marker
        const nodeGeometry = new THREE.SphereGeometry(0.5, 16, 16)
        const nodeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.8
        })
        
        this.maneuverNode = new THREE.Mesh(nodeGeometry, nodeMaterial)
        this.maneuverNode.visible = false
        this.scene.add(this.maneuverNode)
        
        // Create maneuver UI
        this.createManeuverUI()
        
        console.log('🎯 Maneuver node system created')
    }
    
    /**
     * Create maneuver planning UI
     */
    createManeuverUI() {
        const maneuverDiv = document.createElement('div')
        maneuverDiv.id = 'maneuver-panel'
        maneuverDiv.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 20px;
            background: rgba(0, 20, 40, 0.85);
            border: 2px solid #00ccff;
            border-radius: 10px;
            padding: 15px;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 2000;
            min-width: 200px;
            display: none;
        `
        
        maneuverDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #00ccff; border-bottom: 1px solid #00ccff; padding-bottom: 5px;">
                🎯 MANEUVER NODE
            </div>
            <div style="margin: 8px 0;">
                <label>Prograde:</label>
                <input type="range" id="maneuver-prograde" min="-1000" max="1000" value="0" step="10"
                    style="width: 100%; margin-top: 5px;">
                <div id="prograde-value" style="text-align: center; margin-top: 3px;">0 m/s</div>
            </div>
            <div style="margin: 8px 0;">
                <label>Normal:</label>
                <input type="range" id="maneuver-normal" min="-500" max="500" value="0" step="5"
                    style="width: 100%; margin-top: 5px;">
                <div id="normal-value" style="text-align: center; margin-top: 3px;">0 m/s</div>
            </div>
            <div style="margin: 8px 0;">
                <label>Radial:</label>
                <input type="range" id="maneuver-radial" min="-500" max="500" value="0" step="5"
                    style="width: 100%; margin-top: 5px;">
                <div id="radial-value" style="text-align: center; margin-top: 3px;">0 m/s</div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #006688;">
                <div id="delta-v-total" style="font-weight: bold; text-align: center; color: #00ff88;">
                    Total ΔV: 0 m/s
                </div>
            </div>
            <button id="execute-maneuver" style="
                width: 100%;
                margin-top: 10px;
                padding: 8px;
                background: #00cc66;
                border: none;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                cursor: pointer;
            ">Execute Maneuver</button>
        `
        
        document.body.appendChild(maneuverDiv)
        this.maneuverPanel = maneuverDiv
        
        // Add event listeners
        setTimeout(() => {
            ['prograde', 'normal', 'radial'].forEach(axis => {
                const slider = document.getElementById(`maneuver-${axis}`)
                const valueDisplay = document.getElementById(`${axis}-value`)
                
                if (slider && valueDisplay) {
                    slider.addEventListener('input', () => {
                        valueDisplay.textContent = `${slider.value} m/s`
                        this.updateManeuverDeltaV()
                    })
                }
            })
            
            const executeBtn = document.getElementById('execute-maneuver')
            if (executeBtn) {
                executeBtn.addEventListener('click', () => this.executeManeuver())
            }
        }, 100)
    }
    
    /**
     * Update maneuver delta-V calculation
     */
    updateManeuverDeltaV() {
        const prograde = parseFloat(document.getElementById('maneuver-prograde')?.value || 0)
        const normal = parseFloat(document.getElementById('maneuver-normal')?.value || 0)
        const radial = parseFloat(document.getElementById('maneuver-radial')?.value || 0)
        
        const totalDeltaV = Math.sqrt(prograde ** 2 + normal ** 2 + radial ** 2)
        
        const deltaVElement = document.getElementById('delta-v-total')
        if (deltaVElement) {
            deltaVElement.textContent = `Total ΔV: ${totalDeltaV.toFixed(1)} m/s`
        }
    }
    
    /**
     * Execute planned maneuver
     */
    executeManeuver() {
        const prograde = parseFloat(document.getElementById('maneuver-prograde')?.value || 0)
        const normal = parseFloat(document.getElementById('maneuver-normal')?.value || 0)
        const radial = parseFloat(document.getElementById('maneuver-radial')?.value || 0)
        
        // Apply delta-V to velocity
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.spacecraft.quaternion)
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.spacecraft.quaternion)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.spacecraft.quaternion)
        
        this.spacecraftData.velocity.add(forward.multiplyScalar(prograde / 1000))
        this.spacecraftData.velocity.add(up.multiplyScalar(normal / 1000))
        this.spacecraftData.velocity.add(right.multiplyScalar(radial / 1000))
        
        console.log('🚀 Maneuver executed!')
        this.showNotification(`Maneuver executed! ΔV: ${Math.sqrt(prograde**2 + normal**2 + radial**2).toFixed(1)} m/s`, 'success')
        
        // Recalculate orbit
        setTimeout(() => {
            this.calculateOrbit()
            this.drawPredictedOrbit()
        }, 100)
    }
    
    /**
     * Toggle maneuver panel visibility
     */
    toggleManeuverPanel() {
        if (this.maneuverPanel) {
            const isVisible = this.maneuverPanel.style.display !== 'none'
            this.maneuverPanel.style.display = isVisible ? 'none' : 'block'
            
            if (!isVisible && this.maneuverNode) {
                this.maneuverNode.visible = true
                this.maneuverNode.position.copy(this.spacecraftData.position)
            } else if (this.maneuverNode) {
                this.maneuverNode.visible = false
            }
        }
    }
    
    /**
     * Create 2D map view for orbit visualization
     */
    createMapView() {
        const mapCanvas = document.createElement('canvas')
        mapCanvas.id = 'orbit-map'
        mapCanvas.width = 400
        mapCanvas.height = 400
        mapCanvas.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 10, 20, 0.95);
            border: 3px solid #00ccff;
            border-radius: 10px;
            z-index: 3000;
            display: none;
            box-shadow: 0 0 30px rgba(0, 204, 255, 0.5);
        `
        
        document.body.appendChild(mapCanvas)
        this.mapCanvas = mapCanvas
        this.mapContext = mapCanvas.getContext('2d')
        
        // Close button
        const closeBtn = document.createElement('button')
        closeBtn.innerHTML = '×'
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background: rgba(255, 0, 0, 0.7);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            z-index: 3001;
        `
        closeBtn.addEventListener('click', () => this.toggleMapView())
        mapCanvas.parentNode.insertBefore(closeBtn, mapCanvas.nextSibling)
        
        console.log('🗺️ Map view created')
    }
    
    /**
     * Update and render map view
     */
    updateMapView() {
        if (!this.mapCanvas || !this.mapContext || this.mapCanvas.style.display === 'none') return
        
        const ctx = this.mapContext
        const width = this.mapCanvas.width
        const height = this.mapCanvas.height
        const centerX = width / 2
        const centerY = height / 2
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 10, 20, 0.95)'
        ctx.fillRect(0, 0, width, height)
        
        // Draw Earth
        const earthRadius = 100
        ctx.beginPath()
        ctx.arc(centerX, centerY, earthRadius, 0, Math.PI * 2)
        ctx.fillStyle = '#1a5490'
        ctx.fill()
        ctx.strokeStyle = '#00ccff'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Draw orbit
        if (this.orbitalData.apoapsis > 0 && this.orbitalData.periapsis > 0) {
            const scale = 0.02 // Scale factor for display
            const semiMajorAxis = (this.orbitalData.apoapsis + this.orbitalData.periapsis + 2 * 6371) / 2
            const orbitRadius = semiMajorAxis * scale
            
            ctx.beginPath()
            ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2)
            ctx.strokeStyle = '#00ff88'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            ctx.stroke()
            ctx.setLineDash([])
            
            // Draw spacecraft position
            const spacecraftDistance = this.spacecraftData.position.length()
            const spacecraftRadius = spacecraftDistance * scale
            const angle = Math.atan2(this.spacecraftData.position.z, this.spacecraftData.position.x)
            
            const scX = centerX + spacecraftRadius * Math.cos(angle)
            const scY = centerY + spacecraftRadius * Math.sin(angle)
            
            ctx.beginPath()
            ctx.arc(scX, scY, 5, 0, Math.PI * 2)
            ctx.fillStyle = '#ff4444'
            ctx.fill()
        }
        
        // Draw labels
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Courier New'
        ctx.textAlign = 'center'
        ctx.fillText('EARTH', centerX, centerY + 5)
        ctx.fillText(`Ap: ${this.orbitalData.apoapsis.toFixed(0)} km`, centerX, 20)
        ctx.fillText(`Pe: ${this.orbitalData.periapsis.toFixed(0)} km`, centerX, height - 10)
    }
    
    /**
     * Toggle map view visibility
     */
    toggleMapView() {
        if (this.mapCanvas) {
            const isVisible = this.mapCanvas.style.display !== 'none'
            this.mapCanvas.style.display = isVisible ? 'none' : 'block'
            
            if (!isVisible) {
                this.updateMapView()
            }
        }
    }
    
    /**
     * Create 2D attitude control panel with compass
     */
    create2DAttitudePanel() {
        const panelDiv = document.createElement('div')
        panelDiv.id = 'attitude-2d-panel'
        panelDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 40, 0.9);
            border: 2px solid #00ccff;
            border-radius: 15px;
            padding: 20px;
            z-index: 2000;
            display: none;
        `
        
        // Compass container
        const compassContainer = document.createElement('div')
        compassContainer.style.cssText = `
            width: 300px;
            height: 300px;
            position: relative;
            margin: 0 auto;
        `
        
        // Canvas for compass drawing
        const canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 300
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
        `
        compassContainer.appendChild(canvas)
        
        // Crosshair
        const crosshair = document.createElement('div')
        crosshair.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border: 2px solid #ff4444;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
        `
        compassContainer.appendChild(crosshair)
        
        panelDiv.appendChild(compassContainer)
        
        // Control stick area
        const controlStickDiv = document.createElement('div')
        controlStickDiv.id = 'control-stick-container'
        controlStickDiv.style.cssText = `
            margin-top: 20px;
            text-align: center;
        `
        controlStickDiv.innerHTML = `
            <div style="color: #00ccff; font-weight: bold; margin-bottom: 10px; font-family: 'Courier New', monospace;">
                🎮 CONTROL STICK
            </div>
            <div id="control-stick" style="
                width: 150px;
                height: 150px;
                margin: 0 auto;
                background: radial-gradient(circle, rgba(0, 100, 200, 0.3) 0%, rgba(0, 50, 100, 0.5) 100%);
                border: 3px solid #00ccff;
                border-radius: 50%;
                position: relative;
                cursor: pointer;
            ">
                <div id="stick-handle" style="
                    width: 30px;
                    height: 30px;
                    background: #00ff88;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
                "></div>
            </div>
            <div style="margin-top: 10px; color: #aaaaaa; font-size: 11px; font-family: 'Courier New', monospace;">
                Drag to control pitch and yaw
            </div>
        `
        panelDiv.appendChild(controlStickDiv)
        
        document.body.appendChild(panelDiv)
        this.attitude2DPanel = panelDiv
        this.compassCanvas = canvas
        this.compassContext = canvas.getContext('2d')
        
        // Initialize control stick interaction
        this.initControlStick()
        
        console.log('🎯 2D attitude panel created')
    }
    
    /**
     * Initialize control stick mouse/touch interaction
     */
    initControlStick() {
        const stickContainer = document.getElementById('control-stick')
        const stickHandle = document.getElementById('stick-handle')
        
        if (!stickContainer || !stickHandle) return
        
        let isDragging = false
        let startX, startY
        
        const handleStart = (e) => {
            isDragging = true
            const rect = stickContainer.getBoundingClientRect()
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            startX = rect.left + rect.width / 2
            startY = rect.top + rect.height / 2
        }
        
        const handleMove = (e) => {
            if (!isDragging) return
            
            e.preventDefault()
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            
            const deltaX = clientX - startX
            const deltaY = clientY - startY
            const maxDistance = 60
            
            const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
            const clampedDistance = Math.min(distance, maxDistance)
            
            const angle = Math.atan2(deltaY, deltaX)
            const x = Math.cos(angle) * clampedDistance
            const y = Math.sin(angle) * clampedDistance
            
            stickHandle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
            
            // Apply control input
            const pitchInput = -y / maxDistance // Negative because up is negative Y
            const yawInput = x / maxDistance
            
            this.applyControlInput(pitchInput, yawInput, 0)
        }
        
        const handleEnd = () => {
            isDragging = false
            stickHandle.style.transform = 'translate(-50%, -50%)'
            this.applyControlInput(0, 0, 0)
        }
        
        stickContainer.addEventListener('mousedown', handleStart)
        stickContainer.addEventListener('mousemove', handleMove)
        stickContainer.addEventListener('mouseup', handleEnd)
        stickContainer.addEventListener('mouseleave', handleEnd)
        
        stickContainer.addEventListener('touchstart', handleStart)
        stickContainer.addEventListener('touchmove', handleMove)
        stickContainer.addEventListener('touchend', handleEnd)
    }
    
    /**
     * Apply control input from 2D panel
     */
    applyControlInput(pitch, yaw, roll) {
        const controlStrength = 0.02
        
        if (pitch !== 0) {
            this.spacecraft.rotateX(pitch * controlStrength)
        }
        if (yaw !== 0) {
            this.spacecraft.rotateY(yaw * controlStrength)
        }
        if (roll !== 0) {
            this.spacecraft.rotateZ(roll * controlStrength)
        }
    }
    
    /**
     * Update 2D compass display
     */
    update2DCompass() {
        if (!this.compassCanvas || !this.compassContext) return
        
        const ctx = this.compassContext
        const width = this.compassCanvas.width
        const height = this.compassCanvas.height
        const centerX = width / 2
        const centerY = height / 2
        const radius = 140
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        // Draw compass circle
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.strokeStyle = '#00ccff'
        ctx.lineWidth = 3
        ctx.stroke()
        
        // Draw cardinal directions
        const directions = [
            { label: 'N', angle: 0 },
            { label: 'E', angle: Math.PI / 2 },
            { label: 'S', angle: Math.PI },
            { label: 'W', angle: 3 * Math.PI / 2 }
        ]
        
        ctx.font = 'bold 20px Courier New'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        directions.forEach(dir => {
            const x = centerX + (radius - 20) * Math.sin(dir.angle)
            const y = centerY - (radius - 20) * Math.cos(dir.angle)
            
            ctx.fillStyle = dir.label === 'N' ? '#ff4444' : '#00ff88'
            ctx.fillText(dir.label, x, y)
        })
        
        // Draw degree markings
        for (let deg = 0; deg < 360; deg += 10) {
            const rad = THREE.MathUtils.degToRad(deg)
            const isMajor = deg % 90 === 0
            const innerRadius = isMajor ? radius - 15 : radius - 10
            const outerRadius = radius - 5
            
            const x1 = centerX + innerRadius * Math.sin(rad)
            const y1 = centerY - innerRadius * Math.cos(rad)
            const x2 = centerX + outerRadius * Math.sin(rad)
            const y2 = centerY - outerRadius * Math.cos(rad)
            
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.strokeStyle = isMajor ? '#ffffff' : '#666666'
            ctx.lineWidth = isMajor ? 2 : 1
            ctx.stroke()
        }
        
        // Draw current heading indicator
        if (this.spacecraft) {
            const euler = new THREE.Euler().setFromQuaternion(this.spacecraft.quaternion)
            const heading = THREE.MathUtils.radToDeg(euler.y) % 360
            const headingRad = THREE.MathUtils.degToRad(heading)
            
            const indicatorX = centerX + (radius - 30) * Math.sin(headingRad)
            const indicatorY = centerY - (radius - 30) * Math.cos(headingRad)
            
            ctx.beginPath()
            ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2)
            ctx.fillStyle = '#ffaa00'
            ctx.fill()
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.stroke()
        }
    }
    
    /**
     * Create RCS control buttons
     */
    createRCSControls() {
        const rcsDiv = document.createElement('div')
        rcsDiv.id = 'rcs-controls'
        rcsDiv.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 20, 40, 0.9);
            border: 2px solid #00ccff;
            border-radius: 10px;
            padding: 15px;
            z-index: 2000;
            display: none;
        `
        
        rcsDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #00ccff; text-align: center; font-family: 'Courier New', monospace;">
                🚀 RCS CONTROLS
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 50px); gap: 5px; justify-content: center;">
                <button class="rcs-btn" data-dir="forward" style="grid-column: 2;">▲</button>
                <button class="rcs-btn" data-dir="left">◀</button>
                <button class="rcs-btn" data-dir="right">▶</button>
                <button class="rcs-btn" data-dir="backward" style="grid-column: 2;">▼</button>
            </div>
            <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(3, 50px); gap: 5px; justify-content: center;">
                <button class="rcs-btn" data-dir="up" style="grid-column: 1;">↥</button>
                <button class="rcs-btn" data-dir="down" style="grid-column: 3;">↧</button>
            </div>
            <div style="margin-top: 15px; font-size: 10px; color: #aaaaaa; text-align: center; font-family: 'Courier New', monospace;">
                Use keyboard: W/S (forward/back)<br>
                A/D (left/right) Q/E (up/down)
            </div>
        `
        
        document.body.appendChild(rcsDiv)
        this.rcsControls = rcsDiv
        
        // Add button event listeners
        setTimeout(() => {
            const buttons = rcsDiv.querySelectorAll('.rcs-btn')
            buttons.forEach(btn => {
                btn.addEventListener('mousedown', () => {
                    const dir = btn.dataset.dir
                    this.activateRCS(dir, true)
                })
                btn.addEventListener('mouseup', () => {
                    const dir = btn.dataset.dir
                    this.activateRCS(dir, false)
                })
                btn.addEventListener('mouseleave', () => {
                    const dir = btn.dataset.dir
                    this.activateRCS(dir, false)
                })
            })
        }, 100)
    }
    
    /**
     * Activate RCS thruster
     */
    activateRCS(direction, active) {
        if (!this.controlSystems.rcsEnabled) return
        
        const rcsForce = 0.5
        
        switch(direction) {
            case 'forward':
                if (active) this.spacecraftData.velocity.z += rcsForce
                break
            case 'backward':
                if (active) this.spacecraftData.velocity.z -= rcsForce
                break
            case 'left':
                if (active) this.spacecraftData.velocity.x -= rcsForce
                break
            case 'right':
                if (active) this.spacecraftData.velocity.x += rcsForce
                break
            case 'up':
                if (active) this.spacecraftData.velocity.y += rcsForce
                break
            case 'down':
                if (active) this.spacecraftData.velocity.y -= rcsForce
                break
        }
    }
    
    /**
     * Create throttle control slider
     */
    createThrottleControl() {
        const throttleDiv = document.createElement('div')
        throttleDiv.id = 'throttle-control'
        throttleDiv.style.cssText = `
            position: fixed;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 20, 40, 0.9);
            border: 2px solid #00ccff;
            border-radius: 10px;
            padding: 15px;
            z-index: 2000;
            display: none;
            width: 80px;
        `
        
        throttleDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #00ccff; text-align: center; font-size: 11px; font-family: 'Courier New', monospace;">
                THROTTLE
            </div>
            <input type="range" id="throttle-slider" min="0" max="100" value="0"
                style="
                    width: 100%;
                    writing-mode: bt-lr; /* IE */
                    -webkit-appearance: slider-vertical; /* WebKit */
                    height: 200px;
                ">
            <div id="throttle-value" style="text-align: center; margin-top: 10px; font-size: 14px; font-weight: bold; color: #00ff88; font-family: 'Courier New', monospace;">
                0%
            </div>
        `
        
        document.body.appendChild(throttleDiv)
        this.throttleControl = throttleDiv
        
        // Add slider event listener
        setTimeout(() => {
            const slider = document.getElementById('throttle-slider')
            const valueDisplay = document.getElementById('throttle-value')
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    const value = parseInt(slider.value)
                    valueDisplay.textContent = `${value}%`
                    this.spacecraftData.throttle = value / 100
                })
            }
        }, 100)
    }
    
    /**
     * Toggle 2D control panel visibility
     */
    toggle2DPanel() {
        const panels = [
            this.attitude2DPanel,
            this.rcsControls,
            this.throttleControl
        ]
        
        const anyVisible = panels.some(panel => panel && panel.style.display !== 'none')
        
        panels.forEach(panel => {
            if (panel) {
                panel.style.display = anyVisible ? 'none' : 'block'
            }
        })
        
        if (!anyVisible) {
            // Start updating compass
            this.update2DCompass()
        }
    }
    
    /**
     * Reset spacecraft
     */
    resetSpacecraft() {
        this.spacecraftData.position.set(0, 0, 5)
        this.spacecraftData.velocity.set(2.5, 0, 0)
        this.spacecraftData.fuel = 100
        this.spacecraftData.monopropellant = 50
        this.spacecraftData.throttle = 0
        this.spacecraftData.thrust = 0
        this.spacecraft.position.copy(this.spacecraftData.position)
        this.spacecraft.rotation.set(0, 0, 0)
        this.spacecraft.quaternion.identity()
        this.trailPositions = []
        
        // Reset control systems
        this.controlSystems.sasEnabled = false
        this.controlSystems.rcsEnabled = false
        this.controlSystems.targetOrientation.identity()
        
        console.log('Spacecraft reset! All systems nominal.')
    }
    
    /**
     * Switch game mode
     */
    switchGameMode(newMode) {
        const validModes = ['GROUND', 'LAUNCH', 'ORBITAL', 'FREE_ROAM']
        if (!validModes.includes(newMode)) {
            console.warn(`Invalid game mode: ${newMode}`)
            return
        }
        
        console.log(`🔄 Switching to ${newMode} mode`)
        
        switch (newMode) {
            case 'GROUND':
                this.gameState.mode = 'GROUND'
                this.gameState.launchPhase = 'PRE_LAUNCH'
                this.initGroundScene()
                break
                
            case 'LAUNCH':
                if (this.gameState.mode === 'GROUND') {
                    this.startLaunchSequence()
                } else {
                    console.warn('Can only launch from GROUND mode')
                }
                break
                
            case 'ORBITAL':
                this.gameState.mode = 'ORBITAL'
                this.calculateOrbit()
                this.drawPredictedOrbit()
                break
                
            case 'FREE_ROAM':
                this.gameState.mode = 'FREE_ROAM'
                break
        }
        
        this.showNotification(`Switched to ${newMode} mode`, 'info')
    }
}
