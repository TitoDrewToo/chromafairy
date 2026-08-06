"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnimatedFairy from "./animated-fairy";
import InquiryForm from "./inquiry-form";

type HomeClientProps = {
  styles: string;
  markup: string;
};

export default function HomeClient({ styles, markup }: HomeClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [backgroundMount, setBackgroundMount] = useState<HTMLElement | null>(null);
  const [fairyMount, setFairyMount] = useState<HTMLElement | null>(null);
  const [commissionMount, setCommissionMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setBackgroundMount(document.getElementById("global-background-layer"));
    setFairyMount(root.querySelector<HTMLElement>("#animated-fairy-mount"));
    setCommissionMount(root.querySelector<HTMLElement>("#commission-form-mount"));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = backgroundMount?.querySelector<HTMLCanvasElement>("#art");
    const fallback = backgroundMount?.querySelector<HTMLElement>("#artFallback");
    if (!root || !canvas || !fallback) return;

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      fallback.style.display = "block";
      canvas.style.display = "none";
      return;
    }

    const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fs = `
  precision highp float;
  uniform vec2 u_res; uniform float u_time; uniform float u_scroll; uniform vec2 u_mouse;

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}

  vec2 seedScene(int i){
    if(i==0)return vec2(0.0,0.0);
    if(i==1)return vec2(11.0,4.0);
    if(i==2)return vec2(3.0,17.0);
    if(i==3)return vec2(23.0,7.0);
    return vec2(8.0,29.0);
  }
  vec3 palAt(vec3 d,vec3 m,vec3 l,float f){
    vec3 c=mix(d,m,smoothstep(0.12,0.55,f));
    c=mix(c,l,smoothstep(0.55,0.92,f));
    return c;
  }
  vec3 palScene(int i,float f){
    if(i==0)return palAt(vec3(0.03,0.15,0.24),vec3(0.12,0.56,0.64),vec3(0.60,0.87,0.89),f);
    if(i==1)return palAt(vec3(0.02,0.06,0.20),vec3(0.10,0.22,0.70),vec3(0.78,0.86,1.00),f);
    if(i==2)return palAt(vec3(0.05,0.18,0.26),vec3(0.30,0.62,0.70),vec3(0.93,0.98,0.98),f);
    if(i==3)return palAt(vec3(0.14,0.03,0.05),vec3(0.72,0.30,0.10),vec3(0.92,0.74,0.36),f);
    return palAt(vec3(0.05,0.20,0.07),vec3(0.42,0.62,0.12),vec3(0.97,0.91,0.34),f);
  }

  void main(){
    vec2 uv=gl_FragCoord.xy/u_res.xy;
    vec2 p=uv; p.x*=u_res.x/u_res.y;
    float t=u_time*0.035;
    float scene=u_scroll*4.0;

    p+=(u_mouse-0.5)*0.22;
    p.y-=u_scroll*0.4;

    vec2 seed=vec2(0.0); float sw=0.0;
    for(int i=0;i<5;i++){float w=max(0.0,1.0-abs(scene-float(i)));seed+=w*seedScene(i);sw+=w;}
    seed/=sw;
    vec2 q=vec2(fbm(p+seed+t),fbm(p+seed+vec2(5.2,1.3)-t));
    vec2 r=vec2(fbm(p+seed+4.0*q+vec2(1.7,9.2)+t*0.7),fbm(p+seed+4.0*q+vec2(8.3,2.8)-t*0.6));
    float f=fbm(p+seed+4.0*r);

    vec3 col=vec3(0.0);
    for(int i=0;i<5;i++){float w=max(0.0,1.0-abs(scene-float(i)))/sw;col+=w*palScene(i,f);}
    col=mix(col,vec3(0.96,0.98,0.97),smoothstep(0.86,1.02,f)*0.55);
    float vig=smoothstep(1.3,0.2,length(uv-0.5));
    col*=0.72+0.42*vig; col+=f*f*0.05;
    gl_FragColor=vec4(col,1.0);
  }`;

    const shader = (type: number, source: string) => {
      const result = gl.createShader(type);
      if (!result) return null;
      gl.shaderSource(result, source);
      gl.compileShader(result);
      return result;
    };

    const program = gl.createProgram();
    const vertexShader = shader(gl.VERTEX_SHADER, vs);
    const fragmentShader = shader(gl.FRAGMENT_SHADER, fs);
    if (!program || !vertexShader || !fragmentShader) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fallback.style.display = "block";
      canvas.style.display = "none";
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {
      res: gl.getUniformLocation(program, "u_res"),
      time: gl.getUniformLocation(program, "u_time"),
      scroll: gl.getUniformLocation(program, "u_scroll"),
      mouse: gl.getUniformLocation(program, "u_mouse"),
    };

    let mouse: [number, number] = [0.5, 0.5];
    let currentScroll = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const onMouseMove = (event: MouseEvent) => {
      mouse = [event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight];
    };
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    resize();

    const sceneStops = [
      { id: "home", scene: 0.0 },
      { id: "collections", scene: 0.7 },
      { id: "exhibitions", scene: 1.4 },
      { id: "gallery", scene: 2.2 },
      { id: "commission", scene: 2.9 },
      { id: "press", scene: 3.4 },
      { id: "about", scene: 3.7 },
      { id: "contact", scene: 4.0 },
    ]
      .map((stop) => ({ el: root.querySelector<HTMLElement>(`#${stop.id}`), scene: stop.scene }))
      .filter((stop): stop is { el: HTMLElement; scene: number } => Boolean(stop.el));

    const sceneValue = () => {
      const probe = window.scrollY + window.innerHeight * 0.5;
      const points = sceneStops.map((stop) => {
        const rect = stop.el.getBoundingClientRect();
        return { center: rect.top + window.scrollY + rect.height * 0.5, scene: stop.scene };
      });
      if (probe <= points[0].center) return points[0].scene;
      for (let i = 0; i < points.length - 1; i += 1) {
        if (probe >= points[i].center && probe <= points[i + 1].center) {
          const ratio = (probe - points[i].center) / ((points[i + 1].center - points[i].center) || 1);
          return points[i].scene + (points[i + 1].scene - points[i].scene) * ratio;
        }
      }
      return points[points.length - 1].scene;
    };

    let frameId = 0;
    const start = performance.now();
    const frame = (now: number) => {
      currentScroll += (sceneValue() / 4 - currentScroll) * 0.04;
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, (now - start) / 1000);
      gl.uniform1f(uniforms.scroll, currentScroll);
      gl.uniform2f(uniforms.mouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frameId = requestAnimationFrame(frame);
    };
    frame(start);

    const header = root.querySelector<HTMLElement>("#hdr");
    const onScroll = () => header?.classList.toggle("solid", window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.14 },
    );
    root.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    root.querySelectorAll<HTMLElement>("a, button").forEach((element) => {
      if (element.classList.contains("btn")) {
        element.classList.add("chroma-cta");
        const label = document.createElement("span");
        label.className = "chroma-cta-label";
        while (element.firstChild) label.append(element.firstChild);
        element.append(label);
      } else {
        element.classList.add("chroma-text");
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [backgroundMount]);

  return (
    <div className="home-shell" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {backgroundMount ? createPortal(<><canvas id="art" /><div id="artFallback" /></>, backgroundMount) : null}
      {fairyMount ? createPortal(<AnimatedFairy />, fairyMount) : null}
      {commissionMount ? createPortal(<InquiryForm kind="commission" />, commissionMount) : null}
    </div>
  );
}
