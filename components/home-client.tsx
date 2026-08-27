"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnimatedFairy from "./animated-fairy";
import HomeShopPreview, { type HomeShopPreviewItem } from "./home-shop-preview";
import InquiryForm from "./inquiry-form";
import { PAINTING_TEXTURES, isPaintingBackgroundVariant, type PaintingBackgroundVariant } from "./backgrounds/painting-textures";

type HomeClientProps = {
  styles: string;
  markup: string;
  shopPreview: HomeShopPreviewItem[];
};

const PAINTING_FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexA,uTexB; uniform vec2 uTexResA,uTexResB,uRes;
  uniform float uTime,uBlend,uDissolve,uZoom,uShadow,uAmp,uBright,uTopExtend;
  float lum(vec3 c){ return dot(c,vec3(0.299,0.587,0.114)); }
  vec2 coverUV(vec2 uv, vec2 tr){ vec2 r=vec2(min((uRes.x/uRes.y)/(tr.x/tr.y),1.0),min((uRes.y/uRes.x)/(tr.y/tr.x),1.0));
    return (uv-0.5)/uZoom*r+0.5; }
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p),uu=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),uu.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),uu.x),uu.y); }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*noise(p);p*=2.02;a*=0.5;} return v; }
  float mir(float x){ x=abs(x); if(x>1.0) x=2.0-x; return clamp(x,0.001,0.999); }
  vec3 sp(sampler2D t, vec2 uv){ return texture2D(t, vec2(mir(uv.x),mir(uv.y))).rgb; }
  vec3 living(sampler2D tex, vec2 tr){
    vec2 base=coverUV(vUv,tr);
    float t=uTime*0.05*max(uAmp,0.001);
    vec2 warp=(vec2(fbm(base*3.0+t),fbm(base*3.0+vec2(4.7,2.1)-t))-0.5)*0.03*uAmp;
    vec2 uv=base+warp;
    float e=1.5/max(uRes.x,uRes.y);
    float gx=lum(sp(tex,uv+vec2(e,0.0)))-lum(sp(tex,uv-vec2(e,0.0)));
    float gy=lum(sp(tex,uv+vec2(0.0,e)))-lum(sp(tex,uv-vec2(0.0,e)));
    vec2 flow=vec2(-gy,gx); float fl=length(flow); flow=fl>1e-4?flow/fl:vec2(0.0);
    vec2 drift=vec2(fbm(base*2.0-t*0.5),fbm(base*2.0+vec2(9.1,3.3)+t*0.5))-0.5;
    flow=normalize(flow+drift*0.8+1e-5);
    float speed=0.10*uAmp, scale=0.05; float tt=uTime*speed;
    return mix(sp(tex,uv-flow*fract(tt)*scale), sp(tex,uv-flow*fract(tt+0.5)*scale), abs(1.0-2.0*fract(tt)));
  }
  vec3 finish(vec3 col){
    col=(col-0.5)*1.06+0.5; float l=lum(col); col=mix(vec3(l),col,1.14); col*=uBright;
    float dCenter=1.0-smoothstep(0.0,0.55,abs(vUv.y-0.5));
    float dTop=smoothstep(0.40,1.0,vUv.y);
    float shade=max(dCenter,dTop*uTopExtend);
    float scrim=mix(1.0,0.5,shade);
    col*=mix(1.0,scrim,uShadow);
    return col;
  }
  void main(){
    float blend=clamp(uBlend,0.0,1.0);
    vec3 col;
    // Evaluate only the visible painting at settled endpoints; both are evaluated during a morph.
    if(blend<=0.001) col=finish(living(uTexA,uTexResA));
    else if(blend>=0.999) col=finish(living(uTexB,uTexResB));
    else {
      vec3 a=living(uTexA,uTexResA); vec3 b=living(uTexB,uTexResB);
      float n=fbm(vUv*3.2 + uTime*0.04);
      float w=max(uDissolve,0.001);
      float m=smoothstep(0.0,1.0, clamp((blend*(1.0+w) - w*0.5) + (n-0.5)*w, 0.0, 1.0));
      col=finish(mix(a,b,m));
    }
    gl_FragColor=vec4(col,1.0);
  }`;

export default function HomeClient({ styles, markup, shopPreview }: HomeClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [backgroundMount, setBackgroundMount] = useState<HTMLElement | null>(null);
  const [fairyMount, setFairyMount] = useState<HTMLElement | null>(null);
  const [commissionMount, setCommissionMount] = useState<HTMLElement | null>(null);
  const [shopPreviewMount, setShopPreviewMount] = useState<HTMLElement | null>(null);
  const backgroundVariantRef = useRef<PaintingBackgroundVariant | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setBackgroundMount(document.getElementById("global-background-layer"));
    setFairyMount(root.querySelector<HTMLElement>("#animated-fairy-mount"));
    setCommissionMount(root.querySelector<HTMLElement>("#commission-form-mount"));
    setShopPreviewMount(root.querySelector<HTMLElement>("#shop-preview-mount"));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const deferredMedia = [
      ...Array.from(root.querySelectorAll<HTMLImageElement>("img[data-src]")),
      ...Array.from(root.querySelectorAll<HTMLVideoElement>("video[data-poster]")),
    ];
    if (!deferredMedia.length) return;
    const loadMedia = (element: HTMLImageElement | HTMLVideoElement) => {
      if (element instanceof HTMLImageElement) {
        const src = element.dataset.src;
        if (src) element.src = src;
        element.closest<HTMLElement>("[data-deferred-footer]")?.classList.add("is-shimmer-ready");
        return;
      }
      const poster = element.dataset.poster;
      if (!poster) return;
      element.poster = poster;
      element.preload = "metadata";
    };
    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = window.setTimeout(() => deferredMedia.forEach(loadMedia), 4000);
      return () => window.clearTimeout(fallbackTimer);
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        loadMedia(entry.target as HTMLImageElement | HTMLVideoElement);
      });
    }, { rootMargin: "480px 0px" });
    deferredMedia.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [markup]);

  useEffect(() => {
    const root = rootRef.current;
    const header = root?.querySelector<HTMLElement>("#hdr");
    const toggle = root?.querySelector<HTMLButtonElement>("#home-menu-toggle");
    const nav = root?.querySelector<HTMLElement>("#home-nav");
    if (!root || !header || !toggle || !nav) return;

    const setOpen = (open: boolean) => {
      header.classList.toggle("open", open);
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    const onToggle = (event: MouseEvent) => {
      event.stopPropagation();
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    };
    const onNavClick = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a");
      if (!anchor) return;

      setOpen(false);
      const href = anchor.getAttribute("href");
      if (!href?.startsWith("#")) return;

      window.dispatchEvent(new CustomEvent("cf-audio-effect", { detail: { name: "whoosh", volume: 0.1 } }));

      const target = root.querySelector<HTMLElement>(href);
      if (!target) return;

      event.preventDefault();
      const alignment: Record<string, "start" | "center"> = {
        "#collections": "center",
        "#exhibitions": "start",
        "#press": "center",
        "#gallery": "start",
        "#commission": "center",
        "#about": "center",
        "#contact": "center",
      };
      const headerHeight = header.getBoundingClientRect().height;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const targetHeight = target.getBoundingClientRect().height;
      const canCenter = targetHeight <= window.innerHeight - headerHeight;
      const destination = alignment[href] === "center" && canCenter
        ? Math.max(0, targetTop - Math.max(headerHeight, (window.innerHeight - targetHeight) / 2))
        : Math.max(0, targetTop - headerHeight);
      const start = window.scrollY;
      const distance = destination - start;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion || Math.abs(distance) < 2) {
        window.scrollTo({ top: destination, behavior: "auto" });
        window.history.pushState(null, "", href);
        return;
      }

      const duration = Math.min(900, Math.max(450, Math.abs(distance) * 0.28));
      const startedAt = performance.now();
      if (activeScrollFrame) window.cancelAnimationFrame(activeScrollFrame);
      const animateScroll = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = (1 - Math.cos(Math.PI * progress)) / 2;
        window.scrollTo({
          top: progress === 1 ? destination : start + distance * eased,
          behavior: "auto",
        });
        if (progress < 1) {
          activeScrollFrame = window.requestAnimationFrame(animateScroll);
        } else {
          activeScrollFrame = 0;
        }
      };
      activeScrollFrame = window.requestAnimationFrame(animateScroll);
      window.history.pushState(null, "", href);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    };
    const onOutsidePointer = (event: PointerEvent) => {
      if (!header.contains(event.target as Node)) setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 860) setOpen(false);
    };

    let activeScrollFrame = 0;

    toggle.addEventListener("click", onToggle);
    nav.addEventListener("click", onNavClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onOutsidePointer);
    window.addEventListener("resize", onResize);
    return () => {
      toggle.removeEventListener("click", onToggle);
      nav.removeEventListener("click", onNavClick);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onOutsidePointer);
      window.removeEventListener("resize", onResize);
      if (activeScrollFrame) window.cancelAnimationFrame(activeScrollFrame);
    };
  }, [markup]);

  useEffect(() => {
    const root = rootRef.current;
    const header = root?.querySelector<HTMLElement>("#hdr");
    if (!root || !header) return;

    const onScroll = () => header.classList.toggle("solid", window.scrollY > window.innerHeight * 0.7);
    onScroll();
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
    root.querySelectorAll<HTMLElement>("a, button:not(.menu-toggle)").forEach((element) => {
      if (element.classList.contains("btn")) {
        element.classList.add("chroma-cta");
        const label = document.createElement("span");
        label.className = "chroma-cta-label";
        while (element.firstChild) label.append(element.firstChild);
        element.append(label);
        element.addEventListener("click", onCtaClick);
      } else {
        element.classList.add("chroma-text");
      }
    });

    function onCtaClick() {
      window.dispatchEvent(new CustomEvent("cf-audio-effect", { detail: { name: "sparkle", volume: 0.08 } }));
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      root.querySelectorAll<HTMLElement>(".chroma-cta").forEach((element) => element.removeEventListener("click", onCtaClick));
    };
  }, [markup]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const instagram = () => {
      const win = window as Window & { instgrm?: { Embeds?: { process: () => void } } };
      if (win.instgrm?.Embeds) {
        win.instgrm.Embeds.process();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>("script[data-instagram-embed]");
      if (existing) {
        existing.addEventListener("load", () => win.instgrm?.Embeds?.process(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.instagram.com/embed.js";
      script.dataset.instagramEmbed = "true";
      script.addEventListener("load", () => win.instgrm?.Embeds?.process(), { once: true });
      document.body.appendChild(script);
    };

    const cleanups: Array<() => void> = [];
    const modalClosers = new Map<HTMLElement, () => void>();
    root.querySelectorAll<HTMLButtonElement>(".press-cover-trigger").forEach((trigger) => {
      const modalId = trigger.getAttribute("aria-controls");
      const modal = modalId ? root.querySelector<HTMLElement>(`#${CSS.escape(modalId)}`) : null;
      if (!modal) return;
      let previousFocus: HTMLElement | null = null;
      const open = () => {
        previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        if (trigger.classList.contains("press-instagram-trigger")) instagram();
      };
      const closeModal = () => {
        modal.hidden = true;
        document.body.style.overflow = "";
        previousFocus?.focus();
      };
      modalClosers.set(modal, closeModal);
      const onBackdrop = (event: MouseEvent) => {
        if (event.target === modal) closeModal();
      };
      trigger.addEventListener("click", open);
      modal.addEventListener("click", onBackdrop);
      cleanups.push(() => {
        trigger.removeEventListener("click", open);
        modal.removeEventListener("click", onBackdrop);
        modalClosers.delete(modal);
      });
    });

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      root.querySelectorAll<HTMLElement>(".press-modal:not([hidden])").forEach((modal) => modalClosers.get(modal)?.());
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [markup]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = backgroundMount?.querySelector<HTMLCanvasElement>("#art");
    const fallback = backgroundMount?.querySelector<HTMLElement>("#artFallback");
    if (!root || !canvas || !fallback) return;
    const signalBackgroundReady = () => window.dispatchEvent(new Event("cf-home-background-ready"));

    const paintingBgEnabled = !["0", "false", "off"].includes((process.env.NEXT_PUBLIC_PAINTING_BG ?? "1").toLowerCase());
    if (!backgroundVariantRef.current) {
      const queryVariant = new URLSearchParams(window.location.search).get("bg");
      const cookieLast = document.cookie.match(/(?:^|;\s*)cf_bg_last=([^;]+)/)?.[1] ?? null;
      const requested = paintingBgEnabled && isPaintingBackgroundVariant(queryVariant) ? queryVariant : null;
      const pool = (["v1", "v2", "v3"] as PaintingBackgroundVariant[]).filter((variant) => variant !== cookieLast);
      const chosen = requested ?? pool[Math.floor(Math.random() * pool.length)] ?? "v1";
      backgroundVariantRef.current = paintingBgEnabled ? chosen : "v1";
      document.cookie = `cf_bg_last=${backgroundVariantRef.current}; Max-Age=31536000; Path=/; SameSite=Lax`;
    }
    const selectedVariant = backgroundVariantRef.current;

    if (paintingBgEnabled && selectedVariant !== "v1") {
      let active = true;
      let cleanupVariant = () => {};
      const onVariantError = () => {
        canvas.style.opacity = "1";
        canvas.style.display = "none";
        fallback.style.display = "block";
        signalBackgroundReady();
      };
      window.addEventListener("cf-background-error", onVariantError);
      void (async () => {
        try {
          const backgroundModule = selectedVariant === "v2"
            ? await import("./backgrounds/omma-v2")
            : await import("./backgrounds/omma-v3");
          if (active) cleanupVariant = backgroundModule.init(canvas);
        } catch {
          onVariantError();
        }
      })();
      return () => {
        active = false;
        window.removeEventListener("cf-background-error", onVariantError);
        cleanupVariant();
      };
    }

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      fallback.style.display = "block";
      canvas.style.display = "none";
      signalBackgroundReady();
      return;
    }

    const usePaintingV1 = paintingBgEnabled && selectedVariant === "v1";
    const vs = paintingBgEnabled
      ? `attribute vec2 p; varying vec2 vUv; void main(){vUv=vec2(0.5)+p*0.5;gl_Position=vec4(p,0.,1.);}`
      : `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const oldFragmentShader = `
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
    const fs = usePaintingV1 ? PAINTING_FRAGMENT_SHADER : oldFragmentShader;

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
      signalBackgroundReady();
      return;
    }
    if (!paintingBgEnabled) signalBackgroundReady();

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    if (usePaintingV1) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const lowPower = Boolean(connection?.saveData);
      const holdStill = reducedMotion || lowPower;
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75);
      const paintingUniforms = {
        res: gl.getUniformLocation(program, "uRes"),
        time: gl.getUniformLocation(program, "uTime"),
        texA: gl.getUniformLocation(program, "uTexA"),
        texB: gl.getUniformLocation(program, "uTexB"),
        texResA: gl.getUniformLocation(program, "uTexResA"),
        texResB: gl.getUniformLocation(program, "uTexResB"),
        blend: gl.getUniformLocation(program, "uBlend"),
        dissolve: gl.getUniformLocation(program, "uDissolve"),
        zoom: gl.getUniformLocation(program, "uZoom"),
        shadow: gl.getUniformLocation(program, "uShadow"),
        amp: gl.getUniformLocation(program, "uAmp"),
        bright: gl.getUniformLocation(program, "uBright"),
        topExtend: gl.getUniformLocation(program, "uTopExtend"),
      };
      const sceneStopIds = ["home", "collections", "exhibitions", "press", "gallery", "commission", "shop-preview", "about", "contact"];
      const sceneStops = sceneStopIds
        .map((id, index) => ({ id, scene: index / Math.max(1, sceneStopIds.length - 1) }))
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
      const textures: Array<WebGLTexture | null> = new Array(PAINTING_TEXTURES.length).fill(null);
      const dimensions: Array<[number, number] | null> = new Array(PAINTING_TEXTURES.length).fill(null);
      let disposed = false;
      let firstTextureReady = false;

      const resize = () => {
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(paintingUniforms.res, canvas.clientWidth, canvas.clientHeight);
      };
      const uploadTexture = (image: HTMLImageElement, index: number) => {
        const texture = gl.createTexture();
        if (!texture) return false;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        textures[index] = texture;
        dimensions[index] = [image.naturalWidth, image.naturalHeight];
        return true;
      };
      const loadTexture = (index: number) => new Promise<boolean>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (disposed) { resolve(false); return; }
          resolve(uploadTexture(image, index));
        };
        image.onerror = () => { signalBackgroundReady(); resolve(false); };
        image.src = PAINTING_TEXTURES[index];
      });
      const showFirstTexture = (ready: boolean) => {
        if (!ready || disposed || firstTextureReady) {
          if (!ready && !disposed) signalBackgroundReady();
          return;
        }
        firstTextureReady = true;
        canvas.style.opacity = "1";
        signalBackgroundReady();
      };
      canvas.style.opacity = "0";
      canvas.style.transition = "opacity 500ms ease";
      fallback.style.display = "none";
      resize();
      window.addEventListener("resize", resize);

      let currentScroll = 0;
      let currentTopExtend = 1;
      let frameId = 0;
      const startedAt = performance.now();
      const frame = (now: number) => {
        if (disposed || document.hidden) { frameId = 0; return; }
        const target = sceneValue();
        currentScroll += (target - currentScroll) * (holdStill ? 1 : 0.06);
        const vh = Math.max(1, window.innerHeight);
        const rawTopExtend = 1 - (window.scrollY / vh) / 0.9;
        const targetTopExtend = Math.min(1, Math.max(0, rawTopExtend));
        currentTopExtend += (targetTopExtend - currentTopExtend) * (holdStill ? 1 : 0.06);
        const position = holdStill ? 0 : currentScroll * (PAINTING_TEXTURES.length - 1);
        let index = Math.floor(position);
        if (index >= PAINTING_TEXTURES.length - 1) index = PAINTING_TEXTURES.length - 2;
        if (index < 0) index = 0;
        const blend = holdStill ? 0 : Math.min(1, Math.max(0, position - index));
        const textureA = textures[index] ?? textures[0];
        const textureB = holdStill ? textureA : (textures[index + 1] ?? textureA);
        const blendReady = textureB && textures[index + 1] ? blend : 0;
        if (textureA && textureB) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textureA);
          gl.uniform1i(paintingUniforms.texA, 0);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, textureB);
          gl.uniform1i(paintingUniforms.texB, 1);
          const dimA = dimensions[index] ?? dimensions[0] ?? [1, 1];
          const dimB = dimensions[index + 1] ?? dimA;
          gl.uniform2f(paintingUniforms.texResA, dimA[0], dimA[1]);
          gl.uniform2f(paintingUniforms.texResB, dimB[0], dimB[1]);
          gl.uniform1f(paintingUniforms.blend, blendReady);
          gl.uniform1f(paintingUniforms.time, (now - startedAt) / 1000);
          gl.uniform1f(paintingUniforms.dissolve, 0.55);
          gl.uniform1f(paintingUniforms.zoom, 1.06);
          gl.uniform1f(paintingUniforms.shadow, 1.0);
          gl.uniform1f(paintingUniforms.amp, holdStill ? 0 : 1.5);
          gl.uniform1f(paintingUniforms.bright, 1.5);
          gl.uniform1f(paintingUniforms.topExtend, currentTopExtend);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        frameId = window.requestAnimationFrame(frame);
      };
      const onVisibilityChange = () => {
        if (!document.hidden && !frameId) frameId = window.requestAnimationFrame(frame);
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      frameId = window.requestAnimationFrame(frame);

      void loadTexture(0).then(showFirstTexture);
      if (!holdStill) {
        window.setTimeout(() => {
          PAINTING_TEXTURES.slice(1).forEach((_, offset) => {
            window.setTimeout(() => { if (!disposed) void loadTexture(offset + 1); }, Math.min(offset * 45, 360));
          });
        }, 0);
      }

      return () => {
        disposed = true;
        if (frameId) window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        textures.forEach((texture) => { if (texture) gl.deleteTexture(texture); });
        gl.deleteProgram(program);
      };
    }

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

    const sceneStopIds = ["home", "collections", "exhibitions", "press", "gallery", "commission", "shop-preview", "about", "contact"];
    const sceneStops = sceneStopIds
      .map((id, index) => ({ id, scene: index / Math.max(1, sceneStopIds.length - 1) }))
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
      currentScroll += (sceneValue() - currentScroll) * 0.04;
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, (now - start) / 1000);
      gl.uniform1f(uniforms.scroll, currentScroll);
      gl.uniform2f(uniforms.mouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frameId = requestAnimationFrame(frame);
    };
    frame(start);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      gl.deleteProgram(program);
    };
  }, [backgroundMount]);

  return (
    <div className="home-shell" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {backgroundMount ? createPortal(<><canvas id="art" /><div id="artFallback" /></>, backgroundMount) : null}
      {fairyMount ? createPortal(<AnimatedFairy />, fairyMount) : null}
      {commissionMount ? createPortal(<InquiryForm kind="commission" />, commissionMount) : null}
      {shopPreviewMount && shopPreview.length ? createPortal(<HomeShopPreview items={shopPreview} />, shopPreviewMount) : null}
    </div>
  );
}
