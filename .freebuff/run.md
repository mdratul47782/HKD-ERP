# Preview run doc — HKD ERP (Next.js frontend + Express backend)

The project preview runs two servers: the Express API (default 5000) and the Next.js dev server (default 3000). The frontend reads `NEXT_PUBLIC_API_URL` at startup and calls the API directly (no Next proxy).

## Reproduce the artifacts a fresh checkout needs

1. **Install dependencies** (package manager is npm):
   - `cd backend && npm install`
   - `cd frontend && npm install`

2. **Create env files** (procedures only — no secret values):
   - `backend/.env`: copy from the main checkout; must contain `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` (MySQL connection) and `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (image uploads).
   - `frontend/.env`: copy from the main checkout, but set `NEXT_PUBLIC_API_URL=http://localhost:5000` for a local preview. (The main checkout had a LAN IP here — adapt per worktree. `NEXT_PUBLIC_*` is inlined at server start, so set it before launching.)

3. **MySQL is required for data features.** The backend boots without it (the mysql2 pool is lazy) and the marketing homepage + page shells render, but `/styles`, `/boms`, `/auth/users`, login, register, and CRUD all return 500 `ECONNREFUSED` if MySQL is not reachable at `MYSQL_HOST:MYSQL_PORT`. Start MySQL (or point `MYSQL_HOST` at a reachable server) and run `npm run db:push` inside `backend/` to create tables for a fully working preview.

## Run the servers

**Gotcha:** the dev-shell environment exports `PORT=52333`, which overrides `dotenv`'s `.env` values (dotenv does not overwrite existing env vars). Always launch with explicit `PORT=` values on the command line.

Detach both processes so they survive the launching shell (plain `nohup ... &` gets reaped; use `cmd /c start /b` on Windows). Both log to the same file: `.freebuff/preview-*.log`.

```bash
# 1) Backend — Express API on 5000
cd backend
PORT=5000 cmd //c "start /b node server.js" >> ../.freebuff/preview-<id>.log 2>&1

# 2) Frontend — Next.js dev server on 3000
#    Use the installed binary directly; `npx next dev`'s process tree can get
#    reaped when the launching shell exits.
cd ../frontend
PORT=3000 cmd //c "start /b node node_modules/next/dist/bin/next dev -p 3000" >> ../.freebuff/preview-<id>.log 2>&1
```

**Verify before registering:**

```bash
netstat -ano | grep LISTENING | grep -E ':(3000|5000)'   # both listening
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"  # 200 (first compile ~5-9s)
curl -s http://localhost:5000/                            # {"message":"API is running"}
```

**Register the preview** with the URL `http://localhost:3000` and the PID of the Next.js process (from `netstat`).

## Known notes (August 2026)

- The backend serves the API on 5000; the frontend on 3000. Both were launched detached via `cmd /c start /b`.
- No local MySQL was running at preview time, so data pages show a friendly error banner (added defensive guards in `style-register/page.js` and `bom-booking/page.js` so an error response renders instead of crashing).
- Fixed the top-nav "Style Register" link in `TopNavbar.jsx` from `/StyleRegister` → `/style-register` (it previously 404'd).
