import * as THREE from 'three'

/**
 * Zodiac and Constellation Manager
 * Displays the 12 zodiac constellations and traditional Chinese star mansions
 */
export class ZodiacManager {
    constructor(scene, sunPosition = new THREE.Vector3(0, 0, 0), earthPosition = null) {
        this.scene = scene
        this.sunPosition = sunPosition // Sun position (center of ecliptic)
        this.earthPosition = earthPosition || new THREE.Vector3(0, 0, 0) // Earth position
        this.constellations = []
        this.zodiacLines = []
        this.starLabels = []
        this.visible = false
        
        // Performance optimization: cache reusable objects
        this._sunToEarth = new THREE.Vector3() // Reusable vector for calculations
        this._currentZodiacIndex = -1 // Cache current zodiac index to avoid redundant updates
        this._yellowColor = new THREE.Color(0xffff00) // Pre-created color object
        
        // Initialize zodiac data
        this.initializeZodiacData()
        this.createZodiacDisplay()
    }
    
    /**
     * Initialize zodiac constellation data with approximate positions
     * Positions are in ecliptic coordinates (longitude along the ecliptic plane)
     */
    initializeZodiacData() {
        // Western Zodiac constellations with approximate ecliptic longitudes
        this.zodiacConstellations = [
            {
                name: '白羊座',
                nameEn: 'Aries',
                symbol: '♈',
                longitude: 30, // degrees
                color: 0xff6b6b,
                stars: [
                    { name: 'Hamal', lon: 25, lat: 5, mag: 2.0 },
                    { name: 'Sheratan', lon: 28, lat: 3, mag: 2.6 },
                    { name: 'Mesarthim', lon: 30, lat: 2, mag: 4.8 }
                ]
            },
            {
                name: '金牛座',
                nameEn: 'Taurus',
                symbol: '♉',
                longitude: 60,
                color: 0xffa94d,
                stars: [
                    { name: 'Aldebaran', lon: 55, lat: -5, mag: 0.9 },
                    { name: 'Elnath', lon: 62, lat: 2, mag: 1.7 },
                    { name: 'Alcyone', lon: 58, lat: -4, mag: 2.9 }
                ]
            },
            {
                name: '双子座',
                nameEn: 'Gemini',
                symbol: '♊',
                longitude: 90,
                color: 0xffd93d,
                stars: [
                    { name: 'Castor', lon: 85, lat: 8, mag: 1.6 },
                    { name: 'Pollux', lon: 88, lat: 6, mag: 1.1 },
                    { name: 'Alhena', lon: 92, lat: 4, mag: 1.9 }
                ]
            },
            {
                name: '巨蟹座',
                nameEn: 'Cancer',
                symbol: '♋',
                longitude: 120,
                color: 0x6bcf7f,
                stars: [
                    { name: 'Acubens', lon: 115, lat: 2, mag: 4.3 },
                    { name: 'Altarf', lon: 118, lat: 1, mag: 3.5 },
                    { name: 'Asellus Borealis', lon: 122, lat: 3, mag: 4.7 }
                ]
            },
            {
                name: '狮子座',
                nameEn: 'Leo',
                symbol: '♌',
                longitude: 150,
                color: 0xff6b9d,
                stars: [
                    { name: 'Regulus', lon: 145, lat: 0, mag: 1.4 },
                    { name: 'Algieba', lon: 148, lat: 2, mag: 2.0 },
                    { name: 'Denebola', lon: 155, lat: -3, mag: 2.1 }
                ]
            },
            {
                name: '处女座',
                nameEn: 'Virgo',
                symbol: '♍',
                longitude: 180,
                color: 0xa78bfa,
                stars: [
                    { name: 'Spica', lon: 175, lat: -2, mag: 1.0 },
                    { name: 'Porrima', lon: 178, lat: 1, mag: 2.7 },
                    { name: 'Vindemiatrix', lon: 183, lat: 3, mag: 2.8 }
                ]
            },
            {
                name: '天秤座',
                nameEn: 'Libra',
                symbol: '♎',
                longitude: 210,
                color: 0xf783ac,
                stars: [
                    { name: 'Zubenelgenubi', lon: 205, lat: -1, mag: 2.7 },
                    { name: 'Zubeneschamali', lon: 208, lat: 0, mag: 2.6 },
                    { name: 'Brachium', lon: 213, lat: -2, mag: 2.6 }
                ]
            },
            {
                name: '天蝎座',
                nameEn: 'Scorpius',
                symbol: '♏',
                longitude: 240,
                color: 0xff8787,
                stars: [
                    { name: 'Antares', lon: 235, lat: -5, mag: 1.0 },
                    { name: 'Graffias', lon: 238, lat: -3, mag: 2.5 },
                    { name: 'Dschubba', lon: 242, lat: -4, mag: 2.3 }
                ]
            },
            {
                name: '射手座',
                nameEn: 'Sagittarius',
                symbol: '♐',
                longitude: 270,
                color: 0xffc078,
                stars: [
                    { name: 'Kaus Australis', lon: 265, lat: -6, mag: 1.8 },
                    { name: 'Nunki', lon: 268, lat: -4, mag: 2.0 },
                    { name: 'Kaus Borealis', lon: 272, lat: -5, mag: 2.8 }
                ]
            },
            {
                name: '摩羯座',
                nameEn: 'Capricornus',
                symbol: '♑',
                longitude: 300,
                color: 0x94d2bd,
                stars: [
                    { name: 'Deneb Algedi', lon: 295, lat: -2, mag: 2.9 },
                    { name: 'Dabih', lon: 298, lat: -1, mag: 3.1 },
                    { name: 'Alshat', lon: 302, lat: -3, mag: 3.7 }
                ]
            },
            {
                name: '水瓶座',
                nameEn: 'Aquarius',
                symbol: '♒',
                longitude: 330,
                color: 0x74c0fc,
                stars: [
                    { name: 'Sadalmelik', lon: 325, lat: 1, mag: 2.9 },
                    { name: 'Sadalsuud', lon: 328, lat: 0, mag: 2.9 },
                    { name: 'Skat', lon: 333, lat: -2, mag: 3.3 }
                ]
            },
            {
                name: '双鱼座',
                nameEn: 'Pisces',
                symbol: '♓',
                longitude: 360,
                color: 0xb197fc,
                stars: [
                    { name: 'Alrescha', lon: 355, lat: 2, mag: 3.8 },
                    { name: 'Fum al Samakah', lon: 358, lat: 1, mag: 4.5 },
                    { name: 'Omega Piscium', lon: 2, lat: 0, mag: 4.0 }
                ]
            }
        ]
        
        // Traditional Chinese 28 Mansions (二十八宿)
        this.chineseMansions = [
            // Eastern Azure Dragon (东方青龙)
            { name: '角宿', group: '青龙', lon: 180, lat: -10, color: 0x4ecdc4 },
            { name: '亢宿', group: '青龙', lon: 185, lat: -8, color: 0x4ecdc4 },
            { name: '氐宿', group: '青龙', lon: 190, lat: -12, color: 0x4ecdc4 },
            { name: '房宿', group: '青龙', lon: 195, lat: -9, color: 0x4ecdc4 },
            { name: '心宿', group: '青龙', lon: 200, lat: -11, color: 0x4ecdc4 },
            { name: '尾宿', group: '青龙', lon: 205, lat: -13, color: 0x4ecdc4 },
            { name: '箕宿', group: '青龙', lon: 210, lat: -10, color: 0x4ecdc4 },
            
            // Northern Black Tortoise (北方玄武)
            { name: '斗宿', group: '玄武', lon: 240, lat: -15, color: 0x95e1d3 },
            { name: '牛宿', group: '玄武', lon: 245, lat: -12, color: 0x95e1d3 },
            { name: '女宿', group: '玄武', lon: 250, lat: -14, color: 0x95e1d3 },
            { name: '虚宿', group: '玄武', lon: 255, lat: -10, color: 0x95e1d3 },
            { name: '危宿', group: '玄武', lon: 260, lat: -11, color: 0x95e1d3 },
            { name: '室宿', group: '玄武', lon: 265, lat: -13, color: 0x95e1d3 },
            { name: '壁宿', group: '玄武', lon: 270, lat: -9, color: 0x95e1d3 },
            
            // Western White Tiger (西方白虎)
            { name: '奎宿', group: '白虎', lon: 0, lat: 10, color: 0xffeaa7 },
            { name: '娄宿', group: '白虎', lon: 5, lat: 8, color: 0xffeaa7 },
            { name: '胃宿', group: '白虎', lon: 10, lat: 12, color: 0xffeaa7 },
            { name: '昴宿', group: '白虎', lon: 15, lat: 9, color: 0xffeaa7 },
            { name: '毕宿', group: '白虎', lon: 20, lat: 11, color: 0xffeaa7 },
            { name: '觜宿', group: '白虎', lon: 25, lat: 7, color: 0xffeaa7 },
            { name: '参宿', group: '白虎', lon: 30, lat: 10, color: 0xffeaa7 },
            
            // Southern Vermilion Bird (南方朱雀)
            { name: '井宿', group: '朱雀', lon: 60, lat: 15, color: 0xff7675 },
            { name: '鬼宿', group: '朱雀', lon: 65, lat: 12, color: 0xff7675 },
            { name: '柳宿', group: '朱雀', lon: 70, lat: 14, color: 0xff7675 },
            { name: '星宿', group: '朱雀', lon: 75, lat: 10, color: 0xff7675 },
            { name: '张宿', group: '朱雀', lon: 80, lat: 13, color: 0xff7675 },
            { name: '翼宿', group: '朱雀', lon: 85, lat: 11, color: 0xff7675 },
            { name: '轸宿', group: '朱雀', lon: 90, lat: 12, color: 0xff7675 }
        ]
    }
    
    /**
     * Convert ecliptic coordinates to 3D position on celestial sphere
     * @param {number} longitude - Ecliptic longitude in degrees
     * @param {number} latitude - Ecliptic latitude in degrees
     * @param {number} radius - Distance from center
     * @returns {THREE.Vector3} Position vector
     */
    eclipticToVector(longitude, latitude, radius = 100) {
        const lon = THREE.MathUtils.degToRad(longitude)
        const lat = THREE.MathUtils.degToRad(latitude)
        
        // Ecliptic plane is tilted ~23.5° relative to Earth's equator
        const obliquity = THREE.MathUtils.degToRad(23.44)
        
        // Convert to Cartesian coordinates (in ecliptic plane)
        let x = radius * Math.cos(lat) * Math.cos(lon)
        let z = radius * Math.cos(lat) * Math.sin(lon) // Note: z instead of y
        let y = radius * Math.sin(lat)
        
        // Apply axial tilt rotation around X axis
        const rotatedY = y * Math.cos(obliquity) - z * Math.sin(obliquity)
        const rotatedZ = y * Math.sin(obliquity) + z * Math.cos(obliquity)
        
        // Add center offset (Sun position)
        return new THREE.Vector3(
            x + this.sunPosition.x,
            rotatedY + this.sunPosition.y,
            rotatedZ + this.sunPosition.z
        )
    }
    
    /**
     * Create the complete zodiac display
     */
    createZodiacDisplay() {
        this.createEclipticPlane()
        this.createZodiacCircle()
        this.createConstellationStars()
        this.createChineseMansions()
        this.createZodiacSymbols()
    }
    
    /**
     * Create the ecliptic plane reference
     */
    createEclipticPlane() {
        const geometry = new THREE.RingGeometry(95, 105, 128)
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide
        })
        
        this.eclipticPlane = new THREE.Mesh(geometry, material)
        
        // Tilt the ecliptic plane by 23.44°
        this.eclipticPlane.rotation.x = THREE.MathUtils.degToRad(23.44)
        this.eclipticPlane.visible = false
        this.scene.add(this.eclipticPlane)
    }
    
    /**
     * Create zodiac circle with divisions
     */
    createZodiacCircle() {
        const radius = 100
        const segments = 360
        const points = []
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            const pos = this.eclipticToVector(i, 0, radius)
            points.push(pos)
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.3
        })
        
        this.zodiacCircle = new THREE.Line(geometry, material)
        this.zodiacCircle.visible = false
        this.scene.add(this.zodiacCircle)
        
        // Add division lines every 30 degrees (zodiac boundaries)
        for (let i = 0; i < 12; i++) {
            const lon = i * 30
            const innerPos = this.eclipticToVector(lon, 0, 95)
            const outerPos = this.eclipticToVector(lon, 0, 105)
            
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([innerPos, outerPos])
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.4
            })
            
            const divisionLine = new THREE.Line(lineGeometry, lineMaterial)
            divisionLine.visible = false
            this.scene.add(divisionLine)
            this.zodiacLines.push(divisionLine)
        }
    }
    
    /**
     * Create constellation stars
     * OPTIMIZED: Use InstancedMesh for batch rendering (10-50x performance improvement)
     */
    createConstellationStars() {
        // Count total stars across all constellations
        let totalStars = 0
        this.zodiacConstellations.forEach(c => totalStars += c.stars.length)
        
        // Create shared geometry and material for instancing
        const baseGeometry = new THREE.SphereGeometry(0.5, 8, 8)
        const baseMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.8
        })
        
        // Create instanced mesh for all stars
        const instancedStars = new THREE.InstancedMesh(baseGeometry, baseMaterial, totalStars)
        instancedStars.instanceMatrix.setUsage(THREE.DynamicDrawUsage) // Allow updates
        
        const dummy = new THREE.Object3D()
        const color = new THREE.Color()
        let instanceIndex = 0
        
        // Store instance ranges for each constellation
        this.constellationInstanceRanges = []
        
        this.zodiacConstellations.forEach((constellation, cIndex) => {
            const startIndex = instanceIndex
            let constellationBrightness = 0.8 // Default brightness for this constellation
            
            constellation.stars.forEach((star, sIndex) => {
                const starPos = this.eclipticToVector(star.lon, star.lat, 100)
                
                // Calculate size based on magnitude
                const size = Math.max(0.3, 1.5 - star.mag * 0.3)
                const brightness = Math.max(0.3, 1.0 - star.mag * 0.15)
                
                // Track average brightness for the constellation
                if (sIndex === 0) constellationBrightness = brightness
                
                // Set position and scale
                dummy.position.copy(starPos)
                dummy.scale.set(size, size, size)
                dummy.updateMatrix()
                instancedStars.setMatrixAt(instanceIndex, dummy.matrix)
                
                // Set color based on constellation
                color.setHex(constellation.color).multiplyScalar(brightness)
                instancedStars.setColorAt(instanceIndex, color)
                
                instanceIndex++
            })
            
            // Store range for this constellation
            this.constellationInstanceRanges.push({
                startIndex: startIndex,
                count: constellation.stars.length,
                baseOpacity: constellationBrightness
            })
        })
        
        instancedStars.instanceMatrix.needsUpdate = true
        if (instancedStars.instanceColor) instancedStars.instanceColor.needsUpdate = true
        
        instancedStars.visible = false
        this.scene.add(instancedStars)
        
        // Store reference for updates
        this.instancedStars = instancedStars
        this.constellations = [instancedStars] // Use array for compatibility
    }
    
    /**
     * Create Chinese 28 Mansions markers
     * OPTIMIZED: Use InstancedMesh for batch rendering
     */
    createChineseMansions() {
        const totalMansions = this.chineseMansions.length
        
        // Create instanced mesh for all mansions
        const mansionGeometry = new THREE.SphereGeometry(0.5, 8, 8)
        const mansionMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.7
        })
        
        const instancedMansions = new THREE.InstancedMesh(mansionGeometry, mansionMaterial, totalMansions)
        
        const dummy = new THREE.Object3D()
        const color = new THREE.Color()
        
        this.chineseMansions.forEach((mansion, index) => {
            const pos = this.eclipticToVector(mansion.lon, mansion.lat, 100)
            
            dummy.position.copy(pos)
            dummy.scale.set(1.0, 1.0, 1.0)
            dummy.updateMatrix()
            instancedMansions.setMatrixAt(index, dummy.matrix)
            
            color.setHex(mansion.color)
            instancedMansions.setColorAt(index, color)
        })
        
        instancedMansions.instanceMatrix.needsUpdate = true
        if (instancedMansions.instanceColor) instancedMansions.instanceColor.needsUpdate = true
        
        instancedMansions.visible = false
        this.scene.add(instancedMansions)
        
        this.chineseMansionGroup = instancedMansions
    }
    
    /**
     * Create zodiac symbols (simplified as colored markers)
     */
    createZodiacSymbols() {
        const symbolGroup = new THREE.Group()
        
        this.zodiacConstellations.forEach((constellation, index) => {
            const pos = this.eclipticToVector(constellation.longitude, 0, 108)
            
            // Symbol marker
            const symbolGeometry = new THREE.OctahedronGeometry(1.5, 0)
            const symbolMaterial = new THREE.MeshBasicMaterial({
                color: constellation.color,
                transparent: true,
                opacity: 0.8,
                wireframe: true
            })
            
            const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial)
            symbol.position.copy(pos)
            symbol.userData = { 
                name: constellation.name, 
                nameEn: constellation.nameEn,
                symbol: constellation.symbol 
            }
            
            symbolGroup.add(symbol)
        })
        
        symbolGroup.visible = false
        this.scene.add(symbolGroup)
        this.symbolGroup = symbolGroup
    }
    
    /**
     * Toggle visibility of all zodiac elements
     * @param {boolean} show - Whether to show or hide
     */
    setVisible(show) {
        this.visible = show
        
        if (this.eclipticPlane) this.eclipticPlane.visible = show
        if (this.zodiacCircle) this.zodiacCircle.visible = show
        
        this.zodiacLines.forEach(line => {
            line.visible = show
        })
        
        this.constellations.forEach(group => {
            group.visible = show
        })
        
        if (this.chineseMansionGroup) {
            this.chineseMansionGroup.visible = show
        }
        
        if (this.symbolGroup) {
            this.symbolGroup.visible = show
        }
    }
    
    /**
     * Update animation
     * @param {number} elapsedTime - Time in seconds
     * @param {THREE.Vector3} earthPosition - Current Earth position (optional)
     */
    update(elapsedTime, earthPosition = null) {
        if (!this.visible) return
        
        // Update earth position if provided
        if (earthPosition) {
            this.earthPosition.copy(earthPosition)
        }
        
        // Calculate current visible constellation based on Earth-Sun geometry
        this.updateVisibleConstellations(elapsedTime)
        
        // Slowly rotate the entire zodiac system (precession simulation)
        // OPTIMIZED: Only update rotation, no per-object calculations
        const precessionSpeed = 0.001
        if (this.symbolGroup) {
            this.symbolGroup.rotation.y = elapsedTime * precessionSpeed
        }
        
        if (this.chineseMansionGroup) {
            this.chineseMansionGroup.rotation.y = elapsedTime * precessionSpeed
        }
        
        // REMOVED: Per-star pulse animation was causing severe performance issues
        // The constellation highlighting already provides visual feedback
        // If pulse effect is needed, consider using shader-based animation instead
    }
    
    /**
     * Destroy all zodiac elements
     */
    destroy() {
        if (this.eclipticPlane) {
            this.scene.remove(this.eclipticPlane)
            this.eclipticPlane.geometry.dispose()
            this.eclipticPlane.material.dispose()
        }
        
        if (this.zodiacCircle) {
            this.scene.remove(this.zodiacCircle)
            this.zodiacCircle.geometry.dispose()
            this.zodiacCircle.material.dispose()
        }
        
        this.zodiacLines.forEach(line => {
            this.scene.remove(line)
            line.geometry.dispose()
            line.material.dispose()
        })
        
        this.constellations.forEach(group => {
            group.children.forEach(star => {
                star.geometry.dispose()
                star.material.dispose()
            })
            this.scene.remove(group)
        })
        
        if (this.chineseMansionGroup) {
            this.chineseMansionGroup.children.forEach(marker => {
                marker.geometry.dispose()
                marker.material.dispose()
            })
            this.scene.remove(this.chineseMansionGroup)
        }
        
        if (this.symbolGroup) {
            this.symbolGroup.children.forEach(symbol => {
                symbol.geometry.dispose()
                symbol.material.dispose()
            })
            this.scene.remove(this.symbolGroup)
        }
    }
    
    /**
     * Update visible constellations based on Earth-Sun geometry
     * The constellation opposite to the Sun is most visible at midnight
     * OPTIMIZED: Reuses objects, caches state, minimizes GPU updates
     */
    updateVisibleConstellations(elapsedTime) {
        // Calculate direction from Sun to Earth (reuse cached vector)
        this._sunToEarth.subVectors(this.earthPosition, this.sunPosition)
        
        // Get the ecliptic longitude of Earth as seen from Sun
        let earthLongitude = Math.atan2(this._sunToEarth.z, this._sunToEarth.x)
        earthLongitude = THREE.MathUtils.radToDeg(earthLongitude)
        if (earthLongitude < 0) earthLongitude += 360
        
        // The visible constellation is opposite to Earth's position (180° away)
        const visibleLongitude = (earthLongitude + 180) % 360
        
        // Find which zodiac constellation corresponds to this longitude
        const newZodiacIndex = Math.floor(visibleLongitude / 30) % 12
        
        // Only update if the visible constellation changed (avoid redundant work)
        if (newZodiacIndex === this._currentZodiacIndex) {
            return // No change needed
        }
        
        const oldIndex = this._currentZodiacIndex
        this._currentZodiacIndex = newZodiacIndex
        
        // Update instanced mesh scales for old and new constellations
        if (this.instancedStars && this.constellationInstanceRanges) {
            const dummy = new THREE.Object3D()
            const matrix = new THREE.Matrix4()
            
            // Dim the old constellation
            if (oldIndex >= 0 && oldIndex < this.constellationInstanceRanges.length) {
                const oldRange = this.constellationInstanceRanges[oldIndex]
                for (let i = 0; i < oldRange.count; i++) {
                    const instanceIdx = oldRange.startIndex + i
                    this.instancedStars.getMatrixAt(instanceIdx, matrix)
                    matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
                    dummy.scale.set(1.0, 1.0, 1.0) // Reset to normal size
                    dummy.updateMatrix()
                    this.instancedStars.setMatrixAt(instanceIdx, dummy.matrix)
                }
            }
            
            // Brighten the new constellation
            const newRange = this.constellationInstanceRanges[newZodiacIndex]
            for (let i = 0; i < newRange.count; i++) {
                const instanceIdx = newRange.startIndex + i
                this.instancedStars.getMatrixAt(instanceIdx, matrix)
                matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
                dummy.scale.set(1.5, 1.5, 1.5) // Enlarge
                dummy.updateMatrix()
                this.instancedStars.setMatrixAt(instanceIdx, dummy.matrix)
            }
            
            // Mark instance matrix as needing update
            this.instancedStars.instanceMatrix.needsUpdate = true
        }
        
        // Update zodiac symbols (only old and new)
        if (this.symbolGroup) {
            if (oldIndex >= 0 && oldIndex < this.symbolGroup.children.length) {
                const oldSymbol = this.symbolGroup.children[oldIndex]
                oldSymbol.material.opacity = 0.5
                oldSymbol.scale.set(1.0, 1.0, 1.0)
                oldSymbol.material.emissiveIntensity = 0
            }
            
            const newSymbol = this.symbolGroup.children[newZodiacIndex]
            newSymbol.material.opacity = 1.0
            newSymbol.scale.set(2.0, 2.0, 2.0)
            newSymbol.material.emissive = this._yellowColor // Reuse cached color
            newSymbol.material.emissiveIntensity = 0.5
        }
    }
}
