"use client";

import { useState } from "react";

type BlogShareProps = {
  title: string;
  url: string;
};

type ShareIconName = "facebook" | "x" | "instagram" | "link";

function ShareIcon({ name }: { name: ShareIconName }) {
  if (name === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v6h4v-6h3.2l.8-4h-4V9c0-.7.3-1 1-1Z" /></svg>;
  if (name === "x") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4h4.4l3.4 4.8L17 4h2l-5.3 6.3L20 20h-4.4l-3.8-5.4L7.2 20H5l5.8-6.9L5 4Zm3.3 2 8.4 12h1L9.3 6h-1Z" /></svg>;
  if (name === "instagram") return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" fill="var(--shop-paper)" /><circle cx="17.2" cy="6.8" r="1" fill="var(--shop-paper)" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.5 14.5 8 16H6a4 4 0 0 1 0-8h4v2H6a2 2 0 0 0 0 4h2l1.5-1.5v2ZM14 8h4a4 4 0 0 1 0 8h-4v-2h4a2 2 0 0 0 0-4h-2l-1.5 1.5v-2L14 8Zm-6 3h8v2H8v-2Z" /></svg>;
}

export default function BlogShare({ title, url }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links: Array<{ href: string; icon: ShareIconName; label: string }> = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: "facebook", label: "Facebook" },
    { href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, icon: "x", label: "X" },
  ];

  async function copyLink(message = "Link copied to clipboard.") {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      return message;
    } catch {
      window.prompt("Copy this link", url);
      return "Copy the link into Instagram to share this entry.";
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
        <button aria-label="Copy entry link for Instagram" className="blog-share-action" onClick={() => void copyLink("Link copied for Instagram.")} title="Copy the entry link to share on Instagram" type="button">
          <ShareIcon name="instagram" />
          <span>Instagram</span>
        </button>
        <button aria-label="Copy entry link" className="blog-share-action" onClick={() => void copyLink()} title="Copy entry link" type="button">
          <ShareIcon name="link" />
          <span>{copied ? "Copied" : "Copy link"}</span>
        </button>
      </div>
      <span aria-live="polite" className="blog-share-status">{copied ? "Link copied to clipboard." : ""}</span>
    </aside>
  );
}
