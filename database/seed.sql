-- ============================================================================
-- Aura Fitness Management - demo seed data
--
-- Run with:    npm run db:seed
-- Remove with: npm run db:seed:clear   (deletes only members where is_demo)
--
-- Every member inserted here is flagged `is_demo = true`, and their
-- memberships disappear with them through ON DELETE CASCADE.
--
-- Dates are written as offsets from current_date so the dashboard shows a
-- realistic mix - active, expiring, expired and newly joined - no matter which
-- day you run the seed. Demo data is the one place current_date is fine to
-- use; real queries pass the gym's own local date instead (see lib/config.js).
-- ============================================================================

-- Re-running the seed replaces the demo members rather than duplicating them.
DELETE FROM members WHERE is_demo = true;

-- ---------------------------------------------------------------------------
-- Membership plans
-- Kept when demo members are cleared, since these are real plans the gym sells.
-- ---------------------------------------------------------------------------
INSERT INTO membership_plans (name, description, duration_days, price) VALUES
  ('Monthly',     'One month of full gym access',              30,  1500.00),
  ('Quarterly',   'Three months, billed once',                 90,  4000.00),
  ('Half Yearly', 'Six months, includes one fitness review',  180,  7000.00),
  ('Yearly',      'Twelve months, best value',                365, 12000.00)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo members, each with a current membership.
--
-- The offsets are chosen so the dashboard demonstrates every state:
--   end_offset < 0      -> Expired
--   end_offset 0 to 7   -> Expiring Soon
--   end_offset > 7      -> Active
--   join_offset within  -> counted in New Members This Month
--   the current month
--
-- Both inserts run as one statement: the members are created, and their
-- memberships are attached to the ids that come back, in a single pass.
-- ---------------------------------------------------------------------------
WITH demo (
  first_name, last_name, phone, email, gender, dob, address,
  ec_name, ec_phone, notes, join_offset, plan_name, start_offset, end_offset
) AS (
  VALUES
    ('Rahul',  'Patel',    '+91 90000 00001', 'rahul.patel@example.com',  'male'::text,   '1994-04-18'::date, 'Satellite, Ahmedabad'::text,   'Nisha Patel'::text,   '+91 90000 10001'::text, 'Prefers early morning sessions.'::text, -242, 'Monthly',      -28,   2),
    ('Amit',   'Shah',     '+91 90000 00002', 'amit.shah@example.com',    'male',         '1989-11-02',       'Bopal, Ahmedabad',             'Riya Shah',           '+91 90000 10002',       NULL,                                    -370, 'Quarterly',    -87,   3),
    ('Priya',  'Mehta',    '+91 90000 00003', 'priya.mehta@example.com',  'female',       '1997-06-25',       'Vastrapur, Ahmedabad',         'Anil Mehta',          '+91 90000 10003',       'Joined after a trial week.',              -5, 'Monthly',       -5,  25),
    ('Neha',   'Shah',     '+91 90000 00004', 'neha.shah@example.com',    'female',       '1992-01-30',       'Thaltej, Ahmedabad',           'Kunal Shah',          '+91 90000 10004',       NULL,                                      -8, 'Quarterly',     -8,  82),
    ('Karan',  'Desai',    '+91 90000 00005', 'karan.desai@example.com',  'male',         '1986-09-14',       'Prahlad Nagar, Ahmedabad',     'Sonal Desai',         '+91 90000 10005',       'Long-standing member, renews yearly.',  -735, 'Yearly',      -245, 120),
    ('Sneha',  'Joshi',    '+91 90000 00006', 'sneha.joshi@example.com',  'female',       '1995-03-08',       'Navrangpura, Ahmedabad',       'Dipak Joshi',         '+91 90000 10006',       'Follow up about renewal.',              -205, 'Half Yearly', -192, -12),
    ('Vikram', 'Rana',     '+91 90000 00007', 'vikram.rana@example.com',  'male',         '1991-12-19',       'Chandkheda, Ahmedabad',        'Pallavi Rana',        '+91 90000 10007',       NULL,                                     -95, 'Monthly',      -33,  -3),
    ('Meera',  'Trivedi',  '+91 90000 00008', 'meera.trivedi@example.com','female',       '1999-08-11',       'Gota, Ahmedabad',              'Harsh Trivedi',       '+91 90000 10008',       NULL,                                      -2, 'Monthly',       -2,  28),
    ('Arjun',  'Solanki',  '+91 90000 00009', 'arjun.solanki@example.com','male',         '1993-02-27',       'Maninagar, Ahmedabad',         'Jay Solanki',         '+91 90000 10009',       'Training for a half marathon.',         -186, 'Quarterly',    -85,   5),
    ('Pooja',  'Bhatt',    '+91 90000 00010', 'pooja.bhatt@example.com',  'female',       '1990-07-05',       'Shela, Ahmedabad',             'Nirav Bhatt',         '+91 90000 10010',       NULL,                                    -430, 'Yearly',      -165, 200),
    ('Rohit',  'Chauhan',  '+91 90000 00011', NULL,                       'male',         '1996-10-23',       'Naranpura, Ahmedabad',         'Meet Chauhan',        '+91 90000 10011',       'No email on file.',                      -45, 'Monthly',      -23,   7),
    ('Ananya', 'Iyer',     '+91 90000 00012', 'ananya.iyer@example.com',  'female',       '1998-05-16',       'Science City, Ahmedabad',      'Lakshmi Iyer',        '+91 90000 10012',       NULL,                                     -60, 'Half Yearly',  -50, 130),
    ('Devan',  'Parmar',   '+91 90000 00013', 'devan.parmar@example.com', 'male',         '1988-03-03',       'Ranip, Ahmedabad',             'Bhavna Parmar',       '+91 90000 10013',       'Membership lapsed, wants to restart.',  -152, 'Monthly',      -55, -25),
    ('Kavita', 'Nair',     '+91 90000 00014', 'kavita.nair@example.com',  'female',       '1994-12-09',       'Bodakdev, Ahmedabad',          'Suresh Nair',         '+91 90000 10014',       NULL,                                      -1, 'Quarterly',     -1,  89),
    ('Manish', 'Gohel',    '+91 90000 00015', 'manish.gohel@example.com', 'male',         '1987-06-21',       'Nikol, Ahmedabad',             'Rekha Gohel',         '+91 90000 10015',       NULL,                                     -20, 'Monthly',      -20,  10)
),
new_members AS (
  INSERT INTO members (
    first_name, last_name, phone, email, gender, date_of_birth, address,
    emergency_contact_name, emergency_contact_phone, notes, join_date, is_demo
  )
  SELECT
    first_name, last_name, phone, email, gender, dob, address,
    ec_name, ec_phone, notes, current_date + join_offset, true
  FROM demo
  RETURNING id, phone
)
INSERT INTO memberships (member_id, membership_plan_id, start_date, end_date, price)
SELECT
  nm.id,
  p.id,
  current_date + d.start_offset,
  current_date + d.end_offset,
  p.price
FROM demo d
JOIN new_members nm ON nm.phone = d.phone
JOIN membership_plans p ON p.name = d.plan_name;

-- ---------------------------------------------------------------------------
-- Past memberships for three long-standing members.
--
-- These exist to show why memberships is a separate table: Rahul has renewed
-- three times, and the members list still shows only his current term because
-- the member_overview view picks the one with the latest end date.
-- ---------------------------------------------------------------------------
WITH history (phone, plan_name, start_offset, end_offset) AS (
  VALUES
    ('+91 90000 00001'::text, 'Monthly'::text,   -88, -59),
    ('+91 90000 00001',       'Monthly',         -58, -29),
    ('+91 90000 00005',       'Yearly',         -610, -246),
    ('+91 90000 00009',       'Quarterly',      -176,  -86)
)
INSERT INTO memberships (member_id, membership_plan_id, start_date, end_date, price)
SELECT
  m.id,
  p.id,
  current_date + h.start_offset,
  current_date + h.end_offset,
  p.price
FROM history h
JOIN members m ON m.phone = h.phone
JOIN membership_plans p ON p.name = h.plan_name;
