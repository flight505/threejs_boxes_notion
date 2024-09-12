uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
varying float vHeight;  // Declare a varying to pass the height (Y-axis) to the fragment shader
uniform vec2 pixels;
float PI = 3.141592653589793238;

// Pass UV coordinates to the fragment shader
varying vec2 v_uv;

void main() {
    // Assign the UV coordinates to a varying variable
    v_uv = uv;

    // Standard vertex transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}