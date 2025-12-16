-- Remove foreign key constraint on user_id to allow open access
ALTER TABLE public.industry_trackers DROP CONSTRAINT IF EXISTS industry_trackers_user_id_fkey;