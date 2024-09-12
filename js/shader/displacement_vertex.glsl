varying vec2 v_uv;

void main() {
    // Pass the UV coordinates to the fragment shader
    v_uv = uv;
    
    // Standard transformation for the vertex position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}