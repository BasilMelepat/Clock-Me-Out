# Clock me Out (MERN)

Work-hours and clock-out calculator with Google sign-in.
React (Vite) client · Express API · MongoDB Atlas · deployable to Vercel.

```
clock-me-out/
├── client/   React app (Vite)
└── server/   Express API (runs as a Vercel serverless function)
```

## 1. One-time setup

### MongoDB Atlas
1. Create a free cluster, then a database user.
2. Network Access → allow `0.0.0.0/0` (Vercel IPs change).
3. Copy the connection string into `MONGODB_URI`.

### Google sign-in
1. Google Cloud Console → APIs & Services → OAuth consent screen → configure it (add test users while in Testing mode).
2. Credentials → Create credentials → OAuth client ID → **Web application**.
3. Authorized JavaScript origins: `http://localhost:5173` and, later, your deployed client URL.
4. Copy the Client ID. No redirect URI is needed.

## 2. Run locally

```bash
# API
cd server
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID
npm install
npm run dev               # http://localhost:5000

# Client (new terminal)
cd client
cp .env.example .env      # fill in VITE_GOOGLE_CLIENT_ID
npm install
npm run dev               # http://localhost:5173
```

## 3. Push to GitHub

```bash
cd clock-me-out
git init
git add .
git commit -m "Clock me Out MERN"
git branch -M main
git remote add origin https://github.com/<you>/clock-me-out.git
git push -u origin main
```

## 4. Deploy to Vercel (two projects, one repo)

**API**: Vercel → Add New Project → import the repo → **Root Directory: `server`**.
Environment variables: `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CLIENT_URL` (set after the client is deployed, e.g. `https://clock-me-out.vercel.app`).
Test: `https://<api>.vercel.app/api/health` should return `{"ok":true}`.

**Client**: import the same repo again → **Root Directory: `client`** (framework: Vite).
Environment variables: `VITE_API_URL=https://<api>.vercel.app/api`, `VITE_GOOGLE_CLIENT_ID`.

Finally add the client's Vercel URL to the Google OAuth **Authorized JavaScript origins** and to `CLIENT_URL` on the API project, then redeploy the API.

## API overview

| Route | Purpose |
|---|---|
| `POST /api/auth/google` | Verify Google ID token, return session JWT |
| `GET/PATCH /api/auth/me` | Profile and settings |
| `GET/PUT/DELETE /api/shift` | Today's shift (clock-in, target, breaks, running late, departure) |
| `GET /api/logs`, `PUT/DELETE /api/logs/:date`, `POST /api/logs/bulk`, `DELETE /api/logs?month=` | Daily log |
| `GET/PUT/DELETE /api/holidays…` | Holidays and absences |
| `POST /api/import/excel` | Attendance `.xlsx` import |
| `GET /api/data/backup`, `POST /api/data/restore`, `DELETE /api/data` | Backup, restore, flush |

## Notes
- The Excel importer is a best-effort parser: it finds a header row containing "Date", then an hours column (names like Worked, Effective, Total, Duration), an optional Target column and an optional Status column. If your sheet layout differs, adjust `server/src/lib/attendance.js`.
- Alerts (sound and browser notifications) run in the browser, so the page has to stay open.
- The session token is kept in `localStorage`. For stricter security, move it to an httpOnly cookie (needs `SameSite=None; Secure` across the two Vercel domains).
