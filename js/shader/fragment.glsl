uniform float time;
uniform float uProgress;
uniform sampler2D uState1;
uniform sampler2D uState2;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
const float PI = 3.141592653589793238;

void main() {
	vec4 color = texture2D(uState1, vUv);
	vec4 color2 = texture2D(uState2, vec2(vUv.x, 1.0 - vUv.y));

	float dist = distance(vUv, vec2(0.5));
	float radius = 1.41;
	float outer_progress = clamp(1.1 * uProgress, 0.0, 1.0);
	float inner_progress = clamp(1.1 * uProgress - 0.05, 0.0, 1.0);

	float innerCircle = 1.0 - smoothstep((inner_progress - 0.1) * radius, inner_progress * radius, dist);
	float outerCircle = 2.0 - smoothstep((outer_progress - 0.1) * radius, inner_progress * radius, dist);

	float displacement = outerCircle - innerCircle;
	float scale = mix(color.r, color2.r, innerCircle);

	vec4 finalColor = mix(color, color2, uProgress);

	gl_FragColor = vec4(vec3(displacement, scale, 0.0), 1.0);
}