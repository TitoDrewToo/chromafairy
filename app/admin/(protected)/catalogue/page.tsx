import Link from "next/link";
import { createClient } from "../../../../lib/supabase/server";
import { getArtworkUrl } from "../../../../lib/catalogue";
import CatalogueAdmin, { type AdminCatalogueImage, type AdminCatalogueSeries, type AdminCatalogueWork } from "../../../../components/admin-catalogue";
import "../../admin.css";
import "../../catalogue.css";

export const dynamic = "force-dynamic";

export default async function AdminCataloguePage() {
  const supabase = await createClient();
  if (!supabase) return <CatalogueMessage message="Supabase is not configured." />;

  const [{ data: works, error: worksError }, { data: series }, { data: images }] = await Promise.all([
    supabase.from("works").select("*").order("year", { ascending: false }).order("month", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("series").select("id, name, slug, year").order("name", { ascending: true }),
    supabase.from("work_images").select("id, work_id, storage_path, alt, display_order, is_primary").order("display_order", { ascending: true }),
  ]);

  if (worksError) return <CatalogueMessage message="The catalogue could not be loaded." />;
  const seriesById = new Map((series ?? []).map((item) => [item.id, item]));
  const imagesByWork = new Map<string, AdminCatalogueImage[]>();
  (images ?? []).forEach((image) => imagesByWork.set(image.work_id, [
    ...(imagesByWork.get(image.work_id) ?? []),
    { ...image, url: getArtworkUrl(supabase, image.storage_path) },
  ]));

  const adminWorks: AdminCatalogueWork[] = (works ?? []).map((work) => ({
    ...work,
    series_name: work.series_id ? seriesById.get(work.series_id)?.name ?? null : null,
    images: imagesByWork.get(work.id) ?? [],
  }));

  return (
    <div className="admin-dashboard admin-catalogue-page">
      <div className="admin-catalogue-heading">
        <div><p className="admin-eyebrow">Studio catalogue</p><h1>Works</h1><p className="admin-muted">All works, including drafts.</p></div>
        <Link className="admin-action-button admin-action-link" href="/admin/catalogue/new"><span className="admin-action-label">Add a work</span></Link>
      </div>
      <CatalogueAdmin initialWorks={adminWorks} initialSeries={(series ?? []) as AdminCatalogueSeries[]} />
    </div>
  );
}

function CatalogueMessage({ message }: { message: string }) {
  return <div className="admin-dashboard"><p className="admin-eyebrow">Studio catalogue</p><h1>Works</h1><p className="admin-muted">{message}</p></div>;
}
