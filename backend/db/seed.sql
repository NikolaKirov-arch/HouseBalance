-- HouseBalance sample data

SET @DEMO_PASSWORD_HASH = 'REPLACE_WITH_LOCAL_BCRYPT_HASH';
SET @DEMO_INVITATION_CODE = 'REPLACE_WITH_LOCAL_INVITATION_CODE';

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM audit_log;
DELETE FROM settlement;
DELETE FROM expense_split;
DELETE FROM expense;
DELETE FROM expense_category;
DELETE FROM group_invitation;
DELETE FROM group_member;
DELETE FROM household_group;
DELETE FROM user_account;
SET FOREIGN_KEY_CHECKS = 1;

START TRANSACTION;

INSERT INTO user_account
  (id, first_name, last_name, email, password_hash, created_at, status)
VALUES
  (1, 'Nikola', 'Kirov', 'nikola@example.com',
   @DEMO_PASSWORD_HASH,
   '2026-06-25 10:00:00', 'active'),
  (2, 'Ana', 'Petrova', 'ana@example.com',
   @DEMO_PASSWORD_HASH,
   '2026-06-25 10:05:00', 'active'),
  (3, 'Marko', 'Markov', 'marko@example.com',
   @DEMO_PASSWORD_HASH,
   '2026-06-25 10:10:00', 'active');

INSERT INTO household_group (id, name, currency, created_at)
VALUES (1, 'Apartment', 'EUR', '2026-06-26 09:00:00');

INSERT INTO group_member
  (id, user_id, group_id, role, joined_at, member_status)
VALUES
  (1, 1, 1, 'admin', '2026-06-26 09:00:00', 'active'),
  (2, 2, 1, 'member', '2026-06-26 09:30:00', 'active'),
  (3, 3, 1, 'member', '2026-06-26 09:35:00', 'active');

INSERT INTO group_invitation
  (id, group_id, invited_user_id, invited_by_member_id, invitation_code,
   status, created_at, expires_at)
VALUES
  (1, 1, 2, 1, @DEMO_INVITATION_CODE, 'accepted',
   '2026-06-26 09:20:00', '2026-07-03 09:20:00');

INSERT INTO expense_category (id, group_id, name, is_default, is_active)
VALUES
  (1, 1, 'Rent', TRUE, TRUE),
  (2, 1, 'Utilities', TRUE, TRUE),
  (3, 1, 'Groceries', TRUE, TRUE),
  (4, 1, 'Internet', TRUE, TRUE),
  (5, 1, 'Cleaning', TRUE, TRUE),
  (6, 1, 'Other', TRUE, TRUE);

INSERT INTO expense
  (id, group_id, payer_member_id, category_id, amount, description,
   expense_date, split_type, created_by_member_id, created_at)
VALUES
  (1, 1, 1, 3, 90.00, 'Weekly groceries', '2026-07-01',
   'equal', 1, '2026-07-01 18:00:00'),
  (2, 1, 2, 4, 45.00, 'Home internet', '2026-07-03',
   'exact', 2, '2026-07-03 12:00:00'),
  (3, 1, 3, 2, 120.00, 'Electricity and water', '2026-07-06',
   'percentage', 3, '2026-07-06 16:30:00');

INSERT INTO expense_split
  (id, expense_id, member_id, owed_amount, percentage)
VALUES
  (1, 1, 1, 30.00, NULL),
  (2, 1, 2, 30.00, NULL),
  (3, 1, 3, 30.00, NULL),
  (4, 2, 1, 20.00, NULL),
  (5, 2, 2, 15.00, NULL),
  (6, 2, 3, 10.00, NULL),
  (7, 3, 1, 60.00, 50.00),
  (8, 3, 2, 30.00, 25.00),
  (9, 3, 3, 30.00, 25.00);

INSERT INTO settlement
  (id, group_id, payer_member_id, receiver_member_id, created_by_member_id,
   amount, settlement_date, note, created_at)
VALUES
  (1, 1, 2, 3, 2, 10.00, '2026-07-10',
   'Partial repayment', '2026-07-10 14:00:00');

INSERT INTO audit_log
  (id, group_id, actor_member_id, action_type, entity_type, entity_id,
   description, created_at)
VALUES
  (1, 1, 1, 'group_created', 'household_group', 1,
   'Created household group Apartment', '2026-06-26 09:00:00'),
  (2, 1, 1, 'category_created', 'expense_category', 1,
   'Created default household categories', '2026-06-26 09:01:00'),
  (3, 1, 1, 'member_invited', 'group_invitation', 1,
   'Invited Ana Petrova (ana@example.com)', '2026-06-26 09:20:00'),
  (4, 1, 2, 'member_joined', 'group_member', 2,
   'Ana Petrova joined the group', '2026-06-26 09:30:00'),
  (5, 1, 1, 'expense_created', 'expense', 1,
   'Created 90.00 expense: Weekly groceries', '2026-07-01 18:00:00'),
  (6, 1, 2, 'expense_created', 'expense', 2,
   'Created 45.00 expense: Home internet', '2026-07-03 12:00:00'),
  (7, 1, 3, 'expense_created', 'expense', 3,
   'Created 120.00 expense: Electricity and water', '2026-07-06 16:30:00'),
  (8, 1, 2, 'settlement_created', 'settlement', 1,
   'Recorded settlement payment of 10.00', '2026-07-10 14:00:00');

COMMIT;

-- Expected balances after this seed:
-- Nikola Kirov: -20.00, Ana Petrova: -20.00, Marko Markov: +40.00
