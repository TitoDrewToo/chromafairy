import { PAINTING_TEXTURES } from "./painting-textures";

const V2_FRAGMENT = `
precision highp float; varying vec2 vUv;
uniform sampler2D uTexA,uTexB; uniform vec2 uTexResA,uTexResB,uRes,uPan;
uniform float uTime,uBlend,uDissolve,uZoom,uShadow,uAmp,uBright,uAngle,uFocus,uScrollBoost,uPersp;
float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
vec2 coverUV(vec2 uv,vec2 tr){vec2 r=vec2(min((uRes.x/uRes.y)/(tr.x/tr.y),1.0),min((uRes.y/uRes.x)/(tr.y/tr.x),1.0));vec2 p=uv-0.5;float c=cos(uAngle),s=sin(uAngle);p=mat2(c,-s,s,c)*p;float z=1.0+p.y*uPersp;p/=max(z,0.2);p=p/uZoom*r;p+=uPan;return p+0.5;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),uu=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),uu.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),uu.x),uu.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.02;a*=0.5;}return v;}
vec3 sp(sampler2D t,vec2 uv){return texture2D(t,clamp(uv,0.002,0.998)).rgb;}
vec3 spBlur(sampler2D t,vec2 uv,float rad){if(rad<0.0009)return sp(t,uv);vec3 acc=sp(t,uv);for(int k=0;k<6;k++){float a=1.0472*float(k);acc+=sp(t,uv+vec2(cos(a),sin(a))*rad);}return acc/7.0;}
vec3 living(sampler2D tex,vec2 tr){vec2 base=coverUV(vUv,tr);float t=uTime*0.05*max(uAmp,0.001);vec2 warp=(vec2(fbm(base*3.0+t),fbm(base*3.0+vec2(4.7,2.1)-t))-0.5)*0.03*uAmp;vec2 uv=base+warp;float e=1.5/max(uRes.x,uRes.y);float gx=lum(sp(tex,uv+vec2(e,0.0)))-lum(sp(tex,uv-vec2(e,0.0)));float gy=lum(sp(tex,uv+vec2(0.0,e)))-lum(sp(tex,uv-vec2(0.0,e)));vec2 flow=vec2(-gy,gx);float fl=length(flow);flow=fl>1e-4?flow/fl:vec2(0.0);vec2 drift=vec2(fbm(base*2.0-t*0.5),fbm(base*2.0+vec2(9.1,3.3)+t*0.5))-0.5;flow=normalize(flow+drift*0.8+1e-5);float speed=(0.10+uScrollBoost)*uAmp,scale=0.05;float tt=uTime*speed;float rad=uFocus*0.013;return mix(spBlur(tex,uv-flow*fract(tt)*scale,rad),spBlur(tex,uv-flow*fract(tt+0.5)*scale,rad),abs(1.0-2.0*fract(tt)));}
void main(){vec3 a=living(uTexA,uTexResA);vec3 b=living(uTexB,uTexResB);float n=fbm(vUv*3.2+uTime*0.04);float w=max(uDissolve,0.001);float m=smoothstep(0.0,1.0,clamp((uBlend*(1.0+w)-w*0.5)+(n-0.5)*w,0.0,1.0));vec3 col=mix(a,b,m);col=(col-0.5)*1.06+0.5;float l=lum(col);col=mix(vec3(l),col,1.14);col*=uBright;vec2 d=vUv-0.5;float vig=smoothstep(1.15,0.30,length(d*vec2(1.0,1.06)));float topShade=mix(1.0,0.40,smoothstep(0.32,1.0,vUv.y));col*=mix(1.0,vig*topShade,uShadow);gl_FragColor=vec4(col,1.0);}
`;

const signalError = () => window.dispatchEvent(new Event("cf-background-error"));

export function init(canvas: HTMLCanvasElement): () => void {
  let disposed = false;
  let animationFrame = 0;
  let renderer: { dispose: () => void; forceContextLoss?: () => void } | null = null;
  const textures: Array<{ dispose: () => void }> = [];
  const cleanups: Array<() => void> = [];

  const start = async () => {
    try {
      const THREE = await import("three");
      if (disposed) return;
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const lowPower = Boolean(connection?.saveData) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
      const staticMode = isReduced || lowPower;
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75);
      const N = PAINTING_TEXTURES.length;
      const rendererInstance = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer = rendererInstance;
      rendererInstance.setPixelRatio(dpr);
      rendererInstance.setSize(window.innerWidth, window.innerHeight, false);
      if ("outputColorSpace" in rendererInstance) rendererInstance.outputColorSpace = THREE.SRGBColorSpace;
      else (rendererInstance as unknown as { outputEncoding: number }).outputEncoding = 3001;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const uniforms: any = {
        uTexA: { value: null }, uTexB: { value: null },
        uTexResA: { value: new THREE.Vector2(1350, 1800) }, uTexResB: { value: new THREE.Vector2(1350, 1800) },
        uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, uTime: { value: 0 }, uBlend: { value: 0 },
        uDissolve: { value: 0.55 }, uZoom: { value: 1.1 }, uShadow: { value: 1 }, uAmp: { value: staticMode ? 0 : 0.9 },
        uBright: { value: 1.5 }, uAngle: { value: 0 }, uFocus: { value: staticMode ? 0 : 0.06 }, uScrollBoost: { value: 0 },
        uPersp: { value: 0.12 }, uPan: { value: new THREE.Vector2(0, 0) },
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}", fragmentShader: V2_FRAGMENT });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(mesh);
      const textureSlots: Array<{ dispose: () => void } | null> = new Array(N).fill(null);
      const dims: Array<[number, number] | null> = new Array(N).fill(null);
      let revealed = false;
      const reveal = () => { if (!revealed && !disposed) { revealed = true; canvas.style.opacity = "1"; } };
      canvas.style.opacity = "0";
      canvas.style.transition = "opacity 500ms ease";
      const loadTexture = (index: number) => new Promise<void>((resolve, reject) => {
        new THREE.TextureLoader().load(PAINTING_TEXTURES[index], (texture) => {
          if (disposed) { texture.dispose(); resolve(); return; }
          texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
          texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.anisotropy = Math.min(4, rendererInstance.capabilities.getMaxAnisotropy());
          textureSlots[index] = texture; textures.push(texture);
          dims[index] = [texture.image.width, texture.image.height];
          if (index === 0) reveal();
          resolve();
        }, undefined, reject);
      });
      const progress = () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        return total > 0 ? Math.min(1, Math.max(0, window.pageYOffset / total)) : 0;
      };
      let target = progress(), current = target, last = target, boost = 0;
      const onScroll = () => { target = progress(); };
      const onResize = () => { rendererInstance.setSize(window.innerWidth, window.innerHeight, false); uniforms.uRes.value.set(window.innerWidth, window.innerHeight); };
      const onVisibility = () => { if (!document.hidden && !animationFrame && !staticMode) animationFrame = requestAnimationFrame(frame); };
      const render = (time: number) => {
        const p = staticMode ? 0 : current;
        const position = p * (N - 1); let index = Math.min(N - 2, Math.max(0, Math.floor(position))); const frac = staticMode ? 0 : Math.min(1, Math.max(0, position - index));
        const a = textureSlots[index] ?? textureSlots[0]; const b = staticMode ? a : (textureSlots[index + 1] ?? a);
        if (!a || !b) return;
        uniforms.uTexA.value = a; uniforms.uTexB.value = b; uniforms.uBlend.value = textureSlots[index + 1] ? frac : 0;
        const da = dims[index] ?? dims[0] ?? [1, 1]; const db = dims[index + 1] ?? da; uniforms.uTexResA.value.set(da[0], da[1]); uniforms.uTexResB.value.set(db[0], db[1]);
        const es = frac * frac * (3 - 2 * frac); const trans = Math.sin(Math.PI * frac); const tt = time * .001;
        const pan = .05; uniforms.uPan.value.set(Math.cos(index * 2.399) * pan * (1 - es) + Math.cos((index + 1) * 2.399) * pan * es + Math.sin(tt * .03 + index) * pan * .3, Math.sin(index * 1.71) * pan * (1 - es) + Math.sin((index + 1) * 1.71) * pan * es + Math.cos(tt * .025 + index) * pan * .3);
        uniforms.uZoom.value = 1.1 + .03 * Math.sin(tt * .05 + index) + trans * .18; uniforms.uAngle.value = trans * (2.5 * Math.PI / 180) * (index % 2 === 0 ? 1 : -1) + Math.sin(tt * .02 + index) * .003; uniforms.uFocus.value = staticMode ? 0 : trans * 1.3 + .06; uniforms.uPersp.value = .12 + trans * .1 + Math.sin(tt * .02 + index) * .01;
        rendererInstance.render(scene, camera);
      };
      const frame = (time: number) => {
        animationFrame = 0;
        if (disposed || document.hidden) return;
        current += (target - current) * (staticMode ? 1 : .06); boost = boost * .9 + Math.abs(current - last) * 7; last = current; uniforms.uScrollBoost.value = Math.min(boost, .6); render(time); animationFrame = requestAnimationFrame(frame);
      };
      window.addEventListener("scroll", onScroll); window.addEventListener("resize", onResize); document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVisibility); });
      void loadTexture(0).catch(signalError); if (!staticMode) PAINTING_TEXTURES.slice(1).forEach((_, index) => { window.setTimeout(() => { if (!disposed) void loadTexture(index + 1).catch(signalError); }, Math.min(index * 45, 360)); });
      if (staticMode) { const wait = window.setInterval(() => { if (textureSlots[0]) { window.clearInterval(wait); render(0); } }, 40); cleanups.push(() => window.clearInterval(wait)); } else animationFrame = requestAnimationFrame(frame);
      cleanups.push(() => { mesh.geometry.dispose(); material.dispose(); textures.forEach((texture) => texture.dispose()); rendererInstance.dispose(); rendererInstance.forceContextLoss(); });
    } catch { signalError(); }
  };
  void start();
  return () => { disposed = true; if (animationFrame) cancelAnimationFrame(animationFrame); cleanups.splice(0).forEach((cleanup) => cleanup()); renderer?.dispose(); };
}
