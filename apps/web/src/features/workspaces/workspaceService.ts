
import { supabase } from "../../lib/supabase";

import type {
  Workspace,
  WorkspaceMembership,
  UserWorkspace,
  WorkspaceType,
} from "./workspace.types";

export const workspaceService = {
  async getUserWorkspaces(): Promise<UserWorkspace[]> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      throw new Error("You must be signed in to access workspaces.");
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, joined_at")
      .eq("user_id", user.id);

    if (membershipError) {
      throw new Error(
        `Unable to fetch workspace memberships: ${membershipError.message}`,
      );
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const workspaceIds = memberships.map(
      (membership) => membership.workspace_id,
    );

    const { data: workspaces, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, name, workspace_type, owner_id, created_at, updated_at")
      .in("id", workspaceIds);

    if (workspaceError) {
      throw new Error(
        `Unable to fetch workspaces: ${workspaceError.message}`,
      );
    }

    const membershipMap = new Map(
      (memberships as WorkspaceMembership[]).map((membership) => [
        membership.workspace_id,
        membership,
      ]),
    );

    return ((workspaces ?? []) as Workspace[]).flatMap((workspace) => {
      const membership = membershipMap.get(workspace.id);

      if (!membership) {
        return [];
      }

      return [{ ...workspace, membership }];
    });
  },

  async createWorkspace(
    name: string,
    workspaceType: WorkspaceType,
  ): Promise<string> {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 120) {
      throw new Error(
        "Workspace name must contain between 1 and 120 characters.",
      );
    }

    if (
      workspaceType !== "personal" &&
      workspaceType !== "business"
    ) {
      throw new Error("Invalid workspace type.");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      throw new Error("You must be signed in to create a workspace.");
    }

    const { data: workspaceId, error: creationError } =
      await supabase.rpc("create_workspace", {
        workspace_name: trimmedName,
        workspace_type: workspaceType,
      });

    if (creationError) {
      throw new Error(
        `Unable to create workspace: ${creationError.message}`,
      );
    }

    if (typeof workspaceId !== "string") {
      throw new Error(
        "Workspace creation returned an invalid response.",
      );
    }

    return workspaceId;
  },
};
