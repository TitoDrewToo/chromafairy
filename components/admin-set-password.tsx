"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, createInviteClient } from "../lib/supabase/client";
import { absoluteUrl } from "../lib/site";
import { Hint } from "./studio-hint";

export default function SetPasswordForm({ mode }: { mode: "forgot" | "invite" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const cookieClient = createClient();
    const inviteClient = mode === "invite" ? createInviteClient() : cookieClient;
    if (!cookieClient || !inviteClient) return;

    let active = true;
    void inviteClient.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (mode === "invite" && data.session) {
        await cookieClient.auth.setSession(data.session);
      }
      if (active) setHasSession(Boolean(data.session));
    });

    const { data: listener } = cookieClient.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [mode]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return setError("Password recovery is temporarily unavailable.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true); setError(""); setMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: absoluteUrl("/studio/set-password?mode=reset") });
    setBusy(false);
    if (resetError) return setError("Could not send the reset link. Please try again.");
    setMessage("If that account exists, a password-reset link is on its way.");
  }

  async function setNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return setError("Password setup is temporarily unavailable.");
    if (!hasSession) return setError("Open the invite or reset link from your email first.");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setBusy(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError("Could not set that password. Please use a fresh email link.");
    router.replace("/studio");
    router.refresh();
  }

  return mode === "forgot" ? <form className="admin-login-form" onSubmit={requestReset}><label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-inline-success" role="status">{message}</p>}<Hint id="forgotPassword"><button className="admin-action-button admin-primary-button" disabled={busy} type="submit"><span className="admin-action-label">{busy ? "Sending…" : "Send reset link"}</span></button></Hint><Link className="admin-back-link" href="/studio/login">Back to sign in</Link></form> : <form className="admin-login-form" onSubmit={setNewPassword}><Hint id="password"><label>New password<input autoComplete="new-password" minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label></Hint><Hint id="password"><label>Confirm password<input autoComplete="new-password" minLength={8} required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></Hint>{error && <p className="admin-error" role="alert">{error}</p>}<Hint id="password"><button className="admin-action-button admin-primary-button" disabled={busy} type="submit"><span className="admin-action-label">{busy ? "Saving…" : "Set password"}</span></button></Hint><Link className="admin-back-link" href="/studio/login">Back to sign in</Link></form>;
}
