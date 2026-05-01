/**
 * Sun Fragment Shader
 * Realistic solar surface with plasma animation, sunspots, and corona
 */

uniform float time;
uniform float intensity;
uniform vec3 sunColor;
uniform vec3 coronaColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// Simplex-like noise function for solar surface
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
    
    // Animated solar surface with multiple layers
    float time0 = time * 0.1;
    float time1 = time * 0.05;
    
    // Base solar plasma with animation
    vec2 uv0 = vUv * 8.0 + vec2(time0, time0 * 0.5);
    vec2 uv1 = vUv * 4.0 - vec2(time1 * 0.7, time1);
    
    float plasma1 = fbm(uv0);
    float plasma2 = fbm(uv1);
    float plasma3 = fbm(vUv * 12.0 + time0 * 1.2);
    
    // Combine plasma layers
    float surfacePattern = plasma1 * 0.5 + plasma2 * 0.3 + plasma3 * 0.2;
    
    // Solar surface color gradient
    vec3 coreColor = vec3(1.0, 0.95, 0.8);    // Bright yellow-white core
    vec3 midColor = vec3(1.0, 0.7, 0.3);      // Orange mid-layer
    vec3 surfaceColor = vec3(0.9, 0.4, 0.1);  // Red-orange surface
    
    vec3 solarSurface = mix(
        mix(surfaceColor, midColor, surfacePattern),
        coreColor,
        pow(surfacePattern, 2.0)
    );
    
    // Sunspots (darker regions)
    float sunspotNoise = fbm(vUv * 6.0 + vec2(time * 0.02, 0.0));
    float sunspotMask = smoothstep(0.65, 0.75, sunspotNoise) * 
                        (1.0 - smoothstep(0.75, 0.85, sunspotNoise));
    vec3 sunspotColor = vec3(0.3, 0.15, 0.05);
    solarSurface = mix(solarSurface, sunspotColor, sunspotMask * 0.6);
    
    // Solar flares (bright regions)
    float flareNoise = fbm(vUv * 10.0 - vec2(0.0, time * 0.03));
    float flareMask = smoothstep(0.7, 0.8, flareNoise) * 
                      smoothstep(0.9, 0.85, flareNoise);
    vec3 flareColor = vec3(1.0, 1.0, 0.9);
    solarSurface = mix(solarSurface, flareColor, flareMask * 0.4);
    
    // Fresnel effect for limb darkening
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.0);
    vec3 limbColor = vec3(0.8, 0.3, 0.1);
    solarSurface = mix(solarSurface, limbColor, fresnel * 0.3);
    
    // Corona effect (outer glow)
    float coronaIntensity = pow(fresnel, 1.5) * intensity;
    vec3 corona = coronaColor * coronaIntensity * 2.0;
    
    // Combine surface and corona
    vec3 finalColor = solarSurface + corona;
    
    // Emissive glow
    float emissive = intensity * (0.8 + surfacePattern * 0.4);
    finalColor *= emissive;
    
    // Add bloom-like effect
    float bloom = pow(surfacePattern, 0.5) * 0.3;
    finalColor += vec3(bloom);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
