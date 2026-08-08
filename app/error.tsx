"use client";

import { useEffect } from "react";
import { captureError } from "../lib/client-error-capture";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureError("systems", "app.error-boundary", "render-error", error, { digest: error.digest ?? null }); }, [error]);
  return (
    <main className="admin-denied-page">
      <div className="admin-denied-card">
        <p className="admin-eyebrow">Chroma Fairy</p>
        <h1>Something went wrong</h1>
        <p className="admin-muted">Please try again.</p>
        <button className="admin-action-button admin-primary-button" onClick={() => reset()} type="button"><span className="admin-action-label">Try again</span></button>
      </div>
    </main>
  );
}
