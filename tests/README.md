# Testing

The default suite uses Vitest with Supertest and does not connect to PostgreSQL.
`vitest.config.ts` supplies isolated test environment values, including an
unreachable local `DATABASE_URL`, while database modules are mocked in API tests.

Run the complete suite with `npm test`, watch mode with `npm run test:watch`,
or generate V8 coverage with `npm run test:coverage`. Unit and integration
suites can be run separately with `npm run test:unit` and
`npm run test:integration`. `npm run test:typecheck` checks both source and test
TypeScript.

Database integration tests are opt-in. Copy `.env.test.example` to a local,
ignored `.env.test`, provide a dedicated database whose name contains `test`,
apply the committed migrations to it, then run `npm run test:database`.
`RUN_DATABASE_TESTS=true` is required so an accidentally inherited URL cannot
activate these tests. Remote test databases additionally require
`ALLOW_REMOTE_TEST_DATABASE=true`. Migration or reset commands must use the URL
returned by `getTestDatabaseUrl()` rather than `DATABASE_URL`.
