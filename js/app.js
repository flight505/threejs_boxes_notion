import * as THREE from "three";
import { REVISION } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import transition_fragment from "./shader/transition_fragment.glsl";
import transition_vertex from "./shader/transition_vertex.glsl";
import displacement_fragment from "./shader/displacement_fragment.glsl";
import displacement_vertex from "./shader/displacement_vertex.glsl";
import GUI from "lil-gui";
import gsap from "gsap";
import bar from "../bar.glb?url";
import ao from "../ao.png?url";
import displacement_noise from '../texture-displacement-noise.png?url';
import displacement_map from '../texture-displacement-map.png?url';
import mask_graph from '../texture-mask-graph.png?url';
import mask_map from '../texture-mask-map.png?url';


// Noise shader code. Define the noise shader code.
const noise = `
//	Classic Perlin 3D Noise 
//	by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}`

// sketch Class: Main class for the 3D scene
export default class Sketch {
    constructor(options) {
        // Scene setup
        this.scene = new THREE.Scene();
        this.container = options.dom;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor('#221f29', 1);
        this.container.appendChild(this.renderer.domElement);

        // Camera setup
        let frustumSize = this.height * 3; // Increase this value to zoom out
        let aspect = this.width / this.height;
        this.camera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            -2000,
            2000
        );
        this.camera.position.set(5, 5, 5); // Move the camera further back along the z-axis
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.time = 0;

        // Loaders setup
        const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
        this.dracoLoader = new DRACOLoader(new THREE.LoadingManager()).setDecoderPath(`${THREE_PATH}/examples/jsm/libs/draco/gltf/`);
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        // Initial state
        this.isPlaying = true;
        this.settings = { progress: 0, progress_in: 0, progress_out: 0 }; // Ensure settings is initialized
        this.setupFBO();
        this.addObjects();
        this.resize();
        this.render();
        this.setupResize();
        this.addLights();
        this.setUpSettings();
    }

    // GUI settings
    setUpSettings() {
        this.gui = new GUI();

        this.gui.add(this.settings, "progress", 0, 1, 0.01).onChange((val) => {
            this.fboMaterial.uniforms.transition.value = val;

            // Ensure all textures are loaded from the start
            if (!this.texturesLoaded) {
                this.fboMaterial.uniforms.texture_noise.value = new THREE.TextureLoader().load(displacement_noise);
                this.fboMaterial.uniforms.texture_mask_in.value = new THREE.TextureLoader().load(mask_graph);
                this.fboMaterial.uniforms.texture_mask_out.value = new THREE.TextureLoader().load(mask_map);
                this.texturesLoaded = true;
            }

            // Update transition values
            if (val <= 0.00) {
                // Initial visibility of cubes (mask_graph)
                this.fboMaterial.uniforms.transition_noise.value = 1 - (val / 0.05);
                this.fboMaterial.uniforms.transition_in.value = 0;
                this.fboMaterial.uniforms.transition_out.value = 0;
            } else if (val <= 0.4) {
                // Transition to forming a country (mask_map)
                this.fboMaterial.uniforms.transition_noise.value = 0;
                this.fboMaterial.uniforms.transition_in.value = (val - 0.05) / 0.35;
                this.fboMaterial.uniforms.transition_out.value = 0;
            } else if (val <= 0.5) {
                // mask_graph (texture-mask-graph.png) remains visible
                this.fboMaterial.uniforms.transition_noise.value = 0;
                this.fboMaterial.uniforms.transition_in.value = 1;
                this.fboMaterial.uniforms.transition_out.value = (val - 0.45) / 0.05;
            } else {
                // Ensure mask_map remains visible
                this.fboMaterial.uniforms.transition_noise.value = 0;
                this.fboMaterial.uniforms.transition_in.value = 1;
                this.fboMaterial.uniforms.transition_out.value = 1;
            }
        });
    }

    // Resize event listener
    setupResize() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    // Handle resize
    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        let aspect = this.width / this.height;
        let frustumSize = this.height * 3; // Ensure this matches the frustumSize in the constructor
        this.camera.left = (frustumSize * aspect) / -2;
        this.camera.right = (frustumSize * aspect) / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();
    }

    // Setup Frame Buffer Object (FBO)
    setupFBO() {
        this.fbo = new THREE.WebGLRenderTarget(this.width, this.height);
        this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        this.fboScene = new THREE.Scene();
        this.fboMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_speed: { value: 1.0 },
                u_time: { value: 0.0 },
                u_frequency: { value: 1.0 },
                u_intensity: { value: 1.0 },
                texture_mask_in: { value: null },
                texture_mask_out: { value: new THREE.TextureLoader().load() },
                texture_noise: { value: new THREE.TextureLoader().load(displacement_noise) },
                transition: { value: 0.0 },
                transition_in: { value: 0.0 },
                transition_out: { value: 0.0 },
                transition_noise: { value: 0.0 }
            },
            vertexShader: transition_vertex,
            fragmentShader: transition_fragment,
        });
        this.fbogeo = new THREE.PlaneGeometry(2, 2);
        this.fboQuad = new THREE.Mesh(this.fbogeo, this.fboMaterial);
        this.fboScene.add(this.fboQuad);

        // Load texture_mask_in (mask_graph) and assign it to the uniform
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(mask_graph, (texture) => {
            this.fboMaterial.uniforms.texture_mask_in.value = texture;
        }, undefined, (error) => {
            console.error('Error loading texture:', error);
        });
    }

    // Add objects to the scene
    addObjects() {
        this.aoTexture = new THREE.TextureLoader().load(ao);
        this.debug = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ map: this.fbo.texture }));
        this.scene.add(this.debug);
        this.debug.position.y = 150;
        this.aoTexture.flipY = false;

        this.material = new THREE.MeshPhysicalMaterial({
            roughness: 0.65,
            map: this.aoTexture,
            // set AO map
            aoMap: this.aoTexture,
            aoMapIntensity: 0.75,
        });

        this.uniforms = {
            time: { value: 0 },
            uFBO: { value: null },
            aoMap: { value: this.aoTexture },
            light_color: { value: new THREE.Color('#e0f7fa') },    // Light Aqua
            ramp_color_one: { value: new THREE.Color('#004d40') }, // Dark Teal
            ramp_color_two: { value: new THREE.Color('#00838f') }, // Deep Cyan
            ramp_color_three: { value: new THREE.Color('#4fc3f7') }, // Sky Blue
            ramp_color_four: { value: new THREE.Color('#b3e5fc') },  // Light Sky Blue
        };

        this.material.onBeforeCompile = (shader) => {
            shader.uniforms = Object.assign(shader.uniforms, this.uniforms);
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
        uniform sampler2D uFBO;
        uniform float time;
        attribute vec2 instanceUV;
        varying float vHeight;
        varying float vHeightUV;
        ${noise}
        `
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
        #include <begin_vertex>
        float n = cnoise(vec3(instanceUV.x*5., instanceUV.y*5. , time*0.1));
        transformed.y += n*360.; // Increase the amplitude here
        vHeightUV = clamp(position.y*2.,0.,1.);
        vec4 transition = texture2D(uFBO, instanceUV);
        transformed *=(transition.g);
        transformed.y += transition.r*100.;
        vHeight = transformed.y;
        `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
        #include <common>
        uniform vec3 light_color;
        uniform vec3 ramp_color_one;
        uniform vec3 ramp_color_two;
        uniform vec3 ramp_color_three;
        uniform vec3 ramp_color_four;
        varying float vHeight;
        varying float vHeightUV;
        `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
        vec3 highlight = mix(ramp_color_three, ramp_color_four, vHeightUV);
        diffuseColor.rgb = ramp_color_two;
        diffuseColor.rgb = mix(diffuseColor.rgb, ramp_color_three, vHeightUV);
        float smoothFactor = smoothstep(0.0, 1.0, (vHeight / 12.0 - 3.0)); // Fine-tune for smoother transitions
        diffuseColor.rgb = mix(diffuseColor.rgb, highlight, smoothFactor);
        `
            );
        };

        this.gltfLoader.load(bar, (gltf) => {
            this.model = gltf.scene.children[0];
            this.scene.add(this.model);
            this.model.material = this.material;
            this.geometry = this.model.geometry;
            this.geometry.scale(40, 40, 40);

            this.iSize = 100; // Reduce this value to adjust the number of cubes
            this.instances = this.iSize ** 2;
            this.instanceMesh = new THREE.InstancedMesh(this.geometry, this.material, this.instances);
            let dummy = new THREE.Object3D();
            let w = 60;

            let instanceUV = new Float32Array(this.instances * 2);
            for (let i = 0; i < this.iSize; i++) {
                for (let j = 0; j < this.iSize; j++) {
                    instanceUV.set([i / this.iSize, j / this.iSize], (i * this.iSize + j) * 2);
                    dummy.position.set(w * (i - this.iSize / 2), 0, w * (j - this.iSize / 2));
                    dummy.updateMatrix();
                    this.instanceMesh.setMatrixAt(i * this.iSize + j, dummy.matrix);
                }
            }
            this.geometry.setAttribute('instanceUV', new THREE.InstancedBufferAttribute(instanceUV, 2));
            this.scene.add(this.instanceMesh);
        });
    }

    // Add lights to the scene
    addLights() {
        const ambientLight = new THREE.AmbientLight('#c5eeff', 0.4);  // Light blue-grey ambient light
        this.scene.add(ambientLight);

        this.spotlight = new THREE.SpotLight('#fbe5ff', 1200);  // Reduced intensity for a softer look
        this.spotlight.position.set(-80 * 3, 200 * 3, -80 * 3);
        let target = new THREE.Object3D();
        target.position.set(0, -80, 200);
        this.spotlight.target = target;
        this.spotlight.intensity = 200;
        this.spotlight.angle = 1;
        this.spotlight.penumbra = 0.6;   // Slightly increase penumbra for softer edges
        this.spotlight.decay = 0.6;
        this.spotlight.distance = 3000;
        this.scene.add(this.spotlight);
    }

    // Stop rendering
    stop() {
        this.isPlaying = false;
    }

    // Resume rendering
    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.render();
        }
    }

    // Render loop
    render() {
        if (!this.isPlaying) return;
        requestAnimationFrame(this.render.bind(this));
        this.time += 0.05; // Ensure this increment is appropriate for your animation speed
        this.uniforms.time.value = this.time;


        // Update FBO uniforms in the render loop
        this.fboMaterial.uniforms.u_time.value = this.time;
        this.fboMaterial.uniforms.transition.value = this.settings.progress;

        // Render to FBO
        this.renderer.setRenderTarget(this.fbo);
        this.renderer.render(this.fboScene, this.fboCamera);
        this.renderer.setRenderTarget(null);

        // Update FBO texture
        this.uniforms.uFBO.value = this.fbo.texture;

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize Sketch
new Sketch({
    dom: document.getElementById("container"),
})
