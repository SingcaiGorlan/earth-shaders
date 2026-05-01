/**
 * Solar System Extension Model
 * Adds other planets to the existing Earth scene with realistic solar system proportions
 * Works as an extension to the main Earth visualization
 */

import * as THREE from 'three'
import sunVertexShader from './shaders/solarSystem/sun-vertex.glsl'
import sunFragmentShader from './shaders/solarSystem/sun-fragment.glsl'
import rockyPlanetVertexShader from './shaders/solarSystem/rocky-planet-vertex.glsl'
import rockyPlanetFragmentShader from './shaders/solarSystem/rocky-planet-fragment.glsl'
import gasGiantVertexShader from './shaders/solarSystem/gas-giant-vertex.glsl'
import gasGiantFragmentShader from './shaders/solarSystem/gas-giant-fragment.glsl'
import ringVertexShader from './shaders/solarSystem/ring-vertex.glsl'
import ringFragmentShader from './shaders/solarSystem/ring-fragment.glsl'

export class SolarSystemModel {
    constructor(scene, existingEarth = null, existingSun = null) {
        this.scene = scene
        this.existingEarth = existingEarth  // Reference to existing Earth
        this.existingSun = existingSun || { position: new THREE.Vector3(150, 0, 0) }  // Reference to existing Sun or default position
        this.planets = []
        this.orbits = []
        this.asteroidBelt = null
        this.sun = null  // Will not create new sun, use existing one
        this.time = 0
        this.timeScale = 1
        
        // Realistic solar system proportions (AU scale)
        // 1 AU = 149,597,870.7 km (Earth-Sun distance)
        // In existing scene: Sun at (150, 0, 0), Earth at (0, 0, 0)
        // So 1 AU = 150 scene units
        const AU = 150  // Scale to match existing scene (Sun at 150, Earth at 0)
        
        // Real planet data (radius in Earth radii, distance in AU)
        this.planetData = [
            {
                name: 'Mercury',
                nameCN: '水星',
                radius: 0.383,  // Real: 0.383 Earth radii
                distance: 0.387 * AU,  // Real: 0.387 AU
                color: 0x8C7853,
                orbitSpeed: 4.15,  // Relative to Earth (1 year)
                rotationSpeed: 0.005,
                inclination: 7.0,
                eccentricity: 0.205,
                description: '离太阳最近的行星，表面温差极大 (-180°C ~ 430°C)'
            },
            {
                name: 'Venus',
                nameCN: '金星',
                radius: 0.949,  // Real: 0.949 Earth radii
                distance: 0.723 * AU,  // Real: 0.723 AU
                color: 0xFFC649,
                orbitSpeed: 1.62,  // Real: 225 days
                rotationSpeed: -0.002, // Retrograde rotation
                inclination: 3.4,
                eccentricity: 0.007,
                description: '最热的行星，浓厚的大气层造成温室效应 (462°C)'
            },
            // Note: Earth already exists in the scene, skip adding it
            {
                name: 'Mars',
                nameCN: '火星',
                radius: 0.532,  // Real: 0.532 Earth radii
                distance: 1.524 * AU,  // Real: 1.524 AU
                color: 0xC1440E,
                orbitSpeed: 0.53,  // Real: 687 days
                rotationSpeed: 0.018,
                inclination: 1.9,
                eccentricity: 0.094,
                description: '红色星球，可能有液态水存在 (-60°C)'
            },
            {
                name: 'Jupiter',
                nameCN: '木星',
                radius: 11.21,  // Real: 11.21 Earth radii
                distance: 5.203 * AU,  // Real: 5.203 AU
                color: 0xD8CA9D,
                orbitSpeed: 0.084,  // Real: 11.86 years
                rotationSpeed: 0.04,
                inclination: 1.3,
                eccentricity: 0.049,
                hasRings: false,
                description: '最大的行星，拥有大红斑风暴'
            },
            {
                name: 'Saturn',
                nameCN: '土星',
                radius: 9.45,  // Real: 9.45 Earth radii
                distance: 9.537 * AU,  // Real: 9.537 AU
                color: 0xFAD5A5,
                orbitSpeed: 0.034,  // Real: 29.46 years
                rotationSpeed: 0.038,
                inclination: 2.5,
                eccentricity: 0.057,
                hasRings: true,
                description: '美丽的光环系统，密度小于水'
            },
            {
                name: 'Uranus',
                nameCN: '天王星',
                radius: 4.01,  // Real: 4.01 Earth radii
                distance: 19.191 * AU,  // Real: 19.191 AU
                color: 0x4FD0E7,
                orbitSpeed: 0.012,  // Real: 84.01 years
                rotationSpeed: -0.03, // Retrograde rotation
                inclination: 0.8,
                eccentricity: 0.046,
                hasRings: true,
                axialTilt: 97.8, // Extreme tilt
                description: '侧躺的冰巨星，蓝绿色外观 (-224°C)'
            },
            {
                name: 'Neptune',
                nameCN: '海王星',
                radius: 3.88,  // Real: 3.88 Earth radii
                distance: 30.069 * AU,  // Real: 30.069 AU
                color: 0x4B70DD,
                orbitSpeed: 0.006,  // Real: 164.8 years
                rotationSpeed: 0.032,
                inclination: 1.8,
                eccentricity: 0.010,
                description: '最远的行星，风速最快的行星 (-218°C)'
            }
        ]
        
        // 不再在构造函数中自动初始化
        // 由外部调用 initSolarSystem() 方法来初始化
        // this.initSolarSystem()
    }
    
    /**
     * Initialize complete solar system
     * Uses existing Sun, Earth, and Moon from the main scene
     * Only adds other planets (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
     */
    initSolarSystem() {
        // Do NOT create Sun - use existing sun from script.js at (150, 0, 0)
        // this.createSun()  // REMOVED - Earth scene already has sun
        
        this.createPlanets()
        this.createAsteroidBelt()
        this.createOrbitalPaths()
    }
    
    /**
     * Create the Sun positioned relative to existing Earth
     * Sun is placed at distance based on real AU scale
     */
    createSun() {
        const sunGroup = new THREE.Group()
        
        // Position Sun at -3.87 AU (opposite side from Mercury)
        // Earth is at origin (0, 0, 0), Sun at (-10, 0, 0)
        sunGroup.position.set(-10, 0, 0)
        
        // Main sun sphere with custom shader
        const sunGeometry = new THREE.SphereGeometry(3, 128, 128)
        const sunMaterial = new THREE.ShaderMaterial({
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader,
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.5 },
                sunColor: { value: new THREE.Color(0xFFD700) },
                coronaColor: { value: new THREE.Color(0xFF6600) }
            }
        })
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial)
        sunGroup.add(this.sun)
        
        // Inner glow
        const innerGlowGeometry = new THREE.SphereGeometry(3.8, 64, 64)
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA00,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide
        })
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial)
        sunGroup.add(innerGlow)
        
        // Outer glow
        const outerGlowGeometry = new THREE.SphereGeometry(5.0, 64, 64)
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6600,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        })
        const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial)
        sunGroup.add(outerGlow)
        
        // Corona effect (particle-based)
        const coronaGeometry = new THREE.BufferGeometry()
        const coronaCount = 300
        const positions = new Float32Array(coronaCount * 3)
        
        for (let i = 0; i < coronaCount; i++) {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 5.0 + Math.random() * 2.5
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)
        }
        
        coronaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        const coronaMaterial = new THREE.PointsMaterial({
            color: 0xFFAA44,
            size: 0.2,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        })
        
        const corona = new THREE.Points(coronaGeometry, coronaMaterial)
        sunGroup.add(corona)
        
        // Point light from sun (illuminates entire scene including Earth)
        const sunLight = new THREE.PointLight(0xFFFFFF, 2.0, 500)
        sunLight.castShadow = false
        sunGroup.add(sunLight)
        
        // Hemisphere light for overall illumination
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2)
        sunGroup.add(hemiLight)
        
        this.scene.add(sunGroup)
        this.sunGroup = sunGroup
        this.group = sunGroup
    }
    
    /**
     * Create all planets
     */
    createPlanets() {
        this.planetData.forEach((data, index) => {
            const planet = this.createPlanet(data, index)
            this.planets.push(planet)
        })
    }
    
    /**
     * Create individual planet with professional shaders
     */
    createPlanet(data, index) {
        const planetGroup = new THREE.Group()
        
        // Planet sphere with high detail
        const geometry = new THREE.SphereGeometry(data.radius, 64, 64)
        
        // Create shader material based on planet type
        let material
        
        if (data.name === 'Earth') {
            // Earth uses the existing earth shader (already high quality)
            // We'll use a simplified version here
            material = new THREE.ShaderMaterial({
                vertexShader: rockyPlanetVertexShader,
                fragmentShader: rockyPlanetFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    planetColor: { value: new THREE.Color(0x6B93D6) },
                    atmosphereColor: { value: new THREE.Color(0x87CEEB) },
                    atmosphereDensity: { value: 0.6 },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                    surfaceDetail: { value: 8.0 }
                }
            })
        } else if (data.name === 'Jupiter' || data.name === 'Saturn' || 
                   data.name === 'Uranus' || data.name === 'Neptune') {
            // Gas giants with atmospheric bands and storms
            const isJupiter = data.name === 'Jupiter'
            const bandColor1 = isJupiter ? new THREE.Color(0xD4A574) : 
                              data.name === 'Saturn' ? new THREE.Color(0xFAD5A5) :
                              data.name === 'Uranus' ? new THREE.Color(0x72B5C4) :
                              new THREE.Color(0x5B7DD1)
            
            const bandColor2 = isJupiter ? new THREE.Color(0xC4956A) :
                              data.name === 'Saturn' ? new THREE.Color(0xE8C088) :
                              data.name === 'Uranus' ? new THREE.Color(0x5A9AAF) :
                              new THREE.Color(0x4B6BB5)
            
            material = new THREE.ShaderMaterial({
                vertexShader: gasGiantVertexShader,
                fragmentShader: gasGiantFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    planetColor: { value: new THREE.Color(data.color) },
                    bandColor1: { value: bandColor1 },
                    bandColor2: { value: bandColor2 },
                    stormColor: { value: new THREE.Color(0xCC4422) },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                    rotationSpeed: { value: data.rotationSpeed * 10 },
                    hasGreatSpot: { value: isJupiter ? 1.0 : 0.0 }
                }
            })
        } else {
            // Rocky planets (Mercury, Venus, Mars)
            const atmosphereDensity = data.name === 'Venus' ? 0.8 : 
                                     data.name === 'Mars' ? 0.15 : 0.0
            const atmosphereColor = data.name === 'Venus' ? new THREE.Color(0xE8D5B5) :
                                   data.name === 'Mars' ? new THREE.Color(0xD4A574) :
                                   new THREE.Color(0x888888)
            
            material = new THREE.ShaderMaterial({
                vertexShader: rockyPlanetVertexShader,
                fragmentShader: rockyPlanetFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    planetColor: { value: new THREE.Color(data.color) },
                    atmosphereColor: { value: atmosphereColor },
                    atmosphereDensity: { value: atmosphereDensity },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                    surfaceDetail: { value: 10.0 }
                }
            })
        }
        
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = false // Disable for performance
        mesh.receiveShadow = false
        planetGroup.add(mesh)
        
        // Add rings for Saturn and Uranus with custom shader
        if (data.hasRings) {
            this.createPlanetRings(planetGroup, data)
        }
        
        // Add moon for Earth
        if (data.hasMoon) {
            this.createMoon(planetGroup, data)
        }
        
        // Initial position
        const angle = Math.random() * Math.PI * 2
        planetGroup.position.x = Math.cos(angle) * data.distance
        planetGroup.position.z = Math.sin(angle) * data.distance
        
        // Apply orbital inclination
        planetGroup.rotation.x = THREE.MathUtils.degToRad(data.inclination)
        
        // Special axial tilt for Uranus
        if (data.axialTilt) {
            mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt)
        }
        
        this.scene.add(planetGroup)
        
        return {
            group: planetGroup,
            mesh: mesh,
            data: data,
            angle: angle,
            orbitSpeed: data.orbitSpeed * 0.01,
            rotationSpeed: data.rotationSpeed,
            material: material // Store material reference for animation
        }
    }
    
    /**
     * Create planetary rings with professional shader (Saturn/Uranus)
     */
    createPlanetRings(planetGroup, data) {
        const ringInnerRadius = data.radius * 1.2
        const ringOuterRadius = data.radius * (data.name === 'Saturn' ? 2.5 : 1.8)
        
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 128, 8)
        
        // Adjust UV mapping for radial texture
        const pos = ringGeometry.attributes.position
        const uv = ringGeometry.attributes.uv
        const v3 = new THREE.Vector3()
        
        for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i)
            const dist = v3.length()
            const normalizedDist = (dist - ringInnerRadius) / (ringOuterRadius - ringInnerRadius)
            uv.setXY(i, normalizedDist, 0.5)
        }
        
        // Use custom ring shader for Saturn
        let ringMaterial
        if (data.name === 'Saturn') {
            ringMaterial = new THREE.ShaderMaterial({
                vertexShader: ringVertexShader,
                fragmentShader: ringFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    ringColor1: { value: new THREE.Color(0xC4A882) },
                    ringColor2: { value: new THREE.Color(0xD4B896) },
                    ringColor3: { value: new THREE.Color(0xB89B72) },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) }
                },
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        } else {
            // Simpler rings for Uranus
            ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x88AABB,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            })
        }
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.rotation.x = Math.PI / 2
        ring.rotation.y = data.name === 'Uranus' ? Math.PI / 4 : 0 // Uranus tilted
        planetGroup.add(ring)
    }
    
    /**
     * Create Moon for Earth
     */
    createMoon(planetGroup, earthData) {
        const moonGeometry = new THREE.SphereGeometry(0.27, 16, 16)
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCCC,
            roughness: 0.9,
            metalness: 0.1
        })
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial)
        moon.position.set(2, 0, 0)
        moon.castShadow = true
        moon.receiveShadow = true
        
        planetGroup.add(moon)
        
        // Store moon reference for animation
        planetGroup.userData.moon = moon
        planetGroup.userData.moonAngle = 0
        planetGroup.userData.moonDistance = 2
        planetGroup.userData.moonSpeed = 0.05
    }
    
    /**
     * Create asteroid belt between Mars (1.524 AU) and Jupiter (5.203 AU)
     * Real position: 2.2 - 3.2 AU from Sun
     * With AU = 150: 2.2*150 = 330, 3.2*150 = 480
     */
    createAsteroidBelt() {
        const asteroidCount = 2000
        // Real asteroid belt: 2.2 - 3.2 AU from Sun
        // Sun is at (150, 0, 0), 1 AU = 150 units
        const innerRadius = 2.2 * AU  // 330 units from Sun
        const outerRadius = 3.2 * AU  // 480 units from Sun
        
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(asteroidCount * 3)
        const sizes = new Float32Array(asteroidCount)
        
        for (let i = 0; i < asteroidCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius)
            const height = (Math.random() - 0.5) * 1.5 // Vertical spread
            
            // Offset to center around existing Sun position (150, 0, 0)
            positions[i * 3] = Math.cos(angle) * radius + 150
            positions[i * 3 + 1] = height
            positions[i * 3 + 2] = Math.sin(angle) * radius
            
            sizes[i] = Math.random() * 0.15 + 0.05
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
        
        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.2,
            sizeAttenuation: true
        })
        
        this.asteroidBelt = new THREE.Points(geometry, material)
        this.scene.add(this.asteroidBelt)
        // 将小行星带也标记为可控制
        if (this.group) {
            this.group.add(this.asteroidBelt)
        }
    }
    
    /**
     * Create orbital paths - Elliptical orbits based on real eccentricity
     */
    createOrbitalPaths() {
        this.planetData.forEach((data) => {
            // Create elliptical orbit using real eccentricity
            const semiMajorAxis = data.distance  // a
            const eccentricity = data.eccentricity || 0
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity)  // b
            
            // Create ellipse curve
            const orbitCurve = new THREE.EllipseCurve(
                0, 0,  // Center
                semiMajorAxis, semiMinorAxis,  // xRadius, yRadius (ellipse!)
                0, 2 * Math.PI,
                false,
                0
            )
            
            const points = orbitCurve.getPoints(256)  // More points for smooth ellipse
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            
            const material = new THREE.LineBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.3
            })
            
            const orbit = new THREE.Line(geometry, material)
            orbit.rotation.x = Math.PI / 2
            orbit.rotation.y = THREE.MathUtils.degToRad(data.inclination)
            
            // Offset orbit to center around existing Sun position (150, 0, 0)
            // Sun is at one focus of the ellipse, not the center
            const focusOffset = semiMajorAxis * eccentricity  // c = a*e
            orbit.position.set(150 + focusOffset, 0, 0)
            
            this.scene.add(orbit)
            this.orbits.push(orbit)
            // Add orbit to group for visibility control
            if (this.group) {
                this.group.add(orbit)
            }
        })
    }
    
    /**
     * Update solar system animation with elliptical orbits
     */
    update(deltaTime) {
        this.time += deltaTime
        
        // Apply time scale
        const scaledDeltaTime = deltaTime * (this.timeScale || 1)
        
        // No sun to update - using existing sun from main scene
        
        // Update planets with elliptical orbits
        this.planets.forEach(planet => {
            // Update orbital angle with time scale
            planet.angle += planet.orbitSpeed * scaledDeltaTime
            
            // Elliptical orbit calculations (Kepler's laws)
            const a = planet.data.distance  // Semi-major axis
            const e = planet.data.eccentricity || 0  // Eccentricity
            const b = a * Math.sqrt(1 - e * e)  // Semi-minor axis
            
            // Calculate position on ellipse
            // Sun is at focus (ae, 0), planet orbits around center (0,0) then offset
            const centerX = 150 + a * e  // Sun position + focus offset
            const centerZ = 0
            
            // Parametric equations for ellipse
            planet.group.position.x = centerX + a * Math.cos(planet.angle)
            planet.group.position.z = centerZ + b * Math.sin(planet.angle)
            
            // Self rotation
            planet.mesh.rotation.y += planet.rotationSpeed
            
            // Update shader uniforms
            if (planet.material && planet.material.uniforms) {
                planet.material.uniforms.time.value = this.time
                
                // Update sun direction based on planet position
                const sunPos = new THREE.Vector3(150, 0, 0) // Existing sun position
                const planetPos = planet.group.position.clone()
                const sunDir = sunPos.sub(planetPos).normalize()
                planet.material.uniforms.sunDirection.value.copy(sunDir)
            }
        })
        
        // Update asteroid belt rotation
        if (this.asteroidBelt) {
            this.asteroidBelt.rotation.y += 0.0005 * scaledDeltaTime
        }
        
        // Update moons
        this.planets.forEach(planet => {
            if (planet.group.userData.moon) {
                const moon = planet.group.userData.moon
                planet.group.userData.moonAngle += planet.group.userData.moonSpeed * scaledDeltaTime
                
                moon.position.x = Math.cos(planet.group.userData.moonAngle) * planet.group.userData.moonDistance
                moon.position.z = Math.sin(planet.group.userData.moonAngle) * planet.group.userData.moonDistance
            }
        })
    }
    
    /**
     * Toggle orbital paths visibility
     */
    toggleOrbits(visible) {
        this.orbits.forEach(orbit => {
            orbit.visible = visible
        })
    }
    
    /**
     * Toggle asteroid belt visibility
     */
    toggleAsteroidBelt(visible) {
        if (this.asteroidBelt) {
            this.asteroidBelt.visible = visible
        }
    }
    
    /**
     * Focus camera on specific planet
     */
    focusOnPlanet(planetName, camera, controls) {
        const planet = this.planets.find(p => p.data.name === planetName)
        if (!planet) return
        
        const targetPosition = planet.group.position.clone()
        // Adjust offset based on planet size
        const planetRadius = planet.data.radius
        const offset = new THREE.Vector3(
            planetRadius * 3,
            planetRadius * 2,
            planetRadius * 3
        )
        const cameraPosition = targetPosition.clone().add(offset)
        
        // Smooth camera transition could be added here
        camera.position.copy(cameraPosition)
        controls.target.copy(targetPosition)
        controls.update()
    }
    
    /**
     * Get planet information
     */
    getPlanetInfo(planetName) {
        const planet = this.planetData.find(p => p.name === planetName)
        return planet ? {
            name: planet.name,
            nameCN: planet.nameCN,
            radius: planet.radius,
            distance: planet.distance,
            orbitSpeed: planet.orbitSpeed,
            inclination: planet.inclination,
            eccentricity: planet.eccentricity,
            description: planet.description
        } : null
    }
    
    /**
     * Scale time speed
     */
    setTimeScale(scale) {
        this.timeScale = scale || 1
    }
}
