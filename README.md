[README.md](https://github.com/user-attachments/files/33751697/README.md)
# Clock me Out (MERN)

The original Clock me Out app, unchanged in look and behaviour, with Google sign-in and per-account cloud storage.
React (Vite) sign-in shell · Express API · MongoDB Atlas · deployable to Vercel.

```
clock-me-out/
├── client/
│   ├── public/app.html   the original app (v2.293) + a small sync script and a "Sign out" row in Settings
│   └── src/              React sign-in page (Google) that loads your data, then opens /app.html
└── server/               Express API (runs as a Vercel serverless function)
```

## How it works
1. `/` shows the sign-in page (React) with **Sign in / Sign up** tabs: email + password, or Google. After sign-in it downloads your saved data and opens `/app.html`.
2. `/app.html` is the original app. A sync script mirrors its six data keys (logs, shift, holidays, absences, name) to the API a moment after every change, and when you leave the page.
3. When you return to a tab, newer data from another device is picked up automatically.
4. Theme, pointer effects and sound stay per device, exactly as before.

## Moving your existing data over
On the old site: Settings → Backup → **Download backup**.
On the new site: Settings → Backup → **Restore backup**, choose that file.

## 1. One-time setup
**MongoDB Atlas:** free cluster, a database user, Network Access `0.0.0.0/0`. Copy the connection string into `MONGODB_URI`.
**Google sign-in:** Google Auth Platform → Clients → Web application. Authorized JavaScript origins: `http://localhost:5173` and your deployed client URL. Copy the Client ID.

## 2. Run locally
```bash
# API
cd server
cp .env.example .env      # MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID, CLIENT_URL
npm install
npm run dev               # http://localhost:5000

# Client (new terminal)
cd client
cp .env.example .env      # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm install
npm run dev               # http://localhost:5173
```

## 3. Push to GitHub
```bash
git init && git add . && git commit -m "Clock me Out MERN"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main --force
```

## 4. Deploy to Vercel (two projects, one repo)
**API:** Root Directory `server`. Env: `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CLIENT_URL` (the client URL, no trailing slash).
**Client:** Root Directory `client`, framework Vite. Env: `VITE_API_URL` (`https://<api>.vercel.app/api`), `VITE_GOOGLE_CLIENT_ID`.
Add the client URL to the Google OAuth Authorized JavaScript origins, then redeploy both.

## API
| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Create an email + password account, return a session token |
| `POST /api/auth/login` | Sign in with email + password |
| `POST /api/auth/google` | Verify the Google ID token, return a session token |
| `GET /api/auth/me` | Current user |
| `POST /api/admin/login`, `GET /api/admin/stats`, `GET/PATCH/DELETE /api/admin/users…` | Admin dashboard (admin token only) |
| `GET /api/state` | The user's saved data (`data` is `null` until first save) |
| `PUT /api/state` | Replace the user's saved data |

## Admin dashboard
Open `https://<your-client>/admin`. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, which you set as environment variables on the **server** project (not in the database, and not tied to any user account). Use a unique password of 12+ characters.
- Overview: total users, new sign-ups, active users, Google vs email split, 14-day sign-up chart.
- Users: search, view a summary, disable or enable, unlock, delete.
- Admin sessions last 8 hours and end when the tab closes. 5 wrong passwords from one IP lock admin sign-in for 15 minutes.
- Privacy: the dashboard shows summaries (days logged, last saved), never a person's actual entries.
- A disabled user is signed out and blocked on their next request.

## Credits
The mascot is based on [page-mascot](https://github.com/nilbuild/page-mascot) (MIT License, © Kamran Ahmed). Its sprite sheets are in `client/public/mascot-*.webp`.

## Notes
- One account per email: a Google account and a password account with the same email are not merged. Passwords are hashed with scrypt; 8 failed sign-ins lock that account for 15 minutes.
- There is no email verification or "forgot password" yet (both need an email-sending service).
- If two devices edit at the same time, the most recent save wins.
- The session token lives in `localStorage` for 30 days. For stricter security, move it to an httpOnly cookie (needs `SameSite=None; Secure` across two Vercel domains).
- To update the app itself later, edit `client/public/app.html` and keep the sync `<script>` at the top of `<head>`.
