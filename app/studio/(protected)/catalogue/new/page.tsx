import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/server";
import WorkForm from "../../../../../components/admin-work-form";
import "../../../admin.css";
import "../../../catalogue.css";

export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  const supabase = await createClient();
  const { data: series } = supabase ? await supabase.from("series").select("id, name, slug, year").order("name") : { data: [] };
  return (
    <div className="admin-dashboard admin-catalogue-page">
      <Link className="admin-back-link" href="/studio/catalogue">← Back to works</Link>
      <p className="admin-eyebrow admin-form-eyebrow">Studio catalogue</p>
      <h1>Add a work</h1>
      <WorkForm mode="create" series={(series ?? [])} />
    </div>
  );
}
