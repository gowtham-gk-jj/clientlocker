
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import apiRequest, {
  getClientFiles,
  getClientChecklist,
  updateChecklistItem,
  generateChecklistSuggestions,
  getAISuggestions,
  decideAISuggestion
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
  const [success, setSuccess] = useState("");

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setFiles([]);
      setChecklist([]);
      setSuggestions([]);
      setError("Client ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch clients available to the logged-in user (partner or staff)
      const clientResponse = await apiRequest("/api/clients");

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

      // Concurrently fetch files, checklist, and AI suggestions
      const [fileRes, checklistRes, suggRes] = await Promise.all([
        getClientFiles(clientId).catch(() => ({ files: [] })),
        getClientChecklist(clientId).catch(() => ({ items: [] })),
        getAISuggestions(clientId).catch(() => ({ suggestions: [] }))
      ]);

      setFiles(Array.isArray(fileRes?.files) ? fileRes.files : []);
      setChecklist(Array.isArray(checklistRes?.items) ? checklistRes.items : []);
      setSuggestions(Array.isArray(suggRes?.suggestions) ? suggRes.suggestions : []);
    } catch (err) {
      setClient(null);
      setFiles([]);
      setError(err.message || "Unable to load client information.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Handle AI analysis on a document
  const handleAnalyzeFile = async (file) => {
    const fileId = file.id || file._id;
    if (!fileId || !clientId) return;

    try {
      setAnalyzingId(fileId);
      setError("");
      setSuccess("");

      const res = await generateChecklistSuggestions(clientId, fileId);

      const count = res.suggestions?.length || 0;
      setSuccess(
        count > 0
          ? `AI generated ${count} suggestion(s). Please review below.`
          : res.message || "Document analyzed successfully."
      );

      await fetchClientData();
    } catch (err) {
      setError(err.message || "Failed to generate AI suggestions.");
    } finally {
      setAnalyzingId(null);
    }
  };

  // Handle Accept / Reject AI suggestion
  const handleDecideSuggestion = async (suggestionId, status) => {
    try {
      setDecidingId(suggestionId);
      setError("");
      setSuccess("");

      const res = await decideAISuggestion(suggestionId, status);
      setSuccess(res.message || `Suggestion ${status} successfully.`);

      await fetchClientData();
    } catch (err) {
      setError(err.message || `Failed to ${status} suggestion.`);
    } finally {
      setDecidingId(null);
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
    navigate(user?.role === "partner" ? "/partner/dashboard" : "/staff");
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
        <button type="button" className="staff-back-button" onClick={fetchClientData}>
          Try again
        </button>
      </main>
    );
  }

  const completedChecklistCount = checklist.filter((i) => i.done).length;
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

                  {sugg.status === "pending" && (
                    <div className="staff-suggestion-actions">
                      <button
                        type="button"
                        className="staff-btn-accept"
                        onClick={() => handleDecideSuggestion(suggId, "accepted")}
                        disabled={decidingId === suggId}
                      >
                        {decidingId === suggId ? "Processing..." : "✓ Accept Suggestion"}
                      </button>
                      <button
                        type="button"
                        className="staff-btn-reject"
                        onClick={() => handleDecideSuggestion(suggId, "rejected")}
                        disabled={decidingId === suggId}
                      >
                        {decidingId === suggId ? "Processing..." : "✕ Reject"}
                      </button>
                    </div>
                  )}
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
