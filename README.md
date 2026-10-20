# MiniSocial — Social Media Platform

A clean, complete social media MVP built for **Prodigy InfoTech Web Development Internship — Task 05**. Users can register, log in, create posts (optionally with images), view a global feed, like and comment on posts, and manage their own profile.

Everything is real: React talks to an Express REST API, which stores data in MySQL. No fake data, no placeholder buttons.

## Features

- **Authentication** — register, log in, log out; bcrypt password hashing; JWT sessions delivered as HTTP-only cookies
- **Profiles** — name, username, bio, profile picture (or generated initials); edit only your own profile; view anyone's profile and their posts
- **Posts** — create with text and an optional image, edit/delete only your own, newest first
- **Feed** — all users' posts with author info, like/comment counts, loading / empty / error states and a refresh button
- **Likes** — like/unlike with live counts; duplicate likes impossible (unique DB constraint); shows whether *you* liked a post
- **Comments** — comment on any post, delete only your own, shows author + time
- **Security** — parameterized SQL, JWT-derived user ids, ownership checks, Helmet, CORS allow-list, CSRF origin checks, auth rate limiting

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19 + Vite, React Router, plain Fetch API, hand-written CSS |
| Backend   | Node.js, Express 5, JSON Web Tokens, bcryptjs, multer |
| Database  | MySQL 8 (mysql2 driver) |
| Optional  | Cloudinary (image uploads) |

## Folder Structure

```
social-media-platform/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Navbar, Avatar, PostCard, PostComposer, CommentSection, ...
│   │   ├── pages/          # Login, Register, Home, Profile, NotFound
│   │   ├── context/        # AuthContext (session state)
│   │   ├── services/       # api.js (fetch wrapper), formatTime.js
│   │   ├── hooks/          # usePageTitle
│   │   ├── App.jsx         # Routes
│   │   ├── main.jsx
│   │   └── index.css       # Full design system
│   ├── .env.example
│   └── package.json
├── server/                 # Express API
│   ├── config/             # db.js (MySQL pool), cloudinary.js
│   ├── middleware/         # auth (JWT), csrf, upload (multer), errorHandler
│   ├── routes/             # auth, users, posts, comments
│   ├── controllers/        # Request handlers
│   ├── services/           # post/user queries, Cloudinary upload
│   ├── utils/              # validation, errors, asyncHandler
│   ├── tests/              # unit tests + manual E2E suite
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── database/
│   └── schema.sql          # Safe, idempotent MySQL schema
├── .gitignore
└── README.md
```

## Prerequisites

- **Node.js 18+** (tested on Node 24)
- **MySQL 8** running locally (or any reachable MySQL server)
- **npm** (comes with Node)

## Setup — Step by Step

### 1. Get the code

```bash
cd "/path/to/Social Media"    # the folder containing client/, server/, database/
```

### 2. Create the database and apply the schema

The schema file never drops anything — it only creates what's missing, so it's safe to re-run.

**Option A — you can run MySQL as root via sudo (typical Linux install):**

```bash
sudo mysql < database/schema.sql
```

**Option B — you have a MySQL user with CREATE privileges:**

```bash
mysql -u your_user -p < database/schema.sql
```

This creates the database `social_media_db` plus the `users`, `posts`, `likes` and `comments` tables (with foreign keys, indexes, and a unique constraint on likes). Want a different database name? Edit the first lines of `database/schema.sql`.

### 3. Configure the backend

```bash
cd server
cp .env.example .env
# now edit .env and fill in your real values
```

Minimum required values:

| Variable | Meaning |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Your MySQL connection (`DB_NAME=social_media_db` by default) |
| `JWT_SECRET` | A long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | `http://localhost:5173` in development (used for CORS/CSRF) |

Optional: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (see below). Leave them blank if you don't have a Cloudinary account — the app still works with text-only posts and initials avatars.

> **Never commit your real `.env` file.** It is already listed in `.gitignore`.

### 4. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 5. Run both development servers

Terminal 1 — API (port 3000):

```bash
cd server
npm run dev        # or: npm start
```

Terminal 2 — React app (port 5173):

```bash
cd client
npm run dev
```

Open **http://localhost:5173** in your browser. In development the Vite dev server proxies every `/api` request to the backend, so cookies and CORS just work.

### Production-style run (single server)

```bash
cd client && npm run build      # creates client/dist
cd ../server && npm start       # Express also serves client/dist
```

Then everything is available at `http://localhost:3000`. Set `NODE_ENV=production` in `server/.env` (auth cookies become `Secure`, so HTTPS is required) and point `CLIENT_URL` at your public URL.

## API Endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | – | Create account (name, username, email, password) |
| POST | `/auth/login` | – | Log in (email + password) |
| GET | `/auth/me` | ✔ | Current user (restores session) |
| POST | `/auth/logout` | – | Clear the session cookie |
| GET | `/users/:id` | – | Public profile + post count (no email) |
| PUT | `/users/profile` | ✔ | Update **own** profile (JSON fields + optional `profile_image` file) |
| GET | `/users/:id/posts` | – | Posts by one user, newest first |
| GET | `/posts` | – | Feed (50 newest posts, with `likedByMe` when logged in) |
| GET | `/posts/:id` | – | Single post |
| POST | `/posts` | ✔ | Create post (JSON `{content}` or multipart with `image`) |
| PUT | `/posts/:id` | ✔ | Edit own post |
| DELETE | `/posts/:id` | ✔ | Delete own post (likes/comments cascade) |
| POST | `/posts/:id/like` | ✔ | Like (idempotent) |
| DELETE | `/posts/:id/like` | ✔ | Unlike (idempotent) |
| GET | `/posts/:id/comments` | – | Comments, oldest first |
| POST | `/posts/:id/comments` | ✔ | Add comment |
| DELETE | `/comments/:id` | ✔ | Delete **own** comment |
| GET | `/health` | – | Server health + upload configuration |

Success responses return the resource (e.g. `{ "post": {...} }`); errors always return `{ "error": "message" }` with a proper HTTP status (400/401/403/404/409/429/503).

## How Authentication Works

1. On **register/login** the server verifies the password with **bcryptjs**, signs a **JWT** (`sub` = user id, 1-day expiry) and sends it as an **HTTP-only, SameSite=Lax cookie** — JavaScript can never read it, so tokens don't sit in `localStorage`.
2. The browser attaches the cookie automatically; middleware verifies the signature and puts the user id on the request. **The user id always comes from the verified token**, never from client input.
3. `GET /api/auth/me` restores the session when the page loads; **logout** clears the cookie server-side and the client drops its state.
4. **CSRF defence**: SameSite=Lax cookies + an Origin check that rejects state-changing requests from any origin not in `CLIENT_URL`.
5. Tokens are also accepted as `Authorization: Bearer <token>` so you can test the API with curl/Postman:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}'
# response body contains "token" — then:
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer YOUR_TOKEN"
```

## Optional: Cloudinary Image Uploads

Image uploads (post images + profile pictures) are stored on [Cloudinary](https://cloudinary.com) when configured:

1. Create a free account and a **product environment** (name it anything, e.g. `minisocial`).
2. Copy the Cloud name / API key / API secret from the dashboard into `server/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_secret
```

3. Restart the server. New uploads now work (max 5 MB, PNG/JPG/GIF/WebP).

Without these variables the app runs perfectly in **text-only mode**: attempting an image upload returns a clear `503` message and initials avatars are shown instead of pictures.

## Testing

```bash
cd server
npm test                          # unit tests (validation rules) — no DB needed
node tests/e2e.manual.mjs         # full API suite against a running server + DB
```

The E2E suite covers registration/login/logout, session restore, post CRUD, ownership rules (403s), likes (idempotency), comments, profile updates, username conflicts, CSRF origin blocking, cascade deletes, and rate limiting. It creates throwaway users, so it's safe to re-run.

Frontend checks:

```bash
cd client
npm run lint                      # ESLint (React Hooks rules)
npm run build                     # production build
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Server exits with `Missing required environment variables` | Create `server/.env` from `.env.example` and fill in the values |
| `Could not connect to MySQL` | Check MySQL is running and `DB_*` values in `server/.env` match your setup; apply the schema (step 2) |
| `ER_BAD_DB_ERROR: Unknown database` | Run `database/schema.sql` (or fix `DB_NAME`) |
| `Access denied for user ...` | Wrong `DB_USER`/`DB_PASSWORD` in `server/.env` |
| Login works but the app immediately logs out | `CLIENT_URL` must match the origin you browse to (`http://localhost:5173`); clear old cookies and retry |
| `429 Too many requests` on login | Auth endpoints allow 20 attempts per 15 minutes per IP — wait or restart the server during development |
| `503 Image uploads are not enabled` | Expected without Cloudinary credentials — posts still work without images |
| Port already in use | Change `PORT` in `server/.env`, or stop the other process; the Vite port can be changed in `client/vite.config.js` |
| Proxy errors from Vite (`ECONNREFUSED :3000`) | Start the backend first — Vite forwards `/api` to `http://localhost:3000` |

## Scope Notes

Deliberately **not** included (future enhancements): follows/followers, notifications, chat, stories/reels, video uploads, trending algorithms, admin dashboards.


