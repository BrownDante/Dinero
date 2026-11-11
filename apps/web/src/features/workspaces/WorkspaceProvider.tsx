
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/AuthProvider";
import { workspaceService } from "./workspaceService";

import type { UserWorkspace } from "./workspace.types";

interface WorkspaceContextValue {
  workspaces: UserWorkspace[];
  activeWorkspace: UserWorkspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

interface WorkspaceState {
  userId: string | null;
  workspaces: UserWorkspace[];
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  userId: null,
  workspaces: [],
  activeWorkspaceId: null,
  loading: true,
  error: null,
};

const WorkspaceContext = createContext<
  WorkspaceContextValue | undefined
>(undefined);

export function WorkspaceProvider({
  children,
}: WorkspaceProviderProps) {
  const { user, loading: authLoading } = useAuth();

  const userId = user?.id ?? null;

  const [state, setState] = useState<WorkspaceState>(initialState);

  // Prevent older requests from overwriting newer results.
  const requestIdRef = useRef(0);

  const refreshWorkspaces = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (authLoading) {
      return;
    }

    if (!userId) {
      setState({
        ...initialState,
        loading: false,
      });
      return;
    }

    setState((current) => ({
      userId,
      workspaces:
        current.userId === userId ? current.workspaces : [],
      activeWorkspaceId:
        current.userId === userId
          ? current.activeWorkspaceId
          : null,
      loading: true,
      error: null,
    }));

    try {
      const workspaces =
        await workspaceService.getUserWorkspaces();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((current) => {
        if (current.userId !== userId) {
          return current;
        }

        const previousSelectionExists = workspaces.some(
          (workspace) =>
            workspace.id === current.activeWorkspaceId,
        );

        return {
          userId,
          workspaces,
          activeWorkspaceId: previousSelectionExists
            ? current.activeWorkspaceId
            : (workspaces[0]?.id ?? null),
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState({
        userId,
        workspaces: [],
        activeWorkspaceId: null,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load workspaces.",
      });
    }
  }, [authLoading, userId]);

  useEffect(() => {
    void refreshWorkspaces();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshWorkspaces]);

  const setActiveWorkspace = useCallback(
    (workspaceId: string) => {
      setState((current) => {
        if (current.userId !== userId) {
          return current;
        }

        const workspaceExists = current.workspaces.some(
          (workspace) => workspace.id === workspaceId,
        );

        if (!workspaceExists) {
          return current;
        }

        return {
          ...current,
          activeWorkspaceId: workspaceId,
        };
      });
    },
    [userId],
  );

  const stateBelongsToCurrentUser = state.userId === userId;

  const workspaces = stateBelongsToCurrentUser
    ? state.workspaces
    : [];

  const activeWorkspace =
    workspaces.find(
      (workspace) => workspace.id === state.activeWorkspaceId,
    ) ?? null;

  const loading =
    authLoading ||
    (userId !== null &&
      (!stateBelongsToCurrentUser || state.loading));

  const error = stateBelongsToCurrentUser
    ? state.error
    : null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        error,
        setActiveWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (context === undefined) {
    throw new Error(
      "useWorkspace must be used within a WorkspaceProvider",
    );
  }

  return context;
}
