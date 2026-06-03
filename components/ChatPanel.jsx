import React, { useRef, useEffect } from "react";
import { Send, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatPanel({
  messages,
  input,
  setInput,
  sendMessage,
  isStreaming,
  clearChat,
  videoReady
}) {
  const chatEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive or stream updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const PRESET_PROMPTS = [
    {
      label: "Why did A beat B?",
      query: "Why did Video A get more engagement than Video B?"
    },
    {
      label: "Compare hook pacing",
      query: "Compare the hooks in the first 5 seconds."
    },
    {
      label: "Engagement rates",
      query: "What's the engagement rate of each?"
    },
    {
      label: "Creator profiles",
      query: "Who's the creator of Video B and what's their follower count?"
    },
    {
      label: "Suggestions for B",
      query: "Suggest improvements for B based on what worked in A."
    }
  ];

  return (
    <div className="flex flex-col h-[650px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/70 shadow-lg rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <h3 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Creator Insights RAG AI</h3>
        </div>
        
        {messages.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChat}
            className="h-8 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-xs gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Chat
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Semantic Video RAG Chatbot</h4>
            <p className="text-xs text-neutral-500 max-w-xs mt-1">
              {videoReady 
                ? "Compare hooks, engagement mechanics, and structures of both videos." 
                : "Enter YouTube and Instagram Reels URLs on the left to activate RAG chat."}
            </p>
            
            {videoReady && (
              <div className="flex flex-wrap gap-2 justify-center max-w-sm mt-6">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(preset.query)}
                    className="text-[11px] font-medium bg-neutral-100 hover:bg-indigo-50 dark:bg-neutral-900 dark:hover:bg-indigo-950/40 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-indigo-900 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div 
                key={index} 
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Bubble */}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isUser 
                    ? "bg-indigo-600 text-white rounded-br-none" 
                    : "bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 text-neutral-800 dark:text-neutral-200 rounded-bl-none"
                }`}>
                  {/* Markdown or plain text spacing */}
                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </div>
                </div>

                {/* Sources & Citations */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-1">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center mr-1">
                      <Layers className="w-3 h-3 mr-0.5" />
                      Sources:
                    </span>
                    {msg.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shadow-xs cursor-default ${
                          src.video_id === "A"
                            ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-150 dark:border-red-900/55"
                            : "bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border-pink-150 dark:border-pink-900/55"
                        }`}
                        title={src.content_snippet}
                      >
                        {src.tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* Stream typing indicator */}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center space-x-1.5 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-900 rounded-full px-3 py-1.5 w-fit">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input container */}
      <form 
        onSubmit={handleSubmit}
        className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10 flex gap-2 items-center"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={videoReady ? "Ask RAG about Video A or B..." : "Ingest videos on the left to enable typing..."}
          disabled={!videoReady || isStreaming}
          rows={1}
          className="resize-none flex-1 py-2 px-3 text-sm rounded-xl max-h-[80px] min-h-[40px] border-neutral-200 dark:border-neutral-800 focus-visible:ring-indigo-500 dark:bg-neutral-900/60 shadow-inner"
        />
        <Button 
          type="submit" 
          disabled={!videoReady || !input.trim() || isStreaming}
          className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
