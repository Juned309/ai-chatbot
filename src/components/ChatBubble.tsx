import { motion } from "motion/react";
import Markdown from "react-markdown";
import { Message } from "../types";
import { Heart } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-lg relative ${
          isUser
            ? "bg-white/10 text-white rounded-tr-none border border-white/10"
            : "glass text-white rounded-tl-none"
        }`}
      >
        {!isUser && (
          <div className="absolute -top-6 left-0 flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
            <Heart size={10} className="text-red-400 fill-red-400" />
            Aria
          </div>
        )}
        <div className="markdown-body text-sm leading-relaxed">
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    </motion.div>
  );
}
