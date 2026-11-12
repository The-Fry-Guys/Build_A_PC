-- Apply once to a PostgreSQL database after verifying that these tables do not exist.
-- catalog_parts must already exist. User identity integration is not implemented yet.
BEGIN;

CREATE TABLE pc_builds (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE INDEX pc_builds_user_created_id_idx
    ON pc_builds (user_id, created_at DESC, id);

CREATE TABLE build_parts (
    id uuid PRIMARY KEY,
    build_id uuid NOT NULL REFERENCES pc_builds(id) ON DELETE CASCADE,
    catalog_part_id uuid NOT NULL REFERENCES catalog_parts(id),
    quantity integer NOT NULL CHECK (quantity > 0)
);

COMMIT;
