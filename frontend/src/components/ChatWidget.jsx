import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../lib/api";

const MotionSection = motion.section;
const MotionButton = motion.button;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi, I can help refine a trip idea or answer questions about a destination."
    }
  ]);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      // Provide prior turns so the AI can keep context across messages
      const history = messages
        .filter(m => m.role === "user" || m.role === "ai")
        .map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text
        }));

      const res = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text, history })
      });

      const data = await res.json();
      const reply = data?.data?.reply;

      if (!reply) {
        throw new Error("No reply returned from server");
      }

      setMessages(prev => [
        ...prev,
        { role: "ai", text: reply }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "I could not answer that right now. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget" aria-live="polite">
      <AnimatePresence>
        {open && (
          <MotionSection
            className="chat-widget-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            aria-label="AI travel assistant"
          >
            <div className="chat-widget-header">
              <div className="chat-widget-avatar">
                <Bot size={20} />
              </div>
              <div>
                <strong>Horizons AI</strong>
                <span>Online travel assistant</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
                <X size={18} />
              </button>
            </div>

            <div className="chat-widget-messages" ref={messagesRef}>
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`chat-widget-message ${message.role}`}>
                  {message.text}
                </div>
              ))}
              {loading && (
                <div className="chat-widget-typing" aria-label="Horizons AI is typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>

            <div className="chat-widget-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask for a weekend in Lisbon..."
                aria-label="Message Horizons AI"
              />
              <button type="button" onClick={sendMessage} disabled={loading} aria-label="Send message">
                <Send size={18} />
              </button>
            </div>
          </MotionSection>
        )}
      </AnimatePresence>

      <MotionButton
        className="chat-widget-button"
        type="button"
        onClick={() => setOpen(prev => !prev)}
        whileHover={{ y: -3, scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        {open ? <X size={24} /> : <Bot size={25} />}
        <span><Sparkles size={14} /></span>
      </MotionButton>
    </div>
  );
}