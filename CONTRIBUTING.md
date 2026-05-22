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
| `npm run typecheck` | TypeScript type checking |
| `npm run build` | Compile to `dist/` |
| `npm run benchmark` | Run performance benchmarks |
| `npm run docs:dev` | VitePress docs site locally (http://localhost:5173/sentinel/) |
| `npm run docs:build` | Build static docs to `docs/.vitepress/dist` |
| `npm run docs:preview` | Preview production docs build |

## Documentation

Docs live in [`docs/`](./docs/) and are published with [VitePress](https://vitepress.dev/) to **https://vegtelenseg.github.io/sentinel/** on every push to `main` (workflow: [`.github/workflows/docs.yml`](./.github/workflows/docs.yml)).

When editing markdown under `docs/`, prefer site-root links (`/getting-started/quickstart`) for the home breadcrumb, and full GitHub URLs for files outside `docs/` (e.g. `SECURITY.md`, `examples/`).

**First-time GitHub Pages setup:** Repository **Settings → Pages → Build and deployment → Source:** set to **GitHub Actions**. If deploy fails with `Failed to create deployment (status: 404)`, Pages is not enabled yet — enable it in Settings (or re-run the workflow after enabling).

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. If you've added functionality, add tests. This project maintains a ~1:1 test-to-code ratio.
3. Make sure `npm test` and `npm run typecheck` pass.
4. Write a clear PR description explaining **what** changed and **why**.

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
   npm run lint
   npm run build
   npm pack --dry-run
   ```
4. Commit, tag (`vX.Y.Z`), and push the tag
5. Create a [GitHub Release](https://github.com/vegtelenseg/sentinel/releases/new) from the tag — [`.github/workflows/publish.yml`](./.github/workflows/publish.yml) publishes to npm via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC; provenance is generated automatically)

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
