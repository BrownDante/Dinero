
-- =========================================================
-- DINERO
-- Phase 1: Identity and Workspace Foundation
-- Migration: 20261110160000
--
-- Database: Supabase PostgreSQL
-- Security: Row Level Security (RLS)
-- =========================================================


-- =========================================================
-- 1. USER PROFILES
-- =========================================================

CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT,
    avatar_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_full_name_length
        CHECK (full_name IS NULL OR char_length(full_name) <= 120)
);


-- =========================================================
-- 2. WORKSPACES
-- =========================================================

CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    workspace_type TEXT NOT NULL
        CHECK (workspace_type IN ('personal', 'business')),

    owner_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT workspace_name_not_empty
        CHECK (char_length(btrim(name)) > 0)
);

CREATE INDEX idx_workspaces_owner_id
    ON public.workspaces(owner_id);

-- Each user can own only one Personal workspace.
-- Business workspace ownership remains unrestricted.

CREATE UNIQUE INDEX idx_one_personal_workspace_per_owner
    ON public.workspaces(owner_id)
    WHERE workspace_type = 'personal';


-- =========================================================
-- 3. WORKSPACE MEMBERS
-- =========================================================

CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_workspace_member
        UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user_id
    ON public.workspace_members(user_id);

CREATE INDEX idx_workspace_members_workspace_id
    ON public.workspace_members(workspace_id);


-- =========================================================
-- 4. ACCESS CONTROL HELPER FUNCTIONS
-- =========================================================

-- Check whether the authenticated user belongs to a workspace.

CREATE OR REPLACE FUNCTION public.is_workspace_member(
    target_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = target_workspace_id
          AND wm.user_id = (SELECT auth.uid())
    );
$$;


-- Check whether the authenticated user is an owner or admin.

CREATE OR REPLACE FUNCTION public.is_workspace_admin(
    target_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = target_workspace_id
          AND wm.user_id = (SELECT auth.uid())
          AND wm.role IN ('owner', 'admin')
    );
$$;


-- Check actual workspace ownership.
-- This uses the authoritative owner_id column.

CREATE OR REPLACE FUNCTION public.is_workspace_owner(
    target_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = target_workspace_id
          AND w.owner_id = (SELECT auth.uid())
    );
$$;


-- =========================================================
-- 5. ATOMIC WORKSPACE CREATION
-- =========================================================

-- Creates a workspace and its initial owner membership
-- together in one transaction.
--
-- The frontend must call this RPC rather than directly
-- inserting workspace records.

CREATE OR REPLACE FUNCTION public.create_workspace(
    workspace_name TEXT,
    workspace_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    new_workspace_id UUID;
BEGIN
    current_user_id := (SELECT auth.uid());

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    IF workspace_name IS NULL
       OR char_length(btrim(workspace_name)) = 0
       OR char_length(workspace_name) > 120 THEN

        RAISE EXCEPTION 'Invalid workspace name'
            USING ERRCODE = '22023';
    END IF;

    IF workspace_type IS NULL
       OR workspace_type NOT IN ('personal', 'business') THEN

        RAISE EXCEPTION 'Invalid workspace type'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.workspaces (
        name,
        workspace_type,
        owner_id
    )
    VALUES (
        btrim(workspace_name),
        workspace_type,
        current_user_id
    )
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        role
    )
    VALUES (
        new_workspace_id,
        current_user_id,
        'owner'
    );

    RETURN new_workspace_id;
END;
$$;


-- =========================================================
-- 6. UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- =========================================================
-- 7. FUNCTION PERMISSIONS
-- =========================================================

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID)
    FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_workspace_admin(UUID)
    FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_workspace_owner(UUID)
    FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_workspace(TEXT, TEXT)
    FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_workspace_owner(UUID)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT)
    TO authenticated;


-- =========================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 9. EXPLICIT TABLE PERMISSIONS
-- =========================================================

-- Remove inherited direct table access for application roles.
-- Service-role/backend administration remains separate.

REVOKE ALL ON TABLE public.profiles
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.workspaces
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.workspace_members
    FROM PUBLIC, anon, authenticated;

-- Profiles: users can read, create and update their own records.

GRANT SELECT, INSERT, UPDATE
    ON TABLE public.profiles
    TO authenticated;

-- Workspaces: users can read workspaces they belong to.
-- Creation happens through the create_workspace RPC.

GRANT SELECT
    ON TABLE public.workspaces
    TO authenticated;

-- Membership: users can view memberships and authorized
-- owners/admins can add members through RLS policies.

GRANT SELECT, INSERT
    ON TABLE public.workspace_members
    TO authenticated;


-- =========================================================
-- 10. PROFILE ROW LEVEL SECURITY POLICIES
-- =========================================================

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);


-- =========================================================
-- 11. WORKSPACE ROW LEVEL SECURITY POLICIES
-- =========================================================

CREATE POLICY "Members can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    public.is_workspace_member(id)
);


-- =========================================================
-- 12. WORKSPACE MEMBERSHIP ROW LEVEL SECURITY POLICIES
-- =========================================================

CREATE POLICY "Members can view workspace membership"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
    public.is_workspace_member(workspace_id)
);


-- Owners can invite members and assign admin/member roles.

CREATE POLICY "Owners can add workspace members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_workspace_owner(workspace_id)
    AND role IN ('admin', 'member')
);


-- Admins can add regular members but cannot assign
-- administrator or owner privileges.

CREATE POLICY "Admins can add regular members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_workspace_admin(workspace_id)
    AND role = 'member'
);


-- No direct UPDATE or DELETE policies are intentionally
-- provided in Phase 1.
--
-- Membership management will be implemented through
-- controlled backend operations in a later phase.


-- =========================================================
-- END OF DINERO PHASE 1 MIGRATION
-- =========================================================
