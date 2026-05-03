import * as THREE from 'three'

/**
 * Lagrange Point and Special Orbit Manager
 * Manages Halo orbits around Lagrange points and lunar frozen orbits
 */
export class LagrangeOrbitManager {
    constructor(scene, earthPosition = new THREE.Vector3(0, 0, 0), moonPosition = null) {
        this.scene = scene
        this.earthPosition = earthPosition
        this.moonPosition = moonPosition || new THREE.Vector3(30, 0, 0) // Default moon position
        
        // Lagrange points (Earth-Moon system)
        this.lagrangePoints = []
        this.haloOrbits = []
        this.frozenOrbits = []
        
        // Visualization elements
        this.lagrangeMarkers = []
        this.visible = false
        
        // Physical constants for Earth-Moon system
        this.EARTH_MASS = 5.972e24 // kg
        this.MOON_MASS = 7.342e22 // kg
        this.MU = this.MOON_MASS / (this.EARTH_MASS + this.MOON_MASS) // Mass ratio
        
        // Initialize
        this.calculateLagrangePoints()
        this.createVisualizations()
    }
    
    /**
     * Calculate the 5 Lagrange points for Earth-Moon system
     * Using simplified circular restricted three-body problem
     */
    calculateLagrangePoints() {
        const R = this.moonPosition.distanceTo(this.earthPosition) // Earth-Moon distance
        
        // L1: Between Earth and Moon
        // Approximate solution: r ≈ R * (MU/3)^(1/3) from Moon towards Earth
        const rL1 = R * Math.pow(this.MU / 3, 1/3)
        const L1 = new THREE.Vector3().lerpVectors(this.moonPosition, this.earthPosition, rL1 / R)
        
        // L2: Beyond the Moon (away from Earth)
        const rL2 = R * Math.pow(this.MU / 3, 1/3)
        const direction = new THREE.Vector3().subVectors(this.moonPosition, this.earthPosition).normalize()
        const L2 = this.moonPosition.clone().add(direction.multiplyScalar(rL2))
        
        // L3: Opposite side of Earth (beyond Earth from Moon)
        const rL3 = R * (1 + (7/12) * this.MU)
        const L3Direction = new THREE.Vector3().subVectors(this.earthPosition, this.moonPosition).normalize()
        const L3 = this.earthPosition.clone().add(L3Direction.multiplyScalar(rL3))
        
        // L4: 60° ahead of Moon in its orbit (equilateral triangle)
        const angle4 = Math.PI / 3 // 60 degrees
        const L4 = new THREE.Vector3()
        L4.x = this.earthPosition.x + R * Math.cos(angle4)
        L4.y = this.earthPosition.y
        L4.z = this.earthPosition.z + R * Math.sin(angle4)
        
        // L5: 60° behind Moon in its orbit
        const angle5 = -Math.PI / 3 // -60 degrees
        const L5 = new THREE.Vector3()
        L5.x = this.earthPosition.x + R * Math.cos(angle5)
        L5.y = this.earthPosition.y
        L5.z = this.earthPosition.z + R * Math.sin(angle5)
        
        this.lagrangePoints = [
            { name: 'L1', position: L1, type: 'collinear', stable: false },
            { name: 'L2', position: L2, type: 'collinear', stable: false },
            { name: 'L3', position: L3, type: 'collinear', stable: false },
            { name: 'L4', position: L4, type: 'triangular', stable: true },
            { name: 'L5', position: L5, type: 'triangular', stable: true }
        ]
    }
    
    /**
     * Create visualization for Lagrange points and special orbits
     */
    createVisualizations() {
        this.createLagrangePointMarkers()
        this.createHaloOrbits()
        this.createFrozenOrbits()
    }
    
    /**
     * Create markers for Lagrange points with enhanced visualization
     */
    createLagrangePointMarkers() {
        this.lagrangePoints.forEach((point, index) => {
            // Create marker sphere with glow effect
            const geometry = new THREE.SphereGeometry(0.4, 32, 32)
            
            // Different colors for different types
            let color, emissiveColor
            if (point.type === 'triangular') {
                color = point.stable ? 0x00ff00 : 0xffff00 // Green for stable (L4, L5)
                emissiveColor = point.stable ? 0x00aa00 : 0xaaaa00
            } else {
                color = 0xff0000 // Red for unstable (L1, L2, L3)
                emissiveColor = 0xaa0000
            }
            
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: emissiveColor,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            })
            
            const marker = new THREE.Mesh(geometry, material)
            marker.position.copy(point.position)
            marker.userData = { 
                name: point.name, 
                type: point.type,
                stable: point.stable,
                baseScale: 1.0
            }
            
            // Effects removed - user requested to hide all visual effects around Lagrange points
            // Add outer glow ring
            // this.createGlowRing(point.position, color)
                
            // Add pulsing energy field
            // this.createEnergyField(point.position, point.stable)
                
            // Label removed - user requested to hide text labels
            // this.createEnhancedLabel(point.name, point.position, point.stable)
                
            this.scene.add(marker)
            this.lagrangeMarkers.push(marker)
        })
    }
    
    /**
     * Create glow ring around Lagrange point
     */
    createGlowRing(position, color) {
        const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 64)
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        })
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.position.copy(position)
        ring.lookAt(this.earthPosition) // Face towards Earth
        ring.userData = { type: 'glowRing', baseOpacity: 0.3 }
        
        this.scene.add(ring)
        this.lagrangeMarkers.push(ring)
    }
    
    /**
     * Create pulsing energy field around Lagrange point
     */
    createEnergyField(position, isStable) {
        const fieldGeometry = new THREE.SphereGeometry(1.2, 32, 32)
        const color = isStable ? 0x00ff00 : 0xff0000
        
        const fieldMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(color) },
                intensity: { value: isStable ? 0.3 : 0.5 }
            },
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
                uniform float time;
                uniform vec3 color;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    float pulse = sin(time * 2.0 + length(vPosition) * 3.0) * 0.5 + 0.5;
                    float alpha = intensity * (0.3 + 0.7 * pulse) * (1.0 - length(vPosition) / 1.2);
                    gl_FragColor = vec4(color, alpha * 0.4);
                }
            `,
            transparent: true,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
        
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial)
        field.position.copy(position)
        field.userData = { type: 'energyField', material: fieldMaterial }
        
        this.scene.add(field)
        this.lagrangeMarkers.push(field)
    }
    
    /**
     * Create enhanced text label with background panel
     */
    createEnhancedLabel(text, position, isStable) {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 512
        canvas.height = 128
        
        // Background panel
        context.fillStyle = isStable ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)'
        context.roundRect ? context.roundRect(10, 10, 492, 108, 15) : context.fillRect(10, 10, 492, 108)
        context.fill()
        
        // Border
        context.strokeStyle = isStable ? '#00ff00' : '#ff0000'
        context.lineWidth = 3
        context.stroke()
        
        // Text
        context.font = 'Bold 48px Arial'
        context.fillStyle = 'white'
        context.textAlign = 'center'
        context.shadowColor = 'black'
        context.shadowBlur = 4
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 15)
        
        const texture = new THREE.CanvasTexture(canvas)
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
        })
        
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.position.copy(position)
        sprite.position.y += 2.5 // Offset above the point
        sprite.scale.set(6, 1.5, 1)
        sprite.userData = { type: 'label' }
        
        this.scene.add(sprite)
        this.lagrangeMarkers.push(sprite)
    }
    
    /**
     * Create Halo orbits around L1 and L2
     * Halo orbits are 3D periodic orbits around collinear Lagrange points
     */
    createHaloOrbits() {
        // Clear any existing orbit markers first
        this.clearOrbitMarkers()
        
        // Create Halo orbit around L1
        const L1 = this.lagrangePoints[0].position
        const haloL1 = this.generateHaloOrbit(L1, 3, 2, 1.5, 64)
        this.haloOrbits.push(haloL1)
        this.scene.add(haloL1)
        
        // Create Halo orbit around L2
        const L2 = this.lagrangePoints[1].position
        const haloL2 = this.generateHaloOrbit(L2, 3, 2, 1.5, 64)
        this.haloOrbits.push(haloL2)
        this.scene.add(haloL2)
        
        // Create smaller Halo orbit around L1 (different size)
        const haloL1Small = this.generateHaloOrbit(L1, 2, 1.5, 1, 64)
        haloL1Small.material = haloL1Small.material.clone()
        haloL1Small.material.color.setHex(0x00ffff)
        this.haloOrbits.push(haloL1Small)
        this.scene.add(haloL1Small)
    }
    
    /**
     * Clear all orbit markers from scene
     */
    clearOrbitMarkers() {
        const markersToRemove = this.lagrangeMarkers.filter(m => 
            m.userData && m.userData.type === 'orbitMarker'
        )
        
        markersToRemove.forEach(marker => {
            this.scene.remove(marker)
            if (marker.geometry) marker.geometry.dispose()
            if (marker.material) marker.material.dispose()
        })
        
        // Remove from array
        this.lagrangeMarkers = this.lagrangeMarkers.filter(m => 
            !m.userData || m.userData.type !== 'orbitMarker'
        )
    }
    
    /**
     * Generate a Halo orbit curve with enhanced visualization
     * @param {THREE.Vector3} center - Center point (Lagrange point)
     * @param {number} amplitudeX - Amplitude in X direction
     * @param {number} amplitudeY - Amplitude in Y direction
     * @param {number} amplitudeZ - Amplitude in Z direction
     * @param {number} segments - Number of curve segments
     * @param {boolean} addMarkers - Whether to add orbit markers (default: true)
     * @returns {THREE.Line} Orbit line
     */
    generateHaloOrbit(center, amplitudeX, amplitudeY, amplitudeZ, segments = 128, addMarkers = true) {
        const points = []
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2
            
            // Halo orbit parametric equations (simplified)
            // Real Halo orbits require numerical integration of CR3BP equations
            const x = amplitudeX * Math.cos(t)
            const y = amplitudeY * Math.sin(t) * Math.cos(t * 0.5) // Figure-8 shape
            const z = amplitudeZ * Math.sin(t)
            
            const point = new THREE.Vector3(x, y, z).add(center)
            points.push(point)
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        
        // Create gradient effect using vertex colors
        const colors = new Float32Array(segments * 3)
        for (let i = 0; i <= segments; i++) {
            const t = i / segments
            const color = new THREE.Color()
            // Gradient from orange to yellow
            color.setHSL(0.08 + t * 0.05, 1.0, 0.5)
            colors[i * 3] = color.r
            colors[i * 3 + 1] = color.g
            colors[i * 3 + 2] = color.b
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        const material = new THREE.LineBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.7,
            linewidth: 3,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        })
        
        const orbit = new THREE.Line(geometry, material)
        orbit.userData = { type: 'halo', center: center.clone() }
        
        // Orbit markers removed - user requested to hide yellow dots
        // Add orbital path markers (small spheres along the orbit)
        // if (addMarkers) {
        //     this.addOrbitMarkers(points, 0xffaa00, 0.15)
        // }
        
        return orbit
    }
    
    /**
     * Add markers along an orbital path
     * @param {Array} points - Array of THREE.Vector3 positions
     * @param {number} color - Marker color
     * @param {number} size - Marker size
     */
    addOrbitMarkers(points, color, size = 0.1) {
        const markerCount = Math.min(16, points.length)
        const step = Math.floor(points.length / markerCount)
        
        for (let i = 0; i < markerCount; i++) {
            const index = i * step
            if (index >= points.length) break
            
            const markerGeometry = new THREE.SphereGeometry(size, 8, 8)
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            })
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial)
            marker.position.copy(points[index])
            marker.userData = { type: 'orbitMarker' }
            
            this.scene.add(marker)
            this.lagrangeMarkers.push(marker)
        }
    }
    
    /**
     * Add periapsis and apoapsis markers for frozen orbits
     * @param {Array} points - Orbit points
     * @param {number} color - Marker color
     */
    addFrozenOrbitMarkers(points, color) {
        if (points.length < 2) return
        
        // Find periapsis (closest to Moon) and apoapsis (farthest from Moon)
        let minDist = Infinity, maxDist = 0
        let periIndex = 0, apoIndex = 0
        
        points.forEach((point, index) => {
            const dist = point.distanceTo(this.moonPosition)
            if (dist < minDist) {
                minDist = dist
                periIndex = index
            }
            if (dist > maxDist) {
                maxDist = dist
                apoIndex = index
            }
        })
        
        // Add periapsis marker (green - closest point)
        const periGeometry = new THREE.SphereGeometry(0.25, 12, 12)
        const periMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.9
        })
        const periMarker = new THREE.Mesh(periGeometry, periMaterial)
        periMarker.position.copy(points[periIndex])
        periMarker.userData = { type: 'periapsis' }
        this.scene.add(periMarker)
        this.lagrangeMarkers.push(periMarker)
        
        // Add apoapsis marker (red - farthest point)
        const apoGeometry = new THREE.SphereGeometry(0.25, 12, 12)
        const apoMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9
        })
        const apoMarker = new THREE.Mesh(apoGeometry, apoMaterial)
        apoMarker.position.copy(points[apoIndex])
        apoMarker.userData = { type: 'apoapsis' }
        this.scene.add(apoMarker)
        this.lagrangeMarkers.push(apoMarker)
    }
    
    /**
     * Create lunar frozen orbits
     * Frozen orbits are special elliptical orbits where perturbations cancel out
     * Common for lunar reconnaissance missions
     */
    createFrozenOrbits() {
        // Lunar frozen orbit parameters (typical values)
        // These orbits have specific inclinations where eccentricity and argument of periapsis remain constant
        
        const frozenOrbitConfigs = [
            {
                name: 'Lunar Frozen Orbit 1',
                altitude: 100, // km above lunar surface
                inclination: 27, // degrees (one of the frozen inclinations)
                eccentricity: 0.001,
                color: 0x00ff88
            },
            {
                name: 'Lunar Frozen Orbit 2',
                altitude: 100,
                inclination: 50, // degrees
                eccentricity: 0.001,
                color: 0x88ff00
            },
            {
                name: 'Lunar Frozen Orbit 3',
                altitude: 200,
                inclination: 76, // degrees (near-polar frozen orbit)
                eccentricity: 0.002,
                color: 0xff00ff
            },
            {
                name: 'Lunar Frozen Orbit 4',
                altitude: 200,
                inclination: 86, // degrees (high-inclination frozen orbit)
                eccentricity: 0.002,
                color: 0xff8800
            }
        ]
        
        const moonRadius = 1.5 // Scaled moon radius in scene units
        const scale = this.scale || 0.001 // Conversion factor
        
        frozenOrbitConfigs.forEach(config => {
            const orbitRadius = moonRadius + (config.altitude * scale * 1000) // Convert to scene units
            
            // Create elliptical orbit with small eccentricity
            const semiMajorAxis = orbitRadius
            const semiMinorAxis = orbitRadius * Math.sqrt(1 - config.eccentricity * config.eccentricity)
            
            // Generate ellipse points
            const points = []
            const segments = 128
            
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2
                
                // Ellipse in orbital plane
                const x = semiMajorAxis * Math.cos(angle)
                const y = semiMinorAxis * Math.sin(angle)
                
                // Rotate by inclination
                const inclinationRad = THREE.MathUtils.degToRad(config.inclination)
                const rotatedY = y * Math.cos(inclinationRad)
                const rotatedZ = y * Math.sin(inclinationRad)
                
                // Position relative to Moon
                const point = new THREE.Vector3(x, rotatedY, rotatedZ).add(this.moonPosition)
                points.push(point)
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            
            // Add gradient colors for better visualization
            const colors = new Float32Array((segments + 1) * 3)
            const baseColor = new THREE.Color(config.color)
            for (let i = 0; i <= segments; i++) {
                const t = i / segments
                const color = baseColor.clone()
                // Slight brightness variation for visual interest
                color.offsetHSL(0, 0, Math.sin(t * Math.PI * 2) * 0.1)
                colors[i * 3] = color.r
                colors[i * 3 + 1] = color.g
                colors[i * 3 + 2] = color.b
            }
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            
            const material = new THREE.LineBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: 0.65,
                linewidth: 2.5,
                vertexColors: true,
                blending: THREE.AdditiveBlending
            })
            
            const orbit = new THREE.Line(geometry, material)
            orbit.userData = { 
                type: 'frozen',
                name: config.name,
                altitude: config.altitude,
                inclination: config.inclination
            }
            
            // Add periapsis and apoapsis markers
            this.addFrozenOrbitMarkers(points, config.color)
            
            this.frozenOrbits.push(orbit)
            this.scene.add(orbit)
        })
        
        // Add a highly elliptical frozen orbit (for lunar mapping)
        this.createHighlyEllipticalFrozenOrbit()
    }
    
    /**
     * Create a highly elliptical frozen orbit (useful for lunar polar observation)
     */
    createHighlyEllipticalFrozenOrbit() {
        const moonRadius = 1.5
        const scale = this.scale || 0.001
        
        // Highly elliptical orbit: low perilune, high apolune
        const periluneAltitude = 50 // km
        const apoluneAltitude = 500 // km
        
        const periluneRadius = moonRadius + (periluneAltitude * scale * 1000)
        const apoluneRadius = moonRadius + (apoluneAltitude * scale * 1000)
        
        const semiMajorAxis = (periluneRadius + apoluneRadius) / 2
        const eccentricity = (apoluneRadius - periluneRadius) / (apoluneRadius + periluneRadius)
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity)
        
        // Generate ellipse
        const points = []
        const segments = 128
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            
            const x = semiMajorAxis * Math.cos(angle)
            const y = semiMinorAxis * Math.sin(angle)
            
            // Near-polar inclination
            const inclinationRad = THREE.MathUtils.degToRad(85)
            const rotatedY = y * Math.cos(inclinationRad)
            const rotatedZ = y * Math.sin(inclinationRad)
            
            const point = new THREE.Vector3(x, rotatedY, rotatedZ).add(this.moonPosition)
            points.push(point)
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        })
        
        const orbit = new THREE.Line(geometry, material)
        orbit.userData = { 
            type: 'frozen',
            name: 'Highly Elliptical Frozen Orbit',
            perilune: periluneAltitude,
            apolune: apoluneAltitude,
            eccentricity: eccentricity.toFixed(3)
        }
        
        this.frozenOrbits.push(orbit)
        this.scene.add(orbit)
    }
    
    /**
     * Set visibility of all elements
     * @param {boolean} show - Whether to show or hide
     */
    setVisible(show) {
        this.visible = show
        
        this.lagrangeMarkers.forEach(marker => {
            marker.visible = show
        })
        
        this.haloOrbits.forEach(orbit => {
            orbit.visible = show
        })
        
        this.frozenOrbits.forEach(orbit => {
            orbit.visible = show
        })
    }
    
    /**
     * Update animation with enhanced dynamic effects
     * @param {number} elapsedTime - Time in seconds
     */
    update(elapsedTime) {
        if (!this.visible) return
        
        // Update Lagrange points positions based on current moon position
        this.updateLagrangePositions()
        
        // OPTIMIZED: Removed per-marker pulse animations for better performance
        // Only update Halo and frozen orbit rotations (simple transform updates)
        
        // Dynamic rotation for Halo orbits (visualization only)
        const rotationSpeed = 0.08
        this.haloOrbits.forEach((orbit, index) => {
            orbit.rotation.z = elapsedTime * rotationSpeed * (index % 2 === 0 ? 1 : -1)
            orbit.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1 // Slight wobble
        })
        
        // Slowly rotate frozen orbits for better visualization
        const frozenRotationSpeed = 0.02
        this.frozenOrbits.forEach((orbit, index) => {
            orbit.rotation.y = elapsedTime * frozenRotationSpeed * (index % 2 === 0 ? 1 : -1)
        })
    }
    
    /**
     * Update Lagrange points positions to track moon movement
     */
    updateLagrangePositions() {
        // Recalculate Lagrange points based on current moon position
        this.calculateLagrangePoints()
        
        // Update all marker positions directly (no recreation)
        this.lagrangePoints.forEach((point, index) => {
            // Find and update all markers for this Lagrange point
            this.lagrangeMarkers.forEach(marker => {
                if (marker.userData && marker.userData.name === point.name) {
                    // Update position based on marker type
                    if (marker.userData.type === 'glowRing' || 
                        marker.userData.type === 'energyField') {
                        marker.position.copy(point.position)
                    }
                    else if (marker.userData.type === 'label') {
                        // Store original offset
                        if (!marker.userData.originalOffset) {
                            marker.userData.originalOffset = marker.position.clone().sub(point.position)
                        }
                        // Update position with original offset
                        marker.position.copy(point.position).add(marker.userData.originalOffset)
                    }
                    else if (marker.isMesh && marker.geometry.type === 'SphereGeometry' && 
                             marker.userData.type !== 'periapsis' && 
                             marker.userData.type !== 'apoapsis' &&
                             marker.userData.type !== 'orbitMarker') {
                        // Main Lagrange point sphere marker
                        marker.position.copy(point.position)
                    }
                }
            })
        })
        
        // Update Halo orbits positions
        this.haloOrbits.forEach((orbit, index) => {
            const lagrangePoint = this.lagrangePoints[index]
            if (lagrangePoint && orbit.userData && orbit.userData.center) {
                // Calculate offset and move orbit
                const offset = new THREE.Vector3().subVectors(
                    lagrangePoint.position, 
                    orbit.userData.center
                )
                orbit.position.add(offset)
                orbit.userData.center.copy(lagrangePoint.position)
            }
        })
        
        // Update frozen orbits positions
        this.frozenOrbits.forEach((orbit) => {
            if (orbit.userData && orbit.userData.type === 'frozen') {
                // Frozen orbits are relative to moon, update if needed
                // For now, they stay at their initialized positions
            }
        })
    }
    
    /**
     * Get information about a specific Lagrange point
     * @param {string} pointName - L1, L2, L3, L4, or L5
     * @returns {Object} Point information
     */
    getLagrangePointInfo(pointName) {
        const point = this.lagrangePoints.find(p => p.name === pointName)
        if (!point) return null
        
        return {
            name: point.name,
            position: point.position.clone(),
            type: point.type,
            stable: point.stable,
            description: this.getLagrangePointDescription(pointName)
        }
    }
    
    /**
     * Get description of a Lagrange point
     */
    getLagrangePointDescription(pointName) {
        const descriptions = {
            'L1': '位于地球和月球之间，引力平衡点。适合太阳观测站和中继卫星。',
            'L2': '位于月球背面外侧，适合深空观测和通信中继（如鹊桥号）。',
            'L3': '位于地球另一侧，与月球相对。较少使用。',
            'L4': '月球轨道前方60°，稳定点。可存放太空站或燃料库。',
            'L5': '月球轨道后方60°，稳定点。同L4，适合长期驻留设施。'
        }
        return descriptions[pointName] || '未知拉格朗日点'
    }
    
    /**
     * Destroy all visualizations
     */
    /**
     * Destroy all visualizations and free resources
     */
    destroy() {
        this.lagrangeMarkers.forEach(marker => {
            this.scene.remove(marker)
            if (marker.geometry) marker.geometry.dispose()
            if (marker.material) {
                if (marker.material.uniforms) {
                    // Dispose shader uniforms textures if any
                    Object.values(marker.material.uniforms).forEach(uniform => {
                        if (uniform.value && uniform.value.dispose) {
                            uniform.value.dispose()
                        }
                    })
                }
                marker.material.dispose()
            }
        })
        
        this.haloOrbits.forEach(orbit => {
            this.scene.remove(orbit)
            orbit.geometry.dispose()
            orbit.material.dispose()
        })
        
        this.frozenOrbits.forEach(orbit => {
            this.scene.remove(orbit)
            orbit.geometry.dispose()
            orbit.material.dispose()
        })
        
        // Clear arrays
        this.lagrangePoints = []
        this.lagrangeMarkers = []
        this.haloOrbits = []
        this.frozenOrbits = []
    }
}
