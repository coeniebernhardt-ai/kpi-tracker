-- =============================================================================
-- SUPPORT CALLS V2 — additive migration (run manually in Supabase SQL editor)
-- Prerequisites: SUPPORT_CALLS_SCHEMA.sql already applied
-- Does NOT drop unrelated Think-Q tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Location directory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_clients_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS support_estates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES support_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_estates_client_name_unique UNIQUE (client_id, name)
);

CREATE TABLE IF NOT EXISTS support_cml_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estate_id UUID NOT NULL REFERENCES support_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_cml_estate_name_unique UNIQUE (estate_id, name)
);

CREATE TABLE IF NOT EXISTS support_onsite_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estate_id UUID NOT NULL REFERENCES support_estates(id) ON DELETE CASCADE,
  cml_location_id UUID REFERENCES support_cml_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_onsite_estate_name_unique UNIQUE (estate_id, name)
);

CREATE INDEX IF NOT EXISTS idx_support_estates_client ON support_estates(client_id);
CREATE INDEX IF NOT EXISTS idx_support_cml_estate ON support_cml_locations(estate_id);
CREATE INDEX IF NOT EXISTS idx_support_onsite_estate ON support_onsite_locations(estate_id);
CREATE INDEX IF NOT EXISTS idx_support_onsite_cml ON support_onsite_locations(cml_location_id);

-- ---------------------------------------------------------------------------
-- 2. support_calls: drafts + location FKs + on-site text
-- ---------------------------------------------------------------------------
ALTER TABLE support_calls DROP CONSTRAINT IF EXISTS support_calls_overall_status_check;
ALTER TABLE support_calls
  ADD CONSTRAINT support_calls_overall_status_check
  CHECK (overall_status IN ('draft', 'open', 'closed', 'cancelled'));

ALTER TABLE support_calls ALTER COLUMN ticket_id DROP NOT NULL;

ALTER TABLE support_calls ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES support_clients(id) ON DELETE SET NULL;
ALTER TABLE support_calls ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES support_estates(id) ON DELETE SET NULL;
ALTER TABLE support_calls ADD COLUMN IF NOT EXISTS cml_location_id UUID REFERENCES support_cml_locations(id) ON DELETE SET NULL;
ALTER TABLE support_calls ADD COLUMN IF NOT EXISTS onsite_location_id UUID REFERENCES support_onsite_locations(id) ON DELETE SET NULL;
ALTER TABLE support_calls ADD COLUMN IF NOT EXISTS onsite_location TEXT;

CREATE INDEX IF NOT EXISTS idx_support_calls_client_id ON support_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_support_calls_estate_id ON support_calls(estate_id);

-- tickets: persist on-site location for member display
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS onsite_location TEXT;

-- ---------------------------------------------------------------------------
-- 3. Seed directory from existing ticket / support_call text
-- ---------------------------------------------------------------------------
INSERT INTO support_clients (name)
SELECT DISTINCT trim(client)
FROM (
  SELECT client FROM tickets WHERE client IS NOT NULL AND trim(client) <> ''
  UNION
  SELECT client FROM support_calls WHERE client IS NOT NULL AND trim(client) <> ''
) s
ON CONFLICT (name) DO NOTHING;

-- Estates: pair client + estate_or_building
INSERT INTO support_estates (client_id, name)
SELECT c.id, trim(x.estate_or_building)
FROM (
  SELECT DISTINCT trim(client) AS client, trim(estate_or_building) AS estate_or_building
  FROM tickets
  WHERE client IS NOT NULL AND trim(client) <> ''
    AND estate_or_building IS NOT NULL AND trim(estate_or_building) <> ''
  UNION
  SELECT DISTINCT trim(client), trim(estate_or_building)
  FROM support_calls
  WHERE client IS NOT NULL AND trim(client) <> ''
    AND estate_or_building IS NOT NULL AND trim(estate_or_building) <> ''
) x
JOIN support_clients c ON c.name = x.client
ON CONFLICT (client_id, name) DO NOTHING;

-- CML under estate
INSERT INTO support_cml_locations (estate_id, name)
SELECT e.id, trim(x.cml_location)
FROM (
  SELECT DISTINCT trim(client) AS client, trim(estate_or_building) AS estate_or_building, trim(cml_location) AS cml_location
  FROM tickets
  WHERE client IS NOT NULL AND trim(client) <> ''
    AND estate_or_building IS NOT NULL AND trim(estate_or_building) <> ''
    AND cml_location IS NOT NULL AND trim(cml_location) <> ''
  UNION
  SELECT DISTINCT trim(client), trim(estate_or_building), trim(cml_location)
  FROM support_calls
  WHERE client IS NOT NULL AND trim(client) <> ''
    AND estate_or_building IS NOT NULL AND trim(estate_or_building) <> ''
    AND cml_location IS NOT NULL AND trim(cml_location) <> ''
) x
JOIN support_clients c ON c.name = x.client
JOIN support_estates e ON e.client_id = c.id AND e.name = x.estate_or_building
ON CONFLICT (estate_id, name) DO NOTHING;

-- On-site: use tickets.location text only when it is NOT the enum on-site/remote
-- Prefer support_calls.onsite_location after backfill; seed from site_name as fallback label under estate
INSERT INTO support_onsite_locations (estate_id, name)
SELECT e.id, trim(x.site_name)
FROM (
  SELECT DISTINCT trim(client) AS client, trim(estate_or_building) AS estate_or_building, trim(site_name) AS site_name
  FROM support_calls
  WHERE client IS NOT NULL AND trim(client) <> ''
    AND estate_or_building IS NOT NULL AND trim(estate_or_building) <> ''
    AND site_name IS NOT NULL AND trim(site_name) <> ''
) x
JOIN support_clients c ON c.name = x.client
JOIN support_estates e ON e.client_id = c.id AND e.name = x.estate_or_building
ON CONFLICT (estate_id, name) DO NOTHING;

-- Backfill FK ids on support_calls from text
UPDATE support_calls sc
SET client_id = c.id
FROM support_clients c
WHERE sc.client_id IS NULL AND sc.client IS NOT NULL AND trim(sc.client) = c.name;

UPDATE support_calls sc
SET estate_id = e.id
FROM support_estates e
WHERE sc.estate_id IS NULL
  AND sc.client_id = e.client_id
  AND sc.estate_or_building IS NOT NULL
  AND trim(sc.estate_or_building) = e.name;

UPDATE support_calls sc
SET cml_location_id = m.id
FROM support_cml_locations m
WHERE sc.cml_location_id IS NULL
  AND sc.estate_id = m.estate_id
  AND sc.cml_location IS NOT NULL
  AND trim(sc.cml_location) = m.name;

UPDATE support_calls sc
SET onsite_location_id = o.id,
    onsite_location = COALESCE(sc.onsite_location, o.name)
FROM support_onsite_locations o
WHERE sc.onsite_location_id IS NULL
  AND sc.estate_id = o.estate_id
  AND sc.site_name IS NOT NULL
  AND trim(sc.site_name) = o.name;

-- ---------------------------------------------------------------------------
-- 4. RLS for location tables
-- ---------------------------------------------------------------------------
ALTER TABLE support_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cml_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_onsite_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scl_clients_select" ON support_clients;
CREATE POLICY "scl_clients_select" ON support_clients FOR SELECT
  USING (auth.uid() IS NOT NULL AND (active = TRUE OR is_support_call_manager()));
DROP POLICY IF EXISTS "scl_clients_write" ON support_clients;
CREATE POLICY "scl_clients_write" ON support_clients FOR ALL
  USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

DROP POLICY IF EXISTS "scl_estates_select" ON support_estates;
CREATE POLICY "scl_estates_select" ON support_estates FOR SELECT
  USING (auth.uid() IS NOT NULL AND (active = TRUE OR is_support_call_manager()));
DROP POLICY IF EXISTS "scl_estates_write" ON support_estates;
CREATE POLICY "scl_estates_write" ON support_estates FOR ALL
  USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

DROP POLICY IF EXISTS "scl_cml_select" ON support_cml_locations;
CREATE POLICY "scl_cml_select" ON support_cml_locations FOR SELECT
  USING (auth.uid() IS NOT NULL AND (active = TRUE OR is_support_call_manager()));
DROP POLICY IF EXISTS "scl_cml_write" ON support_cml_locations;
CREATE POLICY "scl_cml_write" ON support_cml_locations FOR ALL
  USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

DROP POLICY IF EXISTS "scl_onsite_select" ON support_onsite_locations;
CREATE POLICY "scl_onsite_select" ON support_onsite_locations FOR SELECT
  USING (auth.uid() IS NOT NULL AND (active = TRUE OR is_support_call_manager()));
DROP POLICY IF EXISTS "scl_onsite_write" ON support_onsite_locations;
CREATE POLICY "scl_onsite_write" ON support_onsite_locations FOR ALL
  USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

-- ---------------------------------------------------------------------------
-- 5. Realtime publication
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_calls;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_partners;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_visits;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_hardware_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_contributions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_communications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_eta_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_quotes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_job_cards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_call_documents;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
