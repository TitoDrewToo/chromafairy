import { getLandingPageContent } from "../../../../lib/landing-page";
import AdminLandingPage from "../../../../components/admin-landing-page";
import "../../admin.css";
import "../../landing-page.css";

export const dynamic = "force-dynamic";

export default async function LandingPageAdmin() {
  const content = await getLandingPageContent({ publishedOnly: false });
  return <div className="admin-dashboard admin-landing-page"><p className="admin-eyebrow">Studio publishing</p><h1>Landing page</h1><p className="admin-muted">Edit the public sections while their visual templates stay protected.</p><AdminLandingPage initialContent={content} /></div>;
}
