# Contributing

Thanks for considering a contribution to `@siremzam/sentinel`.

## Getting Started

```bash
git clone https://github.com/siremzam/sentinel.git
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

## Reporting Bugs

Open a GitHub issue with:

- A minimal reproduction (ideally a failing test case)
- Expected vs actual behavior
- Node.js version and OS

## Security Issues

See [SECURITY.md](./SECURITY.md) for responsible disclosure instructions. Do not open public issues for security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
