import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const supabase = await createClient();

  if (!supabase) {
    return <HealthMessage message="Supabase unavailable — environment variables are missing." />;
  }

  try {
    const [{ count: works, error: worksError }, { count: series, error: seriesError }] = await Promise.all([
      supabase.from("works").select("id", { count: "exact", head: true }).neq("status", "draft"),
      supabase.from("series").select("id", { count: "exact", head: true }).eq("is_published", true),
    ]);

    const error = worksError ?? seriesError;
    if (error) {
      return <HealthMessage message={`Supabase error — ${error.message}`} />;
    }

    return <HealthMessage message={`Supabase OK — ${works ?? 0} works, ${series ?? 0} series`} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    return <HealthMessage message={`Supabase error — ${message}`} />;
  }
}

function HealthMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#efe9df] px-6 text-center text-[#0e1a24]">
      <p className="font-serif text-2xl">{message}</p>
    </main>
  );
}
