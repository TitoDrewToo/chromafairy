type AreaPageProps = { params: Promise<{ area: string }> };

const labels: Record<string, string> = {
  catalogue: "Catalogue",
  inquiries: "Inquiries",
  orders: "Sales / Orders",
  customers: "Customers",
  scheduling: "Scheduling",
  users: "Users",
  insights: "Insights",
};

export default async function AdminAreaStubPage({ params }: AreaPageProps) {
  const { area } = await params;
  const label = labels[area] ?? "Studio area";
  return (
    <div className="admin-dashboard">
      <p className="admin-eyebrow">Studio area</p>
      <h1>{label}</h1>
      <p className="admin-muted">This area is reserved for a future milestone.</p>
    </div>
  );
}
