import { useState } from "react";
import type { DocumentItem } from "../types";
import { UploadIcon, FileTextIcon, TrashIcon, SparklesIcon } from "../components/Icons";

interface DocumentLibraryProps {
  documents: DocumentItem[];
  onUpload: (file: File, title: string) => Promise<void>;
  onDeleteDocument: (docId: number) => Promise<void>;
  onAskAIAboutDoc: (docTitle: string) => void;
}

export function DocumentLibrary({
  documents,
  onUpload,
  onDeleteDocument,
  onAskAIAboutDoc,
}: DocumentLibraryProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setError("");
    setUploading(true);
    try {
      await onUpload(selectedFile, title || selectedFile.name);
      setSelectedFile(null);
      setTitle("");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Upload Box */}
      <div
        className="card page-section"
        style={{
          border: "2px dashed var(--border-card)",
          padding: 32,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "rgba(232, 67, 31, 0.12)",
            color: "var(--red-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px var(--red-glow-subtle)",
          }}
        >
          <UploadIcon width={26} height={26} stroke="var(--red-accent)" />
        </div>

        <div>
          <h4 style={{ fontSize: 18, marginBottom: 6, color: "var(--text-primary)" }}>
            Upload Project Resources
          </h4>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 500 }}>
            Upload assignment briefs, lecture slides, research papers, and meeting minutes (PDF, DOCX, TXT).
          </p>
        </div>

        <form onSubmit={handleUploadSubmit} style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setSelectedFile(f);
                if (!title) setTitle(f.name);
              }
            }}
            required
            style={{ fontSize: 13 }}
          />

          {selectedFile && (
            <input
              placeholder="Document Title (e.g. Software Eng Brief 2026)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: 13 }}
            />
          )}

          {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="btn btn-bubble-red btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {uploading ? "Extracting text & indexing chunks..." : "Upload & Index with AI"}
          </button>
        </form>
      </div>

      {/* Document List */}
      <div className="page-section" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18 }}>Uploaded Project Documents ({documents.length})</h3>
        </div>

        {documents.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No documents uploaded yet. Upload your group assignment brief above so the AI can answer your questions.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="card card-interactive task-row"
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 14,
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: "rgba(232, 67, 31, 0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--red-accent)",
                        }}
                      >
                        <FileTextIcon width={20} height={20} stroke="var(--red-accent)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{doc.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Added by {doc.uploaded_by_name} · {formatBytes(doc.file_size)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      title="Delete document"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  </div>

                  {/* Metadata Chips - Clean text with status dots */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 14 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      {doc.file_type}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>•</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {doc.page_count} page{doc.page_count === 1 ? "" : "s"}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span className="status-dot active" />
                      {doc.chunk_count} passages indexed
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span className="status-dot success" /> {doc.processing_status}
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a
                    href={doc.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textDecoration: "underline" }}
                  >
                    View Original
                  </a>
                  <button
                    onClick={() => onAskAIAboutDoc(doc.title)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11 }}
                  >
                    <SparklesIcon width={12} height={12} stroke="var(--red-accent)" /> Ask AI About File
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
