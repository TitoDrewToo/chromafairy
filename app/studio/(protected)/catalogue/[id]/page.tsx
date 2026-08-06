import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { getArtworkUrl } from "../../../../../lib/catalogue";
import WorkForm from "../../../../../components/admin-work-form";
import "../../../admin.css";
import "../../../catalogue.css";

export const dynamic = "force-dynamic";

export default async function EditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return <p className="admin-muted">Supabase is not configured.</p>;
  const [{ data: work }, { data: series }, { data: images }] = await Promise.all([
    supabase.from("works").select("*").eq("id", id).maybeSingle(),
    supabase.from("series").select("id, name, slug, year").order("name"),
    supabase.from("work_images").select("id, work_id, storage_path, alt, display_order, is_primary").eq("work_id", id).order("display_order"),
  ]);
  if (!work) notFound();
  const existingImages = (images ?? []).map((image) => ({ ...image, url: getArtworkUrl(supabase, image.storage_path) }));
  return (
    <div className="admin-dashboard admin-catalogue-page">
      <Link className="admin-back-link" href="/studio/catalogue">← Back to works</Link>
      <p className="admin-eyebrow admin-form-eyebrow">Studio catalogue</p>
      <h1>Edit work</h1>
      <WorkForm mode="edit" work={work} images={existingImages} series={(series ?? [])} />
    </div>
  );
}
