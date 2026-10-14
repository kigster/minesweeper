# Pull Requests

## Front end (rey-frontend, round 1)

- `bun run test` → 91 pass, 0 fail, lines 100%.
- `bun run e2e` → Cypress 9/9 passing against the real `bun server.ts`.
- `bun run lint` → biome clean; `tsc` fails only at `src/engine/game.ts(109,11)` TS2367 (luke's file; mailed).

## Back end (luke-backend, round 1) — final integration proof

Run last, after rey's "front end done" (mail #4). The TS2367 above is fixed in `src/engine/game.ts`.

```text
$ just lint
$ biome check . && tsc --noEmit
Checked 25 files in 9ms. No fixes applied.            # exit 0

$ just test
99 pass, 0 fail, 22713 expect() calls, 8 files        # exit 0
All files: 99.45% funcs, 100.00% lines (threshold 0.95)

$ just build
index-ff6714pj.js 7.55 KB, index.html 0.97 KB, index-p898asck.css 2.15 KB   # exit 0

$ just e2e
start-server-and-test start http://localhost:3000 cypress:run
Minesweeper running at http://localhost:3000/
9 passing (3s) — All specs passed!                    # exit 0
```

Port 3000 also had a stray `bun ./index.html` dev server on `[::1]:3000`, so the run above is ambiguous about which server Cypress hit. Re-run on an isolated port, which can only reach `bun server.ts`:

```text
$ PORT=3917 CYPRESS_BASE_URL=http://127.0.0.1:3917 start-server-and-test start http://127.0.0.1:3917 cypress:run
Minesweeper running at http://localhost:3917/
9 passing (3s) — All specs passed!                    # exit 0
```

Back-end integration test (`tests/server.test.ts`): real `Bun.serve` on an ephemeral port and a real `bun server.ts` subprocess, fetching `/`, then the bundled JS and CSS the HTML references; `/nope` is 404.
