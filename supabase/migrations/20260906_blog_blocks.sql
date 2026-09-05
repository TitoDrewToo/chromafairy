alter table public.blog_posts
  add column if not exists content jsonb not null default '{"version":1,"blocks":[]}'::jsonb;

update public.blog_posts
set content = jsonb_build_object(
  'version', 1,
  'blocks', jsonb_build_array(jsonb_build_object(
    'id', 'legacy-body',
    'type', 'text',
    'text', body
  ))
)
where content = '{"version":1,"blocks":[]}'::jsonb
  and body <> '';
