/**
 * Gas Giant Fragment Shader
 * Professional atmospheric bands, storms, and depth effects
 */

uniform float time;
uniform vec3 planetColor;
uniform vec3 bandColor1;
uniform vec3 bandColor2;
uniform vec3 stormColor;
uniform vec3 sunDirection;
uniform float rotationSpeed;
uniform float hasGreatSpot;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// Noise functions for atmospheric turbulence
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main()
{
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);
    
    // Animated atmospheric bands
    float timeOffset = time * rotationSpeed * 0.1;
    vec2 bandUV = vUv;
    bandUV.x += timeOffset;
    
    // Create horizontal atmospheric bands
    float bandPattern = sin(bandUV.y * 20.0) * 0.5 + 0.5;
    float bandDetail = noise(bandUV * vec2(8.0, 40.0)) * 0.3;
    bandPattern += bandDetail;
    
    // Multiple color bands
    vec3 color = mix(bandColor1, bandColor2, bandPattern);
    
    // Add atmospheric turbulence
    float turbulence = fbm(bandUV * 6.0 + vec2(timeOffset * 0.5, 0.0));
    vec3 turbulenceColor = mix(
        planetColor * 0.9,
        planetColor * 1.1,
        turbulence
    );
    color = mix(color, turbulenceColor, 0.4);
    
    // Great Red Spot (for Jupiter)
    if(hasGreatSpot > 0.5) {
        vec2 spotUV = vUv - vec2(0.6, 0.55);
        float spotDistance = length(spotUV * vec2(2.0, 1.5));
        float spotMask = 1.0 - smoothstep(0.0, 0.15, spotDistance);
        
        // Animated storm rotation
        float stormAngle = atan(spotUV.y, spotUV.x) + time * 0.2;
        float stormPattern = sin(stormAngle * 8.0 + spotDistance * 20.0) * 0.5 + 0.5;
        
        vec3 spotColor = mix(stormColor, planetColor, stormPattern * 0.5);
        color = mix(color, spotColor, spotMask * 0.8);
    }
    
    // Calculate lighting
    float lightIntensity = max(dot(normal, sunDirection), 0.0);
    
    // Day/night transition with soft edge
    float dayFactor = smoothstep(-0.15, 0.25, dot(normal, sunDirection));
    
    // Apply lighting
    vec3 litColor = color * (0.15 + lightIntensity * 0.85);
    vec3 nightColor = color * 0.08;
    vec3 finalColor = mix(nightColor, litColor, dayFactor);
    
    // Atmospheric depth effect (subtle specular)
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    float specularStrength = max(dot(normal, halfDirection), 0.0);
    float specular = pow(specularStrength, 16.0) * 0.2 * dayFactor;
    finalColor += vec3(specular) * 0.3;
    
    // Fresnel rim lighting for atmosphere glow
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.5);
    vec3 atmosphereGlow = planetColor * fresnel * 0.4;
    finalColor += atmosphereGlow;
    
    // Cloud layer variation
    float cloudNoise = fbm(vUv * 12.0 + vec2(timeOffset, timeOffset * 0.3));
    float cloudMask = smoothstep(0.4, 0.7, cloudNoise) * 0.3;
    vec3 cloudColor = vec3(1.0, 1.0, 1.0) * 0.9;
    finalColor = mix(finalColor, cloudColor, cloudMask * dayFactor);
    
    // Gamma correction
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
}
