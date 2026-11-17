-- Apply to existing databases before deploying an API version that stores build budgets.
ALTER TABLE public.pc_builds
    ADD COLUMN IF NOT EXISTS budget numeric(10,2);
