
-- Restrict workspace authorization helpers to trusted roles.

-- Remove default and anonymous execution permissions.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid)
FROM PUBLIC, anon;

-- Allow authenticated users and trusted backend operations.
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid)
TO authenticated, service_role;
