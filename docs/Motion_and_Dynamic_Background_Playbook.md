# Motion & Dynamic-Background Playbook

*Internal R&D — a portable reference for building reel-tier UI and dynamic backgrounds across future projects (and to inform Chroma Fairy's final hero background). Authored from live study of reference sites + Sean/ubernatural's reels. Copy into any repo; not CF-specific.*

---

## Why this exists
Our current backgrounds — avint's morphing sphere + reactive SS/SD launchers, and Chroma Fairy's scrolling-wave placeholder — are solid *starters*. The gap to "reel-tier" work (ubernatural.io, utsubo.com, the Awwwards/FWA tier) is not "more effects." It's a specific, learnable set of principles and a specific toolchain. This doc captures both so we stop starting cold.

## The reference set (what each teaches)
- **utsubo.com** — the high bar. A real-time **fluid/smoke simulation** (GPU) as the entire stage; a glowing **ring that morphs into a 3D orb** as the focal object; **hold-to-interact** (pointer perturbs the fluid); **audio** ("better with speakers on"); a **scroll-gated cinematic intro** (loader → fluid reveal → "Begin experience" gate → content). Pitch-black, monochrome, one warm accent. Immersive, slow, deliberate.
- **ubernatural.io** (Sean's studio) — a **Framer** one-page site. Signature = monochrome **project cards floating in parallax** on a black stage under bold display type ("We Design Fast"). Marketing-forward, fast, punchy. Good for the *composition + parallax* lesson, less for raw 3D.
- **Sean's reels** (Instagram/Dribbble, not live sites) — showcase experiments: a face-tracked **3D garage** (Three.js + camera/face tracking), a **particle-fountain "Stream"** hero, a **glowing-portal sailing** site, a **dappled-light editorial tea** shop. These are the "get more" targets — each is one transferable technique.

---

## Core principles (the transferable design language)
1. **Motion is the hero, not decoration.** The background *is* the brand moment. Content sits on top of a living stage.
2. **Cinematic pacing.** Sequence the entrance: loader → reveal → (optional gate) → experience. Let moments breathe; don't dump everything at once.
3. **A focal object that transforms.** utsubo's ring→orb; a portal; a sphere. One hero element that morphs/reacts gives the eye an anchor.
4. **Scroll is a timeline.** Reveals, pins, camera moves, and simulation state are choreographed to scroll progress — not autoplaying loops.
5. **Reactivity earns the "wow."** Mouse parallax, scroll velocity, pointer-hold perturbation, and (sometimes) audio-reactivity make it feel alive and personal.
6. **Restraint in palette, richness in motion.** Mostly monochrome (or one tight palette) + a single accent. The *motion* carries the richness; the color stays disciplined.
7. **Poetic microcopy + typographic confidence.** Big type, few words, evocative gating ("Begin experience," "becomes the journey"). The words frame the motion.
8. **Sound design (optional, high-impact).** Ambient audio + interaction SFX, always opt-in ("better with speakers on"), muted by default.

## The techniques & stack (how it's actually built)
- **Three.js / React Three Fiber** — real 3D scenes (geometry, camera, lighting). The jump from 2D canvas to *depth*.
- **GLSL shaders** — generative backgrounds: fluid/smoke sims (Navier–Stokes or curl-noise), gradient nebulae, displacement, metaballs. (CF already runs a fragment shader on the homepage — that's the seed to grow.)
- **GSAP + ScrollTrigger** — scroll choreography, pinning, timelines. The literal tell from the reels' comments was "Claude + GSAP." Add **Flip** for layout transitions.
- **Lenis** (or similar) — smooth/inertial scroll, which makes scroll-driven motion feel premium.
- **Postprocessing** — **bloom/glow**, chromatic aberration, vignette. This is a big part of the "cinematic" finish.
- **Spline** — fast 3D scenes when hand-coding Three isn't worth it (embed + interaction without the full pipeline).
- **Lottie / Rive** — crisp vector motion + interactive state machines for UI flourishes.
- **Howler.js** — ambient audio + interaction SFX, opt-in.
- **Framer** — for pure marketing microsites where speed > custom code (ubernatural's own site). Not for our products.

## Reusable motion primitives (the kit we build toward)
A library we prototype once and pull from. Each = a self-contained, art-directable, performance-guarded module:
1. **Fluid/smoke field** (utsubo-style) — GPU fluid sim; pointer/scroll perturbs it; palette-tintable.
2. **Particle flow-field** (Stream-style) — GPU particles following curl noise; fountains, drift, convergence.
3. **Shader gradient / nebula** — animated color field driven by time + mouse + scroll uniforms (CF's current bg is a v1 of this).
4. **Floating parallax cards** (ubernatural-style) — depth-layered elements drifting on mouse/scroll.
5. **Morphing focal orb / portal** — metaball/sphere that reacts and transforms; a scene anchor.
6. **Scroll-choreographed reveal sequence** — GSAP timeline pinning + revealing sections with camera/opacity/position.
7. **Cursor-reactive displacement** — image/texture warps toward the pointer (great for hero imagery).
8. **Dappled-light overlay** (tea-site) — soft animated light/leaf-shadow layer over content; organic, gentle.

## Production discipline (our edge over one-shot demos)
Sean's reels look incredible for 11 seconds. Ours have to survive real users — this is exactly where our layered method wins:
- **Performance budget.** GPU sims are heavy. Cap DPR, throttle to 60fps, pause when tab hidden / element off-screen.
- **Lazy-load the heavy scenes.** Don't block first paint; load the WebGL after the shell.
- **Mobile degradation.** Lower particle counts / simpler shader / static poster on small or low-power devices.
- **`prefers-reduced-motion`.** Always ship a calm fallback (static gradient or poster image).
- **Fallback image.** A beautiful still for no-WebGL / crawlers / OG.
- **Don't gate critical content** behind a heavy immersive intro on *product* surfaces (fine for a portfolio/hype brand; not for avint's app or a shop checkout).
- **Accessibility.** Keyboard paths, focus states, and content legibility over the motion never regress.

---

## How this maps to our projects
- **Chroma Fairy — final hero background** (near-term): *adopt the technique, not the mood.* utsubo is dark/hype; Sam's brand is elegant/organic/luminous. Translate: a **fluid/flow-field or dappled-light background whose color and texture are driven by Sam's actual paintings** (sample her canvases into the palette / as flow textures), soft and reactive to mouse + scroll, with a gentle focal motif (a light orb/portal echoing the fairy). Cream/teal/bronze, not black. This is the "omma-inspired + Sam's paintings merged" direction, leveled up from the wave placeholder — same intent, reel-tier execution, on-brand.
- **avint** — the sphere + launchers are a good base. Level up with: scroll choreography (GSAP) on the marketing pages, a subtle particle/data-flow motif (fits a "document intelligence" story), and bloom for finish. Keep it product-appropriate (no gated intro on the app).
- **Future projects** — start from the primitive kit + choose the art direction per brand. Hype/agency → dark fluid + gated intro; elegant/editorial → dappled light + soft reveals; tech/product → particle data-flow + restrained scroll motion.

## How we execute it (within our workflow — unchanged)
We do **not** adopt Sean's "one-shot it all in Claude" method — we ship products, not demo reels. Our loop holds:
1. **Direction + spec (me).** Pick the primitive + art direction for the brief; define palette, motion beats, interaction, perf budget.
2. **Live prototype (me).** Build the signature effect as a working prototype in Three.js/GSAP/shader (both Three and GSAP are available in our prototype tooling) so we *feel* it before committing — same loop as the notes drawer.
3. **Build brief → Codex.** Hand a clean spec; Codex implements in the real stack with the discipline checklist above.
4. **Review + loop.** Verify fit, performance, reduced-motion, mobile.

## UI/UX micro-interactions (the layer beyond backgrounds)
The background is the stage; these are the small, reactive details that make the whole thing feel expensive. Observed across the references + standard reel-tier patterns:
- **Custom cursor.** Replaces the default — a dot/ring that lerps toward the pointer, grows and labels on hover ("view", "drag", "hold"), morphs over interactive elements. Often `mix-blend-mode: difference` so it reads on any background. (Cheap: one div + `requestAnimationFrame` lerp.)
- **Magnetic buttons/links.** The control subtly pulls toward the cursor as you approach; label/icon offsets slightly. (GSAP `quickTo` on `pointermove`, released on leave.)
- **Hover reveals.** Underline-grow, gradient fill-sweep (our chroma idle→gradient is exactly this family), image desaturate→saturate + scale, card lift. Every interactive thing *responds*.
- **Inertial smooth scroll (Lenis).** The single biggest "feel" upgrade — eased momentum scrolling makes every scroll-driven effect read premium. Foundational, not optional, for this genre.
- **Scroll-triggered reveals.** Text/lines/images fade+rise, `clip-path` wipes, character-by-character text (GSAP SplitText), animated counters — staggered on entry via ScrollTrigger.
- **Accordion (FAQ).** Smooth height + icon rotate (`+ → ×`) + animated divider line — ubernatural's "Questions? / Answers." pattern.
- **Marquee / infinite ticker.** Words or logos scrolling horizontally, speed reacting to scroll velocity.
- **Parallax depth.** Layered elements drift at different rates on scroll/mouse (ubernatural's floating project cards).
- **Ceremonial entry.** "Begin experience," "hold to interact," "scroll to continue," "better with speakers on" (utsubo) — a deliberate, gated hand-off. Great for portfolio/hype; **skip on product surfaces**.
- **Animated line / waveform** (the "line wave next to contact" Andrew flagged). A flowing sine-line or audio-style waveform used as a living divider/accent near contact/footer — reacts to scroll, pointer, or audio. Free to build: animated SVG/canvas sine wave, or an audio-reactive waveform if sound is on. *(Note: I couldn't isolate the exact element in a static browser pass — cursor/motion don't screenshot — so this documents the pattern; point me at the exact section and I'll capture the specific one.)*
- **Form UX.** Dark minimal fields, floating labels, country-code selector, one confident submit; inline validation with motion.
- **Page transitions.** Overlay wipe or shared-element morph between routes (View Transitions API and/or GSAP), so navigation feels continuous.
- **Loader as a brand moment.** % counter → logo reveal → choreographed hand-off into the hero (both references do this).

*Honest limitation: cursor, hover, and motion states do not appear in screenshots. The above is documented from observed behavior + known technique; to study a specific micro-interaction precisely we inspect it live or screen-record it.*

## Tooling & cost (essentially all free)
Bottom line: **almost everything needed is free, open-source, and drops straight into our Next.js/Vercel stack.** No new paid service is required.
- **Free core kit (MIT / open-source, npm):** Three.js · React Three Fiber · drei · GLSL shaders (just code) · **GSAP + ScrollTrigger** (ScrollTrigger always free; GSAP went fully free incl. former paid plugins in 2025) · **Lenis** (smooth scroll) · **postprocessing** (bloom/glow) · **Howler.js** (opt-in audio).
- **The utsubo-style fluid, specifically:** **Pavel Dobryakov's WebGL-Fluid-Simulation** (GitHub, MIT) — the exact smoke/fluid effect, free to adapt.
- **Free assets:** LottieFiles (Lotties) · Poly Haven (HDRIs/textures for 3D lighting) · Freesound (ambient audio) · Google Fonts.
- **Paid tools we can AVOID:** **Framer** (ubernatural uses it — paid; we don't need it, we build in code) · **Spline** (freemium; hand-code Three or use free tier) · **Rive / After Effects** for vector motion (Rive free tier + free Lottie libraries; no After Effects needed).
- **The real cost isn't money — it's skill + iteration + a performance budget.** Shaders/physics are visual and iterative; you can't spec them blind. Codex *can* build all of this (it's code) — the gate is visual tuning, which is why the loop is **I prototype the effect to nail the feel → Codex integrates → we guard performance**.

## Backlog / next actions
- Prototype **primitive #1 (fluid field)** and **#8 (dappled light)** as the two candidates for CF's final BG — tinted from Sam's paintings — so we can pick live.
- Capture the **exact contact-section line-wave** (and a proper hover/cursor micro-interaction pass) once we know which site/section hosts it.
- Stand up a tiny **prototype kit repo/folder** so primitives are reusable across projects.
- Decide CF BG art direction (fluid vs dappled vs hybrid) once we've felt both.

*Sources studied: utsubo.com (live, in-browser), ubernatural.io (live, in-browser), Sean "UX Designer" reels (screenshots).*
