import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSignOut from "../../../components/admin-sign-out";
import { createClient } from "../../../lib/supabase/server";
import "../admin.css";

const areas = [
  ["Catalogue", "/admin/catalogue"],
  ["Inquiries", "/admin/inquiries"],
  ["Sales / Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Scheduling", "/admin/scheduling"],
  ["Users", "/admin/users"],
  ["Insights", "/admin/insights"],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [{ data: isAdmin }, { data: profile }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("profiles").select("email, full_name, role").eq("id", user.id).maybeSingle(),
  ]);

  if (!isAdmin) {
    return (
      <main className="admin-denied-page">
        <div className="admin-denied-card">
          <p className="admin-eyebrow">Chroma Fairy · Studio</p>
          <h1>Access denied</h1>
          <p className="admin-muted">This account is signed in, but it does not have studio administrator access.</p>
          <AdminSignOut />
        </div>
      </main>
    );
  }

  const displayName = profile?.full_name || user.email || "Studio user";
  const role = profile?.role ?? "admin";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-wordmark" href="/admin">Chroma Fairy<span>Studio</span></Link>
        <nav className="admin-nav" aria-label="Admin areas">
          {areas.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <Link className="admin-site-link" href="/">← View site</Link>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar">
          <div><span className="admin-user-email">{displayName}</span><span className="admin-role">{role}</span></div>
          <AdminSignOut />
        </header>
        <div className="admin-page-content">{children}</div>
      </section>
    </div>
  );
}
