-- Fixtures for disposable local e2e Postgres only; never import into Supabase.
INSERT INTO public.users (id, email, display_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'e2e-admin@example.test', 'Demo Administrator', 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'e2e-user@example.test', 'Demo Member', 'USER');

INSERT INTO public.catalog_parts (id, category, name, price) VALUES
('33333333-3333-3333-3333-333333333333', 'cpu', 'Demo CPU', 199.99),
('44444444-4444-4444-4444-444444444444', 'memory', 'Demo Memory', NULL);
