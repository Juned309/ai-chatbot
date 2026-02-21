import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 p-4 bg-black/20 backdrop-blur-xl border-t border-white/10"
    >
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all resize-none placeholder:text-white/20 pr-12"
        />
        <div className="absolute right-3 bottom-3 text-white/20">
          <Sparkles size={16} />
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!input.trim() || isLoading}
        className="bg-gradient-to-br from-red-500 to-orange-600 p-3 rounded-2xl shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:grayscale transition-all"
      >
        <Send size={20} className="text-white" />
      </motion.button>
    </form>
  );
}
