[README.md](https://github.com/user-attachments/files/34062258/README.md)
# Clock me Out

Work-hours and clock-out calculator. Sign in, and your shifts and daily log are saved to your account and follow you to every device.
React sign-in page · Express API · MongoDB.

```
clock-me-out/
├── client/
│   ├── public/app.html   the Clock me Out app (v3.0.0) with cloud sync and a "Sign out" row in Settings
│   └── src/              sign-in page (Google or email) and the admin dashboard
└── server/               Express API
```

## Getting started
1. Open **https://clock-me-out.vercel.app**.
2. Sign in with Google, or choose **Sign up** to create an account with your email and a password.
3. You land in the app. Your data saves to your account automatically, so signing in on another device shows the same shifts and log.

Signing out is under **Settings → Cloud sync → Sign out**.

## How it works
1. The sign-in page has **Sign in / Sign up** tabs: email + password, or Google. After signing in it loads your saved data and opens the app.
2. A sync engine saves the app's six data keys (logs, shift, holidays, absences, name) to your account a moment after every change, and when you leave the page.
3. The header **cloud button** and **Settings → Cloud sync** show the status: tap to sync now, **Upload** to overwrite the cloud copy with this device, **Restore** to replace this device with the cloud copy.
4. Coming back to a tab picks up changes from other devices. If this device and the cloud both changed, nothing is overwritten and you choose Upload or Restore.
5. Theme, pointer effects and sound stay per device.

## Moving your existing data over
On the old site: Settings → Backup → **Download backup**.
On the new site: Settings → Backup → **Restore backup**, choose that file.

## Admin dashboard
Open **https://clock-me-out.vercel.app/admin** and sign in with the admin email and password. These belong to the site owner and are separate from user accounts.
- Overview: total users, new sign-ups, active users, Google vs email split, 14-day sign-up chart.
- Users: search, view a summary, disable or enable, unlock, delete.
- Admin sessions last 8 hours and end when the tab closes. 5 wrong passwords from one IP lock admin sign-in for 15 minutes.
- Privacy: the dashboard shows summaries (days logged, last saved), never a person's actual entries.
- A disabled user is signed out and blocked on their next request.

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

## Versioning
MAJOR.MINOR.PATCH, shown in the header badge (for example v3.0.0).
- **MAJOR:** a big redesign or a change that breaks saved data.
- **MINOR:** a new feature.
- **PATCH:** a fix or small tweak.

To release, change the number in the badge (`id="versionBadge"` in `client/public/app.html`).

## Credits
The mascot is based on [page-mascot](https://github.com/nilbuild/page-mascot) (MIT License, © Kamran Ahmed). Its sprite sheets are in `client/public/mascot-*.webp`.

## Notes
- One account per email: a Google account and a password account with the same email are not merged. Passwords are hashed with scrypt; 8 failed sign-ins lock that account for 15 minutes.
- There is no email verification or "forgot password" yet (both need an email-sending service).
- The shift's `savedAt` timestamp is ignored when comparing copies, so re-saving the same data never counts as a change.
- The session token is kept in the browser for 30 days.
- To change the app itself, edit `client/public/app.html` and keep the sync `<script>` at the top of `<head>`.
