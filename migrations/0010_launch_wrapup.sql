-- Launch wrap-up: account suspension + admin kitchen verification.
ALTER TABLE users ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kitchens ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;
