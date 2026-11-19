
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

const STORAGE_KEY = 'chat-ai-conversations';

function App() {
  const [chats, setChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);

  const activeChat = chats.find(chat => chat.id === activeId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function newChat() {
    setActiveId(null);
    setMessage('');
    setSidebarOpen(false);
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    const id = activeId || Date.now();

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text
    };

    const notice = {
      id: Date.now() + 1,
      role: 'assistant',
      text: 'интерфейс работает! осталось подключить сервер ИИ, чтобы я мог отвечать на сообщения.'
    };

    setChats(previous => {
      const exists = previous.some(chat => chat.id === id);

      if (exists) {
        return previous.map(chat =>
          chat.id === id
            ? { ...chat, messages: [...chat.messages, userMessage, notice] }
            : chat
        );
      }

      return [{
        id,
        title: text.slice(0, 28),
        messages: [userMessage, notice]
      }, ...previous];
    });

    setActiveId(id);
    setMessage('');
  }

  function deleteChat(id) {
    setChats(previous => previous.filter(chat => chat.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="side-head">
          <div className="logo">CHAT<span>AI</span></div>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <span>＋</span> новый чат
        </button>

        <div className="history-title">ИСТОРИЯ</div>

        <div className="history">
          {chats.map(chat => (
            <div className={`history-item ${activeId === chat.id ? 'selected' : ''}`} key={chat.id}>
              <button onClick={() => {
                setActiveId(chat.id);
                setSidebarOpen(false);
              }}>
                {chat.title}
              </button>
              <button className="delete-btn" onClick={() => deleteChat(chat.id)}>×</button>
            </div>
          ))}
          {chats.length === 0 && (
            <p className="empty-history">пока нет переписок</p>
          )}
        </div>

        <div className="side-footer">CHAT AI · версия 1.0</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="top-title">Chat <span>AI</span></div>
          <div className="status"><i /> интерфейс готов</div>
        </header>

        <section className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="glow">✦</div>
              <h1>чем займёмся<br /><span>сегодня?</span></h1>
              <p>твой личный AI-помощник</p>
              <div className="suggestions">
                {['помоги с учёбой', 'напиши идею для проекта', 'объясни сложную тему'].map(item => (
                  <button key={item} onClick={() => setMessage(item)}>{item} ↗</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map(item => (
                <div className={`message ${item.role}`} key={item.id}>
                  <div className="avatar">{item.role === 'user' ? 'Я' : '✦'}</div>
                  <div className="bubble">{item.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-wrap">
          <form className="composer" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="напиши сообщение..."
              aria-label="сообщение"
            />
            <button type="submit" disabled={!message.trim()}>➤</button>
          </form>
          <p className="disclaimer">пока работает демонстрационный режим · сервер ИИ ещё не подключён</p>
        </footer>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
