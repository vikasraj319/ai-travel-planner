import { useEffect, useRef, useState } from "react";
import { Bot, MessageSquare, Mic, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../lib/api";
import { useSpeechInput } from "../lib/useSpeechInput";

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
  const [mode, setMode] = useState("prompt");
  const messagesRef = useRef(null);
  const stickToBottom = useRef(true);

  const { supported, listening, error, start, stop, cancel } = useSpeechInput(sendMessage);

  function handleScroll() {
    const el = messagesRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  useEffect(() => {
    const el = messagesRef.current;
    if (!open || !el || !stickToBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function sendMessage(override) {
    const fromVoice = typeof override === "string";
    const text = (fromVoice ? override : input).trim();
    if (!text || loading) return;

    stickToBottom.current = true;
    setMessages(prev => [...prev, { role: "user", text }]);
    if (!fromVoice) setInput("");
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

  function closeChat() {
    cancel();
    setOpen(false);
  }

  function switchMode(next) {
    if (next === mode) return;
    if (next !== "voice") cancel();
    setMode(next);
  }

  // Cancel any in-progress recording when the panel closes.
  useEffect(() => {
    if (!open) cancel();
  }, [open, cancel]);

  const voiceHint = !supported
    ? "Voice input isn't supported in this browser. Use Prompt instead."
    : listening
      ? "Listening… tap to stop"
      : error || "Tap the microphone to speak";

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
              <button type="button" onClick={closeChat} aria-label="Close chat">
                <X size={18} />
              </button>
            </div>

            <div className="chat-widget-messages" ref={messagesRef} onScroll={handleScroll}>
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

            <div className="chat-widget-composer">
              <div className="chat-widget-mode" role="group" aria-label="Input mode">
                <button type="button" aria-pressed={mode === "prompt"} onClick={() => switchMode("prompt")}>
                  <MessageSquare size={16} /> Prompt
                </button>
                <button type="button" aria-pressed={mode === "voice"} onClick={() => switchMode("voice")}>
                  <Mic size={16} /> Voice
                </button>
              </div>

              {mode === "prompt" ? (
                <div className="chat-widget-input">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask for a weekend in Lisbon..."
                    aria-label="Message Horizons AI"
                  />
                  <button type="button" onClick={() => sendMessage()} disabled={loading} aria-label="Send message">
                    <Send size={18} />
                  </button>
                </div>
              ) : (
                <div className="chat-widget-input chat-widget-voice">
                  <button
                    type="button"
                    className={listening ? "is-listening" : ""}
                    onClick={listening ? stop : start}
                    disabled={loading || !supported}
                    aria-label={listening ? "Stop recording" : "Start voice input"}
                  >
                    <Mic size={18} />
                  </button>
                  <span role="status">{voiceHint}</span>
                </div>
              )}
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