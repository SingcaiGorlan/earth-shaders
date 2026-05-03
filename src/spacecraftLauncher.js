/**
 * Spacecraft Launcher Module
 * Implements spacecraft launch from Earth surface with multi-body gravitational simulation
 */

import * as THREE from 'three';
import { PHYSICAL_CONSTANTS, SCENE_CONSTANTS } from './gravityModel.js';

export class SpacecraftLauncher {
    constructor(scene, earthGravityModel, solarSystemGravityModel = null) {
        this.scene = scene;
        this.earthGravityModel = earthGravityModel;
        this.solarSystemGravityModel = solarSystemGravityModel;
        
        // Spacecraft properties
        this.spacecraft = null;
        this.trail = null;
        this.trailPositions = [];
        this.maxTrailLength = 500;
        
        // Physics state
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.mass = 1000; // kg (default spacecraft mass)
        
        // Simulation state
        this.isLaunched = false;
        this.simulationTime = 0;
        this.timeStep = 0.1; // seconds per simulation step
        
        // Launch parameters
        this.launchSite = {
            latitude: 28.5, // degrees (e.g., Kennedy Space Center)
            longitude: -80.6,
            altitude: 0 // meters above sea level
        };
        
        this.launchVelocity = {
            magnitude: 7800, // m/s (orbital velocity)
            azimuth: 90, // degrees (compass direction, 0=North, 90=East)
            elevation: 0 // degrees (angle above horizon)
        };
        
        // Multi-body gravity settings
        this.enableMoonGravity = true;
        this.enableSunGravity = true;
        
        // Moon parameters (simplified)
        this.moon = {
            mass: 7.342e22, // kg
            gravitationalParameter: 4.9048695e12, // m³/s²
            distance: 384400000, // meters from Earth (average)
            orbitalPeriod: 27.322 * 24 * 3600, // seconds (sidereal month)
            inclination: 5.145 * Math.PI / 180, // radians
            position: new THREE.Vector3()
        };
        
        // Sun parameters
        this.sun = {
            mass: 1.9885e30, // kg
            gravitationalParameter: 1.32712440018e20, // m³/s²
            distance: 149597870700, // meters (1 AU)
            position: new THREE.Vector3(150, 0, 0) // scene coordinates
        };
        
        // Create spacecraft mesh
        this.createSpacecraft();
        this.createTrail();
    }
    
    /**
     * Create spacecraft as a bright point
     */
    createSpacecraft() {
        // Removed spacecraft point - now invisible
        this.spacecraft = new THREE.Group();
        this.spacecraft.visible = false;
        this.scene.add(this.spacecraft);
    }
    
    /**
     * Create orbital trail line
     */
    createTrail() {
        // Actual traveled trail (past positions) - enhanced visual
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.trail.visible = false;
        this.scene.add(this.trail);
        
        // Predicted future orbit line - high precision visualization
        const predictedGeometry = new THREE.BufferGeometry();
        const predictedMaterial = new THREE.LineDashedMaterial({
            color: 0xffaa00,
            linewidth: 2,
            transparent: true,
            opacity: 0.5,
            dashSize: 0.4,
            gapSize: 0.2
        });
        
        this.predictedOrbit = new THREE.Line(predictedGeometry, predictedMaterial);
        this.predictedOrbit.visible = false;
        this.scene.add(this.predictedOrbit);
        
        // Initialize prediction update timer
        this.lastPredictionUpdate = 0;
        this.predictionUpdateInterval = 5; // Update every 5 seconds
    }
    
    /**
     * Set launch site coordinates
     * @param {number} latitude - Latitude in degrees (-90 to 90)
     * @param {number} longitude - Longitude in degrees (-180 to 180)
     * @param {number} altitude - Altitude in meters above sea level
     */
    setLaunchSite(latitude, longitude, altitude = 0) {
        this.launchSite.latitude = latitude;
        this.launchSite.longitude = longitude;
        this.launchSite.altitude = altitude;
    }
    
    /**
     * Set launch velocity parameters
     * @param {number} magnitude - Velocity magnitude in m/s
     * @param {number} azimuth - Compass direction in degrees (0=North, 90=East)
     * @param {number} elevation - Angle above horizon in degrees (0=horizontal, 90=vertical)
     */
    setLaunchVelocity(magnitude, azimuth = 90, elevation = 0) {
        this.launchVelocity.magnitude = magnitude;
        this.launchVelocity.azimuth = azimuth;
        this.launchVelocity.elevation = elevation;
    }
    
    /**
     * Convert geodetic coordinates (lat, lon, alt) to Cartesian (scene coordinates)
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @param {number} alt - Altitude in meters
     * @returns {THREE.Vector3} Position in scene coordinates
     */
    geodeticToCartesian(lat, lon, alt) {
        const phi = (90 - lat) * Math.PI / 180; // Colatitude
        const theta = (lon + 180) * Math.PI / 180; // Longitude
        
        const earthRadiusScene = this.earthGravityModel.earthSceneRadius;
        const earthRadiusPhysical = this.earthGravityModel.earthPhysicalRadius;
        
        // Total radius from Earth center
        const r = earthRadiusScene * (1 + alt / earthRadiusPhysical);
        
        // Convert to Cartesian
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * Calculate initial velocity vector from launch parameters
     * @returns {THREE.Vector3} Velocity vector in scene coordinates
     */
    calculateLaunchVelocityVector() {
        const lat = this.launchSite.latitude;
        const lon = this.launchSite.longitude;
        const azimuth = this.launchVelocity.azimuth * Math.PI / 180;
        const elevation = this.launchVelocity.elevation * Math.PI / 180;
        const speed = this.launchVelocity.magnitude;
        
        // Calculate local coordinate system at launch site
        // North, East, Up vectors in Earth-centered coordinates
        const phi = lat * Math.PI / 180;
        const theta = lon * Math.PI / 180;
        
        // Up vector (radial direction from Earth center)
        const upX = Math.cos(phi) * Math.cos(theta);
        const upY = Math.sin(phi);
        const upZ = Math.cos(phi) * Math.sin(theta);
        
        // North vector (tangent to meridian, pointing north)
        const northX = -Math.sin(phi) * Math.cos(theta);
        const northY = Math.cos(phi);
        const northZ = -Math.sin(phi) * Math.sin(theta);
        
        // East vector (tangent to parallel, pointing east)
        const eastX = -Math.sin(theta);
        const eastY = 0;
        const eastZ = Math.cos(theta);
        
        // Combine vectors based on azimuth and elevation
        // First, project onto horizontal plane using azimuth
        const horizontalX = northX * Math.cos(azimuth) + eastX * Math.sin(azimuth);
        const horizontalY = northY * Math.cos(azimuth) + eastY * Math.sin(azimuth);
        const horizontalZ = northZ * Math.cos(azimuth) + eastZ * Math.sin(azimuth);
        
        // Then combine with vertical component using elevation
        const velX = horizontalX * Math.cos(elevation) + upX * Math.sin(elevation);
        const velY = horizontalY * Math.cos(elevation) + upY * Math.sin(elevation);
        const velZ = horizontalZ * Math.cos(elevation) + upZ * Math.sin(elevation);
        
        // Scale by speed and convert to scene units
        const sceneScale = this.earthGravityModel.sceneScale;
        return new THREE.Vector3(velX, velY, velZ).multiplyScalar(speed * sceneScale);
    }
    
    /**
     * Initialize spacecraft at launch site
     */
    initializeSpacecraft() {
        // Calculate initial position
        this.position = this.geodeticToCartesian(
            this.launchSite.latitude,
            this.launchSite.longitude,
            this.launchSite.altitude
        );
        
        // Calculate initial velocity
        this.velocity = this.calculateLaunchVelocityVector();
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Update spacecraft mesh position
        this.spacecraft.position.copy(this.position);
        this.spacecraft.visible = true;
        
        // Reset trail
        this.trailPositions = [this.position.clone()];
        this.updateTrail();
        this.trail.visible = true;
        
        // Calculate and show predicted orbit
        this.calculatePredictedOrbit();
        this.predictedOrbit.visible = true;
        
        // Reset simulation time
        this.simulationTime = 0;
        this.isLaunched = true;
    }
    
    /**
     * Launch spacecraft from current configuration
     */
    launch() {
        if (this.isLaunched) {
            console.warn('Spacecraft already launched. Reset first.');
            return;
        }
        
        console.log('🚀 Initializing launch sequence...');
        this.initializeSpacecraft();
        
        console.log('🚀 Spacecraft launched successfully!');
        console.log(`   Launch site: ${this.launchSite.latitude}°, ${this.launchSite.longitude}°`);
        console.log(`   Initial position: (${this.position.x.toFixed(4)}, ${this.position.y.toFixed(4)}, ${this.position.z.toFixed(4)})`);
        console.log(`   Initial velocity: ${this.launchVelocity.magnitude} m/s`);
        console.log(`   Velocity vector: (${this.velocity.x.toFixed(6)}, ${this.velocity.y.toFixed(6)}, ${this.velocity.z.toFixed(6)})`);
        console.log(`   Azimuth: ${this.launchVelocity.azimuth}°, Elevation: ${this.launchVelocity.elevation}°`);
        console.log(`   Multi-body gravity: Moon=${this.enableMoonGravity}, Sun=${this.enableSunGravity}`);
    }
    
    /**
     * Reset spacecraft to pre-launch state
     */
    reset() {
        this.isLaunched = false;
        this.spacecraft.visible = false;
        this.trail.visible = false;
        this.predictedOrbit.visible = false;
        this.trailPositions = [];
        this.lastPredictionUpdate = 0;
        this.simulationTime = 0;
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
    }
    
    /**
     * Update physics simulation
     * @param {number} deltaTime - Time delta in seconds
     */
    update(deltaTime) {
        if (!this.isLaunched) return;
        
        // Use numerical integration (Runge-Kutta 4th order for better accuracy)
        this.rk4Integration(deltaTime);
        
        // Update spacecraft position
        this.spacecraft.position.copy(this.position);
        
        // Update trail
        this.trailPositions.push(this.position.clone());
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift();
        }
        this.updateTrail();
        
        // Dynamically update predicted orbit
        this.lastPredictionUpdate += deltaTime;
        if (this.lastPredictionUpdate >= this.predictionUpdateInterval) {
            this.calculatePredictedOrbit();
            this.lastPredictionUpdate = 0;
        }
        
        // Update simulation time
        this.simulationTime += deltaTime;
        
        // Debug: log state every 10 seconds of simulation time
        if (Math.floor(this.simulationTime) % 10 === 0 && Math.floor(this.simulationTime) !== Math.floor(this.simulationTime - deltaTime)) {
            const state = this.getState();
            console.log(`[T=${this.simulationTime.toFixed(1)}s] Altitude: ${state.altitude.toFixed(0)} m, Speed: ${state.speed.toFixed(1)} m/s`);
        }
    }
    
    /**
     * Runge-Kutta 4th order integration for accurate orbital mechanics
     * @param {number} dt - Time step in seconds
     */
    rk4Integration(dt) {
        // k1
        const k1_v = this.velocity.clone();
        const k1_a = this.calculateAcceleration(this.position);
        
        // k2
        const pos2 = this.position.clone().add(k1_v.clone().multiplyScalar(dt / 2));
        const k2_v = this.velocity.clone().add(k1_a.clone().multiplyScalar(dt / 2));
        const k2_a = this.calculateAcceleration(pos2);
        
        // k3
        const pos3 = this.position.clone().add(k2_v.clone().multiplyScalar(dt / 2));
        const k3_v = this.velocity.clone().add(k2_a.clone().multiplyScalar(dt / 2));
        const k3_a = this.calculateAcceleration(pos3);
        
        // k4
        const pos4 = this.position.clone().add(k3_v.clone().multiplyScalar(dt));
        const k4_v = this.velocity.clone().add(k3_a.clone().multiplyScalar(dt));
        const k4_a = this.calculateAcceleration(pos4);
        
        // Update position and velocity
        const dv = k1_a.clone().add(k2_a.multiplyScalar(2))
            .add(k3_a.multiplyScalar(2)).add(k4_a)
            .multiplyScalar(dt / 6);
        
        const dp = k1_v.clone().add(k2_v.multiplyScalar(2))
            .add(k3_v.multiplyScalar(2)).add(k4_v)
            .multiplyScalar(dt / 6);
        
        this.velocity.add(dv);
        this.position.add(dp);
    }
    
    /**
     * Calculate total acceleration at given position (multi-body)
     * @param {THREE.Vector3} position - Position in scene coordinates
     * @returns {THREE.Vector3} Acceleration vector in scene units/s²
     */
    calculateAcceleration(position) {
        let totalAcceleration = new THREE.Vector3(0, 0, 0);
        
        // 1. Earth gravity
        const earthAccel = this.earthGravityModel.calculateTotalGravity(position);
        const sceneScale = this.earthGravityModel.sceneScale;
        totalAcceleration.add(earthAccel.multiplyScalar(sceneScale));
        
        // 2. Moon gravity (if enabled)
        if (this.enableMoonGravity) {
            const moonAccel = this.calculateMoonGravity(position);
            totalAcceleration.add(moonAccel);
        }
        
        // 3. Sun gravity (if enabled)
        if (this.enableSunGravity) {
            const sunAccel = this.calculateSunGravity(position);
            totalAcceleration.add(sunAccel);
        }
        
        return totalAcceleration;
    }
    
    /**
     * Calculate Moon's gravitational acceleration
     * @param {THREE.Vector3} position - Spacecraft position in scene coordinates
     * @returns {THREE.Vector3} Moon's gravitational acceleration in scene units/s²
     */
    calculateMoonGravity(position) {
        // Update Moon position based on simulation time
        this.updateMoonPosition();
        
        // Calculate distance from spacecraft to Moon
        const relativePosition = new THREE.Vector3().subVectors(this.moon.position, position);
        const distanceScene = relativePosition.length();
        
        // Convert to physical distance (meters)
        const sceneScale = this.earthGravityModel.sceneScale;
        const distancePhysical = distanceScene / sceneScale;
        
        // Calculate gravitational acceleration: a = GM/r²
        const accelerationMagnitude = this.moon.gravitationalParameter / (distancePhysical * distancePhysical);
        
        // Direction: towards the Moon
        const direction = relativePosition.normalize();
        
        // Convert to scene units
        return direction.multiplyScalar(accelerationMagnitude * sceneScale);
    }
    
    /**
     * Calculate Sun's gravitational acceleration
     * @param {THREE.Vector3} position - Spacecraft position in scene coordinates
     * @returns {THREE.Vector3} Sun's gravitational acceleration in scene units/s²
     */
    calculateSunGravity(position) {
        // Sun position in scene coordinates (already set)
        const sunPositionScene = this.sun.position;
        
        // Calculate distance from spacecraft to Sun
        const relativePosition = new THREE.Vector3().subVectors(sunPositionScene, position);
        const distanceScene = relativePosition.length();
        
        // Convert to physical distance (meters)
        // Sun uses different scale (AU based)
        const auToSceneUnits = 150; // 150 scene units = 1 AU
        const auToMeters = 149597870700; // 1 AU in meters
        const sceneScale = auToSceneUnits / auToMeters;
        const distancePhysical = distanceScene / sceneScale;
        
        // Calculate gravitational acceleration: a = GM/r²
        const accelerationMagnitude = this.sun.gravitationalParameter / (distancePhysical * distancePhysical);
        
        // Direction: towards the Sun
        const direction = relativePosition.normalize();
        
        // Convert to scene units (Earth scale)
        const earthSceneScale = this.earthGravityModel.sceneScale;
        return direction.multiplyScalar(accelerationMagnitude * earthSceneScale);
    }
    
    /**
     * Update Moon's position based on orbital mechanics
     */
    updateMoonPosition() {
        const moonAngle = (2 * Math.PI * this.simulationTime) / this.moon.orbitalPeriod;
        
        // Moon distance in scene units
        const sceneScale = this.earthGravityModel.sceneScale;
        const moonDistanceScene = this.moon.distance * sceneScale;
        
        // Simplified circular orbit with inclination
        const x = moonDistanceScene * Math.cos(moonAngle);
        const y = moonDistanceScene * Math.sin(moonAngle) * Math.sin(this.moon.inclination);
        const z = moonDistanceScene * Math.sin(moonAngle) * Math.cos(this.moon.inclination);
        
        this.moon.position.set(x, y, z);
    }
    
    /**
     * Update trail geometry
     */
    updateTrail() {
        if (this.trailPositions.length < 2) return;
        
        const positions = new Float32Array(this.trailPositions.length * 3);
        this.trailPositions.forEach((pos, i) => {
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
        });
        
        this.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.trail.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Calculate predicted orbit using current velocity with high precision
     * Uses RK4 integration for better accuracy
     */
    calculatePredictedOrbit() {
        const predictedPositions = [];
        let simPos = this.position.clone();
        let simVel = this.velocity.clone();
        const timeStep = 5; // Reduced to 5 seconds for higher precision
        const totalSteps = 1200; // Predict 6000 seconds (~100 minutes, about one orbit)
        
        // RK4 integration for more accurate prediction
        for (let i = 0; i < totalSteps; i++) {
            // RK4 method
            const k1 = this.calculateAcceleration(simPos);
            
            const pos2 = simPos.clone().add(simVel.clone().multiplyScalar(timeStep / 2));
            const vel2 = simVel.clone().add(k1.clone().multiplyScalar(timeStep / 2));
            const k2 = this.calculateAcceleration(pos2);
            
            const pos3 = simPos.clone().add(vel2.clone().multiplyScalar(timeStep / 2));
            const vel3 = simVel.clone().add(k2.clone().multiplyScalar(timeStep / 2));
            const k3 = this.calculateAcceleration(pos3);
            
            const pos4 = simPos.clone().add(vel3.clone().multiplyScalar(timeStep));
            const vel4 = simVel.clone().add(k3.clone().multiplyScalar(timeStep));
            const k4 = this.calculateAcceleration(pos4);
            
            // Update velocity using weighted average
            const accelAvg = k1.clone().add(k2.clone().multiplyScalar(2))
                .add(k3.clone().multiplyScalar(2))
                .add(k4)
                .multiplyScalar(1 / 6);
            
            simVel = simVel.clone().add(accelAvg.multiplyScalar(timeStep));
            
            // Update position using weighted average of velocities
            const velAvg = simVel.clone().add(vel2.clone().multiplyScalar(2))
                .add(vel3.clone().multiplyScalar(2))
                .add(vel4)
                .multiplyScalar(1 / 6);
            
            simPos = simPos.clone().add(velAvg.multiplyScalar(timeStep));
            
            // Store position
            predictedPositions.push(simPos.clone());
        }
        
        // Update predicted orbit line geometry
        if (predictedPositions.length >= 2) {
            const positions = new Float32Array(predictedPositions.length * 3);
            predictedPositions.forEach((pos, i) => {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
            });
            
            this.predictedOrbit.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.predictedOrbit.geometry.attributes.position.needsUpdate = true;
            this.predictedOrbit.geometry.computeLineDistances(); // Required for LineDashedMaterial
        }
    }
    
    /**
     * Get current spacecraft state
     * @returns {Object} Current state information
     */
    getState() {
        const earthRadius = this.earthGravityModel.earthPhysicalRadius;
        const distanceFromCenter = this.position.length() / this.earthGravityModel.sceneScale;
        const altitude = distanceFromCenter - earthRadius;
        const speed = this.velocity.length() / this.earthGravityModel.sceneScale;
        
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            altitude: altitude, // meters
            speed: speed, // m/s
            simulationTime: this.simulationTime, // seconds
            isLaunched: this.isLaunched
        };
    }
    
    /**
     * Destroy spacecraft and clean up resources
     */
    destroy() {
        if (this.spacecraft) {
            this.scene.remove(this.spacecraft);
        }
        
        if (this.trail) {
            this.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
        
        if (this.predictedOrbit) {
            this.scene.remove(this.predictedOrbit);
            this.predictedOrbit.geometry.dispose();
            this.predictedOrbit.material.dispose();
        }
    }
}
