
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import './style.css';

const STORAGE_KEY = 'chat-ai-conversations';
const MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('ИИ ещё не загружен');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const engineRef = useRef(null);
  const loadingPromiseRef = useRef(null);
  const bottomRef = useRef(null);
  const stopRef = useRef(false);

  const activeChat = chats.find(chat => chat.id === activeId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function updateChat(id, newMessages, title) {
    setChats(previous => {
      const exists = previous.some(chat => chat.id === id);

      if (exists) {
        return previous.map(chat =>
          chat.id === id
            ? { ...chat, messages: newMessages }
            : chat
        );
      }

      return [{ id, title, messages: newMessages }, ...previous];
    });
  }

  async function loadModel() {
    if (engineRef.current) return engineRef.current;
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    setLoading(true);
    setError('');
    setProgress('подключаем WebGPU...');

    loadingPromiseRef.current = (async () => {
      try {
        const engine = await CreateMLCEngine(MODEL, {
          initProgressCallback: report => {
            setProgress(report.text || 'загружаем модель...');
          }
        });

        engineRef.current = engine;
        setProgress('ИИ готов к работе');
        return engine;
      } catch (err) {
        setError('не удалось загрузить ИИ: ' + err.message);
        setProgress('ошибка загрузки');
        throw err;
      } finally {
        setLoading(false);
        loadingPromiseRef.current = null;
      }
    })();

    return loadingPromiseRef.current;
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text || generating) return;

    const id = activeId || Date.now();

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text
    };

    const previousMessages = activeChat?.messages || [];
    const updatedMessages = [...previousMessages, userMessage];

    setActiveId(id);
    setMessage('');
    setError('');
    setGenerating(true);
    stopRef.current = false;

    updateChat(id, updatedMessages, text.slice(0, 28));

    try {
      const engine = await loadModel();

      if (stopRef.current) return;

      setProgress('ИИ думает...');

      const history = [
        {
          role: 'system',
          content: 'Ты полезный ИИ-помощник. Отвечай понятно, дружелюбно и на языке пользователя.'
        },
        ...updatedMessages.slice(-12).map(item => ({
          role: item.role,
          content: item.text
        }))
      ];

      const response = await engine.chat.completions.create({
        messages: history,
        temperature: 0.7,
        max_tokens: 400
      });

      const answer =
        response.choices?.[0]?.message?.content ||
        'не получилось получить ответ. попробуй ещё раз.';

      if (!stopRef.current) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          text: answer
        };

        updateChat(id, [...updatedMessages, assistantMessage], text.slice(0, 28));
      }

      setProgress(stopRef.current ? 'генерация остановлена' : 'ИИ готов к работе');

    } catch (err) {
      console.error(err);
      setError('ошибка: ' + err.message);
      setProgress('попробуй ещё раз');
    } finally {
      setGenerating(false);
      stopRef.current = false;
    }
  }

  function stopGeneration() {
    stopRef.current = true;
    try {
      engineRef.current?.interruptGenerate();
    } catch (err) {
      console.warn(err);
    }
    setGenerating(false);
    setProgress('генерация остановлена');
  }

  async function copyMessage(item) {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError('не удалось скопировать сообщение');
    }
  }

  function newChat() {
    if (generating) stopGeneration();
    setActiveId(null);
    setMessage('');
    setSidebarOpen(false);
    setError('');
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
            <div
              className={`history-item ${activeId === chat.id ? 'selected' : ''}`}
              key={chat.id}
            >
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

        <div className="side-footer">CHAT AI · LOCAL AI</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="top-title">Chat <span>AI</span></div>

          <button
            className="model-button"
            onClick={loadModel}
            disabled={loading || !!engineRef.current}
          >
            {engineRef.current ? '● ИИ готов' : loading ? 'загрузка...' : 'загрузить ИИ'}
          </button>
        </header>

        <div className="model-status">{progress}</div>

        <section className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="glow">✦</div>
              <h1>чем займёмся<br /><span>сегодня?</span></h1>
              <p>твой личный AI-помощник</p>

              <div className="suggestions">
                {['помоги с учёбой', 'напиши идею для проекта', 'объясни сложную тему'].map(item => (
                  <button key={item} onClick={() => setMessage(item)}>
                    {item} ↗
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map(item => (
                <div className={`message ${item.role}`} key={item.id}>
                  <div className="avatar">
                    {item.role === 'user' ? 'Я' : '✦'}
                  </div>
                  <div className="bubble">
                    {item.text}
                    <button
                      className="copy-btn"
                      onClick={() => copyMessage(item)}
                    >
                      {copiedId === item.id ? 'скопировано ✓' : 'копировать'}
                    </button>
                  </div>
                </div>
              ))}

              {generating && (
                <div className="message assistant">
                  <div className="avatar">✦</div>
                  <div className="bubble">думаю...</div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-wrap">
          {error && <p className="error-message">{error}</p>}

          <form className="composer" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="напиши сообщение..."
              aria-label="сообщение"
              disabled={generating}
            />

            {generating ? (
              <button type="button" onClick={stopGeneration}>
                ■
              </button>
            ) : (
              <button type="submit" disabled={!message.trim()}>
                ➤
              </button>
            )}
          </form>

          <p className="disclaimer">
            локальный ИИ · ответы генерируются на устройстве
          </p>
        </footer>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
