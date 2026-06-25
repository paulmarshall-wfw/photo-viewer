# Photo Viewer

Use `HANDOFF.md` only when the user asks for a handoff or an exceptional continuity case applies: the project is midstream, dirty, complex, blocked, being transferred, or likely to need a clean next-session bootstrap.

## Documentation Records

- Keep `docs/completed-tasks.md` append-only. After every non-technical task, add a concise completion entry that records what was done, the outcome, and any relevant artifact or follow-up.
- Use `docs/build-logs/YYYY-MM.md` for technical work. After every technical build task that changes code, config, dependencies, tooling, tests, packaging, runtime setup, or verification docs, add one concise build-log entry.
- Do not duplicate the same technical work in `docs/completed-tasks.md`; the build log is the record for technical build history.

## Port Registry

Before adding or changing local ports, check and update
`/Users/paulmarshall/Software Development/All Standards/local-port-registry.md`; record project ports in this file's Runtime Notes. After updating, run:

```bash
python3 "/Users/paulmarshall/Software Development/All Standards/scripts/check-local-port-registry.py"
```

## Runtime Notes

- Photo Viewer AppLauncher package uses `photo-viewer` version `1.0.4` as a `containerApp`.
- AppLauncher opens Photo Viewer at `http://127.0.0.1:4820/`; the package maps host port `4820` to the container's internal port `3000`.
- AppLauncher package generation writes `dist/applauncher-launch-packages/photo-viewer/1.0.4/`; active installs live under `~/Library/Application Support/AppLauncher/launch-packages/photo-viewer/1.0.4/`.
- App-specific launch values are owned by repo config files, especially `config/applauncher.env` and `deploy/.env`. AppLauncher must not inject Photo Viewer env vars.
