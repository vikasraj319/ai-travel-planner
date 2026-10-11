import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser settings.",
  "audio-capture": "No microphone was found.",
  "no-speech": "I didn't hear anything. Tap the microphone and try again.",
  network: "Speech service is unavailable right now. Use Prompt instead."
};

export function useSpeechInput(onResult) {
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const supported = Boolean(SpeechRecognition);

  useEffect(() => {
    onResultRef.current = onResult;
  });

  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      rec.onresult = rec.onerror = rec.onend = null;
      rec.abort();
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!SpeechRecognition || recRef.current) return;
    setError("");

    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let handled = false;
    rec.onresult = (e) => {
      handled = true;
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onResultRef.current?.(transcript);
      else setError("I couldn't make that out. Please try again.");
    };
    rec.onerror = (e) => {
      handled = true;
      if (e.error !== "aborted") {
        setError(ERRORS[e.error] || "Voice input failed. Please try again.");
      }
    };
    rec.onend = () => {
      if (!handled) setError("I didn't hear anything. Tap the microphone and try again.");
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    try {
      rec.start(); // permission prompt appears here, after the user's tap
      setListening(true);
    } catch {
      recRef.current = null;
      setError("Voice input failed to start. Please try again.");
    }
  }, []);

  useEffect(() => cancel, [cancel]); // cleanup on unmount

  return { supported, listening, error, start, stop, cancel };
}