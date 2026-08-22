import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSignOut from "../../../components/admin-sign-out";
import AdminMobileNav from "../../../components/admin-mobile-nav";
import { Hint } from "../../../components/studio-hint";
import StudioNotes from "../../../components/studio-notes";
import { createClient } from "../../../lib/supabase/server";
import "../admin.css";

const staffAreas = [
  ["Landing page", "/studio/landing-page", "navLandingPage"],
  ["Catalogue", "/studio/catalogue", "navCatalogue"],
  ["Inquiries", "/studio/inquiries", "navInquiries"],
  ["Sales / Orders", "/studio/sales", "navSales"],
  ["Customers", "/studio/customers", "navCustomers"],
  ["Scheduling", "/studio/scheduling", "navScheduling"],
] as const;

const managerAreas = [
  ["Users", "/studio/users", "navUsers"],
  ["Insights", "/studio/insights", "navInsights"],
  ["Settings", "/studio/settings", "navSettings"],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  if (!supabase) redirect("/studio/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

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
  const { data: canViewSystems } = await supabase.rpc("is_user_manager");

  return (
    <div className="admin-shell">
      <aside id="admin-sidebar" className="admin-sidebar">
        <Hint id="wordmark"><Link className="admin-wordmark" href="/studio">Chroma Fairy<span>Studio</span></Link></Hint>
        <nav id="admin-sidebar-nav" className="admin-nav" aria-label="Studio areas">
          {staffAreas.map(([label, href, hintId]) => <Hint id={hintId} key={href}><Link href={href}>{label}</Link></Hint>)}
          {canViewSystems && <>{managerAreas.map(([label, href, hintId]) => <Hint id={hintId} key={href}><Link href={href}>{label}</Link></Hint>)}<Hint id="navSystems"><Link href="/studio/systems">Systems</Link></Hint></>}
        </nav>
        <Hint id="viewSite"><Link className="admin-site-link" href="/">← View site</Link></Hint>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar">
          <AdminMobileNav />
          <Hint id="userRole"><div><span className="admin-user-email">{displayName}</span><span className="admin-role">{role}</span></div></Hint>
          <div className="admin-topbar-actions"><AdminSignOut /></div>
        </header>
        <div className="admin-page-content">{children}</div>
      </section>
      <StudioNotes variant="drawer" />
    </div>
  );
}
