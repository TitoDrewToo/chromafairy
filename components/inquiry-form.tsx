"use client";

import { FormEvent, useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { submitInquiry } from "../app/actions/inquiries";
import { validateInquiry, type InquiryFormValues } from "../lib/inquiry";

type PieceInquiryFormProps = {
  kind: "piece";
  workId: string;
  workTitle: string;
};

type CommissionInquiryFormProps = {
  kind: "commission";
};

type InquiryFormProps = PieceInquiryFormProps | CommissionInquiryFormProps;

const initialValues: InquiryFormValues = { name: "", email: "", phone: "", message: "" };

type DustFieldSharedProps = {
  value: string;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  className?: string;
};

type DustFieldProps =
  | (DustFieldSharedProps & Omit<InputHTMLAttributes<HTMLInputElement>, keyof DustFieldSharedProps> & { as?: "input" })
  | (DustFieldSharedProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof DustFieldSharedProps> & { as: "textarea" });

function DustPlaceholderField({ as = "input", placeholder, value, onChange, className, ...props }: DustFieldProps) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type Particle = {
      homeX: number;
      homeY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      turbulence: number;
      color: number[];
      delay: number;
      alpha: number;
    };

    const placeholderColor = [138, 148, 160];
    const shimmerColors = [[185, 150, 83], [63, 125, 134], [212, 196, 168]];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isTextarea = as === "textarea";
    let particles: Particle[] = [];
    let state: "idle" | "dusting" | "gone" | "restoring" = "idle";
    let frame = 0;
    let restoreAfterDust = false;
    let disposed = false;

    const metrics = () => {
      const style = window.getComputedStyle(field);
      const fontSize = Number.parseFloat(style.fontSize) || 14;
      const lineHeight = style.lineHeight === "normal" ? fontSize * 1.2 : Number.parseFloat(style.lineHeight) || fontSize * 1.2;
      return {
        width: field.clientWidth,
        height: field.clientHeight,
        padX: Number.parseFloat(style.paddingLeft) || 16,
        padY: Number.parseFloat(style.paddingTop) || 14,
        font: style.font,
        lineHeight,
      };
    };

    const drawText = (alpha: number) => {
      const { width, height, padX, padY, font, lineHeight } = metrics();
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = alpha;
      context.font = font;
      context.textBaseline = "top";
      context.fillStyle = `rgb(${placeholderColor.join(",")})`;
      context.fillText(placeholder, padX, isTextarea ? padY : (height - lineHeight) / 2);
      context.globalAlpha = 1;
    };

    const build = () => {
      const { width, height, font } = metrics();
      if (!width || !height) return;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.font = font;
      context.textBaseline = "top";
      const { padX, padY, lineHeight } = metrics();
      context.fillStyle = `rgb(${placeholderColor.join(",")})`;
      context.fillText(placeholder, padX, isTextarea ? padY : (height - lineHeight) / 2);
      const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
      particles = [];
      const step = 2;
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          if (image[(y * canvas.width + x) * 4 + 3] > 110) {
            const homeX = x / dpr;
            const homeY = y / dpr;
            particles.push({
              homeX,
              homeY,
              x: homeX,
              y: homeY,
              vx: 0.25 + Math.random() * 1.1,
              vy: -(0.15 + Math.random() * 0.5),
              turbulence: Math.random() * Math.PI * 2,
              color: Math.random() < 0.5 ? placeholderColor : shimmerColors[(Math.random() * shimmerColors.length) | 0],
              delay: (homeX / width) * 260 + Math.random() * 90,
              alpha: 1,
            });
          }
        }
      }
      if (state === "idle") drawText(1);
    };

    const resetParticles = () => {
      for (const particle of particles) {
        particle.x = particle.homeX;
        particle.y = particle.homeY;
        particle.alpha = 1;
        particle.vx = 0.25 + Math.random() * 1.1;
        particle.vy = -(0.15 + Math.random() * 0.5);
        particle.turbulence = Math.random() * Math.PI * 2;
      }
    };

    const animateDust = (started: number) => {
      const { width, height } = metrics();
      const elapsed = performance.now() - started;
      context.clearRect(0, 0, width, height);
      let alive = false;
      for (const particle of particles) {
        if (elapsed < particle.delay) {
          context.globalAlpha = 1;
          context.fillStyle = `rgb(${placeholderColor.join(",")})`;
          context.fillRect(particle.homeX, particle.homeY, 1.6, 1.6);
          alive = true;
          continue;
        }
        const life = (elapsed - particle.delay) / 900;
        if (life >= 1) continue;
        alive = true;
        particle.turbulence += 0.15;
        particle.x += particle.vx + Math.sin(particle.turbulence) * 0.35;
        particle.y += particle.vy;
        particle.vy -= 0.012;
        particle.alpha = 1 - life;
        context.globalAlpha = Math.max(0, particle.alpha);
        context.fillStyle = `rgb(${particle.color.join(",")})`;
        const size = 1.4 + life * 1.2;
        context.fillRect(particle.x, particle.y, size, size);
      }
      context.globalAlpha = 1;
      if (alive) {
        frame = requestAnimationFrame(() => animateDust(started));
      } else {
        state = "gone";
        context.clearRect(0, 0, width, height);
        if (restoreAfterDust && field.value === "") restore();
      }
    };

    const dust = () => {
      if (state !== "idle") return;
      state = "dusting";
      restoreAfterDust = false;
      resetParticles();
      frame = requestAnimationFrame(() => animateDust(performance.now()));
    };

    const restore = () => {
      if (state !== "gone") return;
      state = "restoring";
      const started = performance.now();
      const finish = () => {
        const progress = Math.min(1, (performance.now() - started) / 380);
        drawText(progress);
        if (progress < 1) frame = requestAnimationFrame(finish);
        else state = "idle";
      };
      frame = requestAnimationFrame(finish);
    };

    const onFocus = () => dust();
    const onBlur = () => {
      if (field.value !== "") return;
      if (state === "gone") restore();
      else if (state === "dusting") restoreAfterDust = true;
    };
    const onInput = () => {
      if (field.value !== "" && state === "idle") dust();
    };
    const resizeObserver = new ResizeObserver(() => {
      if (state === "idle" || state === "gone") {
        build();
        if (state === "gone") context.clearRect(0, 0, field.clientWidth, field.clientHeight);
      }
    });
    const fontReady = document.fonts?.ready.then(() => {
      if (!disposed) build();
    });

    field.addEventListener("focus", onFocus);
    field.addEventListener("blur", onBlur);
    field.addEventListener("input", onInput);
    resizeObserver.observe(field);
    setEnhanced(true);
    build();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      field.removeEventListener("focus", onFocus);
      field.removeEventListener("blur", onBlur);
      field.removeEventListener("input", onInput);
      void fontReady;
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [as, placeholder]);

  const fieldClassName = `inquiry-dust-input${enhanced ? " is-enhanced" : ""}${className ? ` ${className}` : ""}`;
  if (as === "textarea") {
    return <span className="inquiry-dust-field"><textarea {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} ref={fieldRef as React.RefObject<HTMLTextAreaElement>} className={fieldClassName} placeholder={placeholder} value={value} onChange={onChange} /><canvas ref={canvasRef} aria-hidden="true" className="inquiry-dust-placeholder" /></span>;
  }
  return <span className="inquiry-dust-field"><input {...(props as InputHTMLAttributes<HTMLInputElement>)} ref={fieldRef as React.RefObject<HTMLInputElement>} className={fieldClassName} placeholder={placeholder} value={value} onChange={onChange} /><canvas ref={canvasRef} aria-hidden="true" className="inquiry-dust-placeholder" /></span>;
}

export default function InquiryForm(props: InquiryFormProps) {
  const [values, setValues] = useState(initialValues);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());
  const isPiece = props.kind === "piece";

  const update = (field: keyof InquiryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (status === "error") setStatus("idle");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (honeypot || Date.now() - startedAt < 1200) {
      setStatus("success");
      return;
    }

    const validationError = validateInquiry(values, !isPiece);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError("");
    const result = await submitInquiry({ kind: props.kind, workId: isPiece ? props.workId : undefined, name: values.name, email: values.email, phone: values.phone, message: values.message, honeypot, startedAt });
    if (!result.ok) {
      setError(result.error ?? "We couldn’t send that just now. Please try again.");
      setStatus("error");
      return;
    }
    setStatus("success");
    setValues(initialValues);
  }

  if (status === "success") {
    return <p className={isPiece ? "inquiry-success shop-inquiry-success" : "inquiry-success home-inquiry-success"}>Thank you — Samantha will be in touch.</p>;
  }

  return (
    <form className={isPiece ? "shop-inquiry-form" : "home-inquiry-form"} onSubmit={submit} noValidate>
      <input
        aria-hidden="true"
        autoComplete="off"
        className="inquiry-honeypot"
        name="website"
        tabIndex={-1}
        type="text"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
      />
      <DustPlaceholderField aria-label="Your name" name="name" placeholder="Your name *" required value={values.name} onChange={(event) => update("name", event.target.value)} />
      <DustPlaceholderField aria-label="Email" autoComplete="email" name="email" placeholder="Email *" required type="email" value={values.email} onChange={(event) => update("email", event.target.value)} />
      <DustPlaceholderField aria-label="Phone (optional)" autoComplete="tel" name="phone" placeholder="Phone (optional)" type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} />
      <DustPlaceholderField as="textarea" aria-label="Message" name="message" placeholder={isPiece ? "Tell Samantha what you’d like to know…" : "Tell Samantha about your project… *"} required={!isPiece} value={values.message} onChange={(event) => update("message", event.target.value)} />
      {error && <p className="inquiry-error" role="alert">{error}</p>}
      <div className="inquiry-submit-meta">
        <p className="inquiry-required"><span aria-hidden="true">✶</span> Required fields</p>
        <p className="inquiry-disclosure">Your name, email, and note stay with the studio so Samantha can write back — never shared, never sold.</p>
      </div>
      <button className={isPiece ? "shop-inquire inquiry-chroma-button" : "btn chroma-cta"} disabled={status === "sending"} type="submit">
        <span className={isPiece ? "inquiry-chroma-label" : "chroma-cta-label"}>{status === "sending" ? "Sending…" : isPiece ? "Send inquiry" : "Send message"}</span>
      </button>
    </form>
  );
}
