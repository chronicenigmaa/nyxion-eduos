# Nyxion EduOS — Production Setup

Backend runs on Railway, frontend on Vercel, database on Supabase Postgres.

---

## 1. Supabase

Create the project, then grab **Project Settings → Database → Connection string → URI**
(use the **Session pooler** string — it works from Railway and survives IPv6-only
direct-connection issues).

You do **not** need to create tables by hand. The backend runs
`Base.metadata.create_all()` on every boot and adds any missing columns.

### Sharing the database with LearnSpace

This Supabase project (`jiztiytlcrnfffiuaufo`) hosts **both LearnSpace and
EduOS**. Both apps have tables with the same obvious names — `users`,
`schools`, `students` — so putting both in `public` would make them collide:
one app's migration would find the other's `users` table, skip creating its
own, and then attach its foreign keys to the wrong table.

EduOS therefore lives in its own Postgres schema. Set on Railway:

```
DB_SCHEMA=eduos
```

The schema is created automatically on boot if it doesn't exist. Every EduOS
table and every foreign key is schema-qualified, so LearnSpace's `public`
tables are never read, written, or altered. Leave LearnSpace pointed at
`public` (or give it `DB_SCHEMA=learnspace` if you want both namespaced).

> If you ever set `DB_SCHEMA` to `public` on a shared project, EduOS will
> collide with LearnSpace. Startup fails loudly rather than corrupting data,
> but don't rely on that — keep the schemas separate.

The Supabase **API** URL (`https://jiztiytlcrnfffiuaufo.supabase.co`) is a
different thing from the Postgres connection string. The API URL is only used
for the optional `app_logs` REST logging (`SUPABASE_URL`). The backend talks to
Postgres directly via `DATABASE_URL`.

To verify after deploying, open:

```
https://<your-backend>/health/db
```

It reports the connected host, the table list, and how many users / super admins
exist. If `initialized` is `false`, the `error` field says exactly why.

---

## 2. Railway (backend) environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Supabase session-pooler URI. `postgres://` is auto-normalised to `postgresql://`. |
| `DB_SCHEMA` | **yes (shared project)** | `eduos`. See "Sharing the database with LearnSpace" below. |
| `SECRET_KEY` | **yes** | Long random string. Anyone with it can forge login tokens. |
| `ENV` | yes | `production` |
| `SUPER_ADMIN_EMAIL` | yes | First login. Created on boot if no super admin exists. |
| `SUPER_ADMIN_PASSWORD` | yes | Only applied when the account is first created. |
| `SUPER_ADMIN_FORCE_PASSWORD_CHANGE` | no | Default `true` when using the built-in default password. |
| `SEED_DEMO_DATA` | no | Default `true`. Seeds the two demo schools + sample data. Set `false` for a clean tenant. |
| `GROQ_API_KEY` | **yes for AI** | Without it every AI endpoint returns 503. |
| `GROQ_MODEL` | no | Default `llama-3.3-70b-versatile`. |
| `RESEND_API_KEY` | **yes for reset emails** | From resend.com. |
| `MAIL_FROM` | yes with Resend | Must be on a domain verified in Resend. |
| `FRONTEND_URL` | yes | e.g. `https://nyxion-eduos.vercel.app`. Used to build the reset link. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | no | Enables request logging into the `app_logs` table. |

Redeploy after setting these. The startup log prints the DB host it connected to
and whether the bootstrap super admin was created.

---

## 3. Vercel (frontend) environment variables

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL, e.g. `https://nyxion-eduos-production-63b9.up.railway.app` |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | Set to `true` only if you want the demo-account buttons (which display the shared `admin123` password) on the login page. Off by default. |

---

## 4. Super admin accounts

### The first one
Created automatically on boot from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`
if no active super admin exists. This runs in production too — a deploy can
never leave you locked out.

### Creating more from the UI
Sign in as a super admin → **Manage Users → Add User → Role: Super Admin**.
Super admins are global, so no school is assigned. New accounts must set their
own password on first sign-in.

### Creating one from the command line
Useful if you're locked out entirely.

```bash
cd backend
export DATABASE_URL='postgresql://...'      # PowerShell: $env:DATABASE_URL='...'

python create_superadmin.py --list
python create_superadmin.py --email you@example.com --password 'S3cret!' --name "Your Name"
python create_superadmin.py --email you@example.com --reset-password 'NewPass!'
python create_superadmin.py --email you@example.com --generate-password
```

Re-running is safe: an existing account is promoted and re-activated rather than
duplicated, and its password is only touched when you pass one.

### Guardrails
- The last active super admin cannot be deactivated or demoted — you must create
  a replacement first.
- School admins cannot create super admins, and cannot move users into another
  school.

---

## 5. Forgot password

Flow: `/forgot-password` → email with a single-use link → `/reset-password?token=…` → sign in.

- Tokens are random 48-byte values; only their SHA-256 hash is stored, so a
  database leak cannot be replayed.
- Each token expires after `RESET_TOKEN_EXPIRE_MINUTES` (default 60) and is
  single-use. Requesting a new link invalidates the previous one.
- `/forgot-password` always returns the same response whether or not the address
  exists, so it can't be used to discover who has an account.
- A confirmation email is sent whenever a password changes.

**If `RESEND_API_KEY` is not set**, the flow still works but no email is sent —
the link is written to the backend log, and returned in the API response when
`ENV` is not `production`.

Check delivery config at `GET /api/v1/auth/email-status`.

### Resend setup
1. Create an account at resend.com and add your sending domain.
2. Add the DNS records Resend gives you and wait for verification.
3. Set `RESEND_API_KEY` and `MAIL_FROM` (an address on that domain) on Railway.

For a quick test before your domain verifies, `MAIL_FROM=onboarding@resend.dev`
works but only delivers to the address that owns the Resend account.

---

## 6. Verifying AI features

`GET /api/v1/ai/health` (authenticated) makes a real call to Groq and reports
`configured`, `reachable`, the model, and the exact failure reason if any.

AI features are also gated per school by package:

| Package | AI features |
| --- | --- |
| starter | exam generator, lesson planner, notice writer, attendance analysis, fee-defaulter prediction, PDF export, student portal |
| growth | starter + report cards, homework generator, exam analyser, parent messages |
| elite | everything, including AI chatbot, risk scoring, behaviour tracker, plagiarism detector, timetable generator |

A 403 like *"ai chatbot is disabled for your school"* means the school's package
doesn't include it — change it under **Schools → package**, not in the AI config.
Super admins have no school, so they bypass these gates.

---

## 7. Health checks

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness. |
| `GET /health/db` | DB host, table list, user/super-admin/school counts, init errors. |
| `GET /api/v1/auth/email-status` | Whether reset emails can be delivered. |
| `GET /api/v1/ai/health` | Live Groq connectivity check (auth required). |
