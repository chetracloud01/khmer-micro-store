-- Creates the local development database users and database that .env.example
-- expects, on a PostgreSQL installed directly on Windows (no Docker).
-- Safe to run more than once. Run as the "postgres" user: infra/setup-local-db.cmd.
--
-- Two users (docs/blueprint.md "Multi-tenant safety"):
--   khmer_micro_store      owns the tables; runs migrations and the worker.
--   khmer_micro_store_app  what the API uses for shop data; row-level security
--                          applies to it, so one shop can never read another's.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'khmer_micro_store') THEN
    CREATE ROLE khmer_micro_store LOGIN PASSWORD 'khmer_micro_store' CREATEDB;
  ELSE
    ALTER ROLE khmer_micro_store LOGIN PASSWORD 'khmer_micro_store' CREATEDB;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'khmer_micro_store_app') THEN
    CREATE ROLE khmer_micro_store_app LOGIN PASSWORD 'khmer_micro_store_app' NOSUPERUSER NOBYPASSRLS;
  ELSE
    ALTER ROLE khmer_micro_store_app LOGIN PASSWORD 'khmer_micro_store_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

SELECT 'CREATE DATABASE khmer_micro_store OWNER khmer_micro_store'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'khmer_micro_store')\gexec

GRANT CONNECT ON DATABASE khmer_micro_store TO khmer_micro_store_app;

\echo
\echo Done. The project users and database exist:
\du khmer_micro_store*
\l khmer_micro_store
