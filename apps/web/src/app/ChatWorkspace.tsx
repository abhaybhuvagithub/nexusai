"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type Message = { id: string | number; role: "user" | "assistant"; content: string; created_at?: string };
type Section = "chat" | "research" | "agents" | "projects" | "library" | "usage";
type Conversation = { id: number; title: string; updated_at: string };
type Project = { id: number; name: string; description: string; color: string };
type DocumentItem = { id: number; title: string; content_chars: number };
type Usage = { requests: number; input_characters: number; output_characters: number; by_feature: { feature: string; model: string; requests: number }[] };

const apiBase = process.env.NEXT_PUBLIC_NEXUS_API_URL?.replace(/\/$/, "") || "";
const agents = [
  { id: "architect", name: "Architect", description: "System design, architecture, scale and reliability" },
  { id: "researcher", name: "Researcher", description: "Structured synthesis, evidence gaps and recommendations" },
  { id: "engineer", name: "Engineer", description: "Implementation plans, code reviews and test strategy" },
  { id: "analyst", name: "Analyst", description: "Business analysis, options and risk assessment" },
  { id: "writer", name: "Writer", description: "Clear, polished content for any audience" },
] as const;

function Workspace({ getToken, isSignedIn }: { getToken?: () => Promise<string | null>; isSignedIn?: boolean }) {
  const [section, setSection] = useState<Section>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [models, setModels] = useState<string[]>(["gpt-4.1-mini"]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("architect");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const [researchPrompt, setResearchPrompt] = useState("");
  const [researchResult, setResearchResult] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    if (!apiBase) throw new Error("The API endpoint is not configured for this deployment.");
    const token = getToken ? await getToken() : null;
    if (getToken && !token) throw new Error("Your session has expired. Please sign in again.");
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail || `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }, [getToken]);

  const refreshWorkspace = useCallback(async () => {
    if (!apiBase || (getToken && !isSignedIn)) return;
    try {
      const [history, projectList, docs, availableModels, metrics] = await Promise.all([
        api<Conversation[]>("/api/v1/conversations"),
        api<Project[]>("/api/v1/projects"),
        api<DocumentItem[]>("/api/v1/knowledge/documents"),
        api<{ models: string[] }>("/api/v1/models"),
        api<Usage>("/api/v1/usage"),
      ]);
      setConversations(history);
      setProjects(projectList);
      setDocuments(docs);
      setModels(availableModels.models);
      setUsage(metrics);
      if (availableModels.models.length && !availableModels.models.includes(model)) setModel(availableModels.models[0]);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load workspace data.");
    }
  }, [api, model, getToken, isSignedIn]);

  useEffect(() => { void refreshWorkspace(); }, [refreshWorkspace]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function openConversation(id: number) {
    setBusy(true);
    try {
      const data = await api<{ id: number; messages: { id: number; role: string; content: string }[] }>(`/api/v1/conversations/${id}`);
      setConversationId(data.id);
      setMessages(data.messages.filter((m) => m.role === "user" || m.role === "assistant") as Message[]);
      setSection("chat");
      setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not open conversation."); }
    finally { setBusy(false); }
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Message[] = [...messages, { id: `local-${Date.now()}`, role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ answer: string; conversation_id: number; model: string }>("/api/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          messages: next.map(({ role, content: body }) => ({ role, content: body })),
          model, conversation_id: conversationId, project_id: selectedProject, document_ids: selectedDocs,
        }),
      });
      setConversationId(result.conversation_id);
      setMessages((current) => [...current, { id: `answer-${Date.now()}`, role: "assistant", content: result.answer }]);
      void refreshWorkspace();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to complete the request.");
    } finally { setBusy(false); }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setBusy(true);
    try {
      await api("/api/v1/projects", { method: "POST", body: JSON.stringify({ name: projectName, description: projectDescription, color: "green" }) });
      setProjectName(""); setProjectDescription(""); await refreshWorkspace(); setNotice("Project created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Project creation failed."); }
    finally { setBusy(false); }
  }

  async function uploadDocument(file: File | undefined) {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      if (!apiBase) throw new Error("The API endpoint is not configured for this deployment.");
      const token = getToken ? await getToken() : null;
      if (getToken && !token) throw new Error("Please sign in before uploading files.");
      const form = new FormData();
      form.append("file", file);
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`${apiBase}/api/v1/knowledge/upload`, { method: "POST", headers, body: form });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail || `Upload failed (${response.status})`);
      }
      await refreshWorkspace();
      setNotice(`${file.name} added to your knowledge library.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "File upload failed.");
    } finally { setBusy(false); }
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentTitle.trim() || !documentContent.trim()) return;
    setBusy(true);
    try {
      await api("/api/v1/knowledge/documents", { method: "POST", body: JSON.stringify({ title: documentTitle, content: documentContent }) });
      setDocumentTitle(""); setDocumentContent(""); await refreshWorkspace(); setNotice("Knowledge document saved. Select it in Chat to provide context.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Document could not be saved."); }
    finally { setBusy(false); }
  }

  async function runAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agentPrompt.trim()) return;
    setBusy(true); setAgentResult(""); setNotice("");
    try {
      const result = await api<{ answer: string }>("/api/v1/agents/run", { method: "POST", body: JSON.stringify({ agent, prompt: agentPrompt, model }) });
      setAgentResult(result.answer); void refreshWorkspace();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Agent run failed."); }
    finally { setBusy(false); }
  }

  async function runTeamWorkflow() {
    if (!agentPrompt.trim()) return;
    setBusy(true); setAgentResult(""); setNotice("");
    try {
      const sequence = [agent, ...["architect", "engineer", "analyst", "researcher", "writer"].filter((item) => item !== agent)].slice(0, 3);
      const result = await api<{ steps: { specialist: string; answer: string }[]; final_output: string }>(
        "/api/v1/agents/orchestrate",
        { method: "POST", body: JSON.stringify({ task: agentPrompt, steps: sequence, model }) },
      );
      setAgentResult(result.steps.map((step, index) => `STEP ${index + 1} · ${step.specialist.toUpperCase()}\n\n${step.answer}`).join("\n\n────────────\n\n"));
      void refreshWorkspace();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Team workflow failed."); }
    finally { setBusy(false); }
  }

  async function runResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!researchPrompt.trim()) return;
    setBusy(true); setResearchResult(""); setNotice("");
    try {
      const result = await api<{ answer: string; notice: string }>("/api/v1/research", { method: "POST", body: JSON.stringify({ agent: "researcher", prompt: researchPrompt, model }) });
      setResearchResult(`${result.answer}\n\n---\n${result.notice}`); void refreshWorkspace();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Research run failed."); }
    finally { setBusy(false); }
  }

  async function exportWorkspace() {
    try {
      const data = await api<Record<string, unknown>>("/api/v1/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "nexusai-account-export.json"; link.click();
      window.URL.revokeObjectURL(url);
      setNotice("Your workspace export has been prepared.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Export failed."); }
  }

  async function clearWorkspace() {
    if (!window.confirm("Permanently delete all conversations, projects, knowledge documents and usage records for this account? This does not delete your Clerk sign-in account.")) return;
    setBusy(true);
    try {
      await api("/api/v1/account/data", { method: "DELETE" });
      setMessages([]); setConversationId(null); setSelectedDocs([]); await refreshWorkspace();
      setNotice("Workspace data deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Workspace data could not be deleted."); }
    finally { setBusy(false); }
  }

  async function removeItem(path: string, label: string) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    try { await api(path, { method: "DELETE" }); await refreshWorkspace(); setNotice(`${label} deleted.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : `Could not delete ${label}.`); }
  }

  function newChat() { setMessages([]); setConversationId(null); setNotice(""); setSection("chat"); }
  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(input); }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input); }
  }
  const filteredConversations = conversations.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("chat"); }}><span className="brand-mark">✳</span><span>NEXUS<span className="brand-light"> AI</span></span></a>
        <button className="new-chat" onClick={newChat}><span>＋</span> New conversation <kbd>⌘ K</kbd></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={section === "chat" ? "nav-item active" : "nav-item"} onClick={() => setSection("chat")}><span>◉</span> Chat</button>
          <button className={section === "research" ? "nav-item active" : "nav-item"} onClick={() => setSection("research")}><span>⌕</span> Research</button>
          <button className={section === "agents" ? "nav-item active" : "nav-item"} onClick={() => setSection("agents")}><span>✧</span> Agents</button>
          <button className={section === "projects" ? "nav-item active" : "nav-item"} onClick={() => setSection("projects")}><span>▣</span> Projects <small>{projects.length}</small></button>
          <button className={section === "library" ? "nav-item active" : "nav-item"} onClick={() => setSection("library")}><span>▤</span> Knowledge <small>{documents.length}</small></button>
          <button className={section === "usage" ? "nav-item active" : "nav-item"} onClick={() => setSection("usage")}><span>◷</span> Usage</button>
        </nav>
        <div className="side-label history-label"><span>CONVERSATIONS</span><button onClick={() => void refreshWorkspace()} aria-label="Refresh conversations">↻</button></div>
        <input className="history-search" aria-label="Search conversations" placeholder="Search history…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="history-list">{filteredConversations.slice(0, 30).map((item) => <div className="history-row" key={item.id}><button className="history-entry" onClick={() => void openConversation(item.id)}>{item.title}</button><button className="history-delete" aria-label="Delete conversation" onClick={() => void removeItem(`/api/v1/conversations/${item.id}`, "conversation")}>×</button></div>)}{filteredConversations.length === 0 && <p className="empty-history">No conversations yet.</p>}</div>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-icon">✦</div><div><b>Personal workspace</b><span>Private, persistent and yours.</span></div></div>
          <div className="profile"><div className="avatar">N</div><div className="profile-copy"><b>NEXUS account</b><span>{apiBase ? "Connected workspace" : "API not configured"}</span></div><span className="profile-menu">{getToken ? <UserButton /> : "•••"}</span></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><b>{section[0].toUpperCase() + section.slice(1)}</b></div>
          <div className="topbar-right"><span className="preview-pill"><i /> {apiBase ? "Workspace services" : "Local preview"}</span>{getToken ? <><SignedOut><SignInButton mode="modal"><button className="icon-button">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="icon-button">Create account</button></SignUpButton></SignedOut><SignedIn><UserButton /></SignedIn></> : null}</div>
        </header>

        {notice && <div className="global-notice" role="status"><span>ⓘ</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        {section === "chat" && <div className={messages.length ? "chat-area has-messages" : "chat-area"}>
          {messages.length === 0 ? <div className="welcome">
            <div className="welcome-mark">✳</div><p className="eyebrow">YOUR INTELLIGENCE WORKSPACE</p>
            <h1>What can we <span>solve</span><br/>together?</h1>
            <p className="welcome-subtitle">Think clearly. Explore deeply. Turn ideas into action.</p>
            <div className="starter-grid">
              <button className="starter-card" onClick={() => void sendMessage("Design a production-grade URL shortener for 100 million users. Include architecture, data model, APIs, scaling, security and failure handling.")}><span className="starter-icon">⌘</span><b>System design</b><p>Explore architecture, trade-offs and scale.</p><span className="starter-arrow">↗</span></button>
              <button className="starter-card" onClick={() => setSection("research")}><span className="starter-icon">◈</span><b>Research a topic</b><p>Build structured briefs and recommendations.</p><span className="starter-arrow">↗</span></button>
              <button className="starter-card" onClick={() => setSection("agents")}><span className="starter-icon">✧</span><b>Delegate to an agent</b><p>Choose a specialist for focused work.</p><span className="starter-arrow">↗</span></button>
              <button className="starter-card" onClick={() => setSection("library")}><span className="starter-icon">▤</span><b>Use your knowledge</b><p>Save source material and ground your chats.</p><span className="starter-arrow">↗</span></button>
            </div>
          </div> : <div className="conversation">{messages.map((message) => <article className={message.role === "user" ? "message user-message" : "message assistant-message"} key={message.id}><div className="message-avatar">{message.role === "user" ? "A" : "✳"}</div><div className="message-body"><div className="message-author">{message.role === "user" ? "You" : "NEXUS AI"}</div><p>{message.content}</p></div></article>)}{busy && <div className="message assistant-message"><div className="message-avatar">✳</div><div className="message-body"><div className="message-author">NEXUS AI</div><div className="typing"><i/><i/><i/></div></div></div>}<div ref={endRef}/></div>}
          <div className="composer-wrap"><form className="composer" onSubmit={onSubmit}><textarea aria-label="Message NEXUS AI" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder="Message NEXUS AI… (Enter to send, Shift + Enter for a new line)" rows={2}/><div className="composer-tools"><div className="composer-left"><label className="model-select-label">MODEL <select value={model} onChange={(event) => setModel(event.target.value)}>{models.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label className="model-select-label">PROJECT <select value={selectedProject ?? ""} onChange={(event) => setSelectedProject(event.target.value ? Number(event.target.value) : null)}><option value="">Personal</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label className="model-select-label">KNOWLEDGE <select value="" onChange={(event) => { const id = Number(event.target.value); if (id && !selectedDocs.includes(id)) setSelectedDocs((old) => [...old, id]); }}><option value="">Add context…</option>{documents.filter((doc) => !selectedDocs.includes(doc.id)).map((doc) => <option value={doc.id} key={doc.id}>{doc.title}</option>)}</select></label>{selectedDocs.map((id) => <button type="button" className="context-chip" key={id} onClick={() => setSelectedDocs((old) => old.filter((value) => value !== id))}>{documents.find((doc) => doc.id === id)?.title || "Document"} ×</button>)}</div><button className="send-button" type="submit" disabled={!input.trim() || busy}>↑</button></div></form><p className="composer-disclaimer">AI responses may be inaccurate. Verify important decisions.</p></div>
        </div>}

        {section === "agents" && <div className="workspace-page"><p className="eyebrow">SPECIALIST AGENTS</p><h1>Delegate with intent.</h1><p className="page-intro">Choose a focused AI specialist, provide a clear objective and get a structured deliverable. Agent runs are metered and rate-limited.</p><div className="agent-grid">{agents.map((item) => <button key={item.id} className={agent === item.id ? "agent-card selected" : "agent-card"} onClick={() => setAgent(item.id)}><b>{item.name}</b><span>{item.description}</span></button>)}</div><form className="work-form" onSubmit={(event) => void runAgent(event)}><label>YOUR OBJECTIVE<textarea value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} rows={5} placeholder="Describe the task, constraints, audience and expected output…"/></label><div className="agent-actions"><button className="primary-action" disabled={busy || !agentPrompt.trim()}>{busy ? "Working…" : `Run ${agents.find((item) => item.id === agent)?.name}`}</button><button type="button" className="secondary-action" disabled={busy || !agentPrompt.trim()} onClick={() => void runTeamWorkflow()}>Run team workflow · 3 specialists</button></div></form>{agentResult && <article className="result-panel"><div className="result-heading">AGENT OUTPUT <button onClick={() => void navigator.clipboard.writeText(agentResult)}>Copy</button></div><pre>{agentResult}</pre></article>}</div>}

        {section === "research" && <div className="workspace-page"><p className="eyebrow">RESEARCH STUDIO</p><h1>Turn questions into clarity.</h1><p className="page-intro">Generate structured analysis, compare approaches and identify evidence gaps. This synthesis uses the configured language model; it does not fetch live web pages or fabricate citations.</p><form className="work-form" onSubmit={(event) => void runResearch(event)}><label>RESEARCH QUESTION<textarea value={researchPrompt} onChange={(event) => setResearchPrompt(event.target.value)} rows={5} placeholder="What do you need to understand? Include scope, timeframe and decision context…"/></label><button className="primary-action" disabled={busy || !researchPrompt.trim()}>{busy ? "Researching…" : "Generate research brief"}</button></form>{researchResult && <article className="result-panel"><div className="result-heading">RESEARCH BRIEF <button onClick={() => void navigator.clipboard.writeText(researchResult)}>Copy</button></div><pre>{researchResult}</pre></article>}</div>}

        {section === "projects" && <div className="workspace-page"><p className="eyebrow">PROJECTS</p><h1>Organize meaningful work.</h1><p className="page-intro">Create private project spaces for initiatives, engineering work and research. Project records are stored against your authenticated account.</p><form className="inline-create" onSubmit={(event) => void createProject(event)}><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" maxLength={120}/><input value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Short description" maxLength={4000}/><button className="primary-action" disabled={busy || !projectName.trim()}>Create project</button></form><div className="resource-list">{projects.map((project) => <article className="resource-card" key={project.id}><div><b>{project.name}</b><p>{project.description || "No description"}</p></div><button onClick={() => void removeItem(`/api/v1/projects/${project.id}`, "project")}>Delete</button></article>)}{projects.length === 0 && <p className="empty-state">Your first project starts here. Create one above.</p>}</div></div>}

        {section === "library" && <div className="workspace-page"><p className="eyebrow">PRIVATE KNOWLEDGE</p><h1>Bring your context.</h1><p className="page-intro">Save text notes, specifications and reference material. Select saved documents in Chat to include their content as grounded context in a model request.</p><div className="upload-panel"><label>UPLOAD A DOCUMENT <input type="file" accept=".txt,.md,.csv,.json,.log,.pdf,.docx" onChange={(event) => void uploadDocument(event.target.files?.[0])} disabled={busy}/></label><span>TXT, MD, CSV, JSON, LOG, PDF or DOCX · maximum 5 MB</span></div><form className="work-form" onSubmit={(event) => void addDocument(event)}><label>DOCUMENT TITLE<input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="e.g. Architecture decisions" maxLength={200}/></label><label>DOCUMENT CONTENT<textarea value={documentContent} onChange={(event) => setDocumentContent(event.target.value)} rows={7} maxLength={100000} placeholder="Paste notes, requirements, technical documentation or other text…"/></label><div className="form-foot"><span>{documentContent.length.toLocaleString()} / 100,000 characters</span><button className="primary-action" disabled={busy || !documentTitle.trim() || !documentContent.trim()}>Save to knowledge</button></div></form><div className="resource-list">{documents.map((doc) => <article className="resource-card" key={doc.id}><div><b>{doc.title}</b><p>{doc.content_chars.toLocaleString()} characters</p></div><button onClick={() => void removeItem(`/api/v1/knowledge/documents/${doc.id}`, "document")}>Delete</button></article>)}{documents.length === 0 && <p className="empty-state">No documents saved yet.</p>}</div></div>}

        {section === "usage" && <div className="workspace-page"><p className="eyebrow">ACCOUNT USAGE</p><h1>Understand your activity.</h1><p className="page-intro">Usage counters are recorded by the API for completed chat and agent requests. Character counts are operational estimates, not token counts or billing invoices.</p><div className="usage-grid"><article><span>REQUESTS</span><b>{usage?.requests ?? "—"}</b></article><article><span>INPUT CHARACTERS</span><b>{usage?.input_characters.toLocaleString() ?? "—"}</b></article><article><span>OUTPUT CHARACTERS</span><b>{usage?.output_characters.toLocaleString() ?? "—"}</b></article></div><div className="resource-list">{usage?.by_feature.map((row) => <article className="resource-card" key={row.feature + row.model}><div><b>{row.feature}</b><p>{row.model}</p></div><strong>{row.requests} requests</strong></article>)}</div><div className="account-actions"><button className="secondary-action" onClick={() => void exportWorkspace()}>Export my data</button><button className="danger-action" onClick={() => void clearWorkspace()} disabled={busy}>Delete workspace data</button></div></div>}

        <footer className="app-footer"><span>✳ NEXUS AI</span><span>One workspace. More ways to think.</span><a href="https://github.com/abhaybhuvagithub/nexusai" target="_blank" rel="noreferrer">Built in the open ↗</a></footer>
      </section>
    </main>
  );
}

function AuthenticatedWorkspace() {
  const { getToken, isSignedIn } = useAuth();
  const tokenGetter = useCallback(() => getToken({ template: "nexus-api" }), [getToken]);
  return <Workspace getToken={tokenGetter} isSignedIn={Boolean(isSignedIn)} />;
}

export default function ChatWorkspace() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <AuthenticatedWorkspace />
    : <Workspace />;
}
