-- Leadership Management System for Dr. Pitágoras Campaign
-- Multi-level hierarchy with progressive profiling and goal tracking

-- 1. ORGANIZATIONS (campaign/gabinete)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  election_type TEXT NOT NULL DEFAULT 'estadual',
  election_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. MEMBERSHIP (user + role + hierarchy in organization)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Hierarchy
  parent_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  path LTREE,  -- materialized path for tree queries

  -- Role and status
  role TEXT NOT NULL DEFAULT 'supporter' CHECK (role IN (
    'candidate', 'general_coordinator', 'regional_coordinator',
    'community_leader', 'captain', 'supporter', 'admin'
  )),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN (
    'invited', 'pending_validation', 'active', 'dormant', 'suspended', 'removed'
  )),

  -- Territory
  territory_ids UUID[] DEFAULT '{}',
  zone_name TEXT,
  neighborhood TEXT,

  -- Metadata
  invited_by_membership_id UUID REFERENCES memberships(id),
  promoted_at TIMESTAMP,
  activated_at TIMESTAMP,
  last_action_at TIMESTAMP,

  -- Progressive profiling (Layers 1 & 2)
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Profile data (jsonb for flexibility)
  profile JSONB DEFAULT '{}',  -- CPF, voter_id, areas_of_influence, availability, network_size
  consent_terms_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, organization_id),
  FOREIGN KEY (organization_id, parent_membership_id)
    REFERENCES memberships(organization_id, id) DEFERRABLE INITIALLY DEFERRED
);

-- Index for hierarchy queries
CREATE INDEX idx_memberships_path ON memberships USING GIST(path);
CREATE INDEX idx_memberships_org_status ON memberships(organization_id, status);
CREATE INDEX idx_memberships_parent ON memberships(parent_membership_id);
CREATE INDEX idx_memberships_last_action ON memberships(last_action_at DESC);

-- 3. CONTACTS (eleitores/contatos cadastrados)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,

  -- Basic info
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,

  -- Electoral info (hashed for LGPD)
  cpf_hash TEXT,
  voter_id_hash TEXT,

  -- Address
  address JSONB DEFAULT '{}',  -- street, number, complement, city, state, cep
  zone TEXT,
  section TEXT,
  neighborhood TEXT,

  -- Engagement
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'sympathizer', 'committed',
    'confirmed_voter', 'declined', 'ghost', 'archived'
  )),

  influence_level INTEGER DEFAULT 1,  -- 1-5 scale
  engagement_score DECIMAL(3,2) DEFAULT 0,  -- 0-1.0

  -- Tagging & notes
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Source tracking (CRITICAL for analytics)
  source_channel TEXT,  -- 'whatsapp_link', 'qrcode', 'import', 'manual', etc
  referrer_membership_id UUID REFERENCES memberships(id),  -- who referred this contact

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  last_interaction_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_contacts_owner ON contacts(owner_membership_id);
CREATE INDEX idx_contacts_org_status ON contacts(organization_id, status);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at DESC);
CREATE INDEX idx_contacts_zone ON contacts(zone, section);

-- 4. CONTACT INTERACTIONS (audit trail + analytics foundation)
CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,

  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'visit', 'call', 'whatsapp', 'sms', 'email', 'event',
    'registration', 'commitment', 'survey', 'note', 'other'
  )),

  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_show')),

  -- Details
  notes TEXT,
  metadata JSONB DEFAULT '{}',  -- custom fields per interaction type
  geo_location POINT,

  occurred_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_interactions_membership ON contact_interactions(membership_id);
CREATE INDEX idx_interactions_type ON contact_interactions(interaction_type);

-- 5. GOALS (metas cascateadas)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  scope_membership_id UUID REFERENCES memberships(id),  -- NULL = global goal

  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'volume', 'conversion', 'geographic', 'composite'
  )),

  -- Values
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'contacts',  -- 'contacts', 'conversions', '%', etc

  -- Timeline
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Hierarchy
  parent_goal_id UUID REFERENCES goals(id),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed', 'cancelled')),

  -- Metadata
  description TEXT,
  notes TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_goals_scope ON goals(scope_membership_id);
CREATE INDEX idx_goals_period ON goals(period_start, period_end);

-- 6. INVITATIONS (onboarding flow)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  invited_by_membership_id UUID REFERENCES memberships(id),

  code TEXT NOT NULL UNIQUE,
  intended_role TEXT NOT NULL DEFAULT 'supporter',
  intended_parent_membership_id UUID REFERENCES memberships(id),

  target_phone TEXT,
  target_email TEXT,

  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_org ON invitations(organization_id);

-- 7. TERRITORIES (zonas, seções, bairros)
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parent_id UUID REFERENCES territories(id),

  type TEXT NOT NULL CHECK (type IN ('state', 'city', 'zone', 'section', 'neighborhood', 'street')),
  code TEXT,
  name TEXT NOT NULL,

  estimated_voters INTEGER,
  target_votes INTEGER,

  geo_polygon POLYGON,

  created_at TIMESTAMP DEFAULT now()
);

-- 8. AUDIT LOGS (compliance + security)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID REFERENCES auth.users(id),

  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  before_state JSONB,
  after_state JSONB,

  ip_address INET,
  user_agent TEXT,

  occurred_at TIMESTAMP DEFAULT now()
);

-- 9. BADGES (gamification)
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,

  criteria JSONB NOT NULL,  -- how to earn this badge
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,

  earned_at TIMESTAMP DEFAULT now(),
  UNIQUE(membership_id, badge_id)
);

-- 10. BROADCASTS (mensagens em massa)
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sent_by_membership_id UUID REFERENCES memberships(id),

  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'push', 'sms', 'email')),
  template TEXT NOT NULL,
  audience_filter JSONB,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,

  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT now()
);

-- TRIGGERS & FUNCTIONS

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update ltree path on membership creation/update
CREATE OR REPLACE FUNCTION update_membership_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path LTREE;
BEGIN
  IF NEW.parent_membership_id IS NULL THEN
    NEW.path = text2ltree('root.' || NEW.id::text)::LTREE;
  ELSE
    SELECT path INTO parent_path FROM memberships WHERE id = NEW.parent_membership_id;
    NEW.path = parent_path || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memberships_path BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_membership_path();

-- Helper function: get all members in subtree
CREATE OR REPLACE FUNCTION get_member_subtree(member_id UUID)
RETURNS TABLE(id UUID, user_id UUID, path LTREE, role TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.user_id, m.path, m.role, m.status
  FROM memberships m
  WHERE m.path <@ (SELECT path FROM memberships WHERE id = member_id)
  ORDER BY m.path;
END;
$$ LANGUAGE plpgsql;

-- Helper: count contacts by membership (for analytics)
CREATE OR REPLACE FUNCTION count_contacts_for_member(member_id UUID)
RETURNS TABLE(total INTEGER, committed INTEGER, confirmed_voters INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE status = 'committed')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'confirmed_voter')::INTEGER
  FROM contacts
  WHERE owner_membership_id = member_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- (policies will be added in separate migration for clarity)

-- INDEXES para performance
CREATE INDEX idx_contacts_org_creation ON contacts(organization_id, created_at DESC);
CREATE INDEX idx_memberships_org_role ON memberships(organization_id, role);
CREATE INDEX idx_goals_org_active ON goals(organization_id, status) WHERE status = 'active';
