"use client";

import { signOutAdmin } from "../app/actions/admin-auth";
import { Hint } from "./studio-hint";

export default function AdminSignOut() {
  return (
    <Hint id="signOut"><form action={signOutAdmin}><button className="admin-action-button admin-sign-out" type="submit"><span className="admin-action-label">Sign out</span></button></form></Hint>
  );
}
