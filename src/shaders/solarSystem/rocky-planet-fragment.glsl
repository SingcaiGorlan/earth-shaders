/**
 * Rocky Planet Fragment Shader
 * Professional surface rendering with atmosphere, shadows, and lighting
 */

uniform float time;
uniform vec3 planetColor;
uniform vec3 atmosphereColor;
uniform float atmosphereDensity;
uniform vec3 sunDirection;
uniform float surfaceDetail;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// Procedural noise for surface detail
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
    
    for(int i = 0; i < 5; i++) {
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
    
    // Procedural surface texture with detail
    vec2 surfaceUV = vUv * surfaceDetail;
    float terrainNoise = fbm(surfaceUV + vec2(time * 0.01, 0.0));
    float detailNoise = fbm(surfaceUV * 2.0 - vec2(0.0, time * 0.02));
    
    // Base surface color with variation
    vec3 baseColor = planetColor;
    vec3 darkColor = baseColor * 0.7;
    vec3 lightColor = baseColor * 1.3;
    
    vec3 surfaceColor = mix(
        mix(darkColor, baseColor, terrainNoise),
        lightColor,
        detailNoise * 0.5
    );
    
    // Calculate lighting
    float lightIntensity = max(dot(normal, sunDirection), 0.0);
    
    // Day/night transition
    float dayFactor = smoothstep(-0.1, 0.3, dot(normal, sunDirection));
    
    // Apply lighting
    vec3 litColor = surfaceColor * (0.1 + lightIntensity * 0.9);
    vec3 nightColor = surfaceColor * 0.05;
    vec3 color = mix(nightColor, litColor, dayFactor);
    
    // Specular reflection for smooth surfaces
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    float specularStrength = max(dot(normal, halfDirection), 0.0);
    float specular = pow(specularStrength, 32.0) * 0.3 * dayFactor;
    color += vec3(specular) * 0.5;
    
    // Atmospheric scattering
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
    
    // Atmosphere effect
    float atmosphereEffect = fresnel * atmosphereDensity;
    vec3 atmosphereGlow = atmosphereColor * atmosphereEffect;
    
    // Day atmosphere (brighter)
    float dayAtmosphere = atmosphereEffect * max(dot(normal, sunDirection) + 0.5, 0.0) * 0.6;
    // Night atmosphere (dimmer)
    float nightAtmosphere = atmosphereEffect * (1.0 - dayFactor) * 0.2;
    
    color = mix(color, atmosphereGlow, dayAtmosphere + nightAtmosphere);
    
    // Rim lighting
    float rimLight = pow(1.0 - abs(dot(viewDirection, normal)), 4.0);
    vec3 rimColor = mix(
        atmosphereColor * 0.3,
        atmosphereColor * 0.6,
        dayFactor
    );
    color += rimColor * rimLight * 0.4;
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
}
