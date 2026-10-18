import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Bot, CalendarDays, ChevronDown, Coins, MapPin, Mountain, Send, Sparkles, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";

const MotionDiv = motion.div;

const suggestions = [
  "7 days in Tokyo, food focused and hidden spots",
  "Romantic Paris under EUR 2000",
  "Adventure in Patagonia in November",
  "Cultural Morocco trip for 10 days",
];

const Planner = forwardRef(({ onResult }, ref) => {
  const [formData, setFormData] = useState({
    destination: "",
    days: "",
    budget: "",
    style: ""
  });
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Welcome to Horizons AI. Share a destination or use the trip form and I will build the itinerary."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

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
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function buildPrompt() {
    const parts = [
      formData.destination && `Destination: ${formData.destination}`,
      formData.days && `Number of days: ${formData.days}`,
      formData.budget && `Budget: ${formData.budget}`,
      formData.style && `Travel style: ${formData.style}`
    ].filter(Boolean);

    return parts.length
      ? `Create a personalized travel itinerary. ${parts.join(". ")}.`
      : "";
  }

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Pass the structured fields so the backend stores exactly what the user
    // entered instead of trying (and often failing) to re-parse the prompt.
    sendMessage(buildPrompt(), formData);
  }

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  async function sendMessage(customText, formFields) {
    const text = customText || input || buildPrompt();
    if (!text.trim() || loading) return;

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

      // Provide prior turns so the AI can keep context across messages
      const history = messages
        .filter(m => m.role === "user" || m.role === "ai")
        .slice(-10)
        .map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text
        }));

      const payload = {
        prompt: text,
        history
      };

      if (formFields) {
        payload.destination = formFields.destination || "";
        payload.duration = formFields.days || "";
        payload.budget = formFields.budget || "";
        payload.travelStyle = formFields.style || "";
      }

      const res = await fetch(apiUrl("/api/travel-plan"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      const parsed = data?.plan;

      if (!res.ok) {
        throw new Error(data?.message || "The server could not generate an itinerary.");
      }

      if (!parsed) {
        throw new Error("No itinerary returned from server");
      }

      if (data.saveError) {
        console.warn("Trip save failed:", data.saveError);
      }

      let summary;
      if (typeof parsed === "string") {
        summary = parsed;
      } else if (parsed && typeof parsed === "object") {
        summary = [parsed.title, parsed.overview]
          .filter(Boolean)
          .join(" — ");
      }
      summary = summary || "Your itinerary is ready.";

      const nextMessages = [{ role: "ai", text: summary }];

      // Never swallow save failures: tell the user the plan was generated but
      // could not be stored, and why.
      if (data.saveError) {
        nextMessages.push({
          role: "ai",
          text: `Your itinerary was generated but could not be saved. ${data.saveError}`
        });
      }

      setMessages(prev => [...prev, ...nextMessages]);

      onResult?.(parsed);
    } catch (err) {
      console.error(err);

      const isNetworkIssue =
        !err?.message ||
        /fetch failed|network|load failed/i.test(err.message);

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: isNetworkIssue
            ? "Something went wrong. Please try again."
            : err.message
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="planner">
      <MotionDiv
        className="planner-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.45 }}
      >
        <div className="planner-brand-header">
          <span className="planner-brand-mark">
            <Mountain size={26} fill="currentColor" />
          </span>
          <div>
            <h3>Horizons AI</h3>
            <p>Your next adventure, planned with AI</p>
          </div>
        </div>

        <div className="planner-builder-panel">
          <div className="planner-card-header">
            <span className="planner-icon"><Sparkles size={20} /></span>
            <div>
              <p className="section-eyebrow">AI Trip Builder</p>
              <h2>Tell us your travel style</h2>
            </div>
          </div>

          <form className="trip-form" onSubmit={handleSubmit}>
            <label className="floating-field">
              <span className="field-icon"><MapPin size={20} /></span>
              <span className="field-copy">
                <span className="field-label">Destination</span>
                <input
                  name="destination"
                  value={formData.destination}
                  onChange={handleFieldChange}
                  placeholder="Where to?"
                  required
                />
              </span>
              <ChevronDown className="field-chevron" size={17} />
            </label>

            <label className="floating-field">
              <span className="field-icon"><CalendarDays size={20} /></span>
              <span className="field-copy">
                <span className="field-label">Number of Days</span>
                <input
                  name="days"
                  type="number"
                  min="1"
                  value={formData.days}
                  onChange={handleFieldChange}
                  placeholder="Select days"
                  required
                />
              </span>
              <ChevronDown className="field-chevron" size={17} />
            </label>

            <label className="floating-field">
              <span className="field-icon"><Coins size={20} /></span>
              <span className="field-copy">
                <span className="field-label">Budget</span>
                <input
                  name="budget"
                  value={formData.budget}
                  onChange={handleFieldChange}
                  placeholder="Choose budget"
                />
              </span>
              <ChevronDown className="field-chevron" size={17} />
            </label>

            <label className="floating-field">
              <span className="field-icon"><UsersRound size={20} /></span>
              <span className="field-copy">
                <span className="field-label">Travel Style</span>
                <select name="style" value={formData.style} onChange={handleFieldChange}>
                  <option value="">Choose a style</option>
                  <option value="Relaxed">Relaxed</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Culture and food">Culture and food</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Family friendly">Family friendly</option>
                </select>
              </span>
              <ChevronDown className="field-chevron" size={17} />
            </label>

            <button className="generate-trip-btn" type="submit" disabled={loading}>
              <Send size={18} />
              {loading ? "Generating..." : "Generate Trip"}
            </button>
          </form>
        </div>
      </MotionDiv>

      <div id="planner-chat" className="chat-container">
        <div className="chat-header">
          <div className="chat-avatar"><Bot size={20} /></div>
          <div>
            <strong>Horizons AI</strong>
            <span>Trip planning conversation</span>
          </div>
        </div>

        <div className="chat-messages" ref={chatRef}>
          {messages.map((msg, i) => (
            <div key={`${msg.role}-${i}`} className={`msg ${msg.role}`}>
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

        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} type="button">
              {s}
            </button>
          ))}
        </div>

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
            type="button"
            aria-label="Send trip prompt"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </section>
  );
});

export default Planner;
