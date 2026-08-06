"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "../admin.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Admin login is temporarily unavailable.");
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError("That email or password was not accepted.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <Link className="admin-back-link" href="/">← Back to site</Link>
        <p className="admin-eyebrow">Chroma Fairy · Studio</p>
        <h1>Admin sign in</h1>
        <p className="admin-muted">Use your existing studio account to continue.</p>
        <form className="admin-login-form" onSubmit={submit}>
          <label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="admin-action-button admin-primary-button" disabled={isSubmitting} type="submit"><span className="admin-action-label">{isSubmitting ? "Signing in…" : "Sign in"}</span></button>
        </form>
      </div>
    </main>
  );
}
