# Clock me Out

Work-hours and clock-out calculator. Sign in, and your shifts and daily log are saved to your account and follow you to every device.
React sign-in page · Express API · MongoDB.

```
clock-me-out/
├── client/
│   ├── public/app.html   the Clock me Out app (v3.10.0) with cloud sync and a "Sign out" row in Settings
│   └── src/              sign-in page (Google or email) and the admin dashboard
└── server/               Express API
```

## Getting started
1. Open **https://clock-me-out.vercel.app**.
2. Sign in with Google, or choose **Sign up** to create an account with your email and a password.
3. You land in the app. Your data saves to your account automatically, so signing in on another device shows the same shifts and log.

4. **Install it like an app (optional).** On a phone, use your browser's *Add to Home Screen* / *Install app*. On desktop Chrome or Edge, click the install icon in the address bar, or use **Settings → Profile → Install app**. It then opens in its own window, and the app itself still opens when you are offline (your data loads from the cloud, or the last copy on the device).

Signing out is under **Settings → Cloud sync → Sign out**.

## How it works
1. The sign-in page has **Sign in / Sign up** tabs: email + password, or Google. After signing in it loads your saved data and opens the app.
2. Every time the app opens it loads your data from the cloud first (a short loading screen), never from this device's saved copy. If the cloud can't be reached within 8 seconds it opens the last copy saved on this device and tells you. Changes made on this device that haven't uploaded yet are kept, not overwritten.
3. A sync engine saves the app's six data keys (logs, shift, holidays, absences, name) to your account a moment after every change, and when you leave the page.
4. The header **cloud button** and **Settings → Cloud sync** show the status: tap to sync now, **Upload** to overwrite the cloud copy with this device, **Restore** to replace this device with the cloud copy.
5. Coming back to a tab picks up changes from other devices. If this device and the cloud both changed, nothing is overwritten and you choose Upload or Restore.
6. In the Log tab the Table View can be sorted by Day, Clocked, Target or Log (tap a column title again to reverse). Hovering a day in the calendar highlights its table row, and hovering a row highlights its day in the calendar. In the calendar's List view, today's row fills with your live shift progress (like today's cell in the grid) and reads "In progress · 63%".
7. **Clear Log** in the Table View removes every day shown for that month, after a warning popup. **Bulk Import** has two steps (upload a sheet, or paste entries) and its Import button stays disabled until there is something valid to import.
8. Click a row in the Table View to edit that day. Deleting an entry, clearing the log, deleting a past month, or removing holidays and absences shows a toast with an **Undo** button (or press Ctrl/Cmd+Z) for a few seconds.
9. **Settings → Profile** shows your Google photo, name and email with a Sign out button, and a field for the name used in your greetings. **Settings → Your data** keeps backups in one card: **Cloud** (sync, upload, restore from your account) and **Offline** (download or restore a backup file).
10. **Settings → Preferences → Theme** has six colour themes (Ocean, Forest, Sunset, Grape, Rose, Slate), each with a light and a dark look, plus a Light/Dark switch. The choice is saved on this device and also colours the sign-in page and the admin dashboard.
11. Main actions (starting or stopping a shift, adding breaks, logging days, holidays, backup, name) show a short toast message. In the admin dashboard, disabling, enabling, unlocking and deleting do too.
12. Theme, pointer effects and sound stay per device.

## Moving your existing data over
On the old site: Settings → Backup → **Download backup**.
On the new site: Settings → Backup → **Restore backup**, choose that file.

## Admin dashboard
Open **https://clock-me-out.vercel.app/admin** and sign in with the admin email and password. These belong to the site owner and are separate from user accounts.
- **Overview:** total users, new sign-ups, active users, Google vs email split, 14-day sign-up chart, and the top people running late and ahead.
- **Attendance:** a month calendar showing how many people logged hours each day (and holidays and absences). Click a day to see who logged, how long, and whether they were ahead or short. Below are the full Running late and Ahead of target lists for the month.
- **Users:** search, view a summary, disable or enable, unlock, delete.
- **Mascot tips:** the mascot gives a short status message. Tap it for the next tip.
- Admin sessions last 8 hours and end when the tab closes. 5 wrong passwords from one IP lock admin sign-in for 15 minutes.
- "Running late" means a person's logged time for the month is below their targets; "ahead" means above.
- Privacy: the admin can see daily hours and ahead/behind totals per person. The sign-up form tells new users this.
- A disabled user is signed out and blocked on their next request.

## API
| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Create an email + password account, return a session token |
| `POST /api/auth/login` | Sign in with email + password |
| `POST /api/auth/google` | Verify the Google ID token, return a session token |
| `GET /api/auth/me` | Current user |
| `POST /api/admin/login`, `GET /api/admin/stats`, `GET /api/admin/attendance`, `GET/PATCH/DELETE /api/admin/users…` | Admin dashboard (admin token only) |
| `GET /api/state` | The user's saved data (`data` is `null` until first save) |
| `PUT /api/state` | Replace the user's saved data |

## Versioning
MAJOR.MINOR.PATCH, shown in the header badge (for example v3.10.0).
- **MAJOR:** a big redesign or a change that breaks saved data.
- **MINOR:** a new feature.
- **PATCH:** a fix or small tweak.

Every release changes the number, including admin-only and server changes. To release, change the number in the badge (`id="versionBadge"` in `client/public/app.html`) and `VERSION` in `client/public/sw.js`, so installed copies refresh their offline files.

## Credits
The mascot is based on [page-mascot](https://github.com/nilbuild/page-mascot) (MIT License, © Kamran Ahmed). Its sprite sheets are in `client/public/mascot-*.webp`.

## Notes
- One account per email: a Google account and a password account with the same email are not merged. Passwords are hashed with scrypt; 8 failed sign-ins lock that account for 15 minutes.
- There is no email verification or "forgot password" yet (both need an email-sending service).
- The shift's `savedAt` timestamp is ignored when comparing copies, so re-saving the same data never counts as a change.
- The session token is kept in the browser for 30 days.
- To change the app itself, edit `client/public/app.html` and keep the sync `<script>` at the top of `<head>`.
