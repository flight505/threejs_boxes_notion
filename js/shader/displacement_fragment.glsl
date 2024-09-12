// Perlin Noise Functions
float mod289(const in float x) { 
    return x - floor(x * (1. / 289.)) * 289.; 
}

vec3 mod289(const in vec3 x) { 
    return x - floor(x * (1. / 289.)) * 289.; 
}

// Permutation function
float permute(const in float x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec3 permute(const in vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

// Fast Inverse Square Root
float taylorInvSqrt(in float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// Perlin Noise Function for 3D
float cnoise(in vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0

    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = vec4(Pi0.zzzz);
    vec4 iz1 = vec4(Pi1.zzzz);

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec3 fade_xyz = Pf0 * Pf0 * Pf0 * (Pf0 * (Pf0 * 6.0 - 15.0) + 10.0);
    vec4 n_z = mix(vec4(dot(g000, Pf0), dot(g010, Pf1.xy), dot(g100, Pf0.xy), dot(g110, Pf1.xy)), 
                   vec4(dot(g001, Pf0.xy), dot(g011, Pf1.xy), dot(g101, Pf0.xy), dot(g111, Pf1.xy)), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    return mix(n_yz.x, n_yz.y, fade_xyz.x);
}

// Uniform variables
uniform sampler2D texture_map_in;
uniform sampler2D texture_map_out;
uniform float noise;
uniform float bulge;
uniform float wipe_out;
uniform float radial_in;
uniform float radial_out;
uniform float progress_out;
uniform float noise_in;
uniform float time;

varying vec2 v_uv;

void main() {
    // Calculate the distance from the center
    float dist = length(v_uv - 0.5) * 2.0;

    // Textures
    vec4 map_in = texture2D(texture_map_in, v_uv);
    vec4 map_out = texture2D(texture_map_out, v_uv);

    float displacement = 0.0;
    float displacement_out = map_out.r;
    float displacement_in = map_in.r;

    // Noise-based displacement
    float displacement_noise = (cnoise(vec3((v_uv.xy + time * 0.05) * 12.0, time * 0.05)) + 1.0) * 0.5;
    displacement_out += (displacement_noise * noise);

    // Wipe transition effect
    float transition_wipe_out = mix(1.0, 0.0, smoothstep(1.0, 0.96, v_uv.y + mix(-0.025, 0.5, (1.0 - wipe_out))));
    transition_wipe_out += mix(1.0, 0.0, smoothstep(0.0, 0.04, v_uv.y - mix(-0.025, 0.5, (1.0 - wipe_out))));
    transition_wipe_out = clamp(transition_wipe_out, 0.0, 1.0);
    displacement += transition_wipe_out * displacement_out;

    // Radial transition effect
    float transition_radial_out = 1.0 - smoothstep((radial_out - 0.05) * 2.0, radial_out * 2.0, dist);
    displacement -= transition_radial_out * displacement_out;

    float transition_radial_in = 1.0 - smoothstep((radial_in - 0.05) * 2.0, radial_in * 2.0, dist);
    displacement += transition_radial_in * displacement_in;

    // Noise transition for displacement
    float transition_noise_in = (cnoise(vec3(v_uv * 5.0, 0.5)) + 1.0) * 0.5;
    transition_noise_in = smoothstep(0.0, 1.0, transition_noise_in);
    transition_noise_in = clamp(transition_noise_in, 0.0, 1.0);
    displacement += transition_noise_in * displacement_in;

    // Bulge effect
    float bulge_outer_progress = clamp(bulge, 0.0, 1.0);
    float bulge_outer_circle = 1.0 - smoothstep((bulge_outer_progress - 0.05) * 2.0, bulge_outer_progress * 2.0, dist);

    float bulge_inner_progress = clamp((bulge * 1.05) - 0.05, 0.0, 1.0);
    float bulge_inner_circle = 1.0 - smoothstep((bulge_inner_progress - 0.05) * 2.0, bulge_inner_progress * 2.0, dist);

    float bulge_effect = bulge_outer_circle - bulge_inner_circle;
    displacement += bulge_effect * 0.25;

    // Final output
    gl_FragColor = vec4(vec3(displacement), 1.0);
}