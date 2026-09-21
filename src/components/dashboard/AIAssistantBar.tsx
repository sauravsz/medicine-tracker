"use client";

import { useState, useTransition } from "react";
import { Sparkles, Mic, MicOff, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { AICommandPayload } from "@/lib/types";

interface AIAssistantBarProps {
  onParsedCommand: (payload: AICommandPayload) => void;
}

export function AIAssistantBar({ onParsedCommand }: AIAssistantBarProps) {
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    try {
      const Win = window as unknown as Record<string, unknown>;
      const SpeechRecognitionClass = (Win.SpeechRecognition || Win.webkitSpeechRecognition) as {
        new (): {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onstart: () => void;
          onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
          onerror: () => void;
          onend: () => void;
          start: () => void;
        };
      };

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setPrompt(text);
        handleParse(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleParse = (textToParse?: string) => {
    const query = (textToParse || prompt).trim();
    if (!query) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        let clientConfig: Record<string, string> = {};
        try {
          const gKey = localStorage.getItem("trackmed_groq_api_key") || localStorage.getItem("medtrack_groq_api_key");
          const gModel = localStorage.getItem("trackmed_groq_model") || localStorage.getItem("medtrack_groq_model");
          const oKey = localStorage.getItem("trackmed_ollama_api_key") || localStorage.getItem("medtrack_ollama_api_key");
          const oUrl = localStorage.getItem("trackmed_ollama_base_url") || localStorage.getItem("medtrack_ollama_base_url");
          const oModel = localStorage.getItem("trackmed_ollama_model") || localStorage.getItem("medtrack_ollama_model");
          const prov = localStorage.getItem("trackmed_ai_provider") || localStorage.getItem("medtrack_ai_provider");
          if (gKey) clientConfig.groq_api_key = gKey;
          if (gModel) clientConfig.groq_model = gModel;
          if (oKey) clientConfig.ollama_api_key = oKey;
          if (oUrl) clientConfig.ollama_base_url = oUrl;
          if (oModel) clientConfig.ollama_model = oModel;
          if (prov) clientConfig.ai_provider = prov;
        } catch {}

        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: query, ...clientConfig }),
        });

        const json = await res.json();
        if (!json.success || !json.payload) {
          setErrorMsg(json.error || "Could not parse command.");
          return;
        }

        onParsedCommand(json.payload);
        setPrompt("");
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to parse.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleParse();
  };

  return (
    <div className="space-y-2.5">
      {/* Liquid Glass AI Command Tube */}
      <form
        onSubmit={handleSubmit}
        className="liquid-glass-panel rounded-3xl p-2 shadow-2xl flex items-center justify-between gap-2 border border-white/15 relative overflow-hidden group"
      >
        <div className="flex items-center gap-3 pl-3 sm:pl-4 flex-1">
          <div className="p-2 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Type or speak anything (e.g. 'Bought 4 strips of Telma LN 40 from Apollo for 480')..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent text-[13.5px] text-white placeholder:text-[#64748b] focus:outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 pr-1">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? "Listening..." : "Speak command"}
            className={`p-2.5 rounded-full transition-all spring-tap ${
              isListening
                ? "bg-[#ff385c] text-white animate-pulse"
                : "text-[#94a3b8] hover:text-white hover:bg-white/10"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Submit / Extract Button */}
          <button
            type="submit"
            disabled={isPending || !prompt.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold liquid-btn-primary rounded-full shadow-md transition-all spring-tap disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            <span className="hidden sm:inline">Decode Intent</span>
          </button>
        </div>
      </form>


      {errorMsg && (
        <p className="text-xs text-[#fb7185] pl-4 font-medium">{errorMsg}</p>
      )}
    </div>
  );
}
