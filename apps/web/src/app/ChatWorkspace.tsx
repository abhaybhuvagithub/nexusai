"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
type Section = "chat" | "research" | "agents" | "projects" | "library";

const starters = [
  { icon: "⌘", title: "Design a scalable system", prompt: "Design a production-grade URL shortener for 100 million users. Explain architecture, data model, APIs, scaling and failure handling." },
  { icon: "◈", title: "Research a complex topic", prompt: "Create a structured research brief on the latest practical approaches to building reliable AI agents, including architecture, evaluation and risks." },
  { icon: "⌁", title: "Build something useful", prompt: "Help me turn an idea into a working product. Start with a concise product specification, architecture and an implementation plan." },
  { icon: "▤", title: "Understand a document", prompt: "Give me a framework to analyze a business or technical document: summarize it, identify assumptions, risks, unanswered questions and recommended actions." },
];

const sectionCopy: Record<Exclude<Section, "chat">, { eyebrow: string; title: string; description: string; items: string[] }> = {
  research: { eyebrow: "RESEARCH STUDIO", title: "Turn questions into clarity.", description: "A focused space for structured research, evidence review and decision-ready briefs. Connect a live research provider to enable sourced web research.", items: ["Research briefs and structured outlines", "Evidence and source review workflow", "Decision summaries and action lists"] },
  agents: { eyebrow: "AGENT WORKSPACE", title: "Delegate work with control.", description: "The agent runtime is being built around explicit plans, checkpoints, tool permissions and verification—not uncontrolled background actions.", items: ["Researcher · gather and synthesize information", "Engineer · plan and review implementation", "Analyst · compare options and surface risks"] },
  projects: { eyebrow: "PROJECTS", title: "Keep complex work organized.", description: "Bring conversations, files, tasks and decisions together around a project. Project persistence and collaboration are on the platform roadmap.", items: ["Product strategy and launch planning", "System architecture and engineering", "Business research and operations"] },
  library: { eyebrow: "KNOWLEDGE LIBRARY", title: "Your knowledge, in context.", description: "A dedicated place for the documents and knowledge you want AI to use. Secure ingestion, indexing and permission-aware retrieval are planned for the connected backend.", items: ["Document knowledge bases", "Semantic and keyword retrieval", "Workspace-level access controls"] },
};

function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function Workspace({ getToken }: { getToken?: () => Promise<string | null> }) {
  const [section, setSection] = useState<Section>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nexusai.conversation.v1");
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch { /* Ignore invalid or unavailable local browser storage. */ }
    finally { setHydrated(true); }
  }, []);

  useEffect(() => {
    if (hydrated) { try { window.localStorage.setItem("nexusai.conversation.v1", JSON.stringify(messages)); } catch { /* Storage is optional. */ } }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, hydrated]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const userMessage: Message = { id: makeId(), role: "user", content, createdAt: Date.now() };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setBusy(true);
    setNotice("");
    const apiBase = process.env.NEXT_PUBLIC_NEXUS_API_URL?.replace(/\/$/, "");

    try {
      if (!apiBase) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        setMessages((current) => [...current, {
          id: makeId(), role: "assistant", createdAt: Date.now(),
          content: "You’re viewing the NEXUS AI interactive preview. The workspace UI is active, but no AI backend is connected yet. Once the API is deployed and NEXT_PUBLIC_NEXUS_API_URL is configured, messages will be sent to your model provider.\n\nFor now, you can explore the workspace, switch models and keep this conversation in your browser.",
        }]);
        setNotice("Preview mode · connect the NEXUS API to enable live AI responses.");
        return;
      }
      if (!getToken) throw new Error("Authentication is not configured for this deployment.");
      const token = await getToken();
      if (!token) throw new Error("Please sign in before sending a message.");
      const response = await fetch(`${apiBase}/api/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next.map(({ role, content: body }) => ({ role, content: body })), model }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(payload.detail || `Request failed (${response.status})`);
      }
      const payload = await response.json() as { answer: string };
      setMessages((current) => [...current, { id: makeId(), role: "assistant", content: payload.answer, createdAt: Date.now() }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reach the AI service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(input); }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input); }
  }
  function newChat() { setMessages([]); setNotice(""); setSection("chat"); }
  const activeCopy = section === "chat" ? null : sectionCopy[section];

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("chat"); }}><span className="brand-mark">✳</span><span>NEXUS<span className="brand-light"> AI</span></span></a>
        <button className="new-chat" onClick={newChat}><span>＋</span> New conversation <kbd>⌘ K</kbd></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={section === "chat" ? "nav-item active" : "nav-item"} onClick={() => setSection("chat")}><span>◉</span> Chat <small>⌘1</small></button>
          <button className={section === "research" ? "nav-item active" : "nav-item"} onClick={() => setSection("research")}><span>⌕</span> Research</button>
          <button className={section === "agents" ? "nav-item active" : "nav-item"} onClick={() => setSection("agents")}><span>✧</span> Agents <em>SOON</em></button>
          <button className={section === "projects" ? "nav-item active" : "nav-item"} onClick={() => setSection("projects")}><span>▣</span> Projects <em>SOON</em></button>
          <button className={section === "library" ? "nav-item active" : "nav-item"} onClick={() => setSection("library")}><span>▤</span> Knowledge <em>SOON</em></button>
        </nav>
        <div className="side-label history-label"><span>RECENT</span><button onClick={() => setHistoryOpen((value) => !value)} aria-label="Toggle recent conversations">{historyOpen ? "−" : "+"}</button></div>
        {historyOpen && <div className="history-list">{messages.length > 0 ? <button className="history-entry" onClick={() => setSection("chat")}>{messages.find((message) => message.role === "user")?.content.slice(0, 32) || "Conversation"}…</button> : <p className="empty-history">Your conversations will appear here.</p>}</div>}
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-icon">✦</div><div><b>Build with NEXUS</b><span>Your AI workspace, evolving.</span></div></div>
          <div className="profile"><div className="avatar">A</div><div className="profile-copy"><b>{getToken ? "NEXUS workspace" : "Workspace preview"}</b><span>{getToken ? "Authenticated session" : "Local session"}</span></div><span className="profile-menu">•••</span></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><b>{section === "chat" ? "Chat" : activeCopy?.eyebrow.replace(" STUDIO", "").replace(" WORKSPACE", "").replace(" LIBRARY", "").toLowerCase()}</b></div>
          <div className="topbar-right"><span className="preview-pill"><i /> {getToken ? "Authenticated workspace" : "Interactive preview"}</span><button className="icon-button" aria-label="Settings" onClick={() => setNotice("Settings and account management will be enabled in a later release.")}>⚙</button>{getToken ? <div className="auth-actions"><SignedOut><SignInButton mode="modal"><button className="icon-button">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="icon-button">Create account</button></SignUpButton></SignedOut><SignedIn><UserButton /></SignedIn></div> : <div className="avatar small-avatar">A</div>}</div>
        </header>

        {activeCopy ? <div className="feature-page"><div className="feature-orb">✳</div><p className="eyebrow">{activeCopy.eyebrow}</p><h1>{activeCopy.title}</h1><p className="feature-description">{activeCopy.description}</p><div className="feature-grid">{activeCopy.items.map((item, index) => <article className="feature-tile" key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</div><button className="back-chat" onClick={() => setSection("chat")}>← Back to chat</button></div> :
        <div className={messages.length ? "chat-area has-messages" : "chat-area"}>
          {messages.length === 0 ? <div className="welcome">
            <div className="welcome-mark">✳</div><p className="eyebrow">YOUR INTELLIGENCE WORKSPACE</p>
            <h1>What can we <span>solve</span><br/>together?</h1>
            <p className="welcome-subtitle">Think clearly. Explore deeply. Turn ideas into action.</p>
            <div className="starter-grid">{starters.map((starter) => <button className="starter-card" key={starter.title} onClick={() => void sendMessage(starter.prompt)}><span className="starter-icon">{starter.icon}</span><b>{starter.title}</b><p>{starter.prompt.slice(0, 78)}…</p><span className="starter-arrow">↗</span></button>)}</div>
          </div> : <div className="conversation">{messages.map((message) => <article className={message.role === "user" ? "message user-message" : "message assistant-message"} key={message.id}><div className="message-avatar">{message.role === "user" ? "A" : "✳"}</div><div className="message-body"><div className="message-author">{message.role === "user" ? "You" : "NEXUS AI"}</div><p>{message.content}</p></div></article>)}{busy && <div className="message assistant-message"><div className="message-avatar">✳</div><div className="message-body"><div className="message-author">NEXUS AI</div><div className="typing"><i/><i/><i/></div></div></div>}<div ref={endRef}/></div>}
          {notice && <div className="notice" role="status"><span>ⓘ</span>{notice}</div>}
          <div className="composer-wrap"><form className="composer" onSubmit={onSubmit}><textarea aria-label="Message NEXUS AI" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder="Message NEXUS AI… (Enter to send, Shift + Enter for a new line)" rows={2}/><div className="composer-tools"><div className="composer-left"><button type="button" className="tool-button" onClick={() => setNotice("File uploads will be available when secure document storage is connected.")}>＋ <span>Attach</span></button><span className="composer-divider"/><label className="model-select-label">MODEL <select value={model} onChange={(event) => setModel(event.target.value)}><option value="gpt-4.1-mini">GPT 4.1 mini</option><option value="gpt-4.1">GPT 4.1</option><option value="o4-mini">o4 mini</option></select></label></div><button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Send message">↑</button></div></form><p className="composer-disclaimer">NEXUS AI can make mistakes. Verify important information before acting.</p></div>
        </div>}
        <footer className="app-footer"><span>✳ NEXUS AI</span><span>One workspace. More ways to think.</span><a href="https://github.com/abhaybhuvagithub/nexusai" target="_blank" rel="noreferrer">Built in the open ↗</a></footer>
      </section>
    </main>
  );
}


function AuthenticatedWorkspace() {
  const { getToken } = useAuth();
  return <Workspace getToken={() => getToken({ template: "nexus-api" })} />;
}

export default function ChatWorkspace() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <AuthenticatedWorkspace />
    : <Workspace />;
}
