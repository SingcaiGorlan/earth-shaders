/**
 * 卫星3D模型生成器
 * 这个脚本生成一个简单的卫星模型（立方体 + 太阳能板）
 * 
 * 使用方法：
 * 1. 在 Blender 中创建模型
 * 2. 或者使用 Three.js 程序化生成（如下所示）
 * 
 * 这里提供一个简单的程序化卫星模型示例
 */

import * as THREE from 'three'

/**
 * 创建一个简单的卫星模型
 * @returns {THREE.Group} 卫星模型组
 */
export function createSimpleSatelliteModel() {
    const satelliteGroup = new THREE.Group()

    // 卫星主体（立方体）
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
 * 创建 ISS 模型（简化版）
 * @returns {THREE.Group} ISS 模型组
 */
export function createISSModel() {
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

    // 太阳能板阵列（大型）
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

export default { createSimpleSatelliteModel, createISSModel }
