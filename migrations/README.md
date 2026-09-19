# Prisma migration workflow

The authored source of truth is `src/prisma/contract.prisma`. Generated contract files and
content-addressed snapshots must not be edited manually.

## Create a migration

1. Edit `src/prisma/contract.prisma`.
2. Run `npm run db:emit`.
3. Run `npm run db:plan -- --name <snake_case_change>`.
4. Review the generated `migration.ts`, `ops.json`, operation classes, and destructive operations.
5. If Prisma emits a data placeholder, implement the backfill in `migration.ts`, then self-emit it:
   `node migrations/app/<migration>/migration.ts`.
6. Commit the migration package and every referenced snapshot together.

If the `db` ref is ahead of the committed graph, do not plan from empty. Plan explicitly from the
last reachable migration/ref (`--from <ref-or-hash>`) or intentionally realign the `db` ref first.

## Apply locally

Use a disposable local/test PostgreSQL database, never production credentials:

```text
npm run db:status -- --db <local-test-database-url>
npm run db:migrate -- --db <local-test-database-url>
npm run db:verify -- --db <local-test-database-url>
```

`db update` is acceptable only for disposable solo-development databases; it does not create
committed migration history and cannot handle required data transforms.

## Apply in production

Store the restricted runtime credential in `DATABASE_URL` and the admin/migration credential in
`DATABASE_MIGRATION_URL`. In CI/CD, inspect first and apply the reviewed graph only:

```text
npm run db:status -- --to production --db <production-migration-url>
npm run db:migrate -- --to production --db <production-migration-url>
npm run db:verify -- --db <production-migration-url>
```

The `--db` argument selects the database; `--to production` selects the committed destination ref.
Never use `db init`, `db update`, `db sign`, or a database reset to hide unexplained production drift.
Investigate marker/ref mismatches before changing either side.
