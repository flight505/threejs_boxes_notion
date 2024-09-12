uniform float u_speed;
uniform float u_time;
uniform float u_frequency;
uniform float u_intensity;
uniform sampler2D texture_mask_in;
uniform sampler2D texture_mask_out;
uniform float transition;
uniform float transition_in;
uniform float transition_out;
uniform float transition_noise;

varying vec2 v_uv;

// Directly declare constants without `#define`
const float PI = 3.14159265359;

void main() {
    vec4 mask_in = texture2D(texture_mask_in, v_uv);
    vec4 mask_out = texture2D(texture_mask_out, v_uv);

    // Calculate the distance from the center of the screen
    float dist = length(v_uv - 0.5) * 2.0;
    float radius = 1.0;

    float displacement = 0.0; // Initialize displacement
    float scale = 0.0; // Initialize scale

    // Outer circle transition
    float outer_progress = clamp(transition * 1.1, 0.0, 1.0);
    float outer_circle = 1.0 - smoothstep((outer_progress - 0.1) * radius, outer_progress * radius, dist);

    // Inner circle transition
    float inner_progress = clamp((transition * 1.1) - 0.05, 0.0, 1.0);
    float inner_circle = 1.0 - smoothstep((inner_progress - 0.1) * radius, inner_progress * radius, dist);

    displacement += outer_circle - inner_circle;
    scale += (mask_in.r * (1.0 - inner_circle)) + inner_circle * mask_out.r;

    float in_outer_progress = clamp(transition_in * 1.1, 0.0, 1.0);
    float in_outer_circle = 1.0 - smoothstep((in_outer_progress - 0.1) * radius, in_outer_progress * radius, dist);

    float in_inner_progress = clamp((transition_in * 1.1) - 0.1, 0.0, 1.0);
    float in_inner_circle = 1.0 - smoothstep((in_inner_progress - 0.1) * radius, in_inner_progress * radius, dist);

    scale -= (mask_in.r * (1.0 - in_outer_circle));

    gl_FragColor = vec4(displacement, scale, scale, 1.0);
}