import { StudioWelcomeCard } from "../../../components/studio-hint";
import DailyVerse from "../../../components/daily-verse";

export default function AdminDashboardPage() {
  return (
    <div className="admin-dashboard">
      <StudioWelcomeCard />
      <p className="admin-eyebrow">Studio overview</p>
      <h1>Welcome to the studio</h1>
      <p className="admin-muted">Your catalogue, inquiries, and studio operations will live here.</p>
      <DailyVerse />
    </div>
  );
}
