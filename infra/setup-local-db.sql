-- Creates the local development database user and database that .env.example
-- expects, on a PostgreSQL installed directly on Windows (no Docker).
-- Safe to run more than once. Run as the "postgres" user: infra/setup-local-db.cmd.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'khmer_micro_store') THEN
    CREATE ROLE khmer_micro_store LOGIN PASSWORD 'khmer_micro_store' CREATEDB;
  ELSE
    ALTER ROLE khmer_micro_store LOGIN PASSWORD 'khmer_micro_store' CREATEDB;
  END IF;
END
$$;

SELECT 'CREATE DATABASE khmer_micro_store OWNER khmer_micro_store'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'khmer_micro_store')\gexec

\echo
\echo Done. The project user and database exist:
\du khmer_micro_store
\l khmer_micro_store
