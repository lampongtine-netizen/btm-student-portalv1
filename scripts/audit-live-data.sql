-- BTM live Supabase: READ-ONLY record count inventory.
-- Project ojrandorqgytvzcfiqjt. Never run writes against live.
SELECT dataset, count_rows FROM (
  SELECT 'btm_members' dataset, count(*) count_rows FROM public.btm_members
  UNION ALL SELECT 'btm_member_details', count(*) FROM public.btm_member_details
  UNION ALL SELECT 'btm_tasks', count(*) FROM public.btm_tasks
  UNION ALL SELECT 'btm_support_plans', count(*) FROM public.btm_support_plans
  UNION ALL SELECT 'btm_business_audits', count(*) FROM public.btm_business_audits
  UNION ALL SELECT 'btm_check_ins', count(*) FROM public.btm_check_ins
  UNION ALL SELECT 'btm_conversations', count(*) FROM public.btm_conversations
  UNION ALL SELECT 'btm_messages', count(*) FROM public.btm_messages
  UNION ALL SELECT 'btm_notifications', count(*) FROM public.btm_notifications
  UNION ALL SELECT 'btm_member_state', count(*) FROM public.btm_member_state
  UNION ALL SELECT 'btm_resources', count(*) FROM public.btm_resources
  UNION ALL SELECT 'btm_power_sessions', count(*) FROM public.btm_power_sessions
  UNION ALL SELECT 'btm_session_attendees', count(*) FROM public.btm_session_attendees
  UNION ALL SELECT 'btm_payments', count(*) FROM public.btm_payments
  UNION ALL SELECT 'btm_subscriptions', count(*) FROM public.btm_subscriptions
  UNION ALL SELECT 'btm_activity_log', count(*) FROM public.btm_activity_log
  UNION ALL SELECT 'btm_staff_notifications', count(*) FROM public.btm_staff_notifications
) t ORDER BY dataset;

-- Counts only: never dump personal emails/phone numbers in logs.
SELECT count(*) total_member_rows,
       count(DISTINCT lower(trim(email))) FILTER (WHERE email IS NOT NULL AND trim(email) <> '') distinct_emails,
       count(*) FILTER (WHERE email IS NULL OR trim(email)='') missing_emails,
       count(*) FILTER (WHERE shopify_customer_id IS NULL OR trim(shopify_customer_id)='') missing_shopify_ids
FROM public.btm_members;

-- Storage: count does NOT prove integrity; separately audit object keys/hash/permissions.
SELECT b.id bucket, b.public, count(o.id) objects
FROM storage.buckets b LEFT JOIN storage.objects o ON o.bucket_id=b.id
GROUP BY b.id,b.public ORDER BY b.id;
