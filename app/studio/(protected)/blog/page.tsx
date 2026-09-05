import "../../admin.css";
import "../../operations.css";
import "../../blog.css";
import { getBlogPosts } from "../../../../lib/blog";
import { createClient } from "../../../../lib/supabase/server";
import AdminBlog from "../../../../components/admin-blog";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await getBlogPosts({ publishedOnly: false });
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } = supabase && user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const canEdit = ["owner", "admin", "developer"].includes(profile?.role ?? "");
  return <div className="admin-dashboard admin-blog-page"><p className="admin-eyebrow">Studio publishing</p><h1>Blog</h1><p className="admin-muted">Create, edit, and publish notes from the studio.</p><AdminBlog canEdit={canEdit} initialPosts={posts} /></div>;
}
