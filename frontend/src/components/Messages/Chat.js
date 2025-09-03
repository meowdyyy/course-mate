// import { useEffect, useRef, useState } from 'react';
// import { io } from 'socket.io-client';
// import axios from 'axios';
// import { useAuth } from '../../context/AuthContext';
// import toast from 'react-hot-toast';
// import { formatRelativeTimeShort as relTimeFn } from '../../utils/dateUtils';

// //Fallback in case hot-reload missed the util export
// const formatRelativeTimeShort = relTimeFn || function(date){
//   if(!date) return '';
//   const d=new Date(date); const now=new Date(); const diff=now-d; if(diff<0) return 'now';
//   const sec=Math.floor(diff/1000); if(sec<10) return 'now'; if(sec<60) return sec+'s';
//   const min=Math.floor(sec/60); if(min<60) return min+'m'; const hr=Math.floor(min/60); if(hr<24) return hr+'h';
//   const day=Math.floor(hr/24); if(day<7) return day+'d'; const week=Math.floor(day/7); if(week<4) return week+'w';
//   const month=Math.floor(day/30); if(month<12) return month+'mo'; const year=Math.floor(day/365); return year+'y';
// };

// let socket;
// const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// function normalizeMessageAttachmentUrls(message){
//   if (!message?.attachments) return message;
//   return {
//     ...message,
//     attachments: message.attachments.map(a => ({
//       ...a,
//       url: a.url?.startsWith('http') ? a.url : API_BASE + a.url
//     }))
//   };
// }

// export default function Chat() {
//   const { token, user } = useAuth();
//   const [conversations, setConversations] = useState([]);
//   const [activeConvo, setActiveConvo] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [loadingMsgs, setLoadingMsgs] = useState(false);
//   const [loadingOlder, setLoadingOlder] = useState(false);
//   const [pagination, setPagination] = useState(null);
//   const [typing, setTyping] = useState({}); //convoId -> userIds typing
//   const [presence, setPresence] = useState({}); //userId -> status
//   const typingTimeout = useRef({});
//   const [groups, setGroups] = useState([]);
//   const [invites, setInvites] = useState([]);
//   const [showGroupForm, setShowGroupForm] = useState(false);
//   const [groupForm, setGroupForm] = useState({ name: '', courseId: '' });
//   const [inviteSearch, setInviteSearch] = useState('');
//   const [inviteResults, setInviteResults] = useState([]);
//   const [pendingFiles, setPendingFiles] = useState([]);
//   const [showInviteControls, setShowInviteControls] = useState(false);
//   const inviteDebounce = useRef();
//   const bottomRef = useRef();
//   const messagesContainerRef = useRef(null);
//   const atBottomRef = useRef(true);
//   const [atBottom, setAtBottom] = useState(true);
//   const refreshTimer = useRef(null);

//   //Init socket
//   useEffect(() => {
//     if (!token) return;
//     socket = io('http://localhost:5000', { auth: { token: `Bearer ${token}` } });
//     socket.on('chat:message', ({ conversationId, message }) => {
//       const normalized = normalizeMessageAttachmentUrls(message);
//       setMessages(prev => {
//         if (conversationId !== activeConvo?._id) return prev;
//         if (prev.some(m => m._id === normalized._id)) return prev;
//         //Replace matching optimistic temp (same sender + content + attachment count)
//         const tempIndex = prev.findIndex(m => m._id.startsWith?.('temp-') && m.sender?._id === normalized.sender?._id && (m.content||'') === (normalized.content||'') && (m.attachments?.length||0) === (normalized.attachments?.length||0));
//         if (tempIndex !== -1) {
//           const clone = [...prev];
//           clone.splice(tempIndex, 1, normalized);
//           return clone;
//         }
//         return [...prev, normalized];
//       });
//       setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c));
//     });
//     socket.on('chat:unread', ({ conversationId, unread }) => {
//       setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, unread: unread[user._id] || 0 } : c));
//     });
//     socket.on('chat:typing', ({ conversationId, from, typing: isTyping }) => {
//       if (conversationId !== activeConvo?._id || from === user._id) return;
//       setTyping(prev => {
//         const set = new Set(prev[conversationId] || []);
//         if (isTyping) set.add(from); else set.delete(from);
//         return { ...prev, [conversationId]: Array.from(set) };
//       });
//     });
//     socket.on('chat:read', ({ conversationId, userId, messageId }) => {
//       if (conversationId === activeConvo?._id) {
//         setMessages(prev => prev.map(m => ({ ...m, readBy: (m.readBy || []).concat(userId === user._id ? [] : []) })));
//       }
//     });
//     socket.on('presence', ({ userId, status }) => {
//       setPresence(p => ({ ...p, [userId]: status }));
//     });
//     socket.on('group:invited', (invite) => {
//       // Add to invites list if not already present
//       setInvites(prev => prev.some(i => i._id === invite._id) ? prev : [invite, ...prev]);
//     });
//     socket.on('group:updated', (group) => {
//       setGroups(prev => {
//         const idx = prev.findIndex(g => g._id === group._id);
//         if (idx === -1) return [group, ...prev];
//         const clone = [...prev]; clone[idx] = group; return clone;
//       });
//       // If currently viewing, refresh active convo reference
//       setActiveConvo(ac => ac && ac._id === group._id ? { ...ac, ...group } : ac);
//       // If user was invited and then accepted, remove from invites
//       setInvites(prev => prev.filter(i => i._id !== group._id));
//     });
//     socket.on('group:deleted', ({ groupId }) => {
//       setGroups(prev => prev.filter(g => g._id !== groupId));
//       setInvites(prev => prev.filter(i => i._id !== groupId));
//       setActiveConvo(ac => ac && ac._id === groupId ? null : ac);
//     });
//     return () => { socket.disconnect(); };
//   }, [token, activeConvo?._id]);

//   const loadConversations = async () => {
//     try {
//       const res = await axios.get('/api/chat/conversations');
//       //Sort by lastMessage createdAt descending
//         const mapped = res.data.map(c => {
//           if (c.lastMessage?.attachments) {
//             c.lastMessage.attachments = c.lastMessage.attachments.map(a => ({ ...a, url: a.url?.startsWith('http')? a.url : API_BASE + (a.url || `/uploads/chat/${a.fileName}`) }));
//           }
//           return c;
//         });
//         const sorted = [...mapped].sort((a,b)=> new Date(b.lastMessage?.createdAt||b.updatedAt) - new Date(a.lastMessage?.createdAt||a.updatedAt));
//         setConversations(sorted);
//     } catch (e) { /* ignore */ }
//   };

//   useEffect(() => { loadConversations(); }, []);
//   useEffect(() => { loadGroups(); }, []);
//   useEffect(() => { loadInvites(); }, []);

//   //Auto-refresh conversations every 20s debounced (reset when activeConvo changes)
//   useEffect(()=> {
//     const schedule = () => {
//       clearTimeout(refreshTimer.current);
//       refreshTimer.current = setTimeout(async () => { await loadConversations(); schedule(); }, 20000);
//     };
//     schedule();
//     return () => clearTimeout(refreshTimer.current);
//   }, [activeConvo?._id]);

//   const openConversation = async (convo) => {
//     setActiveConvo(convo);
//     try {
//       setLoadingMsgs(true);
//       const res = await axios.get(`/api/chat/conversations/${convo._id}/messages`);
//   const normalized = res.data.messages.map(m => normalizeMessageAttachmentUrls(m));
//   setMessages(normalized);
//       setPagination(res.data.pagination);
//       // Scroll to bottom only when conversation is opened
//       setTimeout(()=>{
//         if (messagesContainerRef.current) {
//           messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//           atBottomRef.current = true; setAtBottom(true);
//         }
//       }, 0);
//   // Clear unread count locally for this conversation
//   setConversations(prev => prev.map(c => c._id === convo._id ? { ...c, unread: 0 } : c));
//   // Explicitly mark as read on server to propagate state for other participants
//   axios.post(`/api/chat/conversations/${convo._id}/read`).catch(()=>{});
//     } catch (e) { toast.error('Failed to load messages'); }
//     finally { setLoadingMsgs(false); }
//   };

//   const loadOlder = async () => {
//     if (!activeConvo || loadingOlder) return;
//   if (pagination && (pagination.page * pagination.limit) >= pagination.total) return; //guard
//     try {
//       setLoadingOlder(true);
//       const nextPage = (pagination.page + 1);
//       const res = await axios.get(`/api/chat/conversations/${activeConvo._id}/messages?page=${nextPage}&limit=${pagination.limit}`);
//       //prepend older messages
//       setMessages(prev => [...res.data.messages, ...prev]);
//       setPagination(res.data.pagination);
//     } catch (e) { /* ignore */ } finally { setLoadingOlder(false); }
//   };

//   const startConversation = async (userId) => {
//     try {
//       const res = await axios.post('/api/chat/conversations', { userId });
//       //If new, prepend
//       setConversations(prev => [res.data, ...prev.filter(c => c._id !== res.data._id)]);
//       openConversation(res.data);
//     } catch (e) { toast.error(e.response?.data?.message || 'Failed to start chat'); }
//   };

//   const sendMessage = async () => {
//     if ((!input.trim()) && pendingFiles.length === 0) return;
//     if (!activeConvo) return;
//     const isGroup = !!activeConvo.isGroup;
//     const receiverId = !isGroup ? activeConvo.participants.find(p => p._id !== user._id)?._id : undefined;
//     //If attachments present use REST multipart to upload then rely on socket echo
//   if (pendingFiles.length > 0) {
//       try {
//         const form = new FormData();
//         if (input.trim()) form.append('content', input.trim());
//         pendingFiles.forEach(f => form.append('attachments', f));
//         const tempId = 'temp-'+Date.now();
//     const optimistic = { _id: tempId, sender: user, content: input.trim(), attachments: pendingFiles.map(f=>({ originalName: f.name, url: '', mimeType: f.type, size: f.size })), createdAt: new Date().toISOString() };
//         setMessages(prev => [...prev, optimistic]);
//         setInput(''); setPendingFiles([]);
//     const res = await axios.post(`/api/chat/conversations/${activeConvo._id}/message`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
//     const serverMsg = normalizeMessageAttachmentUrls(res.data);
//     setMessages(prev => prev.map(m => m._id === tempId ? serverMsg : m));
//     //When socket echo arrives it will early-return due to id match
//       } catch (e) {
//         toast.error(e.response?.data?.message || 'Upload failed');
//       }
//       return;
//     }
//     const tempId = 'temp-'+Date.now();
//     const optimistic = { _id: tempId, sender: user, content: input, createdAt: new Date().toISOString() };
//     setMessages(prev => [...prev, optimistic]);
//     const payload = isGroup ? { conversationId: activeConvo._id, content: input } : { to: receiverId, content: input };
//     const pending = input;
//     setInput('');
//     socket.emit('chat:send', payload, (ack) => {
//       if (!ack.ok) {
//         toast.error(ack.error || 'Send failed');
//         setMessages(prev => prev.filter(m => m._id !== tempId));
//         setInput(pending);
//       } else if (ack.message) {
//         setMessages(prev => {
//           if (prev.some(m => m._id === ack.message._id)) return prev.filter(m => m._id !== tempId);
//           return prev.map(m => m._id === tempId ? ack.message : m);
//         });
//       }
//     });
//   };

//   const loadGroups = async () => {
//     try { const res = await axios.get('/api/chat/groups'); setGroups(res.data); } catch(e){}
//   };
//   const createGroup = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await axios.post('/api/chat/groups', { name: groupForm.name, courseId: groupForm.courseId });
//       setGroups(g=>[res.data, ...g]);
//       setShowGroupForm(false); setGroupForm({ name:'', courseId:'' });
//     } catch(e){ 
//       const status = e.response?.status;
//       let msg = e.response?.data?.message || 'Failed to create group';
//       if (status === 404) msg = 'Endpoint /api/chat/groups not found (server not restarted?)';
//       toast.error(msg);
//     }
//   };
//   const loadInvites = async () => { try { const r = await axios.get('/api/chat/group-invites'); setInvites(r.data); } catch(e){} };

//   //invite search when viewing a group (creator only)
//   useEffect(()=> {
//   if (!activeConvo?.isGroup) return;
//   const creatorId = typeof activeConvo.creator === 'string' ? activeConvo.creator : activeConvo.creator?._id;
//   if (creatorId !== user._id) return; //only creator can invite
//     clearTimeout(inviteDebounce.current);
//     inviteDebounce.current = setTimeout(async ()=> {
//       try {
//         if (!inviteSearch) { setInviteResults([]); return; }
//     if (!activeConvo.course) return;
//     const courseRef = typeof activeConvo.course === 'string' ? activeConvo.course : activeConvo.course?._id; // support populated course
//         const params = new URLSearchParams();
//         params.append('q', inviteSearch);
//     params.append('courseId', courseRef);
//         const res = await axios.get(`/api/chat/search-users?${params.toString()}`);
//         const existingIds = new Set([...activeConvo.participants.map(p=>p._id), ...(activeConvo.pendingInvites||[]).map(id=> id.toString())]);
//         setInviteResults(res.data.filter(u=> !existingIds.has(u._id)));
//       } catch(e) { /* ignore */ }
//     }, 300);
//     return () => clearTimeout(inviteDebounce.current);
//   }, [inviteSearch, activeConvo]);

//   const sendInvites = async (ids) => {
//     try {
//       await axios.post(`/api/chat/groups/${activeConvo._id}/invite`, { memberIds: ids });
//       //refresh group list / active convo
//       await loadGroups();
//       const updated = await axios.get('/api/chat/groups');
//       const newActive = updated.data.find(g=>g._id===activeConvo._id);
//       if (newActive) setActiveConvo(newActive);
//       setInviteResults([]); setInviteSearch('');
//     } catch(e){ toast.error('Invite failed'); }
//   };

//   const respondInvite = async (groupId, action) => {
//     try { await axios.post(`/api/chat/groups/${groupId}/respond`, { action }); await loadGroups(); } catch(e){}
//   };

//   const leaveGroup = async (groupId) => { try { await axios.post(`/api/chat/groups/${groupId}/leave`); setActiveConvo(null); await loadGroups(); } catch(e){} };
//   const deleteGroup = async (groupId) => { try { await axios.delete(`/api/chat/groups/${groupId}`); setActiveConvo(null); await loadGroups(); } catch(e){} };

//   const emitTyping = (isTyping) => {
//     if (!activeConvo) return;
//     const isGroup = !!activeConvo.isGroup;
//     if (isGroup) {
//       socket.emit('chat:typing', { conversationId: activeConvo._id, typing: isTyping });
//     } else {
//       const otherId = activeConvo.participants.find(p => p._id !== user._id)?._id;
//       socket.emit('chat:typing', { to: otherId, conversationId: activeConvo._id, typing: isTyping });
//     }
//   };

//   const handleInputChange = (e) => {
//     setInput(e.target.value);
//     emitTyping(true);
//     clearTimeout(typingTimeout.current.timer);
//     typingTimeout.current.timer = setTimeout(() => emitTyping(false), 1200);
//   };

//   useEffect(() => { /* disabled auto-scroll */ }, [messages]);

//   return (
//     <div className="flex h-[70vh] bg-white rounded-lg border overflow-hidden">
//       <div className="w-64 border-r overflow-auto">
//         <div className="p-3 border-b flex justify-between items-center">
//           <h3 className="font-semibold text-gray-800 text-sm">Chats</h3>
//           <button onClick={loadConversations} className="text-xs text-black underline">Refresh</button>
//         </div>
//         <div className="px-3 py-2 border-b flex justify-between items-center">
//           <span className="text-[11px] uppercase tracking-wide text-gray-500">Groups</span>
//           <button onClick={()=>setShowGroupForm(s=>!s)} className="text-xs text-black underline">{showGroupForm?'Close':'New'}</button>
//         </div>
//         {showGroupForm && (
//           <form onSubmit={createGroup} className="px-3 py-2 space-y-2 border-b text-xs">
//             <input value={groupForm.name} onChange={e=>setGroupForm(f=>({...f,name:e.target.value}))} placeholder="Group name" className="input input-sm w-full text-xs" />
//             <input value={groupForm.courseId} onChange={e=>setGroupForm(f=>({...f,courseId:e.target.value}))} placeholder="Course ID or Code (e.g. CSE471)" className="input input-sm w-full text-xs" />
//             <button disabled={!groupForm.name || !groupForm.courseId} className="btn btn-primary btn-sm w-full disabled:opacity-50">Create</button>
//           </form>
//         )}
//         {invites.length>0 && (
//           <div className="px-3 py-2 border-b bg-yellow-50">
//             <p className="text-[11px] font-semibold text-yellow-700 mb-1">Invitations</p>
//             <div className="space-y-1 max-h-40 overflow-auto">
//               {invites.map(iv => (
//                 <div key={iv._id} className="flex items-center justify-between bg-white rounded px-2 py-1 border">
//                   <div className="min-w-0">
//                     <p className="text-[11px] font-medium text-gray-800 truncate">{iv.name}</p>
//                     <p className="text-[10px] text-gray-500 truncate">by {iv.creator?.firstName} {iv.creator?.lastName}</p>
//                   </div>
//                   <div className="flex gap-1">
//                     <button onClick={async()=>{ await axios.post(`/api/chat/groups/${iv._id}/respond`, { action:'accept' }); await loadGroups(); await loadInvites(); }} className="text-[10px] text-green-600">Accept</button>
//                     <button onClick={async()=>{ await axios.post(`/api/chat/groups/${iv._id}/respond`, { action:'reject' }); await loadInvites(); }} className="text-[10px] text-red-600">Reject</button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//         {groups.map(g => (
//           <button key={g._id} onClick={()=>openConversation(g)} className={`w-full text-left px-3 py-2 border-b hover:bg-gray-100 ${activeConvo?._id===g._id?'bg-gray-200':''}`}>
//             <p className="text-sm font-medium text-gray-800 flex items-center gap-2">{g.name}<span className="text-[10px] bg-gray-200 px-1 rounded">{g.participants.length}</span></p>
//             <p className="text-xs text-gray-500 line-clamp-1">{g.lastMessage?.content}</p>
//           </button>
//         ))}
//   {conversations.filter(c => !c.isGroup).map(c => {
//           const other = c.participants.find(p => p._id !== user._id) || {};
//           return (
//             <button key={c._id} onClick={() => openConversation(c)} className={`w-full relative text-left px-3 py-2 border-b hover:bg-gray-100 ${activeConvo?._id===c._id?'bg-gray-200':''}`}>
//               <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
//                 <span>{other.firstName} {other.lastName}</span>
//                 <span className={`h-2 w-2 rounded-full ${presence[other._id]==='online'?'bg-green-500':'bg-gray-300'}`}></span>
//               </p>
//               <p className="text-xs text-gray-500 line-clamp-1">{c.lastMessage?.content}</p>
//               {c.unread > 0 && <span className="absolute top-2 right-2 bg-black text-white rounded-full text-[10px] px-1">{c.unread}</span>}
//             </button>
//           );
//         })}
//       </div>
//       <div className="flex-1 flex flex-col">
//         {!activeConvo && (
//           <div className="m-auto text-center text-gray-500 text-sm">Select a conversation or start one.</div>
//         )}
//         {activeConvo && (
//           <>
//             {/* Conversation header */}
//             <div className="border-b bg-white p-3 space-y-2">
//               {(() => {
//                 const creatorId = typeof activeConvo.creator === 'string' ? activeConvo.creator : activeConvo.creator?._id;
//                 const isCreator = creatorId === user._id;
//                 return (
//                   <>
//                     <div className="flex items-center justify-between gap-4 flex-wrap">
//                       <div className="flex-1 min-w-0 pr-2">
//                         <h4 className="font-semibold text-gray-800 text-sm truncate">{activeConvo.name || activeConvo.participants.filter(p=>p._id!==user._id).map(p=>p.firstName + ' ' + p.lastName).join(', ')}</h4>
//                         {activeConvo.isGroup && <p className="text-[10px] text-gray-500">Course: {activeConvo.course || '—'} · Members: {activeConvo.participants.length}</p>}
//                       </div>
//                       {activeConvo.isGroup && (
//                         <div className="flex gap-2 items-center ml-auto">
//                           {isCreator && (
//                             <button onClick={()=>setShowInviteControls(v=>!v)} className="text-[10px] px-2 py-1 rounded bg-gray-200 text-black hover:bg-gray-300">
//                               {showInviteControls ? 'Close' : 'Add Members'}
//                             </button>
//                           )}
//                           {isCreator ? (
//                             <button onClick={()=>deleteGroup(activeConvo._id)} className="text-red-600 text-[10px]">Delete</button>
//                           ) : (
//                             <button onClick={()=>leaveGroup(activeConvo._id)} className="text-red-600 text-[10px]">Leave</button>
//                           )}
//                         </div>
//                       )}
//                     </div>
//                     {isCreator && showInviteControls && (
//                       <div className="space-y-2">
//                         <div className="flex items-center gap-2">
//                           <input value={inviteSearch} onChange={e=>setInviteSearch(e.target.value)} placeholder="Search enrolled users" className="input input-sm flex-1 text-xs" />
//                           {inviteResults.length>0 && <button type="button" onClick={()=>sendInvites(inviteResults.map(u=>u._id))} className="btn btn-secondary btn-xs">Invite All</button>}
//                         </div>
//                         {inviteResults.length>0 && (
//                           <div className="max-h-32 overflow-auto border rounded p-1 grid gap-1">
//                             {inviteResults.map(u => (
//                               <div key={u._id} className="flex items-center justify-between text-[11px] bg-gray-50 px-2 py-1 rounded">
//                                 <span className="truncate">{u.firstName} {u.lastName}</span>
//                                 <button onClick={()=>sendInvites([u._id])} className="text-black underline">Invite</button>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         {activeConvo.pendingInvites?.length>0 && (
//                           <p className="text-[10px] text-gray-500">Pending: {activeConvo.pendingInvites.length}</p>
//                         )}
//                       </div>
//                     )}
//                   </>
//                 );
//               })()}
//             </div>
//             {/* Messages scroll area */}
//             <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50 relative"
//                  ref={messagesContainerRef}
//                  onScroll={(e)=>{
//                    const el = e.target;
//                    if (el.scrollTop === 0) loadOlder();
//                    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
//                    atBottomRef.current = nearBottom;
//                    if (nearBottom !== atBottom) setAtBottom(nearBottom);
//                  }}>
//               {loadingMsgs && <p className="text-xs text-gray-400">Loading...</p>}
//               {loadingOlder && <p className="text-[10px] text-gray-400 text-center">Loading older...</p>}
//               {messages.map(m => (
//                 <MessageBubble key={m._id} m={m} currentUserId={user._id} lastReadMap={activeConvo?.lastRead} />
//               ))}
//               <div ref={bottomRef} />
//               {typing[activeConvo._id]?.length > 0 && <p className="text-[10px] text-gray-500">Typing...</p>}
//               {!atBottom && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     if (messagesContainerRef.current) {
//                       messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//                       atBottomRef.current = true;
//                       setAtBottom(true);
//                     }
//                   }}
//                   className="absolute bottom-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow hover:bg-gray-800"
//                 >
//                   Jump to latest
//                 </button>
//               )}
//             </div>
//             {/* Composer */}
//             <div className="p-3 border-t flex flex-col gap-2">
//               {pendingFiles.length>0 && (
//                 <div className="flex flex-wrap gap-2">
//                   {pendingFiles.map(f => (
//                     <div key={f.name+f.lastModified} className="text-[10px] bg-gray-200 px-2 py-1 rounded flex items-center gap-1">
//                       <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
//                       <button onClick={()=>setPendingFiles(p=>p.filter(x=>x!==f))} className="text-red-600">×</button>
//                     </div>
//                   ))}
//                 </div>
//               )}
//               <div className="flex gap-2 items-center">
//                 <input type="file" multiple className="hidden" id="chat-files" onChange={e=> setPendingFiles(Array.from(e.target.files||[]))} />
//                 <label htmlFor="chat-files" className="btn btn-secondary btn-sm">Files</label>
//                 <input value={input} onChange={handleInputChange} onBlur={()=>emitTyping(false)} onKeyDown={e=>{ if(e.key==='Enter'){ sendMessage(); emitTyping(false);} }} placeholder="Type a message" className="flex-1 input text-sm" />
//                 <button onClick={sendMessage} className="btn btn-primary btn-sm" disabled={!input.trim() && pendingFiles.length===0}>Send</button>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//       {/* Quick start new chat (simple list) */}
//       <SidebarUserPicker onSelect={startConversation} currentUserId={user._id} />
//     </div>
//   );
// }

// function SidebarUserPicker({ onSelect, currentUserId }) {
//   const [list, setList] = useState([]);
//   useEffect(()=>{ 
//     axios.get('/api/chat/search-users?limit=50')
//       .then(r=> setList(r.data))
//       .catch(()=>{}); 
//   },[]);
//   return (
//     <div className="w-56 border-l flex flex-col">
//       <div className="p-3 border-b text-sm font-semibold text-gray-800">Users</div>
//       <div className="flex-1 overflow-auto">
//         {list.filter(u=>u._id!==currentUserId).map(u => (
//           <button key={u._id} onClick={()=>onSelect(u._id)} className="w-full text-left px-3 py-2 border-b hover:bg-gray-50">
//             <p className="text-xs font-medium text-gray-800">{u.firstName} {u.lastName}</p>
//             <p className="text-[10px] text-gray-500 capitalize">{u.role}</p>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// function MessageBubble({ m, currentUserId, lastReadMap }) {
//   const isMine = m.sender?._id === currentUserId;
//   //Determine read status - if any other participant's lastReadMessage equals this message id
//   let read = false;
//   if (isMine && lastReadMap) {
//     Object.entries(lastReadMap).forEach(([uid, mid]) => {
//       if (uid !== currentUserId && mid === m._id) read = true;
//     });
//   }
//   const senderName = m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName||''}`.trim() : 'Unknown';
//   const time = formatRelativeTimeShort(m.createdAt);
//   return (
//   <div className={`max-w-xs rounded px-3 py-2 text-sm shadow relative ${isMine?'bg-black text-white ml-auto':'bg-white text-gray-800'}`}>
//       <div className="flex items-center justify-between mb-1 gap-3">
//         <span className="text-[10px] font-semibold truncate opacity-80">{senderName}</span>
//         <span className="text-[10px] opacity-60 shrink-0">{time}</span>
//       </div>
//       {m.content && <div className="whitespace-pre-wrap break-words mb-1 last:mb-0">{m.content}</div>}
//       {m.attachments?.length>0 && (
//         <div className="flex flex-col gap-1 mt-1">
//           {m.attachments.map((a,i)=> {
//             const isImage = /image\//.test(a.mimeType || '');
//             const isVideo = /video\//.test(a.mimeType || '');
//             const isPdf = /pdf/.test(a.mimeType || '') || /\.pdf$/i.test(a.originalName||a.fileName||'');
//             const download = (evt) => {
//               evt.stopPropagation();
//               const link = document.createElement('a');
//               link.href = a.url;
//               link.download = a.originalName || a.fileName || 'file';
//               document.body.appendChild(link);
//               link.click();
//               document.body.removeChild(link);
//             };
//             return (
//               <div key={i} className="border rounded bg-white/70 overflow-hidden">
//                 {isPdf ? (
//                   <div className={`relative group bg-gray-100 ${isMine?'text-gray-800':'text-gray-800'}`}>
//                     <div className="flex items-center justify-between px-2 py-1 text-[11px] bg-gray-200/70 border-b">
//                       <span className="truncate max-w-[140px]" title={a.originalName || a.fileName}>{a.originalName || a.fileName}</span>
//                       <button onClick={download} className="text-black underline hover:no-underline">Download</button>
//                     </div>
//                     <div onClick={download} className="cursor-pointer" title="Click to download">
//                       {a.url ? (
//                         <iframe
//                           src={`${a.url}#toolbar=0`}
//                           className="w-full h-56 bg-white"
//                           loading="lazy"
//                           style={{ border: 'none' }}
//                           title={a.originalName || a.fileName}
//                         />
//                       ) : (
//                         <div className="w-full h-56 flex items-center justify-center text-[11px] text-gray-500">Preparing preview...</div>
//                       )}
//                       <div className="hidden group-hover:flex absolute inset-0 bg-black/10 items-start justify-end p-2 pointer-events-none"></div>
//                     </div>
//                   </div>
//                 ) : isImage ? (
//                   <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
//                     <img src={a.url} alt={a.originalName} className="max-h-48 object-cover" />
//                   </a>
//                 ) : isVideo ? (
//                   <video controls className="max-h-48 w-full">
//                     <source src={a.url} type={a.mimeType} />
//                   </video>
//                 ) : (
//                   <a href={a.url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 text-[11px] px-2 py-1 hover:bg-gray-100">
//                     <span className="truncate">{a.originalName || a.fileName}</span>
//                     <span className="text-[9px] opacity-60">{(a.size/1024).toFixed(1)}KB</span>
//                   </a>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//       {isMine && (
//         <span className="block text-[10px] mt-1 text-right opacity-80">{read ? '✓✓' : '✓'}</span>
//       )}
//     </div>
//   );
// }
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatRelativeTimeShort as relTimeFn } from '../../utils/dateUtils';

//Fallback in case hot-reload missed the util export
const formatRelativeTimeShort = relTimeFn || function(date){
  if(!date) return '';
  const d=new Date(date); const now=new Date(); const diff=now-d; if(diff<0) return 'now';
  const sec=Math.floor(diff/1000); if(sec<10) return 'now'; if(sec<60) return sec+'s';
  const min=Math.floor(sec/60); if(min<60) return min+'m'; const hr=Math.floor(min/60); if(hr<24) return hr+'h';
  const day=Math.floor(hr/24); if(day<7) return day+'d'; const week=Math.floor(day/7); if(week<4) return week+'w';
  const month=Math.floor(day/30); if(month<12) return month+'mo'; const year=Math.floor(day/365); return year+'y';
};

let socket;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_BASE = process.env.REACT_APP_SOCKET_URL || API_BASE;

function normalizeMessageAttachmentUrls(message){
  if (!message?.attachments) return message;
  return {
    ...message,
    attachments: message.attachments.map(a => ({
      ...a,
      url: a.url?.startsWith('http') ? a.url : API_BASE + a.url
    }))
  };
}

export default function Chat() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [typing, setTyping] = useState({}); //convoId -> userIds typing
  const [presence, setPresence] = useState({}); //userId -> status
  const typingTimeout = useRef({});
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', courseId: '' });
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]); //File objects selected for upload
  const [showInviteControls, setShowInviteControls] = useState(false);
  const inviteDebounce = useRef();
  const bottomRef = useRef();
  const messagesContainerRef = useRef(null); // scrolling container
  const atBottomRef = useRef(true); // track whether user was at bottom prior to updates
  const [atBottom, setAtBottom] = useState(true); // state for UI (jump button)
  // Removed pause auto-scroll feature per requirement; we now only scroll when opening a conversation
  const refreshTimer = useRef(null);

  //Init socket
  useEffect(() => {
    if (!token) return;
  socket = io(SOCKET_BASE, { auth: { token: `Bearer ${token}` } });
    socket.on('chat:message', ({ conversationId, message }) => {
      const normalized = normalizeMessageAttachmentUrls(message);
      setMessages(prev => {
        if (conversationId !== activeConvo?._id) return prev;
        if (prev.some(m => m._id === normalized._id)) return prev;
        //Replace matching optimistic temp (same sender + content + attachment count)
        const tempIndex = prev.findIndex(m => m._id.startsWith?.('temp-') && m.sender?._id === normalized.sender?._id && (m.content||'') === (normalized.content||'') && (m.attachments?.length||0) === (normalized.attachments?.length||0));
        if (tempIndex !== -1) {
          const clone = [...prev];
          clone.splice(tempIndex, 1, normalized);
          return clone;
        }
        return [...prev, normalized];
      });
      setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c));
    });
    socket.on('chat:unread', ({ conversationId, unread }) => {
      setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, unread: unread[user._id] || 0 } : c));
    });
    socket.on('chat:typing', ({ conversationId, from, typing: isTyping }) => {
      if (conversationId !== activeConvo?._id || from === user._id) return;
      setTyping(prev => {
        const set = new Set(prev[conversationId] || []);
        if (isTyping) set.add(from); else set.delete(from);
        return { ...prev, [conversationId]: Array.from(set) };
      });
    });
    socket.on('chat:read', ({ conversationId, userId, messageId }) => {
      if (conversationId === activeConvo?._id) {
        setMessages(prev => prev.map(m => ({ ...m, readBy: (m.readBy || []).concat(userId === user._id ? [] : []) })));
      }
    });
    socket.on('presence', ({ userId, status }) => {
      setPresence(p => ({ ...p, [userId]: status }));
    });
    socket.on('group:invited', (invite) => {
      // Add to invites list if not already present
      setInvites(prev => prev.some(i => i._id === invite._id) ? prev : [invite, ...prev]);
    });
    socket.on('group:updated', (group) => {
      setGroups(prev => {
        const idx = prev.findIndex(g => g._id === group._id);
        if (idx === -1) return [group, ...prev];
        const clone = [...prev]; clone[idx] = group; return clone;
      });
      // If currently viewing, refresh active convo reference
      setActiveConvo(ac => ac && ac._id === group._id ? { ...ac, ...group } : ac);
      // If user was invited and then accepted, remove from invites
      setInvites(prev => prev.filter(i => i._id !== group._id));
    });
    socket.on('group:deleted', ({ groupId }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      setInvites(prev => prev.filter(i => i._id !== groupId));
      setActiveConvo(ac => ac && ac._id === groupId ? null : ac);
    });
    return () => { socket.disconnect(); };
  }, [token, activeConvo?._id]);

  const loadConversations = async () => {
    try {
      const res = await axios.get('/api/chat/conversations');
      //Sort by lastMessage createdAt descending
        const mapped = res.data.map(c => {
          if (c.lastMessage?.attachments) {
            c.lastMessage.attachments = c.lastMessage.attachments.map(a => ({ ...a, url: a.url?.startsWith('http')? a.url : API_BASE + (a.url || `/uploads/chat/${a.fileName}`) }));
          }
          return c;
        });
        const sorted = [...mapped].sort((a,b)=> new Date(b.lastMessage?.createdAt||b.updatedAt) - new Date(a.lastMessage?.createdAt||a.updatedAt));
        setConversations(sorted);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadInvites(); }, []);

  //Auto-refresh conversations every 20s debounced (reset when activeConvo changes)
  useEffect(()=> {
    const schedule = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(async () => { await loadConversations(); schedule(); }, 20000);
    };
    schedule();
    return () => clearTimeout(refreshTimer.current);
  }, [activeConvo?._id]);

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    try {
      setLoadingMsgs(true);
      const res = await axios.get(`/api/chat/conversations/${convo._id}/messages`);
  const normalized = res.data.messages.map(m => normalizeMessageAttachmentUrls(m));
  setMessages(normalized);
      setPagination(res.data.pagination);
      // Scroll to bottom only when conversation is opened
      setTimeout(()=>{
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          atBottomRef.current = true; setAtBottom(true);
        }
      }, 0);
  // Clear unread count locally for this conversation
  setConversations(prev => prev.map(c => c._id === convo._id ? { ...c, unread: 0 } : c));
  // Explicitly mark as read on server to propagate state for other participants
  axios.post(`/api/chat/conversations/${convo._id}/read`).catch(()=>{});
    } catch (e) { toast.error('Failed to load messages'); }
    finally { setLoadingMsgs(false); }
  };

  const loadOlder = async () => {
    if (!activeConvo || loadingOlder) return;
  if (pagination && (pagination.page * pagination.limit) >= pagination.total) return; //guard
    try {
      setLoadingOlder(true);
      const nextPage = (pagination.page + 1);
      const res = await axios.get(`/api/chat/conversations/${activeConvo._id}/messages?page=${nextPage}&limit=${pagination.limit}`);
      //prepend older messages
      setMessages(prev => [...res.data.messages, ...prev]);
      setPagination(res.data.pagination);
    } catch (e) { /* ignore */ } finally { setLoadingOlder(false); }
  };

  const startConversation = async (userId) => {
    try {
      const res = await axios.post('/api/chat/conversations', { userId });
      //If new, prepend
      setConversations(prev => [res.data, ...prev.filter(c => c._id !== res.data._id)]);
      openConversation(res.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to start chat'); }
  };

  const sendMessage = async () => {
    if ((!input.trim()) && pendingFiles.length === 0) return;
    if (!activeConvo) return;
    const isGroup = !!activeConvo.isGroup;
    const receiverId = !isGroup ? activeConvo.participants.find(p => p._id !== user._id)?._id : undefined;
    //If attachments present use REST multipart to upload then rely on socket echo
  if (pendingFiles.length > 0) {
      try {
        const form = new FormData();
        if (input.trim()) form.append('content', input.trim());
        pendingFiles.forEach(f => form.append('attachments', f));
        const tempId = 'temp-'+Date.now();
    const optimistic = { _id: tempId, sender: user, content: input.trim(), attachments: pendingFiles.map(f=>({ originalName: f.name, url: '', mimeType: f.type, size: f.size })), createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, optimistic]);
        setInput(''); setPendingFiles([]);
    const res = await axios.post(`/api/chat/conversations/${activeConvo._id}/message`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const serverMsg = normalizeMessageAttachmentUrls(res.data);
    setMessages(prev => prev.map(m => m._id === tempId ? serverMsg : m));
    //When socket echo arrives it will early-return due to id match
      } catch (e) {
        toast.error(e.response?.data?.message || 'Upload failed');
      }
      return;
    }
    const tempId = 'temp-'+Date.now();
    const optimistic = { _id: tempId, sender: user, content: input, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    const payload = isGroup ? { conversationId: activeConvo._id, content: input } : { to: receiverId, content: input };
    const pending = input;
    setInput('');
    socket.emit('chat:send', payload, (ack) => {
      if (!ack.ok) {
        toast.error(ack.error || 'Send failed');
        setMessages(prev => prev.filter(m => m._id !== tempId));
        setInput(pending);
      } else if (ack.message) {
        setMessages(prev => {
          if (prev.some(m => m._id === ack.message._id)) return prev.filter(m => m._id !== tempId);
          return prev.map(m => m._id === tempId ? ack.message : m);
        });
      }
    });
  };

  const loadGroups = async () => {
    try { const res = await axios.get('/api/chat/groups'); setGroups(res.data); } catch(e){}
  };
  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/chat/groups', { name: groupForm.name, courseId: groupForm.courseId });
      setGroups(g=>[res.data, ...g]);
      setShowGroupForm(false); setGroupForm({ name:'', courseId:'' });
    } catch(e){ 
      const status = e.response?.status;
      let msg = e.response?.data?.message || 'Failed to create group';
      if (status === 404) msg = 'Endpoint /api/chat/groups not found (server not restarted?)';
      toast.error(msg);
    }
  };
  const loadInvites = async () => { try { const r = await axios.get('/api/chat/group-invites'); setInvites(r.data); } catch(e){} };

  //invite search when viewing a group (creator only)
  useEffect(()=> {
  if (!activeConvo?.isGroup) return;
  const creatorId = typeof activeConvo.creator === 'string' ? activeConvo.creator : activeConvo.creator?._id;
  if (creatorId !== user._id) return; //only creator can invite
    clearTimeout(inviteDebounce.current);
    inviteDebounce.current = setTimeout(async ()=> {
      try {
        if (!inviteSearch) { setInviteResults([]); return; }
    if (!activeConvo.course) return;
    const courseRef = typeof activeConvo.course === 'string' ? activeConvo.course : activeConvo.course?._id; // support populated course
        const params = new URLSearchParams();
        params.append('q', inviteSearch);
    params.append('courseId', courseRef);
        const res = await axios.get(`/api/chat/search-users?${params.toString()}`);
        const existingIds = new Set([...activeConvo.participants.map(p=>p._id), ...(activeConvo.pendingInvites||[]).map(id=> id.toString())]);
        setInviteResults(res.data.filter(u=> !existingIds.has(u._id)));
      } catch(e) { /* ignore */ }
    }, 300);
    return () => clearTimeout(inviteDebounce.current);
  }, [inviteSearch, activeConvo]);

  const sendInvites = async (ids) => {
    try {
      await axios.post(`/api/chat/groups/${activeConvo._id}/invite`, { memberIds: ids });
      //refresh group list / active convo
      await loadGroups();
      const updated = await axios.get('/api/chat/groups');
      const newActive = updated.data.find(g=>g._id===activeConvo._id);
      if (newActive) setActiveConvo(newActive);
      setInviteResults([]); setInviteSearch('');
    } catch(e){ toast.error('Invite failed'); }
  };

  const respondInvite = async (groupId, action) => {
    try { await axios.post(`/api/chat/groups/${groupId}/respond`, { action }); await loadGroups(); } catch(e){}
  };

  const leaveGroup = async (groupId) => { try { await axios.post(`/api/chat/groups/${groupId}/leave`); setActiveConvo(null); await loadGroups(); } catch(e){} };
  const deleteGroup = async (groupId) => { try { await axios.delete(`/api/chat/groups/${groupId}`); setActiveConvo(null); await loadGroups(); } catch(e){} };

  const emitTyping = (isTyping) => {
    if (!activeConvo) return;
    const isGroup = !!activeConvo.isGroup;
    if (isGroup) {
      socket.emit('chat:typing', { conversationId: activeConvo._id, typing: isTyping });
    } else {
      const otherId = activeConvo.participants.find(p => p._id !== user._id)?._id;
      socket.emit('chat:typing', { to: otherId, conversationId: activeConvo._id, typing: isTyping });
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimeout.current.timer);
    typingTimeout.current.timer = setTimeout(() => emitTyping(false), 1200);
  };

  // Smart auto-scroll: only scroll if user was already near bottom or the new message is mine
  // No automatic scrolling on new messages (only on conversation open). Effect kept minimal for future extensibility.
  useEffect(() => { /* intentionally empty: disabled auto-scroll */ }, [messages]);

  return (
    <div className="flex h-[70vh] bg-white rounded-lg border overflow-hidden">
      <div className="w-64 border-r overflow-auto">
        <div className="p-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 text-sm">Chats</h3>
          <button onClick={loadConversations} className="text-xs text-black underline">Refresh</button>
        </div>
        <div className="px-3 py-2 border-b flex justify-between items-center">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Groups</span>
          <button onClick={()=>setShowGroupForm(s=>!s)} className="text-xs text-black underline">{showGroupForm?'Close':'New'}</button>
        </div>
        {showGroupForm && (
          <form onSubmit={createGroup} className="px-3 py-2 space-y-2 border-b text-xs">
            <input value={groupForm.name} onChange={e=>setGroupForm(f=>({...f,name:e.target.value}))} placeholder="Group name" className="input input-sm w-full text-xs" />
            <input value={groupForm.courseId} onChange={e=>setGroupForm(f=>({...f,courseId:e.target.value}))} placeholder="Course ID or Code (e.g. CSE471)" className="input input-sm w-full text-xs" />
            <button disabled={!groupForm.name || !groupForm.courseId} className="btn btn-primary btn-sm w-full disabled:opacity-50">Create</button>
          </form>
        )}
        {invites.length>0 && (
          <div className="px-3 py-2 border-b bg-yellow-50">
            <p className="text-[11px] font-semibold text-yellow-700 mb-1">Invitations</p>
            <div className="space-y-1 max-h-40 overflow-auto">
              {invites.map(iv => (
                <div key={iv._id} className="flex items-center justify-between bg-white rounded px-2 py-1 border">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 truncate">{iv.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">by {iv.creator?.firstName} {iv.creator?.lastName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={async()=>{ await axios.post(`/api/chat/groups/${iv._id}/respond`, { action:'accept' }); await loadGroups(); await loadInvites(); }} className="text-[10px] text-green-600">Accept</button>
                    <button onClick={async()=>{ await axios.post(`/api/chat/groups/${iv._id}/respond`, { action:'reject' }); await loadInvites(); }} className="text-[10px] text-red-600">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {groups.map(g => (
          <button key={g._id} onClick={()=>openConversation(g)} className={`w-full text-left px-3 py-2 border-b hover:bg-gray-100 ${activeConvo?._id===g._id?'bg-gray-200':''}`}>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-2">{g.name}<span className="text-[10px] bg-gray-200 px-1 rounded">{g.participants.length}</span></p>
            <p className="text-xs text-gray-500 line-clamp-1">{g.lastMessage?.content}</p>
          </button>
        ))}
  {conversations.filter(c => !c.isGroup).map(c => {
          const other = c.participants.find(p => p._id !== user._id) || {};
          return (
            <button key={c._id} onClick={() => openConversation(c)} className={`w-full relative text-left px-3 py-2 border-b hover:bg-gray-100 ${activeConvo?._id===c._id?'bg-gray-200':''}`}>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <span>{other.firstName} {other.lastName}</span>
                <span className={`h-2 w-2 rounded-full ${presence[other._id]==='online'?'bg-green-500':'bg-gray-300'}`}></span>
              </p>
              <p className="text-xs text-gray-500 line-clamp-1">{c.lastMessage?.content}</p>
              {c.unread > 0 && <span className="absolute top-2 right-2 bg-black text-white rounded-full text-[10px] px-1">{c.unread}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 flex flex-col">
        {!activeConvo && (
          <div className="m-auto text-center text-gray-500 text-sm">Select a conversation or start one.</div>
        )}
        {activeConvo && (
          <>
            {/* Conversation header (sticky outside scroll) */}
            <div className="border-b bg-white p-3 space-y-2">
              {(() => {
                const creatorId = typeof activeConvo.creator === 'string' ? activeConvo.creator : activeConvo.creator?._id;
                const isCreator = creatorId === user._id;
                return (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">{activeConvo.name || activeConvo.participants.filter(p=>p._id!==user._id).map(p=>p.firstName + ' ' + p.lastName).join(', ')}</h4>
                        {activeConvo.isGroup && <p className="text-[10px] text-gray-500">Course: {activeConvo.course || '—'} · Members: {activeConvo.participants.length}</p>}
                      </div>
                      {activeConvo.isGroup && (
                        <div className="flex gap-2 items-center ml-auto">
                          {isCreator && (
                            <button onClick={()=>setShowInviteControls(v=>!v)} className="text-[10px] px-2 py-1 rounded bg-gray-200 text-black hover:bg-gray-300">
                              {showInviteControls ? 'Close' : 'Add Members'}
                            </button>
                          )}
                          {isCreator ? (
                            <button onClick={()=>deleteGroup(activeConvo._id)} className="text-red-600 text-[10px]">Delete</button>
                          ) : (
                            <button onClick={()=>leaveGroup(activeConvo._id)} className="text-red-600 text-[10px]">Leave</button>
                          )}
                        </div>
                      )}
                    </div>
                    {isCreator && showInviteControls && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={inviteSearch} onChange={e=>setInviteSearch(e.target.value)} placeholder="Search enrolled users" className="input input-sm flex-1 text-xs" />
                          {inviteResults.length>0 && <button type="button" onClick={()=>sendInvites(inviteResults.map(u=>u._id))} className="btn btn-secondary btn-xs">Invite All</button>}
                        </div>
                        {inviteResults.length>0 && (
                          <div className="max-h-32 overflow-auto border rounded p-1 grid gap-1">
                            {inviteResults.map(u => (
                              <div key={u._id} className="flex items-center justify-between text-[11px] bg-gray-50 px-2 py-1 rounded">
                                <span className="truncate">{u.firstName} {u.lastName}</span>
                                <button onClick={()=>sendInvites([u._id])} className="text-black underline">Invite</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {activeConvo.pendingInvites?.length>0 && (
                          <p className="text-[10px] text-gray-500">Pending: {activeConvo.pendingInvites.length}</p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Messages scroll area */}
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50 relative"
                 ref={messagesContainerRef}
                 onScroll={(e)=>{
                   const el = e.target;
                   if (el.scrollTop === 0) loadOlder();
                   const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
                   atBottomRef.current = nearBottom;
                   if (nearBottom !== atBottom) setAtBottom(nearBottom);
                 }}>
              {loadingMsgs && <p className="text-xs text-gray-400">Loading...</p>}
              {loadingOlder && <p className="text-[10px] text-gray-400 text-center">Loading older...</p>}
              {messages.map(m => (
                <MessageBubble key={m._id} m={m} currentUserId={user._id} lastReadMap={activeConvo?.lastRead} />
              ))}
              <div ref={bottomRef} />
              {typing[activeConvo._id]?.length > 0 && <p className="text-[10px] text-gray-500">Typing...</p>}
              {!atBottom && (
                <button
                  type="button"
                  onClick={() => {
                    if (messagesContainerRef.current) {
                      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                      atBottomRef.current = true;
                      setAtBottom(true);
                    }
                  }}
                  className="absolute bottom-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow hover:bg-gray-800"
                >
                  Jump to latest
                </button>
              )}
            </div>
            {/* Composer */}
            <div className="p-3 border-t flex flex-col gap-2">
              {pendingFiles.length>0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map(f => (
                    <div key={f.name+f.lastModified} className="text-[10px] bg-gray-200 px-2 py-1 rounded flex items-center gap-1">
                      <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
                      <button onClick={()=>setPendingFiles(p=>p.filter(x=>x!==f))} className="text-red-600">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input type="file" multiple className="hidden" id="chat-files" onChange={e=> setPendingFiles(Array.from(e.target.files||[]))} />
                <label htmlFor="chat-files" className="btn btn-secondary btn-sm">Files</label>
                <input value={input} onChange={handleInputChange} onBlur={()=>emitTyping(false)} onKeyDown={e=>{ if(e.key==='Enter'){ sendMessage(); emitTyping(false);} }} placeholder="Type a message" className="flex-1 input text-sm" />
                <button onClick={sendMessage} className="btn btn-primary btn-sm" disabled={!input.trim() && pendingFiles.length===0}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Quick start new chat (simple list) */}
      <SidebarUserPicker onSelect={startConversation} currentUserId={user._id} />
    </div>
  );
}

function SidebarUserPicker({ onSelect, currentUserId }) {
  const [list, setList] = useState([]);
  useEffect(()=>{ 
    axios.get('/api/chat/search-users?limit=50')
      .then(r=> setList(r.data))
      .catch(()=>{}); 
  },[]);
  return (
    <div className="w-56 border-l flex flex-col">
      <div className="p-3 border-b text-sm font-semibold text-gray-800">Users</div>
      <div className="flex-1 overflow-auto">
        {list.filter(u=>u._id!==currentUserId).map(u => (
          <button key={u._id} onClick={()=>onSelect(u._id)} className="w-full text-left px-3 py-2 border-b hover:bg-gray-50">
            <p className="text-xs font-medium text-gray-800">{u.firstName} {u.lastName}</p>
            <p className="text-[10px] text-gray-500 capitalize">{u.role}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m, currentUserId, lastReadMap }) {
  const isMine = m.sender?._id === currentUserId;
  //Determine read status: if any other participant's lastReadMessage equals this message id
  let read = false;
  if (isMine && lastReadMap) {
    Object.entries(lastReadMap).forEach(([uid, mid]) => {
      if (uid !== currentUserId && mid === m._id) read = true;
    });
  }
  const senderName = m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName||''}`.trim() : 'Unknown';
  const time = formatRelativeTimeShort(m.createdAt);
  return (
  <div className={`max-w-xs rounded px-3 py-2 text-sm shadow relative ${isMine?'bg-black text-white ml-auto':'bg-white text-gray-800'}`}>
      <div className="flex items-center justify-between mb-1 gap-3">
        <span className="text-[10px] font-semibold truncate opacity-80">{senderName}</span>
        <span className="text-[10px] opacity-60 shrink-0">{time}</span>
      </div>
      {m.content && <div className="whitespace-pre-wrap break-words mb-1 last:mb-0">{m.content}</div>}
      {m.attachments?.length>0 && (
        <div className="flex flex-col gap-1 mt-1">
          {m.attachments.map((a,i)=> {
            const isImage = /image\//.test(a.mimeType || '');
            const isVideo = /video\//.test(a.mimeType || '');
            const isPdf = /pdf/.test(a.mimeType || '') || /\.pdf$/i.test(a.originalName||a.fileName||'');
            const download = (evt) => {
              evt.stopPropagation();
              const link = document.createElement('a');
              link.href = a.url;
              link.download = a.originalName || a.fileName || 'file';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };
            return (
              <div key={i} className="border rounded bg-white/70 overflow-hidden">
                {isPdf ? (
                  <div className={`relative group bg-gray-100 ${isMine?'text-gray-800':'text-gray-800'}`}>
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] bg-gray-200/70 border-b">
                      <span className="truncate max-w-[140px]" title={a.originalName || a.fileName}>{a.originalName || a.fileName}</span>
                      <button onClick={download} className="text-black underline hover:no-underline">Download</button>
                    </div>
                    <div onClick={download} className="cursor-pointer" title="Click to download">
                      {a.url ? (
                        <iframe
                          src={`${a.url}#toolbar=0`}
                          className="w-full h-56 bg-white"
                          loading="lazy"
                          style={{ border: 'none' }}
                          title={a.originalName || a.fileName}
                        />
                      ) : (
                        <div className="w-full h-56 flex items-center justify-center text-[11px] text-gray-500">Preparing preview...</div>
                      )}
                      <div className="hidden group-hover:flex absolute inset-0 bg-black/10 items-start justify-end p-2 pointer-events-none"></div>
                    </div>
                  </div>
                ) : isImage ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={a.url} alt={a.originalName} className="max-h-48 object-cover" />
                  </a>
                ) : isVideo ? (
                  <video controls className="max-h-48 w-full">
                    <source src={a.url} type={a.mimeType} />
                  </video>
                ) : (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 text-[11px] px-2 py-1 hover:bg-gray-100">
                    <span className="truncate">{a.originalName || a.fileName}</span>
                    <span className="text-[9px] opacity-60">{(a.size/1024).toFixed(1)}KB</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isMine && (
        <span className="block text-[10px] mt-1 text-right opacity-80">{read ? '✓✓' : '✓'}</span>
      )}
    </div>
  );
}
