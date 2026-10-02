-- ============================================================================
-- Aura Fitness Management - database schema
-- PostgreSQL (Neon)
--
-- Run with: npm run db:setup
--
-- Design notes
--   * A member and a membership are separate things. A person is one row in
--     `members` forever; every term they buy is a new row in `memberships`.
--     That is what makes renewal history possible.
--   * Display status (Active / Expiring Soon / Expired) is never stored. It is
--     always derived from end_date, see lib/utils/membershipStatus.js.
--   * All `date` columns are calendar dates with no time component, so they are
--     immune to timezone drift. Never compare them against current_date - the
--     database clock is UTC and the gym is not. The application passes its own
--     local "today" into every query instead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- membership_plans
-- The catalogue of plans the gym sells. Plans are data rather than a hardcoded
-- dropdown so the owner can add "Student Monthly" without a code change.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_plans (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  description   text,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price         numeric(10, 2) NOT NULL CHECK (price >= 0),
  -- Retiring a plan must not break the memberships that reference it, so plans
  -- are deactivated rather than deleted.
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- A name only has to be unique among the plans on sale, so a deleted
-- (deactivated) "Monthly" does not stop a new "Monthly" being created. Older
-- databases had a plain UNIQUE on name; it is dropped here.
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plans_active_name
  ON membership_plans (lower(name)) WHERE is_active;

-- ---------------------------------------------------------------------------
-- members
-- The person. Contact and identity details only - no membership dates here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name               text NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name                text NOT NULL CHECK (length(trim(last_name)) > 0),
  -- The gym identifies people by phone, so it is the natural unique key.
  phone                    text NOT NULL UNIQUE,
  -- Optional. Postgres allows many NULLs in a UNIQUE column, so members
  -- without an email do not collide. Store NULL, never an empty string.
  email                    text UNIQUE,
  gender                   text CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth            date,
  address                  text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  notes                    text,
  -- The day this person first joined the gym. It belongs to the person, not to
  -- any single membership term, which is why it lives here and drives the
  -- "New Members This Month" report.
  join_date                date NOT NULL,
  -- Marks rows created by `npm run db:seed` so demo data can be removed with a
  -- single DELETE. Drop this column once you no longer need seed data.
  is_demo                  boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_join_date ON members (join_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_is_demo ON members (is_demo) WHERE is_demo;

-- Whether the person still trains here. Members are never deleted: someone who
-- leaves is marked 'left' so their record and payment history stay on file.
-- Added with ALTER so an existing database picks it up on `npm run db:setup`.
ALTER TABLE members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'left'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS left_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);

-- ---------------------------------------------------------------------------
-- memberships
-- One row per membership term. A member accumulates rows here over time:
--   Rahul -> Monthly (Jan-Feb) -> Monthly (Feb-Mar) -> Quarterly (Apr-Jun)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Deleting a member deletes their terms with them: a membership has no
  -- meaning without the person it belongs to.
  member_id          integer NOT NULL REFERENCES members (id) ON DELETE CASCADE,

  -- A plan that has been sold must not be deleted out from under its history.
  -- Deactivate it instead (membership_plans.is_active).
  membership_plan_id integer NOT NULL REFERENCES membership_plans (id) ON DELETE RESTRICT,

  start_date         date NOT NULL,
  end_date           date NOT NULL,
  CONSTRAINT memberships_valid_period CHECK (end_date >= start_date),

  -- The price actually charged, copied from the plan at purchase time. If the
  -- owner raises the Monthly price next year, old terms must still show what
  -- was really paid, so this is never read through to the plan.
  price              numeric(10, 2) NOT NULL CHECK (price >= 0),

  -- Lifecycle status only. This is NOT the Active/Expiring/Expired badge -
  -- that is derived from end_date. This column answers a question the dates
  -- cannot: was this term cancelled or refunded before it ran out?
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'cancelled')),

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships (member_id);
-- Drives every expiry query on the dashboard and the members table.
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships (end_date);

-- ---------------------------------------------------------------------------
-- payments
-- Money the gym has actually received. This records payments, it does not
-- process them - the owner enters what was handed over at the desk or sent
-- over UPI.
--
-- A payment usually pays for one membership term, but the link is optional so
-- a one-off charge can be recorded against a member without inventing a term
-- for it.
--
-- Several payments can point at the same term. That is what makes part
-- payments possible: 2,000 today and 2,000 next week against a 4,000 term.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- A payment belongs to a person. Deleting the member removes their payment
  -- history along with the rest of their record.
  member_id     integer NOT NULL REFERENCES members (id) ON DELETE CASCADE,

  -- The term this money paid for. Nullable, and set to NULL rather than
  -- deleted if the term ever goes away: money received is a financial record
  -- and must not disappear because a membership was tidied up.
  membership_id integer REFERENCES memberships (id) ON DELETE SET NULL,

  amount        numeric(10, 2) NOT NULL CHECK (amount > 0),

  method        text NOT NULL CHECK (method IN ('upi', 'cash')),

  -- The day the money changed hands, which is not necessarily the day it was
  -- entered. Cash collected yesterday is often recorded this morning.
  paid_on       date NOT NULL,

  -- The UPI transaction reference (UTR). Only meaningful for UPI, and even
  -- then optional - an owner will not always have it to hand.
  reference     text,

  remark        text,

  -- Marks rows created by the seed, matching members.is_demo.
  is_demo       boolean NOT NULL DEFAULT false,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- A reference only makes sense against a UPI payment.
  CONSTRAINT payments_reference_requires_upi
    CHECK (method = 'upi' OR reference IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments (member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON payments (membership_id);
-- Drives the payment history list, which is always newest first.
CREATE INDEX IF NOT EXISTS idx_payments_paid_on ON payments (paid_on DESC);

-- ---------------------------------------------------------------------------
-- admins
-- The people allowed to sign in. Only someone with a row here can log in.
--
-- The password is stored as plain text for now. Hash it (and compare with the
-- hash) before this holds any password that matters.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL CHECK (length(trim(name)) > 0),
  email       text NOT NULL UNIQUE,
  password    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- The first admin. ON CONFLICT keeps a re-run from duplicating him or
-- resetting a password that has since been changed.
INSERT INTO admins (name, email, password)
VALUES ('Hiren', 'hiren@gmail.com', 'hiren')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- admin_sessions
-- One row per signed-in browser. The cookie holds only the random token; who
-- it belongs to is looked up here on every request, so a cookie cannot be
-- edited into someone else's session, and logging out ends it for real.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  token       text PRIMARY KEY,
  admin_id    integer NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions (admin_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- Every change made through the application: who did it, what they did, and
-- to which record. Rows are only ever inserted - nothing updates or deletes
-- them - so the history stays trustworthy as more admins are added.
--
-- admin_name and entity_label are copies taken at the time, so a log still
-- reads correctly after the admin or the member is renamed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id      integer REFERENCES admins (id) ON DELETE SET NULL,
  admin_name    text NOT NULL,
  -- create | update | left | restore | delete
  action        text NOT NULL,
  -- member | payment | plan   (logins are not logged)
  entity_type   text NOT NULL,
  entity_id     integer,
  entity_label  text,
  -- What changed, shaped per action - see lib/utils/auditLog.js.
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- One trigger function shared by every table, so no query has to remember to
-- set updated_at by hand.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_memberships_updated_at ON memberships;
CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- member_overview
-- A member together with their CURRENT membership, where "current" means the
-- non-cancelled term with the latest end date.
--
-- This definition is needed by the dashboard, the members table, and later by
-- reports and renewals. Writing it once as a view keeps that DISTINCT ON out
-- of every repository function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW member_overview AS
SELECT
  m.id,
  m.first_name,
  m.last_name,
  m.first_name || ' ' || m.last_name AS full_name,
  m.phone,
  m.email,
  m.gender,
  m.date_of_birth,
  m.address,
  m.emergency_contact_name,
  m.emergency_contact_phone,
  m.notes,
  m.join_date,
  m.created_at,
  m.updated_at,
  cm.id                 AS membership_id,
  cm.membership_plan_id,
  p.name                AS plan_name,
  cm.start_date         AS membership_start_date,
  cm.end_date           AS membership_end_date,
  cm.price              AS membership_price,
  cm.status             AS membership_status,
  -- What has been received against that term so far. COALESCE turns "no
  -- payments yet" into 0 rather than NULL, so the members list can work out
  -- Paid / Partial / Unpaid without a second query per row.
  COALESCE(paid.amount_paid, 0) AS membership_amount_paid,
  paid.last_paid_on,
  -- Appended last: CREATE OR REPLACE VIEW can add columns only at the end.
  m.status              AS member_status,
  m.left_at
FROM members m
LEFT JOIN LATERAL (
  SELECT ms.*
  FROM memberships ms
  WHERE ms.member_id = m.id
    AND ms.status <> 'cancelled'
  ORDER BY ms.end_date DESC, ms.id DESC
  LIMIT 1
) cm ON true
LEFT JOIN membership_plans p ON p.id = cm.membership_plan_id
LEFT JOIN LATERAL (
  SELECT
    sum(pay.amount) AS amount_paid,
    max(pay.paid_on) AS last_paid_on
  FROM payments pay
  WHERE pay.membership_id = cm.id
) paid ON true;

-- ---------------------------------------------------------------------------
-- payment_overview
-- A payment together with who made it and which term it paid for.
--
-- Defined once here so the payment history, a member's own history and the
-- totals all read the same shape, rather than repeating this join in every
-- repository function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW payment_overview AS
SELECT
  pay.id,
  pay.member_id,
  pay.membership_id,
  pay.amount,
  pay.method,
  pay.paid_on,
  pay.reference,
  pay.remark,
  pay.created_at,
  m.first_name || ' ' || m.last_name AS member_name,
  m.phone                            AS member_phone,
  plan.name                          AS plan_name,
  ms.start_date                      AS membership_start_date,
  ms.end_date                        AS membership_end_date,
  ms.price                           AS membership_price
FROM payments pay
JOIN members m ON m.id = pay.member_id
LEFT JOIN memberships ms ON ms.id = pay.membership_id
LEFT JOIN membership_plans plan ON plan.id = ms.membership_plan_id;
