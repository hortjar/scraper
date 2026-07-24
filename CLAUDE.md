# CLAUDE.md

**Read [AGENTS.md](./AGENTS.md).** It is the canonical coding contract for this
repository — architecture, hard rules, commands, and definition of done — and it is
kept in sync with [`docs/`](./docs/README.md).

Everything in AGENTS.md applies to Claude Code sessions without exception. The
three rules worth repeating up front:

1. **Every fix and every implementation updates the docs in the same change.**
2. **Check the ownership map** in [docs/12-AGENT-WORKSTREAMS.md](./docs/12-AGENT-WORKSTREAMS.md)
   before writing — parallel streams own disjoint paths.
3. **No magic strings, no hardcoded prose, no `useEffect`.** All three are lint-enforced.
