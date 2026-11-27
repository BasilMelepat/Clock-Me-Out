# Clock me Out

Work-hours and clock-out calculator. Sign in, and your shifts and daily log are saved to your account and follow you to every device.
React sign-in page · Express API · MongoDB.

```
clock-me-out/
├── client/
│   ├── public/app.html   the Clock me Out app (v3.12.34) with cloud sync and a "Sign out" row in Settings
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
2. **The cloud is the only source of truth.** Every time the app opens it loads your data from the cloud first (a short loading screen with the animated logo) and replaces whatever is on this device; an old copy on a device is never trusted. If the cloud can't be reached the app does not open on old data: it shows "Could not load your data" with **Try again**.
3. Changes save to your account a moment after they happen, and when you leave the page. Every save states which cloud version it was based on; the server refuses a save based on an old version, so a stale device can never overwrite newer data.
4. If two devices changed things, the changes are merged (days are matched by date; nothing from either side is dropped). If this device has days the cloud lacks when the app opens, they are set aside, not deleted.
5. **Settings → Your data → Recover** adds set-aside days back, and lists the cloud's recent saved versions with **Restore**. The header **cloud button** and **Settings → Cloud** show sync status: **Sync now**, **Upload** (replaces the cloud copy; the old one stays in version history), **Restore** (replaces this device with the cloud copy).
6. In the Log tab the Table View can be sorted by Day, Clocked, Target or Log (tap a column title again to reverse). Hovering a day in the calendar highlights its table row, and hovering a row highlights its day in the calendar. In the calendar's List view, today's row fills with your live shift progress (like today's cell in the grid) and reads "In progress · 63%".
7. **Clear Log** in the Table View removes every day shown for that month, after a warning popup. **Bulk Import** has two steps (upload a sheet, or paste entries) and its Import button stays disabled until there is something valid to import.
8. Click a row in the Table View to edit that day. Deleting an entry, clearing the log, deleting a past month, or removing holidays and leave, clearing shift details or breaks, and clearing the running-late time or departure plan shows a toast with an **Undo** button (or press Ctrl/Cmd+Z) for a few seconds.
9. **Settings → Profile** shows your Google photo, name and email with a Sign out button, and a field for the name used in your greetings. **Settings → Your data** keeps backups in one card: **Cloud** (sync, upload, restore from your account) and **Offline** (download or restore a backup file).
10. **Settings → Preferences → Theme** has six colour themes (Ocean, Forest, Sunset, Grape, Rose, Slate), each with a light and a dark look, plus a Light/Dark switch. The choice is saved on this device and also colours the sign-in page and the admin dashboard.
11. Main actions (starting or stopping a shift, adding breaks, logging days, holidays, backup, name) show a short toast message. In the admin dashboard, disabling, enabling, unlocking and deleting do too.
12. Theme, pointer effects and sound stay per device.

## Overview tab and salary deduction
The Overview tab shows the month summary tiles, then **Month Goal**, **Salary Deduction** and **Past Months** side by side on desktop (on tablet Salary Deduction moves to its own row below the other two; on phones they stack, and Past Months only appears once earlier months have logs). Everything follows the month picked at the top.

**Marking days.** **Edit** (on the Holidays or Leave row of Month Goal) opens *Holidays & leave*. Each day carries one mark:

| Mark | Counts as |
|---|---|
| Holiday | Not a working day |
| Nothing logged | 1 unpaid day (see below) |
| Paid leave | 1 paid day, no deduction |
| Half day (unpaid) | 0.5 unpaid day |
| Half day (paid) | 0.5 paid day, no deduction |

**Log a Day** (Daily Log tab) has a *Day type* dropdown for the same marks (plus Holiday): Click any day in Calendar View to load it into Log a Day, with its hours and Day type, and change it from there. Paid leave and Unpaid leave (full day) need only a date (Unpaid leave removes any mark from the day, so it counts as unpaid once it has passed with nothing logged), and Half day (paid or unpaid) takes the hours you worked, or none to only mark the day. Full-day leave can't be added to a date that already has logged hours. Marking a day replaces any earlier mark on it. In the calendar, paid leave is solid green, a paid half day is a green diagonal split, and an unpaid half day is a red one (a half day that also has hours shows a green or red ½ badge). A full paid leave day is not counted as a working day left in Month Goal.

**Salary.** Use the button in the Salary Deduction card title to enter your **monthly salary** once; it applies to every month. For the selected month:
- Working days = days in the month minus Sundays and holidays.
- Unpaid leave = past working days with nothing logged + 0.5 × unpaid half days. Counting starts from your first logged day, and today is not counted until it has passed.
- Deduction % = unpaid leave ÷ working days × 100, capped at 100.
- Deduction = salary × deduction %. Take-home = salary − deduction.

There is no separate Absent mark: log hours, or mark the day as paid leave or a paid half day, otherwise it is unpaid. Amounts are shown as plain numbers, with no currency symbol.

**Data.** Salary and leave are stored in the synced key `cmoPay` (`{ salary, leave: { "YYYY-MM-DD": "paid" | "paidHalf" | "unpaidHalf" } }`). Two devices merge it per date; a holiday on a day beats a leave type for the same day. `cmoPay` is included in backups, and the server accepts it in `server/src/utils/validate.js`, so deploy the server before the client when updating.

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
MAJOR.MINOR.PATCH+BUILD, kept in `client/package.json` and `server/package.json`. The header badge and `client/public/sw.js` are stamped from `client/package.json` by `npm run build` (script `client/scripts/stamp-version.mjs`). Badge shown (for example v3.12.34).
- **MAJOR:** a big redesign or a change that breaks saved data.
- **MINOR:** a new feature.
- **PATCH:** a fix or small tweak.

Every release changes the number, including admin-only and server changes. To release, bump `version` in both `package.json` files.

## Credits
The mascot is based on [page-mascot](https://github.com/nilbuild/page-mascot) (MIT License, © Kamran Ahmed). Its sprite sheets are in `client/public/mascot-*.webp`.

## Notes
- One account per email: a Google account and a password account with the same email are not merged. Passwords are hashed with scrypt; 8 failed sign-ins lock that account for 15 minutes.
- There is no email verification or "forgot password" yet (both need an email-sending service).
- The shift's `savedAt` timestamp is ignored when comparing copies, so re-saving the same data never counts as a change.
- The session token is kept in the browser for 30 days.
- To change the app itself, edit `client/public/app.html` and keep the sync `<script>` at the top of `<head>`.
