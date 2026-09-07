"use client";

import { useState } from "react";

type BlogShareProps = {
  title: string;
  url: string;
};

type ShareIconName = "facebook" | "x" | "linkedin" | "whatsapp" | "email" | "link";

function ShareIcon({ name }: { name: ShareIconName }) {
  if (name === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v6h4v-6h3.2l.8-4h-4V9c0-.7.3-1 1-1Z" /></svg>;
  if (name === "x") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4h4.4l3.4 4.8L17 4h2l-5.3 6.3L20 20h-4.4l-3.8-5.4L7.2 20H5l5.8-6.9L5 4Zm3.3 2 8.4 12h1L9.3 6h-1Z" /></svg>;
  if (name === "linkedin") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8.5h4V20H5V8.5ZM7 3a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 7 3Zm4 5.5h3.8v1.6c.8-1.2 2-2 3.8-2 3.2 0 4.4 2.1 4.4 5.5V20h-4v-5.7c0-1.7-.6-2.7-2-2.7-1.4 0-2 1-2 2.7V20h-4V8.5Z" /></svg>;
  if (name === "whatsapp") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 0 14c-1.2 0-2.4-.3-3.5-.9l-.7-.4-2.1.6.6-2-.4-.7A7 7 0 0 1 12 5Zm-3 3.2c-.3 0-.7.1-1 .5-.3.4-.8 1.1-.8 2.2 0 1 .8 2.1.9 2.3.1.1 1.6 2.6 4 3.5 2 .8 2.4.6 2.9.5.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.2-.3-.2-.7-.4l-1.8-.8c-.3-.1-.6-.2-.8.2l-.8 1c-.2.2-.4.3-.7.1a6 6 0 0 1-1.8-1.1A6.7 6.7 0 0 1 9 12c-.2-.3 0-.5.1-.7l.5-.6.2-.6c.1-.2 0-.5 0-.7L9 8.3Z" /></svg>;
  if (name === "email") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 5h18v14H3V5Zm2 2v.3l7 5.2 7-5.2V7H5Zm14 10V9.8L12 15 5 9.8V17h14Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.5 14.5 8 16H6a4 4 0 0 1 0-8h4v2H6a2 2 0 0 0 0 4h2l1.5-1.5v2ZM14 8h4a4 4 0 0 1 0 8h-4v-2h4a2 2 0 0 0 0-4h-2l-1.5 1.5v-2L14 8Zm-6 3h8v2H8v-2Z" /></svg>;
}

export default function BlogShare({ title, url }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(`${title} — ${url}`);
  const links: Array<{ href: string; icon: ShareIconName; label: string }> = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: "facebook", label: "Facebook" },
    { href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, icon: "x", label: "X" },
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: "linkedin", label: "LinkedIn" },
    { href: `https://wa.me/?text=${encodedMessage}`, icon: "whatsapp", label: "WhatsApp" },
    { href: `mailto:?subject=${encodedTitle}&body=${encodedMessage}`, icon: "email", label: "Email" },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <aside className="blog-share" aria-labelledby="blog-share-title">
      <div>
        <p className="blog-share-kicker">Pass it along</p>
        <h2 id="blog-share-title">Share this entry</h2>
      </div>
      <div className="blog-share-actions">
        {links.map((link) => (
          <a aria-label={`Share on ${link.label}`} className="blog-share-action" href={link.href} key={link.label} rel="noopener noreferrer" target="_blank" title={`Share on ${link.label}`}>
            <ShareIcon name={link.icon} />
            <span>{link.label}</span>
          </a>
        ))}
        <button aria-label="Copy entry link" className="blog-share-action" onClick={copyLink} title="Copy entry link" type="button">
          <ShareIcon name="link" />
          <span>{copied ? "Copied" : "Copy link"}</span>
        </button>
      </div>
      <span aria-live="polite" className="blog-share-status">{copied ? "Link copied to clipboard." : ""}</span>
    </aside>
  );
}
