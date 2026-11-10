import type { ChatResponse, Role } from '../types/models';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  reference?: string;
  action?: ChatResponse['action'];
  failed?: boolean;
  question?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export const CHAT_WELCOME = 'Xin chào! Tôi là Trợ lý AI SmartAqua.\n\nTôi có thể giúp bạn tra cứu, thống kê và phân tích dữ liệu nuôi lươn từ hệ thống.\n\nBạn muốn tìm hiểu thông tin gì?';
export const CHAT_WELCOME_MESSAGE: ChatMessage = { id: 'welcome', role: 'assistant', text: CHAT_WELCOME };

const storageKey = (role: Role) => `smart-aqua-eel-chat-history-v1:${role}`;

export function loadChatHistory(role: Role): Conversation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(role)) || '[]');
    return Array.isArray(parsed) ? parsed as Conversation[] : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(role: Role, conversations: Conversation[]): void {
  try { localStorage.setItem(storageKey(role), JSON.stringify(conversations.slice(0, 30))); } catch { /* History is optional in this demo. */ }
}
