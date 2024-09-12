// Pass UV coordinates to the fragment shader
varying vec2 v_uv;

void main() {
    // Assign the UV coordinates to a varying variable
    v_uv = uv;

    // Standard vertex transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}