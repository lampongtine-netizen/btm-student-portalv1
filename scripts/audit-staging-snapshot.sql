-- BTM staging Supabase: READ-ONLY snapshot and auth inventory.
-- Project grsnbtlpkbswtoebuxel. Do not expose raw snapshot to student clients.
SELECT source_table AS dataset,
       count(*) AS snapshot_rows,
       max(copied_at) AS most_recent_snapshot_write
FROM public.btm_staff_snapshot_rows
GROUP BY source_table ORDER BY source_table;

SELECT (SELECT count(*) FROM public.btm_staff_snapshot_rows) snapshot_total,
       (SELECT count(*) FROM auth.users) auth_users,
       (SELECT count(*) FROM public.btm_portal_profiles) portal_profiles,
       (SELECT count(*) FROM public.btm_portal_memberships) portal_memberships;

SELECT b.id bucket, b.public, count(o.id) objects
FROM storage.buckets b LEFT JOIN storage.objects o ON o.bucket_id=b.id
GROUP BY b.id,b.public ORDER BY b.id;

-- Audit access policy names before connecting any real member:
SELECT tablename, policyname, roles, cmd
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('btm_staff_snapshot_rows','btm_members','btm_messages',
                    'btm_portal_profiles','btm_portal_memberships','btm_portal_records')
ORDER BY tablename, policyname;
