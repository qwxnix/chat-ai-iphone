import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const starter = [{ role: "assistant", content: "привет! я твой AI-чат. напиши, что нужно сделать 👋" }];

function App() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat-ai-history") || "null") || starter; }
    catch { return starter; }
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiBase, setApiBase] = useState("/api/chat");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => localStorage.setItem("chat-ai-history", JSON.stringify(messages)), [messages]);

  async function send() {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setText("");
    setError("");
    const next = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setBusy(true);
    try {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, model })
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `ошибка сервера: ${response.status}`);
      }
      const data = await response.json();
      const answer = data.reply || data.choices?.[0]?.message?.content || "сервер вернул пустой ответ";
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "не получилось получить ответ. проверь подключение и настройки сервера." }]);
      setError(e.message);
    } finally { setBusy(false); }
  }

  function clearChat() {
    if (confirm("очистить историю чата на этом устройстве?")) setMessages(starter);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">✳</div><div><b>chat ai</b><small>личный помощник</small></div></div>
      <div className="actions">
        <button className="icon-btn" onClick={() => setShowSettings(v => !v)} aria-label="Настройки">⚙</button>
        <button className="icon-btn" onClick={clearChat} aria-label="Очистить чат">＋</button>
      </div>
    </header>

    {showSettings && <section className="settings">
      <div className="settings-title">настройки подключения</div>
      <label>модель<input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini" /></label>
      <label>адрес API<input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="/api/chat" /></label>
      <p>ключ API не вводится в браузере. настрой его на сервере, чтобы не раскрывать посторонним.</p>
    </section>}

    <main className="chat">
      <div className="date-pill">сегодня</div>
      {messages.map((m, i) => <div className={`message-row ${m.role}`} key={i}>
        {m.role === "assistant" && <div className="avatar">✳</div>}
        <div className="bubble"><div className="role-label">{m.role === "user" ? "ты" : "chat ai"}</div>{m.content}</div>
      </div>)}
      {busy && <div className="message-row assistant"><div className="avatar">✳</div><div className="bubble typing"><i></i><i></i><i></i></div></div>}
      <div id="bottom" />
    </main>

    {error && <div className="error-note">{error}</div>}
    <footer className="composer-wrap">
      <div className="composer">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="напиши сообщение..." rows="1" />
        <button className="send-btn" onClick={send} disabled={!text.trim() || busy}>↑</button>
      </div>
      <div className="hint">chat ai может ошибаться · проверяй важную информацию</div>
    </footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);