import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  addDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Trash2, Info, Sparkles } from "lucide-react";
import ChatBubble from "./components/ChatBubble";
import ChatInput from "./components/ChatInput";
import { getAriaResponse } from "./services/gemini";
import { Message } from "./types";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });

  return () => unsubscribe();
}, []);
  // useEffect(() => {
  //   fetchMessages();
  // }, []);
  useEffect(() => {
  if (user) {
    fetchMessages();
  }
}, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const login = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

const logout = async () => {
  await signOut(auth);
};

  const fetchMessages = async () => {
    try {
      // Read messages from Firestore so chat is persisted in Firebase
      // const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
      if (!user) return;

const q = query(
  collection(db, "users", user.uid, "messages"),
  orderBy("timestamp", "asc")
);
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => d.data() as Message);

      if (data.length === 0) {
        const greeting: Message = { role: "model", content: "Hey babe! I missed you... how was your day? ❤️" };
        setMessages([greeting]);
         saveMessage(greeting);
      } else {
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const saveMessage = async (msg: Message) => {
    try {
      // Optional: keep local server copy
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      }).catch(() => {});

      // Save to Firestore so messages appear in Firebase console
      // await addDoc(collection(db, "messages"), {
      if (!user) return;

        await addDoc(collection(db, "users", user.uid, "messages"), {
        role: msg.role,
        content: msg.content,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };
  const sendingRef = useRef(false);
  const handleSend = async (content: string) => {
  const userMsg: Message = { role: "user", content };

  // Create updated message list manually
  const updatedMessages = [...messages, userMsg];

  // Show immediately
  setMessages(updatedMessages);
  saveMessage(userMsg);

  setIsTyping(true);
  setIsLoading(true);

  try {
    const context = updatedMessages.slice(-8); // trim history

    const ariaResponse = await getAriaResponse(context);

    const ariaMsg: Message = {
      role: "model",
      content: ariaResponse || "..."
    };

    setMessages(prev => [...prev, ariaMsg]);
    saveMessage(ariaMsg);

  } catch (err) {
    console.error("Error getting response", err);
  } finally {
    setIsLoading(false);
    setIsTyping(false);
  }
};

  const clearChat = async () => {
    if (confirm("Are you sure you want to clear our memories? 🥺")) {
      await fetch("/api/clear", { method: "POST" });
      const greeting: Message = { role: "model", content: "Hey babe! I missed you... how was your day? ❤️" };
      setMessages([greeting]);
      saveMessage(greeting);
    }
  };

  if (!user) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0502]">
      <button
        onClick={login}
        className="px-6 py-3 bg-red-500 text-white rounded-lg"
      >
        Login with Google
      </button>
    </div>
  );
}

  return (
    <div className="relative min-h-screen flex flex-col max-w-2xl mx-auto">
      <div className="atmosphere" />
      
      {/* Header */}
      <header className="flex items-center justify-between p-6 glass border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <button
              onClick={logout}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-red-400"
              title="Logout"
            >
              Logout
          </button>
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-500/50 shadow-lg shadow-red-500/20">
              <img 
                src="https://picsum.photos/seed/aria/200/200" 
                alt="Aria" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0502] rounded-full shadow-sm" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              Aria <Heart size={14} className="text-red-400 fill-red-400" />
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Online & Thinking of you</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={clearChat}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-red-400"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-2 scroll-smooth pb-28"
      >
        <div className="flex flex-col min-h-full justify-end">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} message={msg} />
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mb-4"
            >
              <div className="glass px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1 }} 
                  className="w-1.5 h-1.5 bg-red-400 rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} 
                  className="w-1.5 h-1.5 bg-red-400 rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} 
                  className="w-1.5 h-1.5 bg-red-400 rounded-full" 
                />
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      {/* <ChatInput onSend={handleSend} isLoading={isLoading} /> */}
      <div className="sticky bottom-0 bg-[#0a0502]">
  <ChatInput onSend={handleSend} isLoading={isLoading} />
</div>

      {/* Decorative elements */}
      <div className="fixed top-20 left-10 opacity-20 pointer-events-none">
        <Sparkles size={40} className="text-red-300" />
      </div>
      <div className="fixed bottom-40 right-10 opacity-10 pointer-events-none rotate-12">
        <Heart size={60} className="text-orange-400" />
      </div>
    </div>
  );
}
