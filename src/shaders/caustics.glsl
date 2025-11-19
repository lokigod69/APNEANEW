// Caustics Vertex Shader
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

---FRAGMENT---

// Caustics Fragment Shader
uniform float uTime;
uniform float uDepth;
uniform vec2 uResolution;

varying vec2 vUv;

// Simplex noise for caustics
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Caustic pattern
float caustic(vec2 uv, float time) {
    float c = 0.0;

    // Multiple layers of animated noise
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 p = uv * (3.0 + fi * 2.0);
        p += time * (0.1 + fi * 0.05);

        float n1 = snoise(p);
        float n2 = snoise(p * 1.5 + time * 0.15);

        // Create caustic pattern from noise interference
        c += pow(abs(sin(n1 * 3.14159 + n2 * 2.0)), 3.0) * (1.0 / (1.0 + fi));
    }

    return c / 2.0;
}

void main() {
    vec2 uv = vUv;

    // Calculate caustic intensity
    float c = caustic(uv, uTime);

    // Depth-based attenuation (caustics fade with depth)
    float depthFactor = 1.0 - uDepth;
    c *= depthFactor * depthFactor;

    // Color gradient based on depth
    vec3 shallowColor = vec3(0.6, 0.9, 1.0);  // Bright cyan
    vec3 midColor = vec3(0.2, 0.5, 0.8);      // Ocean blue
    vec3 deepColor = vec3(0.02, 0.05, 0.15);  // Deep navy

    vec3 color;
    if (uDepth < 0.5) {
        color = mix(shallowColor, midColor, uDepth * 2.0);
    } else {
        color = mix(midColor, deepColor, (uDepth - 0.5) * 2.0);
    }

    // Add caustic highlights
    vec3 causticColor = vec3(0.8, 0.95, 1.0) * c;
    color += causticColor * 0.5;

    // Subtle animation shimmer
    float shimmer = sin(uTime * 2.0 + uv.x * 10.0) * 0.02;
    color += shimmer * depthFactor;

    gl_FragColor = vec4(color, 1.0);
}
