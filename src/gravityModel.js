/**
 * 全系统引力物理引擎
 * 提供统一的引力计算接口，支持地球、太阳系和其他天体的引力模拟
 */

import * as THREE from 'three';

// 物理常数 (SI 单位)
const PHYSICAL_CONSTANTS = {
    // 万有引力常数
    GRAVITATIONAL_CONSTANT: 6.67430e-11, // m³/(kg·s²)
    
    // 天体质量 (kg)
    EARTH_MASS: 5.9722e24,
    SUN_MASS: 1.9885e30,
    MOON_MASS: 7.342e22,
    
    // 天体半径 (m)
    EARTH_RADIUS: 6371000,
    SUN_RADIUS: 696340000,
    MOON_RADIUS: 1737400,
    
    // 标准重力参数 μ = GM (m³/s²)
    EARTH_GRAVITATIONAL_PARAMETER: 3.986004418e14, // GM for Earth
    SUN_GRAVITATIONAL_PARAMETER: 1.32712440018e20,  // GM for Sun
    MOON_GRAVITATIONAL_PARAMETER: 4.9048695e12,     // GM for Moon
    
    // 地球表面重力加速度
    EARTH_SURFACE_GRAVITY: 9.80665 // m/s²
};

// 场景缩放常数
const SCENE_CONSTANTS = {
    // 地球场景缩放：2个场景单位 = 地球半径
    EARTH_SCENE_SCALE: 2 / PHYSICAL_CONSTANTS.EARTH_RADIUS, // scene units per meter
    
    // 太阳系场景缩放：150个场景单位 = 1 AU (天文单位)
    AU_TO_SCENE_UNITS: 150 / 149597870700, // scene units per meter (1 AU = 149,597,870,700 m)
    
    // 时间缩放（用于模拟加速）
    DEFAULT_TIME_SCALE: 1.0
};

/**
 * 引力模型基类
 */
class GravitationalModel {
    constructor() {
        this.bodies = new Map(); // 存储所有引力源天体
        this.timeScale = SCENE_CONSTANTS.DEFAULT_TIME_SCALE;
        this.currentTime = Date.now();
    }
    
    /**
     * 添加引力源天体
     * @param {string} id - 天体唯一标识符
     * @param {Object} body - 天体数据
     * @param {THREE.Vector3} body.position - 位置 (场景坐标)
     * @param {number} body.mass - 质量 (kg)
     * @param {number} body.radius - 半径 (m)
     * @param {number} body.gravitationalParameter - 引力参数 μ = GM (m³/s²)
     */
    addGravitationalBody(id, body) {
        if (!body.position || !body.mass || !body.radius) {
            console.error('Invalid gravitational body data:', body);
            return false;
        }
        
        // 确保位置是 THREE.Vector3
        if (!(body.position instanceof THREE.Vector3)) {
            body.position = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
        }
        
        // 如果没有提供引力参数，计算它
        if (!body.gravitationalParameter) {
            body.gravitationalParameter = PHYSICAL_CONSTANTS.GRAVITATIONAL_CONSTANT * body.mass;
        }
        
        this.bodies.set(id, body);
        return true;
    }
    
    /**
     * 移除引力源天体
     * @param {string} id - 天体唯一标识符
     */
    removeGravitationalBody(id) {
        return this.bodies.delete(id);
    }
    
    /**
     * 计算单个天体在指定位置产生的引力加速度
     * @param {string} bodyId - 引力源天体ID
     * @param {THREE.Vector3} position - 目标位置 (场景坐标)
     * @returns {THREE.Vector3} 引力加速度向量 (m/s²)
     */
    calculateGravityFromBody(bodyId, position) {
        const body = this.bodies.get(bodyId);
        if (!body) {
            console.warn(`Gravitational body ${bodyId} not found`);
            return new THREE.Vector3(0, 0, 0);
        }
        
        // 将场景坐标转换为物理坐标 (米)
        const physicalPosition = this.sceneToPhysicalPosition(position);
        const bodyPhysicalPosition = this.sceneToPhysicalPosition(body.position);
        
        // 计算相对位置向量
        const relativePosition = new THREE.Vector3().subVectors(physicalPosition, bodyPhysicalPosition);
        const distance = relativePosition.length();
        
        // 避免除零错误和内部点计算
        if (distance < body.radius) {
            // 在天体内部，使用线性插值的重力（简化模型）
            const gravityAtSurface = body.gravitationalParameter / (body.radius * body.radius);
            const internalGravity = gravityAtSurface * (distance / body.radius);
            const direction = relativePosition.normalize();
            return direction.multiplyScalar(-internalGravity);
        }
        
        // 使用牛顿万有引力定律：g = GM/r²
        const gravityMagnitude = body.gravitationalParameter / (distance * distance);
        const direction = relativePosition.normalize();
        
        // 返回指向引力源的加速度向量
        return direction.multiplyScalar(-gravityMagnitude);
    }
    
    /**
     * 计算所有引力源在指定位置产生的总引力加速度
     * @param {THREE.Vector3} position - 目标位置 (场景坐标)
     * @returns {THREE.Vector3} 总引力加速度向量 (m/s²)
     */
    calculateTotalGravity(position) {
        const totalGravity = new THREE.Vector3(0, 0, 0);
        
        for (const [id, body] of this.bodies) {
            const gravity = this.calculateGravityFromBody(id, position);
            totalGravity.add(gravity);
        }
        
        return totalGravity;
    }
    
    /**
     * 将场景坐标转换为物理坐标 (米)
     * @param {THREE.Vector3} scenePos - 场景坐标
     * @returns {THREE.Vector3} 物理坐标 (米)
     */
    sceneToPhysicalPosition(scenePos) {
        // 这里需要根据不同的场景区域使用不同的缩放比例
        // 对于地球附近区域，使用地球场景缩放
        // 对于太阳系区域，使用太阳系场景缩放
        
        // 简化处理：假设主要在地球场景中工作
        const scale = 1 / SCENE_CONSTANTS.EARTH_SCENE_SCALE;
        return new THREE.Vector3(
            scenePos.x * scale,
            scenePos.y * scale,
            scenePos.z * scale
        );
    }
    
    /**
     * 将物理坐标转换为场景坐标
     * @param {THREE.Vector3} physicalPos - 物理坐标 (米)
     * @returns {THREE.Vector3} 场景坐标
     */
    physicalToScenePosition(physicalPos) {
        const scale = SCENE_CONSTANTS.EARTH_SCENE_SCALE;
        return new THREE.Vector3(
            physicalPos.x * scale,
            physicalPos.y * scale,
            physicalPos.z * scale
        );
    }
    
    /**
     * 更新时间
     * @param {number} deltaTime - 时间增量 (秒)
     */
    updateTime(deltaTime) {
        this.currentTime += deltaTime * 1000 * this.timeScale; // 转换为毫秒
    }
    
    /**
     * 设置时间缩放比例
     * @param {number} scale - 时间缩放比例
     */
    setTimeScale(scale) {
        this.timeScale = Math.max(0.001, scale); // 防止时间倒流或过慢
    }
    
    /**
     * 获取当前模拟时间
     * @returns {Date} 当前模拟时间
     */
    getCurrentSimulationTime() {
        return new Date(this.currentTime);
    }
}

/**
 * 地球专用引力模型
 */
class EarthGravityModel extends GravitationalModel {
    constructor(earthSceneRadius = 2) {
        super();
        this.earthSceneRadius = earthSceneRadius;
        this.earthPhysicalRadius = PHYSICAL_CONSTANTS.EARTH_RADIUS;
        this.sceneScale = earthSceneRadius / this.earthPhysicalRadius;
        
        // 添加地球作为引力源
        this.addGravitationalBody('earth', {
            position: new THREE.Vector3(0, 0, 0),
            mass: PHYSICAL_CONSTANTS.EARTH_MASS,
            radius: this.earthPhysicalRadius,
            gravitationalParameter: PHYSICAL_CONSTANTS.EARTH_GRAVITATIONAL_PARAMETER,
            name: 'Earth'
        });
    }
    
    /**
     * 重写场景到物理坐标的转换（针对地球场景优化）
     */
    sceneToPhysicalPosition(scenePos) {
        const scale = 1 / this.sceneScale;
        return new THREE.Vector3(
            scenePos.x * scale,
            scenePos.y * scale,
            scenePos.z * scale
        );
    }
    
    /**
     * 重写物理到场景坐标的转换
     */
    physicalToScenePosition(physicalPos) {
        const scale = this.sceneScale;
        return new THREE.Vector3(
            physicalPos.x * scale,
            physicalPos.y * scale,
            physicalPos.z * scale
        );
    }
    
    /**
     * 计算轨道速度（圆轨道）
     * @param {number} altitude - 距地表高度 (m)
     * @returns {number} 轨道速度 (m/s)
     */
    calculateOrbitalVelocity(altitude) {
        const r = this.earthPhysicalRadius + altitude;
        return Math.sqrt(PHYSICAL_CONSTANTS.EARTH_GRAVITATIONAL_PARAMETER / r);
    }
    
    /**
     * 计算逃逸速度
     * @param {number} altitude - 距地表高度 (m)
     * @returns {number} 逃逸速度 (m/s)
     */
    calculateEscapeVelocity(altitude) {
        return this.calculateOrbitalVelocity(altitude) * Math.sqrt(2);
    }
    
    /**
     * 计算轨道周期
     * @param {number} semiMajorAxis - 半长轴 (m)
     * @returns {number} 轨道周期 (秒)
     */
    calculateOrbitalPeriod(semiMajorAxis) {
        return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / PHYSICAL_CONSTANTS.EARTH_GRAVITATIONAL_PARAMETER);
    }
}

/**
 * 太阳系引力模型
 */
class SolarSystemGravityModel extends GravitationalModel {
    constructor() {
        super();
        this.auToMeters = 149597870700; // 1 AU in meters
        this.sceneScale = SCENE_CONSTANTS.AU_TO_SCENE_UNITS;
        
        // 添加太阳作为主要引力源
        this.addGravitationalBody('sun', {
            position: new THREE.Vector3(150, 0, 0), // 现有太阳位置
            mass: PHYSICAL_CONSTANTS.SUN_MASS,
            radius: PHYSICAL_CONSTANTS.SUN_RADIUS,
            gravitationalParameter: PHYSICAL_CONSTANTS.SUN_GRAVITATIONAL_PARAMETER,
            name: 'Sun'
        });
        
        // 可以在这里添加其他行星作为次要引力源（如果需要高精度计算）
    }
    
    /**
     * 重写场景到物理坐标的转换（针对太阳系场景）
     */
    sceneToPhysicalPosition(scenePos) {
        // 相对于太阳的位置
        const relativeToSun = new THREE.Vector3().subVectors(scenePos, new THREE.Vector3(150, 0, 0));
        const scale = 1 / this.sceneScale;
        return new THREE.Vector3(
            relativeToSun.x * scale,
            relativeToSun.y * scale,
            relativeToSun.z * scale
        );
    }
    
    /**
     * 重写物理到场景坐标的转换
     */
    physicalToScenePosition(physicalPos) {
        const scale = this.sceneScale;
        const sceneRelative = new THREE.Vector3(
            physicalPos.x * scale,
            physicalPos.y * scale,
            physicalPos.z * scale
        );
        // 转换回绝对场景坐标（相对于太阳在150,0,0的位置）
        return new THREE.Vector3().addVectors(sceneRelative, new THREE.Vector3(150, 0, 0));
    }
}

// 导出常量和类
export {
    PHYSICAL_CONSTANTS,
    SCENE_CONSTANTS,
    GravitationalModel,
    EarthGravityModel,
    SolarSystemGravityModel
};