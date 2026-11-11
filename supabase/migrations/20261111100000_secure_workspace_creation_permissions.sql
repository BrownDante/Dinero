
-- =========================================================
-- DINERO
-- Phase 3: Secure Workspace Creation Permissions
-- =========================================================

-- Remove execution access from PUBLIC and anonymous users.
REVOKE ALL ON FUNCTION public.create_workspace(TEXT, TEXT)
FROM PUBLIC, anon;

-- Explicitly allow authenticated users and backend service role.
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT)
TO authenticated, service_role;

-- Document the security boundary.
COMMENT ON FUNCTION public.create_workspace(TEXT, TEXT) IS
'Creates a workspace and its initial owner membership atomically. Authenticated users may execute this function; ownership is derived from auth.uid().';
