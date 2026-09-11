# Contributing

Thanks for considering a contribution to `@siremzam/sentinel`.

## Getting Started

```bash
git clone https://github.com/vegtelenseg/sentinel.git
cd sentinel
npm install
npm test
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | TypeScript type checking (`src/`, tests excluded) |
| `npm run typecheck:api` | Compile-time public API tests (`src/api-types.test-d.ts`) |
| `npm run build` | Compile to `dist/` |
| `npm run benchmark` | Run performance benchmarks |
| `npm run docs:dev` | VitePress docs site locally (http://localhost:5173/sentinel/) |
| `npm run docs:build` | Build static docs to `docs/.vitepress/dist` |
| `npm run docs:preview` | Preview production docs build |

## Documentation

Docs live in [`docs/`](./docs/) and are published with [VitePress](https://vitepress.dev/) to **https://vegtelenseg.github.io/sentinel/** when `docs/` or `llms.txt` change on `main` (workflow: [`.github/workflows/docs.yml`](./.github/workflows/docs.yml)).

When editing markdown under `docs/`, prefer site-root links (`/getting-started/quickstart`) for the home breadcrumb, and full GitHub URLs for files outside `docs/` (e.g. `SECURITY.md`, `examples/`).

**First-time GitHub Pages setup:** Repository **Settings → Pages → Build and deployment → Source:** set to **GitHub Actions**. If deploy fails with `Failed to create deployment (status: 404)`, Pages is not enabled yet — enable it in Settings (or re-run the workflow after enabling).

## Issues

Every change that lands on `main` should have a GitHub issue, opened **before** the PR:

1. Pick the matching template: **Bug report**, **Feature request**, **Documentation**, or **CI / tooling**.
2. State the user-visible problem, the semver bucket (patch / minor / major), and what is out of scope.
3. Reference it from the PR with `Fixes #n` so merge closes it.

Exceptions: Dependabot PRs, reverts, and security reports (see [SECURITY.md](./SECURITY.md) — never a public issue).

## Pull Request Process

1. Open or link the issue (see above).
2. Fork the repository and create your branch from `main`.
3. If you've added functionality, add tests. This project maintains a ~1:1 test-to-code ratio. Type-level API changes also need an update in `src/api-types.test-d.ts`.
4. Make sure `npm test`, `npm run typecheck`, and `npm run typecheck:api` pass.
5. Write a clear PR description explaining **what** changed and **why**, including `Fixes #n`.

## Code Style

- TypeScript strict mode is enabled.
- No runtime dependencies — keep it that way.
- Avoid comments that just narrate what the code does. Comments should explain *why*, not *what*.
- Use the fluent builder pattern consistent with the existing API surface.

## Releasing

Maintainers follow this checklist for each release:

1. Update [CHANGELOG.md](./CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/) format)
2. Bump the version in [package.json](./package.json)
3. Verify locally:
   ```bash
   npm test
   npm run typecheck
   npm run typecheck:api
   npm run lint
   npm run build
   npm pack --dry-run
   ```
4. Commit, tag (`vX.Y.Z`), and push the tag
5. Create a [GitHub Release](https://github.com/vegtelenseg/sentinel/releases/new) from the tag — [`.github/workflows/publish.yml`](./.github/workflows/publish.yml) publishes to npm via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC; provenance is generated automatically). Do **not** publish on merge to `main`; docs-only deploys to GitHub Pages from `main`.

**npm Trusted Publishing (one-time):** On [npmjs.com](https://www.npmjs.com/) → `@siremzam/sentinel` → **Settings** → **Trusted publishing** → **GitHub Actions** → repository `vegtelenseg/sentinel`, workflow filename `publish.yml`.

Do **not** publish from your laptop with `--provenance` — that flag only works in CI. To publish manually (emergency only): `npm login` then `npm publish --access public` (no `--provenance`).

Patch releases (0.4.x) are non-breaking. Major releases (1.0.0+) follow the [API stability policy](./docs/introduction/api-stability.md).

## Reporting Bugs

Open a GitHub issue with:

- A minimal reproduction (ideally a failing test case)
- Expected vs actual behavior
- Node.js version and OS

## Security Issues

See [SECURITY.md](./SECURITY.md) for responsible disclosure instructions. Do not open public issues for security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
