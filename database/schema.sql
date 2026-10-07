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

-- Older setups called these owners and operators. Rename first so the
-- CREATE TABLE statements below keep the existing rows.
ALTER TABLE IF EXISTS admins RENAME TO owners;
ALTER TABLE IF EXISTS founders RENAME TO operators;

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
-- Whether the plan includes cardio - the main thing that sets one plan apart
-- from another of the same length, so it is a field of its own rather than a
-- line in the description.
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS includes_cardio boolean NOT NULL DEFAULT false;

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

-- The member's photo, stored on Cloudinary: the image address to show, and
-- Cloudinary's id for it so a replaced or removed photo can be deleted there.
-- No photo means a drawn placeholder face is shown instead.
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_public_id text;

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
-- owners
-- One login per gym. A row here can sign in and see only that gym.
--
-- The password is stored as plain text for now. Hash it (and compare with the
-- hash) before this holds any password that matters.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owners (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL CHECK (length(trim(name)) > 0),
  email       text NOT NULL UNIQUE,
  password    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Hiren is inserted after gym_id exists, further down in this file.
-- Inserting him here would fail once gym_id is required.

-- ---------------------------------------------------------------------------
-- Sessions are not stored. Who is signed in is carried in a signed cookie and
-- checked without a query (lib/auth.js). Older databases had an
-- admin_sessions table; it is dropped here.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS admin_sessions;

-- ---------------------------------------------------------------------------
-- audit_logs
-- Every change made through the application: who did it, what they did, and
-- to which record. Rows are only ever inserted - nothing updates or deletes
-- them - so the history stays trustworthy as more owners are added.
--
-- admin_name and entity_label are copies taken at the time, so a log still
-- reads correctly after the admin or the member is renamed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id      integer REFERENCES owners (id) ON DELETE SET NULL,
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

DROP TRIGGER IF EXISTS trg_admins_updated_at ON owners;
DROP TRIGGER IF EXISTS trg_owners_updated_at ON owners;
CREATE TRIGGER trg_owners_updated_at
  BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- gyms
-- One row per gym that uses this application. Existing Aura Fitness data is
-- gym 1. A gym owner (owners.gym_id) only ever works inside their own gym.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gyms (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Explicit id so re-running this file does not create a second Aura Fitness.
INSERT INTO gyms (id, name)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Aura Fitness')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('gyms', 'id'),
  (SELECT MAX(id) FROM gyms)
);

-- ---------------------------------------------------------------------------
-- operators
-- The person who runs the SaaS (you), not a gym owner. Separate from owners
-- so a founder login can see every gym, and a gym login cannot.
-- The account itself is created from FOUNDER_EMAIL / FOUNDER_PASSWORD in .env
-- by `npm run db:setup`, so the password is not stored in this file.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operators (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL CHECK (length(trim(name)) > 0),
  email      text NOT NULL UNIQUE,
  password   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- saas_subscriptions
-- Whether this gym has paid YOU for the software. This is not member fees.
-- Member fees stay in `payments`. One row per gym. New gyms start unpaid.
-- `paid_until` is the last day the gym may use the software. The gym owner
-- sees that date, and a warning for the last 7 days (EXPIRING_SOON_DAYS).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  gym_id     integer PRIMARY KEY REFERENCES gyms (id),
  status     text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_until date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS paid_until date;

INSERT INTO saas_subscriptions (gym_id, status)
SELECT id, 'unpaid' FROM gyms
ON CONFLICT (gym_id) DO NOTHING;

-- Money the gym paid for this software. Not a member's fee.
CREATE TABLE IF NOT EXISTS saas_payments (
  id                   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gym_id               integer NOT NULL REFERENCES gyms (id),
  amount               numeric(10, 2) NOT NULL CHECK (amount > 0),
  paid_on              date NOT NULL,
  covered_until        date NOT NULL,
  razorpay_order_id    text NOT NULL,
  razorpay_payment_id  text NOT NULL UNIQUE,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- gym_id is added nullable, filled, then required, so existing rows are kept.
ALTER TABLE owners            ADD COLUMN IF NOT EXISTS gym_id integer;
ALTER TABLE members           ADD COLUMN IF NOT EXISTS gym_id integer;
ALTER TABLE membership_plans  ADD COLUMN IF NOT EXISTS gym_id integer;
ALTER TABLE memberships       ADD COLUMN IF NOT EXISTS gym_id integer;
ALTER TABLE payments          ADD COLUMN IF NOT EXISTS gym_id integer;
ALTER TABLE audit_logs        ADD COLUMN IF NOT EXISTS gym_id integer;

UPDATE owners           SET gym_id = 1 WHERE gym_id IS NULL;
UPDATE members          SET gym_id = 1 WHERE gym_id IS NULL;
UPDATE membership_plans SET gym_id = 1 WHERE gym_id IS NULL;
UPDATE memberships ms
   SET gym_id = m.gym_id
  FROM members m
 WHERE ms.member_id = m.id
   AND ms.gym_id IS NULL;
UPDATE payments p
   SET gym_id = m.gym_id
  FROM members m
 WHERE p.member_id = m.id
   AND p.gym_id IS NULL;
UPDATE audit_logs SET gym_id = 1 WHERE gym_id IS NULL;

ALTER TABLE owners           ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE members          ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE membership_plans ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE memberships      ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE payments         ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE audit_logs       ALTER COLUMN gym_id SET NOT NULL;

ALTER TABLE owners           DROP CONSTRAINT IF EXISTS admins_gym_id_fkey;
ALTER TABLE owners           DROP CONSTRAINT IF EXISTS owners_gym_id_fkey;
ALTER TABLE members          DROP CONSTRAINT IF EXISTS members_gym_id_fkey;
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_gym_id_fkey;
ALTER TABLE memberships      DROP CONSTRAINT IF EXISTS memberships_gym_id_fkey;
ALTER TABLE payments         DROP CONSTRAINT IF EXISTS payments_gym_id_fkey;
ALTER TABLE audit_logs       DROP CONSTRAINT IF EXISTS audit_logs_gym_id_fkey;

ALTER TABLE owners
  ADD CONSTRAINT owners_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);
ALTER TABLE members
  ADD CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);
ALTER TABLE membership_plans
  ADD CONSTRAINT membership_plans_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);
ALTER TABLE memberships
  ADD CONSTRAINT memberships_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);
ALTER TABLE payments
  ADD CONSTRAINT payments_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms (id);

-- Phone and email are unique inside one gym, not across every gym.
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_phone_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_gym_phone ON members (gym_id, phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_gym_email ON members (gym_id, email);

-- Two gyms may both sell an active plan named Monthly.
DROP INDEX IF EXISTS idx_membership_plans_active_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plans_gym_active_name
  ON membership_plans (gym_id, lower(name)) WHERE is_active;

-- (id, gym_id) lets a membership or payment prove it belongs to the same gym
-- as its member and plan. id is already unique; this extra unique index is
-- what a composite foreign key is allowed to point at.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_id_gym ON members (id, gym_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plans_id_gym ON membership_plans (id, gym_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_id_gym ON memberships (id, gym_id);

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_member_same_gym;
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_plan_same_gym;
ALTER TABLE payments    DROP CONSTRAINT IF EXISTS payments_member_same_gym;
ALTER TABLE payments    DROP CONSTRAINT IF EXISTS payments_membership_same_gym;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_member_same_gym
  FOREIGN KEY (member_id, gym_id) REFERENCES members (id, gym_id) ON DELETE CASCADE;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_plan_same_gym
  FOREIGN KEY (membership_plan_id, gym_id) REFERENCES membership_plans (id, gym_id) ON DELETE RESTRICT;

ALTER TABLE payments
  ADD CONSTRAINT payments_member_same_gym
  FOREIGN KEY (member_id, gym_id) REFERENCES members (id, gym_id) ON DELETE CASCADE;

-- membership_id stays optional. SET NULL (membership_id) clears only that
-- column when a term is removed, and leaves gym_id in place.
ALTER TABLE payments
  ADD CONSTRAINT payments_membership_same_gym
  FOREIGN KEY (membership_id, gym_id) REFERENCES memberships (id, gym_id)
  ON DELETE SET NULL (membership_id);

ALTER INDEX IF EXISTS idx_admins_gym_id RENAME TO idx_owners_gym_id;
CREATE INDEX IF NOT EXISTS idx_owners_gym_id ON owners (gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members (gym_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_gym_id ON membership_plans (gym_id);
CREATE INDEX IF NOT EXISTS idx_memberships_gym_id ON memberships (gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments (gym_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_gym_id ON audit_logs (gym_id);

-- Hiren belongs to Aura Fitness. ON CONFLICT leaves a changed password alone.
INSERT INTO owners (name, email, password, gym_id)
VALUES ('Hiren', 'hiren@gmail.com', 'hiren', 1)
ON CONFLICT (email) DO UPDATE SET gym_id = COALESCE(owners.gym_id, EXCLUDED.gym_id);

DROP TRIGGER IF EXISTS trg_gyms_updated_at ON gyms;
CREATE TRIGGER trg_gyms_updated_at
  BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_founders_updated_at ON operators;
DROP TRIGGER IF EXISTS trg_operators_updated_at ON operators;
CREATE TRIGGER trg_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_saas_subscriptions_updated_at ON saas_subscriptions;
CREATE TRIGGER trg_saas_subscriptions_updated_at
  BEFORE UPDATE ON saas_subscriptions
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
  m.left_at,
  m.photo_url,
  -- The whole paid-up period, not just the latest term. A member who paid
  -- for Oct 05-Nov 03 and, in advance, Nov 04-Dec 03 is covered from Oct 05
  -- to Dec 03: the start is the earliest term that has not ended yet (in the
  -- gym's timezone), and the end is membership_end_date as above. With no
  -- term still running, it is simply the latest term's start.
  COALESCE(cov.start_date, cm.start_date) AS coverage_start_date,
  COALESCE(cov.terms, 0)                  AS active_terms,
  COALESCE(cov.amount_paid, 0)            AS coverage_amount_paid,
  -- Appended last: CREATE OR REPLACE VIEW can add columns only at the end.
  m.gym_id
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
) paid ON true
LEFT JOIN LATERAL (
  SELECT
    min(ms.start_date) AS start_date,
    count(*)::int      AS terms,
    (SELECT sum(pay.amount) FROM payments pay
      WHERE pay.membership_id IN (
        SELECT t.id FROM memberships t
        WHERE t.member_id = m.id AND t.status <> 'cancelled'
          AND t.end_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
      )) AS amount_paid
  FROM memberships ms
  WHERE ms.member_id = m.id
    AND ms.status <> 'cancelled'
    -- Asia/Kolkata is the gym's timezone (GYM_TIMEZONE in lib/config.js).
    AND ms.end_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
) cov ON true;

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
  ms.price                           AS membership_price,
  -- Appended last: CREATE OR REPLACE VIEW can add columns only at the end.
  m.photo_url                        AS member_photo_url,
  m.gender                           AS member_gender,
  -- Appended last: CREATE OR REPLACE VIEW can add columns only at the end.
  pay.gym_id
FROM payments pay
JOIN members m ON m.id = pay.member_id
LEFT JOIN memberships ms ON ms.id = pay.membership_id
LEFT JOIN membership_plans plan ON plan.id = ms.membership_plan_id;
