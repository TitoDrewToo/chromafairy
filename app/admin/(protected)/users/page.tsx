import { createClient } from "../../../../lib/supabase/server";
import UsersAdmin from "../../../../components/admin-users";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const { data: profiles, error } = await supabase.from("profiles").select("id, email, full_name, role, created_at").order("email");
  if (error) return <AdminMessage message="Users could not be loaded." />;
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio access</p><h1>Users</h1><p className="admin-muted">Invite trusted studio users and assign their role.</p><UsersAdmin initialUsers={profiles ?? []} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio access</p><h1>Users</h1><p className="admin-muted">{message}</p></div>; }
