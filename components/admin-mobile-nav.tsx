"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 860;

export default function AdminMobileNav() {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".admin-shell");
    const sidebar = document.getElementById("admin-sidebar");
    const nav = document.getElementById("admin-sidebar-nav");
    const toggle = toggleRef.current;
    if (!shell || !sidebar || !nav || !toggle) return;

    const setDrawerOpen = (nextOpen: boolean, returnFocus = false) => {
      setOpen(nextOpen);
      shell.classList.toggle("nav-open", nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      if (window.innerWidth <= MOBILE_BREAKPOINT) sidebar.setAttribute("aria-hidden", String(!nextOpen));
      else sidebar.removeAttribute("aria-hidden");
      if (nextOpen) {
        window.requestAnimationFrame(() => nav.querySelector<HTMLElement>("a")?.focus());
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    const onToggle = () => setDrawerOpen(!open, open);
    const onNavClick = (event: MouseEvent) => {
      if ((event.target as Element).closest("a")) setDrawerOpen(false, true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (open && !sidebar.contains(event.target as Node) && !toggle.contains(event.target as Node)) {
        setDrawerOpen(false, true);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setDrawerOpen(false, true);
      }
    };
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        sidebar.removeAttribute("aria-hidden");
        if (open) setDrawerOpen(false);
      }
    };

    toggle.addEventListener("click", onToggle);
    nav.addEventListener("click", onNavClick);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    setDrawerOpen(open);

    return () => {
      toggle.removeEventListener("click", onToggle);
      nav.removeEventListener("click", onNavClick);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      shell.classList.remove("nav-open");
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        className="admin-mobile-nav-toggle"
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="admin-sidebar"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div className="admin-mobile-nav-backdrop" aria-hidden="true" />
    </>
  );
}
