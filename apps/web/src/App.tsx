
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import AuthPage from "./features/auth/AuthPage";
import { useAuth } from "./features/auth/AuthProvider";
import { useWorkspace } from "./features/workspaces/WorkspaceProvider";
import { workspaceService } from "./features/workspaces/workspaceService";

function WorkspaceDashboard() {
  const {
    workspaces,
    activeWorkspace,
    loading: workspaceLoading,
    error: workspaceError,
    setActiveWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !creating) {
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, creating]);

  async function handleCreateWorkspace(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = workspaceName.trim();

    if (!trimmedName || trimmedName.length > 120) {
      setFormError(
        "Workspace name must contain between 1 and 120 characters.",
      );
      return;
    }

    setCreating(true);

    try {
      const workspaceId = await workspaceService.createWorkspace(
        trimmedName,
        "business",
      );

      await refreshWorkspaces();
      setActiveWorkspace(workspaceId);

      setWorkspaceName("");
      setModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create workspace. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <header>
        <div>
          <p>DINERO WORKSPACE</p>
          <h1>Welcome to DINERO</h1>
          <p>Manage your personal and business activities.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
        >
          + Create Business Workspace
        </button>
      </header>

      <section>
        <h2>Your workspaces</h2>

        {workspaceLoading ? (
          <p>Loading workspaces...</p>
        ) : workspaceError ? (
          <p role="alert">Workspace error: {workspaceError}</p>
        ) : workspaces.length > 0 ? (
          <>
            <label htmlFor="workspace-selector">
              Active workspace
            </label>

            <select
              id="workspace-selector"
              value={activeWorkspace?.id ?? ""}
              onChange={(event) =>
                setActiveWorkspace(event.target.value)
              }
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({workspace.workspace_type})
                </option>
              ))}
            </select>

            {activeWorkspace && (
              <div>
                <h3>{activeWorkspace.name}</h3>
                <p>
                  Workspace type: {activeWorkspace.workspace_type}
                </p>
                <p>
                  Your role: {activeWorkspace.membership.role}
                </p>
              </div>
            )}
          </>
        ) : (
          <p>No workspaces found.</p>
        )}
      </section>

      {modalOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !creating
            ) {
              setModalOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(10, 25, 18, 0.55)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-modal-title"
            aria-describedby="workspace-modal-description"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "28px",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={creating}
              aria-label="Close dialog"
              style={{ float: "right" }}
            >
              ×
            </button>

            <h2 id="workspace-modal-title">
              Create Business Workspace
            </h2>

            <p id="workspace-modal-description">
              Create a dedicated space to manage your business
              operations, suppliers and purchases.
            </p>

            <form onSubmit={handleCreateWorkspace}>
              <label htmlFor="business-workspace-name">
                Workspace name
              </label>

              <input
                id="business-workspace-name"
                type="text"
                value={workspaceName}
                onChange={(event) =>
                  setWorkspaceName(event.target.value)
                }
                placeholder="e.g. Acme Technologies"
                maxLength={120}
                required
                autoFocus
                disabled={creating}
              />

              <p>{workspaceName.trim().length}/120 characters</p>

              {formError && (
                <p role="alert" style={{ color: "#b42318" }}>
                  {formError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create workspace"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <main>Loading DINERO...</main>;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          session ? <Navigate to="/app" replace /> : <AuthPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<WorkspaceDashboard />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate to={session ? "/app" : "/auth"} replace />
        }
      />
    </Routes>
  );
}

export default App;
