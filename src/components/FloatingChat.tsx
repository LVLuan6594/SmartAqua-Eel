import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { Clipboard, Expand, History, Minimize, Plus, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../store/demoStore';
import { answerDataQuestion, DATA_CHAT_SUGGESTIONS } from '../ai/dataChatService';
import { CHAT_WELCOME_MESSAGE, loadChatHistory, saveChatHistory } from '../ai/chatHistory';
import type { ChatMessage, Conversation } from '../ai/chatHistory';
import type { ChatResponse, Role } from '../types/models';

const GREET = CHAT_WELCOME_MESSAGE;
const ROLE_SUGGESTIONS: Record<Role, string[]> = {
  admin: ['Tổng quan dữ liệu hệ thống', 'Có bao nhiêu cơ sở, hộ và bể nuôi?', 'HTX nào quản lý nhiều hộ nuôi nhất?', 'Xếp hạng xã theo diện tích vùng nuôi'],
  manager: ['Thống kê số bể nuôi theo từng xã', 'Tổng diện tích vùng nuôi hiện nay?', 'Có bao nhiêu vụ nuôi đang hoạt động?', 'Xã nào có diện tích vùng nuôi lớn nhất?'],
  coop: ['Tổng quan dữ liệu hệ thống', 'Có bao nhiêu hộ và bể trong HTX?', 'HTX nào quản lý nhiều hộ nuôi nhất?', 'Tổng sản lượng thu hoạch?'],
  farmer: ['Các bể nuôi của tôi có bao nhiêu?', 'Các vụ nuôi nào đang hoạt động?', 'Sản lượng thu hoạch của tôi?', 'Nhật ký thức ăn của tôi có bao nhiêu?'],
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return <>{parts.map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part.startsWith('`') && part.endsWith('`')
      ? <code key={index}>{part.slice(1, -1)}</code>
      : part)}</>;
}

function MessageBody({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let table: string[][] = [];
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`list-${blocks.length}`}>{list.map((line, i) => <li key={i}><InlineMarkdown text={line}/></li>)}</ul>);
    list = [];
  };
  const flushTable = () => {
    if (table.length) {
      const rows = table.filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell.trim())));
      blocks.push(<div className="fc-table-wrap" key={`table-${blocks.length}`}><table><thead><tr>{(rows[0] || []).map((cell, i) => <th key={i}><InlineMarkdown text={cell}/></th>)}</tr></thead><tbody>{rows.slice(1).map((row, ri) => <tr key={ri}>{row.map((cell, i) => <td key={i}><InlineMarkdown text={cell}/></td>)}</tr>)}</tbody></table></div>);
    }
    table = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      table.push(line.slice(1, -1).split('|').map((cell) => cell.trim()));
      return;
    }
    flushTable();
    const bullet = line.match(/^(?:[-*•])\s+(.+)/);
    if (bullet) { list.push(bullet[1]); return; }
    flushList();
    if (!line) return;
    if (/^#{1,3}\s/.test(line)) blocks.push(<h4 key={`h-${i}`}><InlineMarkdown text={line.replace(/^#{1,3}\s/, '')}/></h4>);
    else blocks.push(<p key={`p-${i}`}><InlineMarkdown text={line}/></p>);
  });
  flushTable();
  flushList();
  return <div className="fc-markdown">{blocks}</div>;
}

export default function FloatingChat() {
  const { db, role } = useDemo();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(() => loadChatHistory(role));
  const [activeId, setActiveId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const active = conversations.find((chat) => chat.id === activeId) || null;
  const messages = active?.messages || [GREET];
  const suggestions = useMemo(() => ROLE_SUGGESTIONS[role] || DATA_CHAT_SUGGESTIONS.slice(0, 4), [role]);

  useEffect(() => {
    setConversations(loadChatHistory(role));
    setActiveId(null);
    setHistoryOpen(false);
  }, [role]);

  useEffect(() => {
    saveChatHistory(role, conversations);
  }, [conversations, role]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, open, busy, historyOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const setChatMessages = (id: string, update: (items: ChatMessage[]) => ChatMessage[]) => {
    setConversations((items) => items.map((chat) => chat.id === id
      ? { ...chat, messages: update(chat.messages), updatedAt: new Date().toISOString() }
      : chat));
  };

  const ask = async (raw: string, retryId?: string) => {
    const question = raw.trim();
    if (!question || busy) return;
    const id = active?.id || uid();
    setBusy(true);
    setInput('');
    setHistoryOpen(false);
    setActiveId(id);
    if (!active) {
      const userMessage: ChatMessage = { id: uid(), role: 'user', text: question };
      setConversations((items) => [{ id, title: question.slice(0, 56), updatedAt: new Date().toISOString(), messages: [GREET, userMessage] }, ...items].slice(0, 30));
    } else if (!retryId) {
      setChatMessages(id, (items) => [...items, { id: uid(), role: 'user', text: question }]);
    }
    if (retryId) setChatMessages(id, (items) => items.filter((message) => message.id !== retryId));
    try {
      const result: ChatResponse = await answerDataQuestion({ question, db, role });
      setChatMessages(id, (items) => [...items, { id: uid(), role: 'assistant', text: result.answer, reference: result.reference, action: result.action }]);
    } catch {
      setChatMessages(id, (items) => [...items, { id: uid(), role: 'assistant', text: 'Không thể truy vấn dữ liệu hiện tại. Hãy kiểm tra kết nối rồi thử lại.', failed: true, question }]);
    } finally {
      setBusy(false);
    }
  };

  const retry = (message: ChatMessage) => { if (message.question) void ask(message.question, message.id); };
  const startNew = () => { setActiveId(null); setHistoryOpen(false); inputRef.current?.focus(); };
  const removeConversation = (id: string) => {
    setConversations((items) => items.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard permissions vary by browser. */ }
  };

  return (
    <div className={`floating-chat${open ? ' is-open' : ''}${expanded ? ' is-expanded' : ''}`} style={{ bottom: isMobile && role === 'farmer' ? 'calc(90px + env(safe-area-inset-bottom))' : 'calc(24px + env(safe-area-inset-bottom))' }}>
      {open && <section className={`floating-chat-panel${isMobile ? ' mobile' : ''}`} role="dialog" aria-label="Trợ lý AI SmartAqua" aria-modal={isMobile}>
        <header className="fc-head">
          <img src="/images/chatbot.png" alt="" className="fc-avatar"/>
          <div className="fc-title"><strong>Trợ lý AI SmartAqua</strong><small>Hỏi đáp dữ liệu nuôi lươn</small><span className="fc-status"><i/> Sẵn sàng · dữ liệu mô phỏng</span></div>
          <div className="fc-head-actions">
            <button onClick={startNew} aria-label="Tạo hội thoại mới" title="Hội thoại mới"><Plus size={17}/></button>
            <button onClick={() => setHistoryOpen((value) => !value)} aria-label="Lịch sử hội thoại" title="Lịch sử"><History size={16}/></button>
            {!isMobile && <button onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Thu nhỏ cửa sổ' : 'Mở rộng cửa sổ'} title={expanded ? 'Thu nhỏ' : 'Mở rộng'}>{expanded ? <Minimize size={16}/> : <Expand size={16}/>}</button>}
            <button onClick={() => setOpen(false)} aria-label="Đóng trợ lý AI" title="Đóng"><X size={17}/></button>
          </div>
        </header>

        {historyOpen ? <div className="fc-history" aria-label="Lịch sử hội thoại">
          <div className="fc-history-title"><strong>Hội thoại gần đây</strong><button onClick={startNew}><Plus size={15}/> Mới</button></div>
          {conversations.length ? conversations.map((chat) => <div className={`fc-history-row${chat.id === activeId ? ' selected' : ''}`} key={chat.id}>
            <button className="fc-history-open" onClick={() => { setActiveId(chat.id); setHistoryOpen(false); }}>{chat.title}</button>
            <button className="fc-icon-quiet" aria-label={`Xóa hội thoại ${chat.title}`} onClick={() => removeConversation(chat.id)}><Trash2 size={14}/></button>
          </div>) : <p className="fc-empty-history">Chưa có hội thoại được lưu.</p>}
        </div> : <>
          <div className="fc-messages" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => <article className={`fc-message ${message.role}`} key={message.id}>
              <MessageBody text={message.text}/>
              {message.reference && <small className="fc-reference">Nguồn: {message.reference}</small>}
              {message.action && <button className="fc-map-action" onClick={() => { setOpen(false); navigate(message.action!.to); }}>{message.action.label}</button>}
              {message.role === 'assistant' && message.id !== 'welcome' && <div className="fc-message-tools">
                {message.failed ? <button onClick={() => retry(message)}><RotateCcw size={13}/> Thử lại</button> : <button onClick={() => copy(message.text)}><Clipboard size={13}/> Sao chép</button>}
              </div>}
            </article>)}
            {busy && <div className="fc-message assistant fc-typing" aria-live="polite"><span className="fc-dot"/><span className="fc-dot"/><span className="fc-dot"/><span className="fc-typing-label">Đang truy vấn dữ liệu trong phạm vi của bạn…</span></div>}
            <div ref={endRef}/>
          </div>
          {messages.length <= 1 && !busy && <div className="fc-suggest"><span>Gợi ý câu hỏi</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}
          <form className="fc-input" onSubmit={(event) => { event.preventDefault(); void ask(input); }}>
            <textarea ref={inputRef} value={input} rows={1} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(input); } }} placeholder="Hỏi SmartAqua AI..." aria-label="Câu hỏi cho trợ lý AI" disabled={busy}/>
            <button type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi"><Send size={17}/></button>
          </form>
          <div className="fc-disclaimer">Số liệu mô phỏng · Không thay thế tư vấn chuyên môn</div>
        </>}
      </section>}

      <button className={`fc-fab${open ? ' open' : ''}${busy ? ' busy' : ''}`} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Thu nhỏ trợ lý AI SmartAqua' : 'Mở trợ lý AI SmartAqua'} aria-expanded={open}>
        <img src="/images/chatbot.png" alt=""/>
        <span className="fc-tooltip" role="tooltip">Xin chào! Tôi là Trợ lý AI SmartAqua. Bạn cần hỗ trợ gì?</span>
      </button>
    </div>
  );
}
