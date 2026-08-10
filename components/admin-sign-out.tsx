"use client";

import { useFormStatus } from "react-dom";
import { signOutAdmin } from "../app/actions/admin-auth";
import { Hint } from "./studio-hint";

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button className={`admin-action-button admin-sign-out${pending ? " is-busy" : ""}`} disabled={pending} type="submit"><span className="admin-action-label">{pending ? "Signing out…" : "Sign out"}</span></button>;
}

export default function AdminSignOut() {
  return (
    <Hint id="signOut"><form action={signOutAdmin}><SignOutButton /></form></Hint>
  );
}
