# Aura Fitness Management

A gym management system for tracking members and their memberships.

This is version 1 — a deliberately small MVP covering the Dashboard and the
Members module, built so that Attendance, Payments, Trainers, Expenses and
Reports can be added later without rework.

## Technology

- **Next.js 16** (App Router, Server Components, API Route Handlers, Proxy)
- **JavaScript** — no TypeScript
- **PostgreSQL** on **Neon**, via `@neondatabase/serverless`
- **CSS Modules** with design tokens — no UI framework

## Getting started

```bash
npm install

# .env must contain your Neon connection string:
#   DATABASE_URL=postgresql://...

npm run db:setup    # create tables, indexes, views and the first admin
npm run db:seed     # add 4 plans and 15 demo members
npm run dev
```

The application opens on <http://localhost:3000>. Signed-out visitors land on
the login page. The first admin is created by `db:setup`:

| Name | Email | Password |
| --- | --- | --- |
| Hiren | hiren@gmail.com | hiren |

Passwords are stored as plain text for now - hash them before this holds a
password that matters.

### Database scripts

| Command | What it does |
| --- | --- |
| `npm run db:setup` | Applies `database/schema.sql`. Safe to re-run, and also upgrades an existing database. |
| `npm run db:seed` | Applies `database/seed.sql`. Replaces existing demo data rather than duplicating it. |
| `npm run db:seed:clear` | Deletes every demo member and their memberships. Plans are kept. |
| `npm run db:reset` | Drops everything, then sets up and seeds from scratch. |

Demo members are flagged with `members.is_demo`, so removing them is a single
`DELETE`. Once you no longer need seed data you can drop that column.

## How it is put together

```text
app/
  login/        the only page a signed-out visitor can see
  (app)/        every signed-in page, inside the shell (the group name is not
                part of the URL): dashboard, members, payments, history
  api/          the API routes - every write goes through one of these
proxy.js        sends signed-out visitors to /login
components/     UI, layout, dashboard, member, payment and history components
  ui/           the shared building blocks: Button, Card, Input, Badge, Modal…
lib/
  auth.js       who is signed in - checked by every page and API route
  api.js        helpers shared by the API routes
  client/api.js how the browser calls the API routes
  config.js     business settings
  db/           every SQL query in the application
  utils/        dates, membership and payment status, audit log wording
  validations/  form validation
database/       schema.sql and seed.sql
scripts/db.mjs  the database CLI behind the npm scripts
```

### The rule that shapes the code

```text
reads:   page (Server Component)  →  lib/db  →  PostgreSQL
writes:  form  →  fetch /api/...  →  validation  →  lib/db  →  PostgreSQL
```

There are no Server Actions. Every change is a plain HTTP call to a route in
`app/api`, which makes them callable from anywhere - including a cron job.

| Method | Route | Does |
| --- | --- | --- |
| POST | `/api/auth/login` | Signs in, sets the session cookie |
| POST | `/api/auth/logout` | Ends the session, clears the cookie |
| POST | `/api/members` | Adds a member, their first term and their joining payment |
| PATCH | `/api/members/:id` | Edits a member and their current term |
| DELETE | `/api/members/:id` | Marks the member as **left** - deletes nothing |
| POST | `/api/members/:id/restore` | Brings a left member back |
| POST | `/api/payments` | Records a payment, optionally with a new term |
| DELETE | `/api/payments/:id` | Removes a payment record (a copy stays in the log) |
| POST | `/api/plans` | Adds a membership plan |
| PATCH | `/api/plans/:id` | Edits a plan's name, length or price |
| DELETE | `/api/plans/:id` | Takes a plan off sale - members on it keep it |

Every route answers `{ ok: true, ... }` or `{ ok: false, message, errors }`.

Components never contain SQL, and `lib/db` never contains JSX. `lib/db` is
marked `server-only`, so importing it into a Client Component fails the build
rather than leaking `DATABASE_URL` towards the browser.

### Signing in

Only people with a row in the `admins` table can sign in. A login creates a
row in `admin_sessions` with a random token, and the browser keeps only that
token in an httpOnly cookie for 30 days.

`proxy.js` turns away any request without the cookie, but that is only an
early exit - a cookie can be stale or made up. Every page (through
`requireAdmin()`) and every API route (through `withAdmin()`) looks the token
up in the database, and that is what actually protects the data.

### Members are never deleted

The delete button on a member marks them **left** (`members.status`). They
disappear from the everyday lists and the dashboard, appear under the **Left**
filter as faded rows, and keep their record, terms and payments. **Restore**
brings them back - which matters because the phone number stays taken.

### Saving shows a receipt

Adding a member and recording a payment no longer jump to another page. A
success popup shows what was saved - member, plan, dates covered, amount,
method - with buttons to view the member, open Payment History, or go home.

A member joins by paying, so the Add Member form includes the joining payment
(amount, cash or UPI, date). The member, their first term, the payment and
both log entries are written by one SQL statement: all of it is saved, or
none of it.

### Plans

The **Plans** page lists the plans on sale. Editing a price changes it from
the next payment on - every term keeps the price it was sold at. Deleting a
plan only takes it off sale (`membership_plans.is_active`), since members'
terms still point at it.

The payment form never asks for a price: a new term costs its plan's price,
which the API looks up in the database rather than trusting the browser.
Nor does it ask what the payment is for - if the member owes money on their
current term it settles that, otherwise it starts their next term.

### History Logs

Every change is written to `audit_logs`: who made it, what they did, to which
record, and what changed - an edit stores each field as `old → new`. The log
entry is written in the same SQL statement or transaction as the change, so a
change can never happen without its entry. Nothing updates or deletes log
rows. The History Logs page shows them newest first, grouped by day.

### Members and memberships are separate

A member is a person; a membership is one term they bought. A member
accumulates terms over time:

```text
Rahul ─┬─ Monthly    Jan – Feb
       ├─ Monthly    Feb – Mar
       └─ Quarterly  Apr – Jun
```

The `member_overview` view pairs each member with their current term — the
non-cancelled one running latest — so the list and dashboard show what is
current while the detail page shows the whole history.

### Filtering happens in the URL

The members list reads its search term and status filter from the query string
(`?q=` and `?status=`), not from component state. The page re-runs on the
server and PostgreSQL does the filtering, so:

- a filtered view can be bookmarked, shared or refreshed;
- the browser never holds the full member list;
- the dashboard's stat cards can link straight to a filtered list —
  **Total Members** opens `/members`, and **Expiring Soon** opens
  `/members?status=expiring`, each showing exactly the number on the card.

The filter's SQL uses the same date comparisons and the same window as the
badges do in JavaScript, so a filtered list always agrees with the statuses
shown inside it. "Active" includes memberships expiring soon — someone whose
term ends on Friday is still training this week. Every tab except **Left**
leaves out members who have left.

On an expired or expiring member's row the list shows an **Add payment**
button, which opens the payment form with that member already selected. The
**Last Payment** column shows the latest money received - "Paid ₹4,000 on
Sep 22, 2026" - and anything still due on the current term.

### Payments record money, they do not move it

Aura never touches a payment gateway. The owner enters what was already handed
over at the desk or sent by UPI, and a payment is one row in `payments`.

Several payments can point at the same membership term, which is what makes
**part payments** work — ₹2,000 today, ₹2,000 next week against a ₹4,000 term.
That is also where the payment status comes from: it compares what has been
received against what the term costs, so it is **Paid**, **Partial** or
**Unpaid** without anything being stored.

Recording a payment can also create the term it pays for. That is how a renewal
happens — the money and the membership it bought come into existence together,
in a single SQL statement, so a payment can never be left pointing at a term
that failed to be created.

Deleting a payment deliberately leaves the membership alone. Correcting a
mistyped receipt should never take away somebody's gym access; the term simply
reads as unpaid again.

### Everything auto-filled is editable

The payment form fills in what it can and then gets out of the way, because the
owner knows things the database does not:

| Field | Filled with | Why it must stay editable |
| --- | --- | --- |
| Payment date | Today | Cash taken yesterday is often entered this morning |
| Term start | The day after the last term ended | The member may really have started on another day |
| Term end | Start + the plan's length | Terms get extended as a goodwill gesture |
| Amount | The plan's price | Discounts, and part payments |

The term start rule is worth spelling out. A member whose membership ran out
three days ago and pays today is buying a term that **started three days ago**,
not one starting this morning. If it started today, those three days quietly
vanish and their renewal date drifts later with every late payment.

When a member is selected the form shows how long they are covered for
("Expired on Sep 07, 2026 — 3 days ago") and what they still owe, so the owner
can see why a date was chosen before accepting it.

### Status is calculated, never stored

`Active`, `Expiring Soon` and `Expired` are derived from the membership end
date every time they are needed, by `lib/utils/membershipStatus.js`. Nothing is
stored, so nothing can go stale overnight.

`memberships.status` is a different thing: it records whether a term was
cancelled, which no date can tell you.

### Tables become cards on mobile

Below 768px a members row is eight columns on a 375px screen, which means
either unreadable text or sideways scrolling. Instead each row restyles into a
stacked card: the column headings are hidden and re-attached to each cell
through a `data-label` attribute in CSS.

The markup stays one real `<table>` — correct for screen readers and for
copy-paste — and only its presentation changes. Every cell therefore needs a
`data-label`; the first cell becomes the card's title and needs none.

Four breakpoints are used throughout, listed in `app/globals.css`:

| Width | What changes |
| --- | --- |
| 640px | One column, stacked full-width buttons |
| 768px | Tables become stacked cards |
| 1024px | The sidebar is replaced by a tab bar along the bottom, and "Add Member" becomes a floating button |
| 1440px | The members table shows Join Date; the dashboard lists sit side by side |

### Dates avoid timezones entirely

Membership dates are calendar dates, handled as `YYYY-MM-DD` strings from
PostgreSQL all the way to the screen — never JavaScript `Date` objects, which
would shift by a day when formatted in the wrong timezone.

Queries never use `current_date`. Neon's clock is UTC and the gym is not, so
the application works out today's date in `GYM_TIMEZONE` and passes it in.

## Configuration

Set in `.env`, with sensible defaults in `lib/config.js`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | Neon connection string. Required. |
| `GYM_TIMEZONE` | `Asia/Kolkata` | The gym's local timezone. |
| `EXPIRING_SOON_DAYS` | `7` | How early a membership counts as expiring. |

## Changing the colours

The app uses a luxury dark theme - zinc surfaces with amber / gold accents.
Every colour is a variable at the top of `app/globals.css`; no component
hardcodes one. The design specification's names come first and everything
else is mapped onto them:

```css
--bg-main: #09090b;          /* page background (zinc-950) */
--bg-card: #18181b;          /* cards, tables (zinc-900) */
--accent-amber: #f59e0b;     /* buttons, active tabs, highlights */
--accent-amber-dark: #d97706;/* gradients, hover */
--text-primary: #f4f4f5;     /* headings */
--status-active-text: #34d399;   /* Active / Paid */
--status-warning-text: #fbbf24;  /* Expiring Soon */
--status-expired-text: #f87171;  /* Expired */
```

On phones, member lists become cards with Call, WhatsApp and Renew quick
actions (`components/members/MemberCard.js`); tablets and desktops keep the
table.

## Adding a module later

1. Add the table to `database/schema.sql`.
2. Add its queries to `lib/db/<module>.js`.
3. Add the route under `app/<module>/`.
4. Add one entry to `NAV_SECTIONS` in `components/layout/navigation.js` — the
   sidebar and the phone tab bar need no other change. The intended modules are already listed
   there, commented out.

Payments were added exactly this way, and reused what was already there rather
than copying it: `SearchInput` and `FilterTabs` in `components/ui/` came out of
the members list when the payment history needed the same behaviour, and the
row-action buttons moved into `Table.module.css` so both tables cannot drift
apart.

## Not in this version

Attendance, trainers, expenses, reports and notifications are all
deliberately absent. The foundation is built for them; none of them are
implemented.

Within Payments, two things are knowingly left out: a payment cannot be edited
(delete it and record it again), and there is no payment gateway — Aura records
money that has already changed hands and never moves any itself.
