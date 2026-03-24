/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Search, Menu, Plus, Smile, Heart, Sparkles } from 'lucide-react';

const DOG_IMAGES = [
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80"
];

const PLACEHOLDERS = [
  "강아지를 살펴볼까요?",
  "강아지의 상태를 확인해보세요",
  "강아지는 지금 무슨 생각을 하고 있을까요?",
  "강아지의 마음을 알려드려요",
  "무엇이 궁금하세요?"
];

const DOG_RESPONSES = [
  "멍멍! 산책 가고 싶어요! 🐾",
  "낑낑.. 배고파요! 간식 주세요! 🦴",
  "왈왈! 주인님 사랑해요! ❤️",
  "멍! 오늘 날씨가 너무 좋아요! ☀️",
  "끄응.. 졸려요.. 같이 자요! 💤",
  "멍멍멍! 공 놀이 해요! 🎾",
  "왈! 꼬리가 멈추지 않아요! 🐕",
  "멍! 쓰다듬어 주세요! ✨"
];

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'dog';
  timestamp: Date;
};

type ReceivedMessage = {
  id: string;
  text: string;
  timestamp: string;
  question?: string;
};

export default function App() {
  const [page, setPage] = useState<'home' | 'chat'>('home');
  const [inputText, setInputText] = useState('');
  const [currentDogImage, setCurrentDogImage] = useState(DOG_IMAGES[0]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(PLACEHOLDERS[0]);
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '멍멍! 오늘 기분은 어때요? 🐾',
      sender: 'dog',
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch received messages from server
  const fetchReceivedMessages = async () => {
    try {
      const response = await fetch('/api/message');
      if (response.ok) {
        const data = await response.json();
        setReceivedMessages(data);
        setServerDown(false);
      } else {
        setServerDown(true);
      }
    } catch (error) {
      setServerDown(true);
    }
  };

  useEffect(() => {
    // Randomly select dog image and placeholder on mount
    const randomImg = DOG_IMAGES[Math.floor(Math.random() * DOG_IMAGES.length)];
    const randomPlaceholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
    setCurrentDogImage(randomImg);
    setCurrentPlaceholder(randomPlaceholder);

    fetchReceivedMessages();
    const interval = setInterval(fetchReceivedMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate dog thinking
    setTimeout(() => {
      const randomResponse = DOG_RESPONSES[Math.floor(Math.random() * DOG_RESPONSES.length)];
      
      const dogMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'dog',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, dogMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleHomeInputSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const response = await fetch('/api/save-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (response.ok) {
        setLastQuestion(inputText);
      } else {
        console.error("Save error:", await response.text());
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white overflow-hidden shadow-2xl border-x border-gray-100">
      <AnimatePresence mode="wait">
        {page === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-start h-full px-8 pt-16 bg-app-cyan relative overflow-y-auto"
          >
            {/* Background Decoration */}
            <div className="absolute top-10 left-10 text-white/20 rotate-12"><Heart size={48} fill="currentColor" /></div>
            <div className="absolute bottom-40 right-10 text-white/20 -rotate-12"><Sparkles size={48} fill="currentColor" /></div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPage('chat')}
              className="relative w-56 h-56 mb-10 cursor-pointer"
            >
              <div className="absolute inset-0 bg-white rounded-full opacity-30 blur-2xl animate-pulse"></div>
              <img
                src={currentDogImage}
                alt="Cute Dog"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full border-[10px] border-white shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-2 -right-2 bg-pink-400 text-white p-3 rounded-full shadow-lg z-20">
                <Heart size={24} fill="currentColor" />
              </div>
            </motion.div>

            <form onSubmit={handleHomeInputSubmit} className="w-full mb-12 relative z-10">
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onFocus={() => setInputText('')}
                  placeholder={currentPlaceholder}
                  className="w-full py-5 px-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl text-lg focus:outline-none focus:ring-4 focus:ring-app-yellow transition-all placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-app-yellow rounded-2xl text-gray-700 hover:bg-yellow-300 transition-all shadow-md"
                >
                  <Send size={22} />
                </button>
              </div>
            </form>

            {/* Received Messages Section */}
            <div className="w-full space-y-4 relative z-10 pb-10">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
                <Sparkles size={20} /> 최근 대화
              </h3>
              {serverDown ? (
                <div className="text-white text-center py-4 text-sm bg-white/20 rounded-2xl px-4">
                  서버가 종료되었습니다. 운영자에게 문의해주세요.
                </div>
              ) : receivedMessages.length > 0 ? (
                receivedMessages.map((msg, idx: number) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {idx === 0 && lastQuestion && (
                      <p className="text-white/70 text-xs mb-1 ml-1">{lastQuestion}</p>
                    )}
                    <div className="dog-thought-card">
                      "{msg.text}"
                      <div className="text-[10px] text-gray-400 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-white/60 text-center py-4 italic text-sm">
                  ...
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col h-full bg-kakao-bg"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-pink-100">
              <div className="flex items-center gap-4">
                <button onClick={() => setPage('home')} className="p-2 hover:bg-pink-50 rounded-2xl transition-colors text-pink-400">
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={currentDogImage}
                      alt="Dog Profile"
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border-2 border-pink-200"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-400 w-3 h-3 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">초코 🐾</span>
                    <span className="text-[10px] text-pink-400 font-medium uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <Search size={20} className="hover:text-pink-400 transition-colors cursor-pointer" />
                <Menu size={20} className="hover:text-pink-400 transition-colors cursor-pointer" />
              </div>
            </header>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              <div className="flex justify-center mb-4">
                <span className="bg-black/5 text-gray-500 text-[10px] px-3 py-1 rounded-full">
                  {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'dog' && (
                    <img
                      src={currentDogImage}
                      alt="Dog"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0 border border-pink-100 shadow-sm"
                    />
                  )}
                  <div className="flex flex-col">
                    {msg.sender === 'dog' && (
                      <span className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1">초코</span>
                    )}
                    <div className="flex items-end gap-2">
                      {msg.sender === 'user' && (
                        <span className="text-[9px] text-gray-400 mb-1 font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <div className={msg.sender === 'user' ? 'chat-bubble-right' : 'chat-bubble-left'}>
                        {msg.text}
                      </div>
                      {msg.sender === 'dog' && (
                        <span className="text-[9px] text-gray-400 mb-1 font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start items-center">
                  <img
                    src={currentDogImage}
                    alt="Dog"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover mr-3 border border-pink-100"
                  />
                  <div className="chat-bubble-left flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-pink-200 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <footer className="bg-white p-4 flex items-center gap-3 border-t border-pink-50">
              <button className="p-2 text-pink-300 hover:text-pink-500 transition-colors">
                <Plus size={24} />
              </button>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  placeholder="메시지를 입력하세요..."
                  className="w-full bg-gray-50 rounded-2xl py-3 px-5 pr-12 focus:outline-none focus:bg-white focus:ring-2 focus:ring-pink-100 transition-all text-sm"
                />
                <button className="absolute right-3 text-pink-300 hover:text-pink-500 transition-colors">
                  <Smile size={22} />
                </button>
              </div>
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
                className={`p-3 rounded-2xl transition-all shadow-md ${
                  inputText.trim() 
                    ? 'bg-app-yellow text-gray-800 scale-100' 
                    : 'bg-gray-100 text-gray-300 scale-95'
                }`}
              >
                <Send size={22} />
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
