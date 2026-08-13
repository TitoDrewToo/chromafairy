import SetPasswordForm from "../../../components/admin-set-password";
import "../admin.css";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const formMode = mode === "forgot" ? "forgot" : mode === "reset" ? "reset" : "invite";
  return <main className="admin-login-page"><div className="admin-login-card"><p className="admin-eyebrow">Chroma Fairy · Studio</p><h1>{formMode === "forgot" ? "Reset password" : "Set your password"}</h1><p className="admin-muted">{formMode === "forgot" ? "Request a secure password-reset link." : "Choose a password to finish setting up your studio account."}</p><SetPasswordForm mode={formMode} /></div></main>;
}
