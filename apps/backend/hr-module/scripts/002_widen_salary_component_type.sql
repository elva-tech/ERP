-- SUPERSEDED - DO NOT APPLY. Kept for history only. The column is already
-- VARCHAR(30) in the Prisma baseline prisma/migrations/0_init; set up
-- databases with `npm run db:deploy` as described in README.md.
--
-- salary_components.component_type was VARCHAR(20) while its CHECK constraint
-- allows 'Employer Contribution' (21 characters), so that value could never be
-- stored. Widening a VARCHAR is non-destructive (metadata-only in PostgreSQL)
-- and keeps the existing CHECK constraint unchanged.
ALTER TABLE salary_components
  ALTER COLUMN component_type TYPE VARCHAR(30);
