"use client";

import { useState } from "react";
import { inviteAdminUser } from "../app/actions/admin-users";
import type { Profile, UserRole } from "../lib/supabase/types";

const roles: UserRole[] = ["owner", "admin", "staff", "developer"];
export default function UsersAdmin({ initialUsers }: { initialUsers: Array<Pick<Profile, "id" | "email" | "full_name" | "role" | "created_at">> }) {
  const [users, setUsers] = useState(initialUsers); const [email, setEmail] = useState(""); const [role, setRole] = useState<UserRole>("staff"); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); const result = await inviteAdminUser(email, role); if (!result.ok) setError(result.error ?? "Could not send invitation."); else { setMessage(`Invitation sent to ${email}.`); setUsers((current) => [...current, { id: `pending-${email}`, email, full_name: null, role, created_at: new Date().toISOString() }]); setEmail(""); } setBusy(false); }
  return <section className="admin-user-section"><form className="admin-operation-form admin-invite-form" onSubmit={submit}><h2>Invite a user</h2><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><p className="admin-form-note">The invitee creates their own password through Supabase Auth. Owner access is available for Samantha.</p>{error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-inline-success" role="status">{message}</p>}<button className="admin-action-button" disabled={busy} type="submit"><span className="admin-action-label">{busy ? "Inviting…" : "Invite by email"}</span></button></form><div className="admin-user-list">{users.map((user) => <article className="admin-user-card" key={user.id}><div><strong>{user.full_name || user.email || "Unnamed user"}</strong><span>{user.email}</span></div><b>{user.role}</b></article>)}</div></section>;
}
