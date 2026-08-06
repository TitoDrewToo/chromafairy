"use client";

import { signOutAdmin } from "../app/actions/admin-auth";

export default function AdminSignOut() {
  return (
    <form action={signOutAdmin}>
      <button className="admin-action-button admin-sign-out" type="submit"><span className="admin-action-label">Sign out</span></button>
    </form>
  );
}
