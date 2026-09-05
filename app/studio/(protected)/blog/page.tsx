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
  const { data: canEdit } = supabase ? await supabase.rpc("is_blog_editor") : { data: false };
  return <div className="admin-dashboard admin-blog-page"><p className="admin-eyebrow">Studio publishing</p><h1>Blog</h1><p className="admin-muted">Write the notes behind the work. Drafts stay private until they are ready to be shared.</p><AdminBlog canEdit={Boolean(canEdit)} initialPosts={posts} /></div>;
}
