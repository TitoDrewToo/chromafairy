import { PAINTING_TEXTURES } from "./painting-textures";

const V3_VERTEX = `
precision highp float; varying vec2 vUv; varying float vDepth; varying float vH;
uniform sampler2D uTex; uniform vec2 uTexRes; uniform float uTime,uRelief,uFlare,uZoomTex,uTileAspect;
float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
vec2 coverFit(vec2 uv){float pa=uTexRes.x/uTexRes.y,ta=uTileAspect;vec2 u2=uv-0.5;if(pa>ta)u2.x*=ta/pa;else u2.y*=pa/ta;u2/=uZoomTex;return u2+0.5;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),uu=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),uu.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),uu.x),uu.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.02;a*=0.5;}return v;}
void main(){vUv=uv;vec2 cu=coverFit(uv);vec3 c=texture2D(uTex,clamp(cu,0.002,0.998)).rgb;float l=lum(c);float flare=(0.5+0.5*sin(uTime*1.1-l*11.0+uv.y*6.0))*uFlare;float h=pow(l,1.4)*uRelief*(1.0+flare);vH=h;vec3 pos=position;pos.z+=h;vec4 mv=modelViewMatrix*vec4(pos,1.0);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}
`;

const V3_FRAGMENT = `
precision highp float; varying vec2 vUv; varying float vDepth; varying float vH;
uniform sampler2D uTex; uniform vec2 uTexRes,uRes; uniform vec3 uBg;
uniform float uTime,uAmp,uEdge,uSeam,uHaze,uTileAspect,uBright,uRelief,uZoomTex,uGlow,uTopExtend,uShadow;
float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),uu=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),uu.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),uu.x),uu.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.02;a*=0.5;}return v;}
vec2 coverFit(vec2 uv){float pa=uTexRes.x/uTexRes.y,ta=uTileAspect;vec2 u2=uv-0.5;if(pa>ta)u2.x*=ta/pa;else u2.y*=pa/ta;u2/=uZoomTex;return u2+0.5;}
vec3 sp(vec2 uv){return texture2D(uTex,clamp(uv,0.002,0.998)).rgb;}
void main(){vec2 base=coverFit(vUv);float t=uTime*0.05*max(uAmp,0.001);vec2 warp=(vec2(fbm(base*3.0+t),fbm(base*3.0+vec2(4.7,2.1)-t))-0.5)*0.03*uAmp;vec2 uv=base+warp;float e=1.5/max(uTexRes.x,uTexRes.y);float gx=lum(sp(uv+vec2(e,0.0)))-lum(sp(uv-vec2(e,0.0)));float gy=lum(sp(uv+vec2(0.0,e)))-lum(sp(uv-vec2(0.0,e)));vec2 flow=vec2(-gy,gx);float fl=length(flow);flow=fl>1e-4?flow/fl:vec2(0.0);vec2 drift=vec2(fbm(base*2.0-t*0.5),fbm(base*2.0+vec2(9.1,3.3)+t*0.5))-0.5;flow=normalize(flow+drift*0.8+1e-5);float speed=0.10*uAmp,scale=0.05;float tt=uTime*speed;vec3 col=mix(sp(uv-flow*fract(tt)*scale),sp(uv-flow*fract(tt+0.5)*scale),abs(1.0-2.0*fract(tt)));col=(col-0.5)*1.06+0.5;float l=lum(col);col=mix(vec3(l),col,1.16);col*=uBright;float crest=smoothstep(uRelief*0.35,uRelief*0.95,vH);vec3 hot=vec3(0.72,0.95,1.0);col=mix(col,hot,crest*uGlow*0.7);col+=crest*crest*uGlow*vec3(0.10,0.30,0.45);float vv=vUv.y+(fbm(vUv*vec2(5.0,3.0)+uTime*0.05)-0.5)*uSeam*0.7;float aIn=smoothstep(0.0,uEdge,vv);float aOut=1.0-smoothstep(1.0-uEdge,1.0,vv);float alpha=clamp(aIn*aOut,0.0,1.0);float haze=smoothstep(60.0,240.0,vDepth)*uHaze;col=mix(col,uBg,haze);alpha*=(1.0-haze*0.5);float sy=gl_FragCoord.y/max(uRes.y,1.0);float dCenter=1.0-smoothstep(0.0,0.55,abs(sy-0.5));float dTop=smoothstep(0.40,1.0,sy);float shade=max(dCenter,dTop*uTopExtend);float scrim=mix(1.0,0.5,shade);col*=mix(1.0,scrim,uShadow);gl_FragColor=vec4(col,alpha);}
`;

const signalError = () => window.dispatchEvent(new Event("cf-background-error"));

export function init(canvas: HTMLCanvasElement): () => void {
  let disposed = false;
  let animationFrame = 0;
  let renderer: { dispose: () => void; forceContextLoss?: () => void } | null = null;
  const cleanups: Array<() => void> = [];
  const start = async () => {
    try {
      const THREE = await import("three");
      if (disposed) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const lowPower = Boolean(connection?.saveData);
      const staticMode = reduced || lowPower;
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75);
      const rendererInstance = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer = rendererInstance;
      rendererInstance.setPixelRatio(dpr); rendererInstance.setSize(window.innerWidth, window.innerHeight, false); rendererInstance.setClearColor(0x000000, 0);
      if ("outputColorSpace" in rendererInstance) rendererInstance.outputColorSpace = THREE.SRGBColorSpace; else (rendererInstance as unknown as { outputEncoding: number }).outputEncoding = 3001;
      const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, .1, 800);
      const tileW = 140, tileL = 70, step = tileL - 24, N = PAINTING_TEXTURES.length;
      const segX = window.innerWidth < 700 ? 52 : 84, segY = window.innerWidth < 700 ? 42 : 64;
      const background = new THREE.Color(0x070b12); const materials: any[] = []; const geometries: any[] = []; const textures: any[] = [];
      let firstReady = false; const reveal = () => { if (!firstReady && !disposed) { firstReady = true; canvas.style.opacity = "1"; } };
      canvas.style.opacity = "0"; canvas.style.transition = "opacity 500ms ease";
      const loader = new THREE.TextureLoader();
      for (let i = 0; i < N; i += 1) {
        const material = new THREE.ShaderMaterial({ vertexShader: V3_VERTEX, fragmentShader: V3_FRAGMENT, transparent: true, depthTest: true, depthWrite: false, uniforms: { uTex: { value: null }, uTexRes: { value: new THREE.Vector2(1350, 1800) }, uBg: { value: background }, uTime: { value: 0 }, uAmp: { value: { value: staticMode ? 0 : .85 } }, uEdge: { value: .24 }, uSeam: { value: .24 }, uHaze: { value: .4 }, uTileAspect: { value: tileW / tileL }, uBright: { value: 1.5 }, uRelief: { value: { value: 0 } }, uFlare: { value: { value: 0 } }, uZoomTex: { value: 1.25 }, uGlow: { value: { value: 0 } }, uRes: { value: new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr) }, uTopExtend: { value: 1 }, uShadow: { value: 1 } } });
        // Normalize nested values created above for Three's uniform format.
        material.uniforms.uAmp.value = staticMode ? 0 : .85; material.uniforms.uRelief.value = 0; material.uniforms.uFlare.value = 0; material.uniforms.uGlow.value = 0;
        const geometry = new THREE.PlaneGeometry(tileW, tileL, segX, segY); const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.position.z = -i * step; mesh.renderOrder = N - i; scene.add(mesh); materials.push(material); geometries.push(geometry);
        if (!staticMode || i === 0) loader.load(PAINTING_TEXTURES[i], (texture) => { if (disposed) { texture.dispose(); return; } texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping; texture.anisotropy = Math.min(4, rendererInstance.capabilities.getMaxAnisotropy()); material.uniforms.uTex.value = texture; material.uniforms.uTexRes.value.set(texture.image.width, texture.image.height); textures.push(texture); if (i === 0) reveal(); }, undefined, (error) => { if (i === 0) signalError(); else console.warn("Chroma Fairy V3 painting failed to load", error); });
      }
      let hStart = 19; let target = 0, current = 0; const mouse = { x: 0, y: 0 };
      const progress = () => { const total = document.documentElement.scrollHeight - window.innerHeight; return total > 0 ? Math.min(1, Math.max(0, window.pageYOffset / total)) : 0; };
      target = progress();
      const resize = () => { rendererInstance.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); const vfov = 46 * Math.PI / 180; const hfovHalf = Math.atan(Math.tan(vfov / 2) * camera.aspect); hStart = (tileW * .98) / (2 * Math.tan(hfovHalf)); materials.forEach((m) => m.uniforms.uRes.value.set(window.innerWidth * dpr, window.innerHeight * dpr)); };
      const onScroll = () => { target = progress(); }; const onMouse = (event: MouseEvent) => { mouse.x = (event.clientX / window.innerWidth - .5) * 2; mouse.y = (event.clientY / window.innerHeight - .5) * 2; };
      const onVisibility = () => { if (!document.hidden && !animationFrame && !staticMode) animationFrame = requestAnimationFrame(frame); };
      const smooth = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
      const frame = (time: number) => { animationFrame = 0; if (disposed || document.hidden) return; current += (target - current) * (staticMode ? 1 : .06); const p = staticMode ? 0 : current; const emerge = smooth(p / .22); const flareWave = [0,1,1,0,0,1,1,0,0,0,0]; const teVh = Math.max(1, window.innerHeight); const te = Math.min(1, Math.max(0, 1 - (window.pageYOffset / teVh) / .9)); materials.forEach((material, index) => { const wave = staticMode ? 0 : flareWave[index] || 0; material.uniforms.uRelief.value = 2.2 * wave; material.uniforms.uFlare.value = .55 * wave; material.uniforms.uGlow.value = .9 * wave; material.uniforms.uTopExtend.value = te; material.uniforms.uTime.value = time * .001; }); const camZ = -p * (N - 1) * step; const hOb = 16 + Math.sin(p * Math.PI * 3) * 2 * .5; const camY = hStart * (1 - emerge) + hOb * emerge; const lookAhead = .6 * (1 - emerge) + 16 * 1.2 * emerge; const sweepX = Math.sin(p * Math.PI * (N - 1) * .5) * 7 * .5 * emerge; camera.position.set(sweepX + mouse.x * 2 * emerge * .4, camY - mouse.y * emerge * .3, camZ); camera.lookAt(sweepX * .35, -2 * emerge, camZ - lookAhead); rendererInstance.render(scene, camera); animationFrame = requestAnimationFrame(frame); };
      resize(); window.addEventListener("resize", resize); window.addEventListener("scroll", onScroll); window.addEventListener("mousemove", onMouse); document.addEventListener("visibilitychange", onVisibility); cleanups.push(() => { window.removeEventListener("resize", resize); window.removeEventListener("scroll", onScroll); window.removeEventListener("mousemove", onMouse); document.removeEventListener("visibilitychange", onVisibility); });
      if (staticMode) { const wait = window.setInterval(() => { if (firstReady) { window.clearInterval(wait); frame(0); } }, 40); cleanups.push(() => window.clearInterval(wait)); } else animationFrame = requestAnimationFrame(frame);
      cleanups.push(() => { scene.clear(); geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose()); textures.forEach((texture) => texture.dispose()); rendererInstance.dispose(); rendererInstance.forceContextLoss(); });
    } catch { signalError(); }
  };
  void start(); return () => { disposed = true; if (animationFrame) cancelAnimationFrame(animationFrame); cleanups.splice(0).forEach((cleanup) => cleanup()); renderer?.dispose(); };
}
