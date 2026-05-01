uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D cloudsTexture;
uniform vec3 sunDirection;
uniform float oceanColorIntensity;
uniform float time;
uniform float waveHeight;
uniform float waveSpeed;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    vec3 normal = normalize(vNormal);
    
    // Sample textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    float specularMask = texture2D(specularTexture, vUv).r;
    float cloudsMask = texture2D(cloudsTexture, vUv).r;
    
    // Enhanced ocean color correction with depth variation
    vec3 deepOceanColor = vec3(0.0, 0.05, 0.18);
    vec3 shallowOceanColor = vec3(0.0, 0.22, 0.42);
    vec3 coastalColor = vec3(0.05, 0.35, 0.55);
    
    // Create ocean depth variation using UV coordinates
    float oceanDepth = sin(vUv.x * 20.0) * cos(vUv.y * 15.0) * 0.5 + 0.5;
    vec3 oceanColor = mix(deepOceanColor, shallowOceanColor, oceanDepth);
    
    float oceanMask = specularMask;
    dayColor = mix(dayColor, oceanColor, oceanMask * oceanColorIntensity);
    
    // Calculate light intensity
    float lightIntensity = dot(normal, sunDirection);
    
    // Enhanced day/night transition with wider twilight zone
    float dayMixFactor = smoothstep(-0.25, 0.35, lightIntensity);
    float twilightFactor = smoothstep(-0.25, -0.05, lightIntensity) * (1.0 - smoothstep(0.05, 0.25, lightIntensity));
    
    // Enhanced night lights - brighter cities with warm color
    vec3 enhancedNightColor = nightColor * vec3(1.8, 1.5, 1.0);
    
    // Add subtle aurora effect on night side near poles
    float poleFactor = abs(normal.y); // Higher at poles
    float auroraNoise = sin(vUv.x * 30.0 + time * 0.5) * cos(vUv.y * 20.0) * 0.5 + 0.5;
    vec3 auroraColor = vec3(0.0, 1.0, 0.6); // Green aurora
    float auroraIntensity = (1.0 - dayMixFactor) * poleFactor * auroraNoise * 0.15;
    enhancedNightColor += auroraColor * auroraIntensity;
    
    // Mix day and night with twilight effect
    vec3 color = mix(enhancedNightColor, dayColor, dayMixFactor);
    
    // Enhanced twilight glow with multiple layers
    vec3 twilightCoreColor = vec3(1.0, 0.5, 0.2);   // Orange core
    vec3 twilightEdgeColor = vec3(1.0, 0.2, 0.1);    // Red edge
    vec3 twilightColor = mix(twilightCoreColor, twilightEdgeColor, twilightFactor);
    color = mix(color, twilightColor, twilightFactor * 0.25);
    
    // Enhanced specular reflection with realistic ocean shine and wave animation
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    
    // Dynamic wave normal perturbation for realistic ocean movement
    float waveTime = time * waveSpeed;
    
    // Multi-frequency wave simulation (Gerstner-like waves)
    float wave1 = sin(vUv.x * 50.0 + waveTime * 1.5) * cos(vUv.y * 40.0 + waveTime * 1.2);
    float wave2 = sin(vUv.x * 80.0 - waveTime * 2.0) * cos(vUv.y * 60.0 + waveTime * 1.8);
    float wave3 = sin((vUv.x + vUv.y) * 120.0 + waveTime * 2.5) * 0.5;
    
    // Combine waves with amplitude control
    float combinedWave = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2) * waveHeight;
    
    // Perturb normal based on wave height
    vec3 perturbedNormal = normal;
    perturbedNormal.x += combinedWave * 0.15;
    perturbedNormal.z += combinedWave * 0.15;
    perturbedNormal = normalize(perturbedNormal);
    
    // Calculate specular with perturbed normal
    float specularStrength = max(dot(perturbedNormal, halfDirection), 0.0);
    
    // Multi-layer specular for realistic ocean reflection with wave distortion
    float specularSharp = pow(specularStrength, 120.0);   // Very sharp highlight
    float specularMedium = pow(specularStrength, 40.0);   // Medium reflection
    float specularBroad = pow(specularStrength, 10.0);    // Broad base
    
    // Add wave-based shimmer effect
    float waveShimmer = abs(combinedWave) * 0.3;
    float specular = (specularSharp * 0.5 + specularMedium * 0.3 + specularBroad * 0.2) * specularMask * max(lightIntensity, 0.0);
    specular *= (1.0 + waveShimmer); // Waves enhance specular
    
    // Ocean color specular (blue-tinted with white highlights)
    vec3 oceanSpecular = mix(vec3(0.5, 0.7, 1.0), vec3(1.0, 1.0, 1.0), specularSharp);
    color += oceanSpecular * specular * 1.5;
    
    // Add subtle foam on wave crests
    float foamThreshold = 0.7;
    float foamMask = smoothstep(foamThreshold, 1.0, abs(combinedWave)) * oceanMask * max(lightIntensity, 0.0);
    vec3 foamColor = vec3(0.95, 0.97, 1.0);
    color = mix(color, foamColor, foamMask * 0.4);
    
    // Enhanced clouds with realistic depth and shadows
    float cloudBase = cloudsMask;
    
    // Cloud shadow on surface (darker and more pronounced)
    float cloudShadow = cloudBase * 0.4 * max(lightIntensity, 0.0);
    color -= vec3(cloudShadow);
    
    // Cloud illumination with gradient
    float cloudIllumination = cloudBase * max(lightIntensity, 0.0);
    
    // Realistic cloud color variation
    vec3 cloudShadowColor = vec3(0.55, 0.58, 0.65);   // Shadowed cloud base
    vec3 cloudMidColor = vec3(0.85, 0.87, 0.92);      // Mid-level clouds
    vec3 cloudHighlightColor = vec3(1.0, 1.0, 1.0);   // Sunlit tops
    
    vec3 cloudColor = mix(
        mix(cloudShadowColor, cloudMidColor, smoothstep(-0.2, 0.3, lightIntensity)),
        cloudHighlightColor,
        max(lightIntensity, 0.0)
    );
    
    // Add clouds with proper blending and depth
    color = mix(color, cloudColor, cloudIllumination * 0.85);
    
    // Enhanced atmospheric scattering with wavelength-dependent colors
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.5);
    
    // Atmosphere color varies from blue to cyan
    vec3 atmosphereBlue = vec3(0.3, 0.6, 1.0);
    vec3 atmosphereCyan = vec3(0.4, 0.8, 1.0);
    vec3 atmosphereColor = mix(atmosphereBlue, atmosphereCyan, fresnel);
    
    // Apply atmosphere with day/night variation
    float dayAtmosphere = fresnel * max(lightIntensity + 0.3, 0.0) * 0.45;
    float nightAtmosphere = fresnel * (1.0 - max(lightIntensity, 0.0)) * 0.1;
    float atmosphereIntensity = dayAtmosphere + nightAtmosphere;
    color = mix(color, atmosphereColor, atmosphereIntensity);
    
    // Enhanced rim lighting with color variation
    float rimLight = pow(1.0 - abs(dot(viewDirection, normal)), 5.0);
    
    // Rim light color changes based on day/night
    vec3 dayRimColor = vec3(0.08, 0.15, 0.35);
    vec3 nightRimColor = vec3(0.02, 0.05, 0.15);
    vec3 rimColor = mix(nightRimColor, dayRimColor, max(lightIntensity + 0.5, 0.0));
    
    color += rimColor * rimLight * max(lightIntensity + 0.5, 0.0);
    
    // Final color with gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
}