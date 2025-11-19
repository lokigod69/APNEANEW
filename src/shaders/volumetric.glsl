// Volumetric Light Shaft Vertex Shader
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment shader marker - split in main.js
---FRAGMENT---

// Volumetric Light Shaft Fragment Shader
uniform float uTime;
uniform float uDepth;
uniform vec2 uResolution;
uniform vec3 uLightPosition;
uniform float uLightIntensity;

varying vec2 vUv;
varying vec3 vPosition;

#define NUM_SAMPLES 50
#define DENSITY 0.15
#define WEIGHT 0.7
#define DECAY 0.98
#define EXPOSURE 0.3

// Noise functions for volumetric scattering
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 texCoord = vUv;

    // Light position in screen space (top of screen)
    vec2 lightPos = vec2(0.5, 1.0);

    // Direction from pixel to light
    vec2 deltaTexCoord = (texCoord - lightPos);
    deltaTexCoord *= 1.0 / float(NUM_SAMPLES) * DENSITY;

    vec2 coord = texCoord;
    float illumination = 0.0;
    float weight = WEIGHT;

    // Ray march towards light
    for (int i = 0; i < NUM_SAMPLES; i++) {
        coord -= deltaTexCoord;

        // Sample noise for volumetric scattering
        float sampleNoise = fbm(coord * 10.0 + uTime * 0.1);

        // Add animated caustic pattern
        float caustic = sin(coord.x * 20.0 + uTime) * sin(coord.y * 20.0 + uTime * 0.7);
        caustic = caustic * 0.5 + 0.5;

        // Combine
        float sample = sampleNoise * 0.5 + caustic * 0.5;
        sample *= weight;

        illumination += sample;
        weight *= DECAY;
    }

    // Apply exposure and depth-based attenuation
    float depthFactor = 1.0 - uDepth;
    illumination *= EXPOSURE * uLightIntensity * depthFactor;

    // Color based on depth (blue shift as we go deeper)
    vec3 shallowColor = vec3(0.7, 0.9, 1.0);
    vec3 deepColor = vec3(0.0, 0.1, 0.3);
    vec3 color = mix(deepColor, shallowColor, depthFactor);

    // Add god rays color
    vec3 rayColor = color * illumination;

    // Soft fade at edges
    float vignette = 1.0 - length(vUv - 0.5) * 0.5;
    rayColor *= vignette;

    gl_FragColor = vec4(rayColor, illumination * 0.8);
}
