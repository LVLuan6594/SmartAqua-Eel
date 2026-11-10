import React,{useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Send,Sparkles,TriangleAlert} from 'lucide-react';
import {PageTitle,Card,Button,Badge,toast} from '../components/UI';
import {answerDataQuestion} from '../ai/dataChatService';
import {CHAT_WELCOME_MESSAGE,loadChatHistory,saveChatHistory} from '../ai/chatHistory';
import type {ChatMessage,Conversation} from '../ai/chatHistory';
import {useDemo} from '../store/demoStore';
export function AIChat(){
 const {db,role}=useDemo();const navigate=useNavigate();const [question,setQuestion]=useState(''),[busy,setBusy]=useState(false),bottom=useRef<HTMLDivElement>(null);
 const [conversations,setConversations]=useState<Conversation[]>(()=>loadChatHistory(role));
 const [activeId,setActiveId]=useState<string|null>(()=>loadChatHistory(role)[0]?.id||null);
 const active=conversations.find(item=>item.id===activeId)||null,chat=active?.messages||[CHAT_WELCOME_MESSAGE];
 useEffect(()=>{const saved=loadChatHistory(role);setConversations(saved);setActiveId(saved[0]?.id||null)},[role]);
 useEffect(()=>saveChatHistory(role,conversations),[role,conversations]);
 useEffect(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),[chat,busy]);
 const setMessages=(id:string,update:(messages:ChatMessage[])=>ChatMessage[])=>setConversations(items=>items.map(item=>item.id===id?{...item,messages:update(item.messages),updatedAt:new Date().toISOString()}:item));
 const ask=async(raw:string)=>{const q=raw.trim();if(!q||busy)return;const id=active?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;setQuestion('');setBusy(true);setActiveId(id);
  if(!active)setConversations(items=>[{id,title:q.slice(0,56),updatedAt:new Date().toISOString(),messages:[CHAT_WELCOME_MESSAGE,{id:`u-${Date.now()}`,role:'user' as const,text:q}]},...items].slice(0,30));
  else setMessages(id,messages=>[...messages,{id:`u-${Date.now()}`,role:'user',text:q}]);
  try{const response=await answerDataQuestion({question:q,db,role});setMessages(id,messages=>[...messages,{id:`a-${Date.now()}`,role:'assistant',text:response.answer,reference:response.reference,action:response.action}])}
  catch{toast('Không thể truy vấn dữ liệu hiện tại','error')}finally{setBusy(false)}};
 const suggestions=['Tổng quan dữ liệu hệ thống','Có bao nhiêu bể nuôi?','Sản lượng thu hoạch năm 2026?','Thông tin bể BE-001','Nhật ký thức ăn cần ghi gì?'];
 return <><PageTitle kicker="TRỢ LÝ AI · DỮ LIỆU SMARTAQUA" title="Hỏi đáp nuôi lươn" description="Dùng chung bộ truy vấn dữ liệu và lịch sử hội thoại với chatbot nổi. Kết quả được giới hạn theo vai trò đang chọn." actions={<Badge tone="purple"><Sparkles size={13}/> Tra cứu cục bộ · chưa kết nối AI backend</Badge>}/>
 <div className="chat-layout"><Card title="Chủ đề gợi ý" subtitle="Bấm để tra cứu dữ liệu hệ thống"><div className="chat-sidebar">{suggestions.map(s=><button key={s} onClick={()=>ask(s)}>{s}</button>)}<div className="divider"/><strong style={{fontSize:13}}>Hội thoại gần đây</strong>{conversations.map(item=><button key={item.id} onClick={()=>setActiveId(item.id)}>{item.title}</button>)}<div className="infobar amber"><TriangleAlert size={17}/> Dữ liệu hiện lưu trong trình duyệt; quyền truy cập chưa được xác thực tại máy chủ.</div></div></Card>
 <Card className="chat-window" title="Trợ lý AI SmartAqua" subtitle="Truy vấn dữ liệu trong phạm vi vai trò hiện tại" action={<Badge tone="blue">Vai trò: {role}</Badge>}><div className="messages">{chat.map((message,i)=><div className={`message ${message.role==='user'?'user':''}`} key={message.id||i}>{message.text}{message.reference&&<small>Nguồn: {message.reference}</small>}{message.action&&<button className="fc-map-action" onClick={()=>navigate(message.action!.to)}>{message.action.label}</button>}</div>)}{busy&&<div className="message">Đang truy vấn dữ liệu trong phạm vi của bạn…</div>}<div ref={bottom}/></div><form className="chat-input" onSubmit={e=>{e.preventDefault();ask(question)}}><input placeholder="Nhập câu hỏi về dữ liệu SmartAqua..." value={question} onChange={e=>setQuestion(e.target.value)} aria-label="Nội dung hỏi đáp"/><Button type="submit" disabled={busy||!question.trim()}><Send size={17}/> Gửi</Button></form></Card></div>
 </>}
export { AIImage } from './AIImage';
