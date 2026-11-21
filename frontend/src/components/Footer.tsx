interface FooterProps {
  onSelectTab: (tab: "overview" | "tasks" | "ai" | "ai-tools" | "documents" | "knowledge" | "contribution" | "readiness" | "members") => void;
}

export function Footer({ onSelectTab }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-logo">
            CollabSpace <span>AI</span>
          </div>
          <p>One shared space for student project teams, with an AI that answers only from your files.</p>
        </div>

        <div className="site-footer-col">
          <h4>Workspace</h4>
          <button onClick={() => onSelectTab("tasks")}>Task Board</button>
          <button onClick={() => onSelectTab("documents")}>Documents</button>
          <button onClick={() => onSelectTab("knowledge")}>Knowledge Hub</button>
        </div>

        <div className="site-footer-col">
          <h4>AI</h4>
          <button onClick={() => onSelectTab("ai")}>Project AI</button>
          <button onClick={() => onSelectTab("ai-tools")}>AI Tools</button>
          <button onClick={() => onSelectTab("readiness")}>Readiness Check</button>
        </div>

        <div className="site-footer-col">
          <h4>Team</h4>
          <button onClick={() => onSelectTab("contribution")}>Contributions</button>
          <button onClick={() => onSelectTab("members")}>Members</button>
          <button onClick={() => onSelectTab("overview")}>Home</button>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {year} CollabSpace AI. All rights reserved.</span>
        <span>Built for university group projects.</span>
      </div>
    </footer>
  );
}
