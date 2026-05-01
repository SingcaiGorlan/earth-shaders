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
            mode: 'FREE_ROAM',
            timeWarp: 1,
            paused: false,
            missionTime: 0
        }
        
        // Spacecraft (player's vessel)
        this.spacecraft = null
        this.spacecraftData = {
            position: new THREE.Vector3(0, 0, 5),
            velocity: new THREE.Vector3(2.5, 0, 0), // Initial orbital velocity
            mass: 1000,
            fuel: 100,
            monopropellant: 50, // RCS燃料
            thrust: 0,
            throttle: 0, // 节流阀 0-1
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
        this.setupControls()
    }
    
    /**
     * Initialize player spacecraft
     */
    initSpacecraft() {
        const spacecraftGroup = new THREE.Group()
        
        // Main body
        const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16)
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.7,
            roughness: 0.3
        })
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
        body.rotation.x = Math.PI / 2
        spacecraftGroup.add(body)
        
        // Nose cone
        const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 16)
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.4
        })
        const nose = new THREE.Mesh(noseGeometry, noseMaterial)
        nose.rotation.x = -Math.PI / 2
        nose.position.z = 0.55
        spacecraftGroup.add(nose)
        
        // Engine nozzle
        const engineGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16)
        const engineMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.2
        })
        const engine = new THREE.Mesh(engineGeometry, engineMaterial)
        engine.rotation.x = Math.PI / 2
        engine.position.z = -0.475
        spacecraftGroup.add(engine)
        
        // Solar panels
        const panelGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.3)
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            metalness: 0.3,
            roughness: 0.6,
            emissive: 0x000044,
            emissiveIntensity: 0.3
        })
        
        const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial)
        leftPanel.position.set(-0.4, 0, 0)
        spacecraftGroup.add(leftPanel)
        
        const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial)
        rightPanel.position.set(0.4, 0, 0)
        spacecraftGroup.add(rightPanel)
        
        // Engine glow
        const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16)
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0
        })
        this.engineGlow = new THREE.Mesh(glowGeometry, glowMaterial)
        this.engineGlow.position.z = -0.6
        spacecraftGroup.add(this.engineGlow)
        
        this.spacecraft = spacecraftGroup
        this.spacecraft.position.copy(this.spacecraftData.position)
        this.scene.add(this.spacecraft)
        
        // Add orbital trail
        this.createOrbitalTrail()
        
        // Add RCS thrusters
        this.addRCSThrusters()
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
     * Create Navball (attitude indicator)
     */
    createNavball() {
        const navballContainer = document.createElement('div')
        navballContainer.id = 'navball-container'
        navballContainer.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1e 100%);
            border: 3px solid #00ff00;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            z-index: 1000;
        `
        
        // Inner rotating sphere representation
        const navballInner = document.createElement('div')
        navballInner.id = 'navball-inner'
        navballInner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 160px;
            height: 160px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: conic-gradient(
                from 0deg,
                #0066ff 0deg 90deg,
                #ffffff 90deg 180deg,
                #ff6600 180deg 270deg,
                #ffffff 270deg 360deg
            );
            opacity: 0.8;
        `
        navballContainer.appendChild(navballInner)
        
        // Center marker (aircraft symbol)
        const centerMarker = document.createElement('div')
        centerMarker.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border: 3px solid #ffff00;
            border-radius: 50%;
            box-shadow: 0 0 10px #ffff00;
        `
        
        // Cross lines
        const crossH = document.createElement('div')
        crossH.style.cssText = `
            position: absolute;
            top: 50%;
            left: 20%;
            width: 60%;
            height: 2px;
            background: #ffff00;
            transform: translateY(-50%);
        `
        
        const crossV = document.createElement('div')
        crossV.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            width: 2px;
            height: 60%;
            background: #ffff00;
            transform: translateX(-50%);
        `
        
        navballContainer.appendChild(centerMarker)
        navballContainer.appendChild(crossH)
        navballContainer.appendChild(crossV)
        
        // Degree markers
        for (let i = 0; i < 360; i += 30) {
            const marker = document.createElement('div')
            const angle = i * Math.PI / 180
            const radius = 70
            const x = Math.cos(angle) * radius + 90 - 2
            const y = Math.sin(angle) * radius + 90 - 2
            
            marker.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: #00ff00;
                border-radius: 50%;
                transform: translate(-50%, -50%);
            `
            navballContainer.appendChild(marker)
        }
        
        document.body.appendChild(navballContainer)
        this.navball = { container: navballContainer, inner: navballInner }
    }
    
    /**
     * Add RCS thruster visual effects
     */
    addRCSThrusters() {
        if (!this.spacecraft) return
        
        const rcsThrusterGeometry = new THREE.SphereGeometry(0.05, 8, 8)
        const rcsMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0
        })
        
        // Add 8 RCS thrusters around the spacecraft
        const positions = [
            [0.3, 0.3, 0], [-0.3, 0.3, 0],
            [0.3, -0.3, 0], [-0.3, -0.3, 0],
            [0, 0, 0.3], [0, 0, -0.3],
            [0.3, 0, 0.3], [-0.3, 0, -0.3]
        ]
        
        this.rcsThrusters = []
        positions.forEach(pos => {
            const thruster = new THREE.Mesh(rcsThrusterGeometry, rcsMaterial.clone())
            thruster.position.set(...pos)
            this.spacecraft.add(thruster)
            this.rcsThrusters.push(thruster)
        })
    }
    
    /**
     * Create Heads-Up Display (HUD)
     */
    createHUD() {
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
            font-family: 'Courier New', monospace;
            color: #00ff00;
            text-shadow: 0 0 5px #00ff00;
        `
        
        // Top bar - Mission info
        const topBar = document.createElement('div')
        topBar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 0, 0.7);
            border: 2px solid #00ff00;
            padding: 10px 20px;
            border-radius: 5px;
            text-align: center;
        `
        topBar.innerHTML = `
            <div style="font-size: 18px; font-weight: bold;">MISSION TIME</div>
            <div id="hud-mission-time" style="font-size: 24px;">T+ 00:00:00</div>
        `
        hudContainer.appendChild(topBar)
        
        // Left panel - Orbital data
        const leftPanel = document.createElement('div')
        leftPanel.style.cssText = `
            position: absolute;
            top: 100px;
            left: 10px;
            background: rgba(0, 20, 0, 0.7);
            border: 2px solid #00ff00;
            padding: 15px;
            border-radius: 5px;
            min-width: 200px;
        `
        leftPanel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">ORBITAL DATA</div>
            <div id="hud-apoapsis" style="margin: 5px 0;">Ap: -- km</div>
            <div id="hud-periapsis" style="margin: 5px 0;">Pe: -- km</div>
            <div id="hud-inclination" style="margin: 5px 0;">Inc: --°</div>
            <div id="hud-period" style="margin: 5px 0;">Period: -- s</div>
            <div id="hud-eccentricity" style="margin: 5px 0;">Ecc: --</div>
        `
        hudContainer.appendChild(leftPanel)
        
        // Right panel - Vessel status
        const rightPanel = document.createElement('div')
        rightPanel.style.cssText = `
            position: absolute;
            top: 100px;
            right: 10px;
            background: rgba(0, 20, 0, 0.7);
            border: 2px solid #00ff00;
            padding: 15px;
            border-radius: 5px;
            min-width: 200px;
        `
        rightPanel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">VESSEL STATUS</div>
            <div id="hud-altitude" style="margin: 5px 0;">Alt: -- km</div>
            <div id="hud-velocity" style="margin: 5px 0;">Vel: -- m/s</div>
            <div id="hud-thrust" style="margin: 5px 0;">Thrust: 0%</div>
            <div id="hud-fuel" style="margin: 5px 0;">Fuel: 100%</div>
            <div style="margin-top: 10px; width: 100%; height: 10px; background: #003300; border: 1px solid #00ff00;">
                <div id="hud-fuel-bar" style="width: 100%; height: 100%; background: #00ff00;"></div>
            </div>
        `
        hudContainer.appendChild(rightPanel)
        
        // Bottom center - Controls hint
        const controlsHint = document.createElement('div')
        controlsHint.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 0, 0.7);
            border: 2px solid #00ff00;
            padding: 10px 20px;
            border-radius: 5px;
            text-align: center;
            font-size: 12px;
        `
        controlsHint.innerHTML = `
            <div><strong>KSP CONTROLS:</strong></div>
            <div>W/S - Pitch | A/D - Yaw | Q/E - Roll</div>
            <div>SHIFT/CTRL - Throttle Up/Down | Z - SAS | X - RCS</div>
            <div>SPACE - Camera | T - Time Warp | R - Reset</div>
        `
        hudContainer.appendChild(controlsHint)
        
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
            fuel: document.getElementById('hud-fuel'),
            fuelBar: document.getElementById('hud-fuel-bar')
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
            
            // Engine glow intensity based on throttle
            this.engineGlow.material.opacity = this.spacecraftData.throttle * 0.8
            this.engineGlow.scale.setScalar(1 + this.spacecraftData.throttle * 0.5)
        } else {
            this.engineGlow.material.opacity = 0
            this.engineGlow.scale.setScalar(1)
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
        
        this.hudElements.apoapsis.textContent = `Ap: ${this.orbitalData.apoapsis.toFixed(1)} km`
        this.hudElements.periapsis.textContent = `Pe: ${this.orbitalData.periapsis.toFixed(1)} km`
        this.hudElements.inclination.textContent = `Inc: ${this.orbitalData.inclination.toFixed(1)}°`
        this.hudElements.period.textContent = `Period: ${this.orbitalData.period.toFixed(0)} s`
        this.hudElements.eccentricity.textContent = `Ecc: ${this.orbitalData.eccentricity.toFixed(3)}`
        
        const altitude = this.spacecraftData.position.length() - 2
        const velocity = this.spacecraftData.velocity.length()
        
        this.hudElements.altitude.textContent = `Alt: ${altitude.toFixed(1)} km`
        this.hudElements.velocity.textContent = `Vel: ${velocity.toFixed(0)} m/s`
        this.hudElements.thrust.textContent = `Throttle: ${(this.spacecraftData.throttle * 100).toFixed(0)}%`
        this.hudElements.fuel.textContent = `Fuel: ${this.spacecraftData.fuel.toFixed(1)}%`
        
        this.hudElements.fuelBar.style.width = `${this.spacecraftData.fuel}%`
        
        if (this.spacecraftData.fuel < 20) {
            this.hudElements.fuelBar.style.background = '#ff0000'
        } else if (this.spacecraftData.fuel < 50) {
            this.hudElements.fuelBar.style.background = '#ffff00'
        } else {
            this.hudElements.fuelBar.style.background = '#00ff00'
        }
        
        // Update navball rotation based on spacecraft orientation
        this.updateNavball()
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
     * Main update loop
     */
    update(deltaTime, elapsedTime) {
        const scaledDeltaTime = deltaTime * this.gameState.timeWarp
        
        if (!this.gameState.paused) {
            this.handleControls(scaledDeltaTime)
            this.updatePhysics(scaledDeltaTime)
            this.updateHUD(elapsedTime)
            this.updateCamera()
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
}
