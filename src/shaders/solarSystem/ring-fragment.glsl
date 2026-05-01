/**
 * Saturn Ring Fragment Shader
 * Professional ring rendering with gaps, particles, and lighting
 */

uniform float time;
uniform vec3 ringColor1;
uniform vec3 ringColor2;
uniform vec3 ringColor3;
uniform vec3 sunDirection;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Noise for ring particle distribution
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

void main()
{
    // Ring UV coordinates
    vec2 uv = vUv;
    
    // Distance from center (0 at inner edge, 1 at outer edge)
    float radius = uv.x;
    
    // Create ring bands with gaps
    float band1 = smoothstep(0.0, 0.1, radius) * (1.0 - smoothstep(0.45, 0.5, radius));
    float band2 = smoothstep(0.55, 0.6, radius) * (1.0 - smoothstep(0.85, 0.9, radius));
    float band3 = smoothstep(0.92, 0.95, radius);
    
    // Cassini Division (famous gap)
    float cassiniGap = smoothstep(0.48, 0.52, radius) * (1.0 - smoothstep(0.58, 0.62, radius));
    
    // Ring colors
    vec3 color1 = ringColor1; // Inner ring (darker)
    vec3 color2 = ringColor2; // Middle ring (bright)
    vec3 color3 = ringColor3; // Outer ring (medium)
    
    vec3 ringColor = vec3(0.0);
    float ringMask = 0.0;
    
    // Apply bands
    if(band1 > 0.0) {
        ringColor = mix(ringColor, color1 * 0.8, band1);
        ringMask += band1 * 0.7;
    }
    
    if(band2 > 0.0 && cassiniGap < 0.5) {
        ringColor = mix(ringColor, color2, band2);
        ringMask += band2;
    }
    
    if(band3 > 0.0) {
        ringColor = mix(ringColor, color3 * 0.9, band3);
        ringMask += band3 * 0.6;
    }
    
    // Add particle texture
    float particleNoise = noise(uv * 80.0) * 0.3;
    ringColor += particleNoise;
    ringMask *= (0.7 + particleNoise * 0.3);
    
    // Calculate lighting
    vec3 normal = normalize(vNormal);
    float lightIntensity = max(abs(dot(normal, sunDirection)), 0.0);
    
    // Rings are flat, so lighting depends on angle
    float illumination = 0.2 + lightIntensity * 0.8;
    
    // Apply lighting
    vec3 finalColor = ringColor * illumination;
    
    // Edge fade
    float edgeFade = smoothstep(0.0, 0.05, radius) * (1.0 - smoothstep(0.95, 1.0, radius));
    finalColor *= edgeFade;
    
    // Transparency based on ring density
    float alpha = ringMask * 0.85;
    
    // Subtle glow
    float glow = pow(ringMask, 0.5) * 0.1;
    finalColor += vec3(glow);
    
    gl_FragColor = vec4(finalColor, alpha);
}
