
export type WorkspaceType = "personal" | "business";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  workspace_type: WorkspaceType;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface UserWorkspace extends Workspace {
  membership: WorkspaceMembership;
}
