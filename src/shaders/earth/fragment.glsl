uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D cloudsTexture;
uniform vec3 sunDirection;
uniform float oceanColorIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    
    // Sample textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    float specularMask = texture2D(specularTexture, vUv).r;
    float cloudsMask = texture2D(cloudsTexture, vUv).r;
    
    // Ocean color correction - enhance blue and darken ocean areas
    vec3 oceanColor = vec3(0.0, 0.15, 0.35);
    float oceanMask = specularMask;
    dayColor = mix(dayColor, oceanColor, oceanMask * oceanColorIntensity);
    
    // Calculate light intensity based on angle between normal and sun direction
    float lightIntensity = dot(normal, sunDirection);
    
    // Smooth transition between day and night
    float mixFactor = smoothstep(-0.15, 0.15, lightIntensity);
    
    // Mix day and night colors
    vec3 color = mix(nightColor, dayColor, mixFactor);
    
    // Specular reflection (Blinn-Phong)
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    float specularStrength = max(dot(normal, halfDirection), 0.0);
    float specular = pow(specularStrength, 30.0) * specularMask * max(lightIntensity, 0.0);
    
    // Add specular to color
    color += vec3(specular);
    
    // Add clouds (only on day side)
    float cloudsIntensity = cloudsMask * max(lightIntensity, 0.0);
    color = mix(color, vec3(1.0), cloudsIntensity * 0.8);

    // Final color
    gl_FragColor = vec4(color, 1.0);
}