import Link from "next/link";

export default function ShopPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#efe9df] px-6 text-center text-[#0e1a24]">
      <div>
        <p className="mb-4 text-xs uppercase tracking-[0.34em] text-[#1f8fa3]">Chroma Fairy</p>
        <h1 className="font-serif text-5xl">Coming soon</h1>
        <Link className="mt-8 inline-block text-xs uppercase tracking-[0.24em] text-[#1f8fa3]" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
