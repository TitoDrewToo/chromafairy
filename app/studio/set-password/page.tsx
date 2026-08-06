import SetPasswordForm from "../../../components/admin-set-password";
import "../admin.css";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <main className="admin-login-page"><div className="admin-login-card"><p className="admin-eyebrow">Chroma Fairy · Studio</p><h1>{mode === "forgot" ? "Reset password" : "Set your password"}</h1><p className="admin-muted">{mode === "forgot" ? "Request a secure password-reset link." : "Choose a password to finish setting up your studio account."}</p><SetPasswordForm mode={mode === "forgot" ? "forgot" : "set"} /></div></main>;
}
