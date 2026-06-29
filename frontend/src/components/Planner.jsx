import { useState, useRef } from "react";
import { forwardRef, useImperativeHandle } from "react";
import { useEffect } from "react";
import { apiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";

const suggestions = [
  "7 days in Tokyo, food focused and hidden spots",
  "Romantic Paris under €2000",
  "Adventure in Patagonia in November",
  "Cultural Morocco trip for 10 days",
];

const Planner = forwardRef(({ onResult }, ref) => {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Welcome to Horizons ✦ Tell me about your dream trip."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  // ✅ expose sendMessage to parent
  useImperativeHandle(ref, () => ({
    sendMessage
  }));

  function formatText(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    return escaped
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/✦/g, '<span style="color:gold">✦</span>');
  }

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  async function sendMessage(customText) {
    const text = customText || input;
    if (!text.trim()) return;

    const userMsg = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);

    setInput("");
    setLoading(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const headers = {
        "Content-Type": "application/json"
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(apiUrl("/api/travel-plan"), {
        method: "POST",
        headers,
        body: JSON.stringify({
        prompt: text
      })
      });

const data = await res.json();

console.log("FULL RESPONSE:", data);

// Backend now returns plan directly
const parsed = data?.plan;

if (!parsed) {
  throw new Error("No itinerary returned from server");
}

console.log("PARSED:", parsed);

// ONLY show short message in chat
setMessages(prev => [
  ...prev,
  {
    role: "ai",
    text: "Your itinerary is ready ✨"
  }
]);

// Send FULL itinerary to itinerary section

onResult?.(parsed);
    } catch (err) {
      console.error(err);

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "Something went wrong. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="planner">
      <div id = "planner" className="chat-container">

        {/* Messages */}
        <div className="chat-messages" ref={chatRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="msg-label">
                {msg.role === "user" ? "You" : "Horizons AI"}
              </div>

              <div
                className="msg-bubble"
                dangerouslySetInnerHTML={{
                  __html: formatText(msg.text)
                }}
              ></div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="msg ai">
              <div className="msg-label">Horizons AI</div>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            id="chatInput"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your trip..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={loading}
          >
            ➤
          </button>
        </div>

      </div>
    </section>
  );
});

export default Planner;
