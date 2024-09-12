uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
varying float vHeight;  // Declare a varying to pass the height (Y-axis) to the fragment shader
uniform vec2 pixels;
float PI = 3.141592653589793238;

void main() {
  vUv = uv;  // Pass UV coordinates to the fragment shader
  vPosition = position;  // Pass the original position to the fragment shader

  // Extract the Y-coordinate as height
  vHeight = position.y;  // Here, we are assuming position.y represents the height of each vertex

  // Standard vertex position calculation
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}