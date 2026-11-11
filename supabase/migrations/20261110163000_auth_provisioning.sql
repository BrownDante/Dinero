
-- ============================================================
-- DINERO PHASE 2
-- Authentication and automatic account provisioning
-- ============================================================

-- Internal schema for database-only functions.
CREATE SCHEMA IF NOT EXISTS private;

-- Prevent application roles from accessing internal functions.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Automatically provision a new user's account.
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_workspace_id UUID;
    v_full_name TEXT;
BEGIN
    -- Read only the user's display name from signup metadata.
    -- Never trust metadata for roles or permissions.
    v_full_name := NULLIF(
        LEFT(
            BTRIM(NEW.raw_user_meta_data ->> 'full_name'),
            120
        ),
        ''
    );

    -- 1. Create the user's profile.
    INSERT INTO public.profiles (
        user_id,
        full_name
    )
    VALUES (
        NEW.id,
        v_full_name
    );

    -- 2. Create the user's Personal workspace.
    INSERT INTO public.workspaces (
        name,
        workspace_type,
        owner_id
    )
    VALUES (
        'Personal',
        'personal',
        NEW.id
    )
    RETURNING id INTO v_workspace_id;

    -- 3. Add the user as the workspace owner.
    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        role
    )
    VALUES (
        v_workspace_id,
        NEW.id,
        'owner'
    );

    RETURN NEW;
END;
$$;

-- The function is for internal trigger use only.
REVOKE ALL ON FUNCTION private.handle_new_user()
FROM PUBLIC, anon, authenticated;

-- Automatically run provisioning after a new Auth user is created.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();

-- Document the trigger's purpose.
COMMENT ON FUNCTION private.handle_new_user() IS
'Creates a profile, Personal workspace, and owner membership after signup.';
