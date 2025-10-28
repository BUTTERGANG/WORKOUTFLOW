-- Enable UUID generation support
-- For PostgreSQL < 13, need pgcrypto extension
-- For PostgreSQL >= 13, gen_random_uuid() is built-in

-- Try to create extension (will fail gracefully on PG 13+ where it's built-in)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- This ensures gen_random_uuid() is available:
-- - On PG 13+, it uses the built-in function
-- - On PG < 13, it uses pgcrypto extension
