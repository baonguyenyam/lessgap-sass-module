# Git, commits and the changelog

- Do not commit, push, create branches or open pull requests unless asked.
  Never force-push, rewrite published history or commit to `main` directly when
  a branch was requested.
- Commit messages follow Conventional Commits:
  `type(scope): summary` in the imperative, under 72 characters.
  Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `security`.
  The body says *why*. A breaking change gets `!` and a `BREAKING CHANGE:` footer.
- One logical change per commit. Do not mix a refactor with a fix.
- Never commit `.env*` (except `.env.example`), build output, coverage or
  `*.tsbuildinfo`.
- `CHANGELOG.md` follows Keep a Changelog and Semantic Versioning. A
  user-visible change gets an entry in the existing voice (bold lead, then the
  reason), under Added / Changed / Fixed / Security. MAJOR breaks something an
  adopter must change; MINOR adds; PATCH fixes.
- A change an adopter must act on (migration, renamed env var, moved file) also
  goes in `docs/upgrading.md` and `docs/upgrading.it.md`.

---

Based on: [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/), [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning 2.0](https://semver.org/).
