
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import apiRequest, {
  getClientFiles,
  getClientChecklist,
  updateChecklistItem,
  generateChecklistSuggestions,
  getAISuggestions,
  decideAISuggestion,
  confirmFileChecklist
} from "../../services/api";

import StaffFileUpload from "./StaffFileUpload";
import FileList from "../../components/FileList";

import "./StaffClientDetails.css";

export default function StaffClientDetails() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState(null);
  const [files, setFiles] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [decidingId, setDecidingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedChecklistBySuggestion, setSelectedChecklistBySuggestion] = useState({});
  const [manualSelection, setManualSelection] = useState(null);
  const [manualChecklistId, setManualChecklistId] = useState("");
  const [confirmingManual, setConfirmingManual] = useState(false);

  const fetchClientData = useCallback(async (silent = false) => {
    if (!clientId) {
      setClient(null);
      setFiles([]);
      setChecklist([]);
      setSuggestions([]);
      setError("Client ID is missing.");
      if (!silent) {
        setLoading(false);
      }
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      // Verify client access on the backend first so direct URL visits
      // and stale-tab refreshes trigger server enforcement and logging.
      const fileRes = await getClientFiles(clientId);

      const rethrowIfAuthError = (err) => {
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
          throw err;
        }
        return null;
      };

      const [clientResponse, checklistRes, suggRes] = await Promise.all([
        apiRequest("/api/clients"),
        getClientChecklist(clientId).catch((err) => {
          rethrowIfAuthError(err);
          return { items: [] };
        }),
        getAISuggestions(clientId).catch((err) => {
          rethrowIfAuthError(err);
          return { suggestions: [] };
        })
      ]);

      const clients = Array.isArray(clientResponse.clients)
        ? clientResponse.clients
        : [];

      const selectedClient = clients.find(
        (item) => String(item.id || item._id) === String(clientId)
      );

      if (!selectedClient) {
        throw new Error(
          "Client not found or you do not have access to this client."
        );
      }

      setClient(selectedClient);
      setFiles(Array.isArray(fileRes?.files) ? fileRes.files : []);
      setChecklist(Array.isArray(checklistRes?.items) ? checklistRes.items : []);
      setSuggestions(Array.isArray(suggRes?.suggestions) ? suggRes.suggestions : []);
    } catch (err) {
      setClient(null);
      setFiles([]);
      setChecklist([]);
      setSuggestions([]);
      setError(err.message || "Unable to load client information.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData(false);
  }, [fetchClientData]);

  // Re-verify active client workspace when the tab regains focus
  // so stale tabs lose access immediately after revocation.
  useEffect(() => {
    if (!client) {
      return undefined;
    }

    const handleRevalidate = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      fetchClientData(true);
    };

    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);

    return () => {
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
    };
  }, [client, fetchClientData]);

  // Handle AI analysis on a document
  const handleAnalyzeFile = async (file) => {
    const fileId = file.id || file._id;
    if (!fileId || !clientId || analyzingId) return;

    try {
      setAnalyzingId(fileId);
      setError("");
      setWarning("");
      setSuccess("");
      setManualSelection(null);
      setManualChecklistId("");

      const res = await generateChecklistSuggestions(clientId, fileId);

      const count = res.suggestions?.length || 0;
      if (count > 0) {
        setSuccess(`AI generated ${count} suggestion(s). Please review and confirm below.`);
      } else if (res.manual_selection_required) {
        setWarning(res.message || "AI could not match automatically. Please select a checklist item manually below.");
        setManualSelection({
          fileId,
          fileName: file.name || "Uploaded document",
          message: res.message || "Please select the matching checklist item manually."
        });
      } else {
        setSuccess(res.message || "Document analyzed successfully.");
      }

      await fetchClientData(true);
    } catch (err) {
      setError(err.message || "Failed to generate AI suggestions.");
    } finally {
      setAnalyzingId(null);
    }
  };

  // Handle Accept / Reject AI suggestion
  const handleDecideSuggestion = async (suggestion, status) => {
    const suggestionId = suggestion._id || suggestion.id;
    if (!suggestionId || decidingId) return;

    const defaultMatchedId =
      suggestion.matched_checklist_item_id?._id ||
      suggestion.matched_checklist_item_id ||
      "";
    const chosenChecklistId =
      selectedChecklistBySuggestion[suggestionId] ?? defaultMatchedId;

    if (status === "accepted" && !chosenChecklistId) {
      setError("Please select an incomplete checklist item to confirm.");
      return;
    }

    try {
      setDecidingId(suggestionId);
      setError("");
      setWarning("");
      setSuccess("");

      const res = await decideAISuggestion(
        suggestionId,
        status,
        status === "accepted" ? chosenChecklistId : null
      );
      setSuccess(res.message || `Suggestion ${status} successfully.`);

      await fetchClientData(true);
    } catch (err) {
      setError(err.message || `Failed to ${status} suggestion.`);
    } finally {
      setDecidingId(null);
    }
  };

  // Handle manual checklist selection fallback confirmation
  const handleConfirmManualSelection = async () => {
    if (!manualSelection?.fileId || confirmingManual) return;

    if (!manualChecklistId) {
      setError("Please select a checklist item to complete.");
      return;
    }

    try {
      setConfirmingManual(true);
      setError("");
      setWarning("");
      setSuccess("");

      const res = await confirmFileChecklist(manualSelection.fileId, {
        checklistItemId: manualChecklistId,
        status: "accepted"
      });

      setSuccess(res.message || "Checklist item confirmed and completed.");
      setManualSelection(null);
      setManualChecklistId("");
      await fetchClientData(true);
    } catch (err) {
      setError(err.message || "Failed to confirm checklist item.");
    } finally {
      setConfirmingManual(false);
    }
  };

  // Handle Checklist item toggle
  const handleToggleChecklist = async (item) => {
    const itemId = item._id || item.id;
    if (!itemId) return;

    try {
      setTogglingId(itemId);
      setError("");
      setSuccess("");

      const newDone = !item.done;
      await updateChecklistItem(itemId, newDone);

      setChecklist((prev) =>
        prev.map((it) => ((it._id || it.id) === itemId ? { ...it, done: newDone } : it))
      );
      setSuccess(`Checklist item marked as ${newDone ? "completed" : "pending"}.`);
    } catch (err) {
      setError(err.message || "Failed to update checklist item.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleBack = () => {
    navigate(user?.role === "partner" ? "/partner/dashboard" : "/staff/dashboard");
  };

  if (loading) {
    return (
      <main className="staff-client-details">
        <div className="staff-details-loading">
          Loading client workspace...
        </div>
      </main>
    );
  }

  if (error && !client) {
    return (
      <main className="staff-client-details">
        <button type="button" className="staff-back-button" onClick={handleBack}>
          ← Back to clients
        </button>
        <div className="staff-details-error">{error}</div>
        <button type="button" className="staff-back-button" onClick={() => fetchClientData(false)}>
          Try again
        </button>
      </main>
    );
  }

  const completedChecklistCount = checklist.filter((i) => i.done).length;
  const openChecklistItems = checklist.filter((i) => !i.done);
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <main className="staff-client-details">
      <button type="button" className="staff-back-button" onClick={handleBack}>
        ← Back to {user?.role === "partner" ? "Partner Dashboard" : "Clients"}
      </button>

      <header className="staff-client-details-header">
        <div className="staff-client-details-avatar">
          {(client?.name || "C").charAt(0).toUpperCase()}
        </div>
        <div>
          <span>CLIENT WORKSPACE</span>
          <h1>{client?.name}</h1>
          <p>Manage documents, checklist items, and AI-suggested matches.</p>
        </div>
      </header>

      {error && <div className="staff-details-error">{error}</div>}
      {warning && <div className="staff-details-warning">{warning}</div>}
      {success && <div className="staff-details-success">{success}</div>}

      <div className="staff-details-stats">
        <div>
          <span>Documents</span>
          <strong>{files.length}</strong>
        </div>
        <div>
          <span>Checklist Progress</span>
          <strong>{completedChecklistCount} / {checklist.length}</strong>
        </div>
        <div>
          <span>Pending AI Suggestions</span>
          <strong>{pendingSuggestions.length}</strong>
        </div>
      </div>

      {/* CHECKLIST MANAGEMENT CARD */}
      <section className="staff-details-checklist-card">
        <div className="staff-details-card-header">
          <div>
            <h2>Client Document Checklist</h2>
            <p>Track document requirements and update their status.</p>
          </div>
          <button
            type="button"
            className="staff-refresh-button"
            onClick={fetchClientData}
          >
            ↻ Refresh
          </button>
        </div>

        {checklist.length === 0 ? (
          <p style={{ color: "#718096" }}>No checklist items for this client.</p>
        ) : (
          <div className="staff-checklist-items-grid">
            {checklist.map((item) => {
              const itemId = item._id || item.id;
              return (
                <div
                  key={itemId}
                  className={`staff-checklist-item-row ${item.done ? "completed" : ""}`}
                >
                  <div className="staff-checklist-item-left">
                    <input
                      type="checkbox"
                      checked={Boolean(item.done)}
                      disabled={togglingId === itemId}
                      onChange={() => handleToggleChecklist(item)}
                    />
                    <span className="staff-checklist-item-title">{item.name}</span>
                  </div>
                  <span
                    className={`staff-badge ${
                      item.done ? "staff-badge-completed" : "staff-badge-pending"
                    }`}
                  >
                    {togglingId === itemId
                      ? "Updating..."
                      : item.done
                      ? "Completed"
                      : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MANUAL CHECKLIST SELECTION FALLBACK */}
      {manualSelection && (
        <section className="staff-details-suggestions-card staff-manual-selection-card">
          <div className="staff-details-card-header">
            <div>
              <h2>Manual Checklist Selection</h2>
              <p>
                File: <strong>{manualSelection.fileName}</strong> — {manualSelection.message}
              </p>
            </div>
            <span className="staff-badge staff-badge-pending">Manual Review</span>
          </div>

          {openChecklistItems.length === 0 ? (
            <p style={{ color: "#718096", margin: 0 }}>
              All checklist items for this client are already completed.
            </p>
          ) : (
            <div className="staff-suggestion-select-row">
              <select
                className="staff-suggestion-select"
                value={manualChecklistId}
                onChange={(e) => setManualChecklistId(e.target.value)}
                disabled={confirmingManual}
              >
                <option value="">-- Select an incomplete checklist item --</option>
                {openChecklistItems.map((item) => {
                  const itemId = item._id || item.id;
                  return (
                    <option key={itemId} value={itemId}>
                      {item.name}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                className="staff-btn-accept"
                onClick={handleConfirmManualSelection}
                disabled={confirmingManual || !manualChecklistId}
              >
                {confirmingManual ? "Confirming..." : "✓ Confirm & Complete"}
              </button>
              <button
                type="button"
                className="staff-btn-reject"
                onClick={() => {
                  setManualSelection(null);
                  setManualChecklistId("");
                }}
                disabled={confirmingManual}
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      )}

      {/* AI SUGGESTIONS SECTION */}
      {suggestions.length > 0 && (
        <section className="staff-details-suggestions-card">
          <div className="staff-details-card-header">
            <div>
              <h2>AI Checklist Suggestions</h2>
              <p>Review and decide AI suggestions before checklist status changes.</p>
            </div>
            <span className="staff-badge staff-badge-pending">
              {pendingSuggestions.length} Pending Approval
            </span>
          </div>

          <div className="staff-suggestions-grid">
            {suggestions.map((sugg) => {
              const suggId = sugg._id || sugg.id;
              return (
                <div
                  key={suggId}
                  className={`staff-suggestion-card ${sugg.status}`}
                >
                  <div className="staff-suggestion-header">
                    <div>
                      <div className="staff-suggestion-title">
                        Suggested: {sugg.suggested_item}
                      </div>
                      <p className="staff-suggestion-reason">{sugg.reason}</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span className="staff-suggestion-score">
                        Score: {sugg.match_score}%
                      </span>
                      <span
                        className={`staff-badge ${
                          sugg.status === "accepted"
                            ? "staff-badge-completed"
                            : sugg.status === "rejected"
                            ? "staff-details-error"
                            : "staff-badge-pending"
                        }`}
                      >
                        {sugg.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="staff-suggestion-meta">
                    {sugg.file_id?.name && (
                      <span>Source: {sugg.file_id.name}</span>
                    )}
                    {sugg.created_by?.name && (
                      <span>Created by: {sugg.created_by.name}</span>
                    )}
                    {sugg.decided_by?.name && (
                      <span>Reviewed by: {sugg.decided_by.name}</span>
                    )}
                  </div>

                  {sugg.status === "pending" && (() => {
                    const defaultMatchedId =
                      sugg.matched_checklist_item_id?._id ||
                      sugg.matched_checklist_item_id ||
                      "";
                    const selectedItemId =
                      selectedChecklistBySuggestion[suggId] ?? defaultMatchedId;

                    return (
                      <div className="staff-suggestion-pending-controls">
                        <div className="staff-suggestion-select-row">
                          <label htmlFor={`sugg-select-${suggId}`} className="staff-suggestion-select-label">
                            Checklist item to complete:
                          </label>
                          <select
                            id={`sugg-select-${suggId}`}
                            className="staff-suggestion-select"
                            value={selectedItemId}
                            onChange={(e) =>
                              setSelectedChecklistBySuggestion((prev) => ({
                                ...prev,
                                [suggId]: e.target.value
                              }))
                            }
                            disabled={decidingId === suggId || openChecklistItems.length === 0}
                          >
                            <option value="">-- Select checklist item --</option>
                            {openChecklistItems.map((item) => {
                              const itemId = item._id || item.id;
                              return (
                                <option key={itemId} value={itemId}>
                                  {item.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="staff-suggestion-actions">
                          <button
                            type="button"
                            className="staff-btn-accept"
                            onClick={() => handleDecideSuggestion(sugg, "accepted")}
                            disabled={decidingId === suggId || !selectedItemId || openChecklistItems.length === 0}
                          >
                            {decidingId === suggId ? "Processing..." : "✓ Confirm & Complete"}
                          </button>
                          <button
                            type="button"
                            className="staff-btn-reject"
                            onClick={() => handleDecideSuggestion(sugg, "rejected")}
                            disabled={decidingId === suggId}
                          >
                            {decidingId === suggId ? "Processing..." : "✕ Reject"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* UPLOAD & FILE LIST */}
      <div className="staff-client-details-layout">
        <div className="staff-details-upload-column">
          <StaffFileUpload
            clientId={clientId}
            onUploadSuccess={fetchClientData}
          />
        </div>

        <div className="staff-details-files-column">
          <FileList
            clientId={clientId}
            files={files}
            onRefresh={fetchClientData}
            onAnalyze={handleAnalyzeFile}
            analyzingId={analyzingId}
          />
        </div>
      </div>
    </main>
  );
}
