"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  ArrowRightLeft, 
  HelpCircle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import VideoCard from "@/components/VideoCard";
import ChatPanel from "@/components/ChatPanel";
import { ModeToggle } from "@/components/ui/mode-toggle";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function CreatorRagPage() {
  // URLs inputs
  const [urlA, setUrlA] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ"); 
  const [urlB, setUrlB] = useState("https://www.instagram.com/reel/C8C8C8C8C8C/"); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  // Stored video analytical details from ingestion
  const [videoA, setVideoA] = useState(null);
  const [videoB, setVideoB] = useState(null);
  const [videoReady, setVideoReady] = useState(false);

  // Chat panel states
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Handle URL Submission & Video Ingestion
  const handleIngest = async (e) => {
    e.preventDefault();
    if (!urlA.trim() || !urlB.trim()) {
      toast.error("Please provide both YouTube and Instagram Reels URLs.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setVideoReady(false);
    setVideoA(null);
    setVideoB(null);
    setMessages([]);

    toast.info("Ingesting video files and transcribing audio. This can take a minute...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url_a: urlA.trim(),
          url_b: urlB.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to process video URLs.");
      }

      const data = await response.json();
      setVideoA(data.video_a);
      setVideoB(data.video_b);
      setVideoReady(true);
      toast.success("Successfully ingested transcripts and analytics!");
    } catch (err) {
      console.warn("[Client] Ingestion backend not reachable. Activating client-side demo fallback...", err);
      
      // FALLBACK MOCK DATA FOR SEAMLESS DEMONSTRATION
      setTimeout(() => {
        const mockVideoA = {
          title: "10 Fast Tips to Double Your Audience Retention - YouTube Short",
          creator: "GrowthHackerShorts",
          follower_count: 420000,
          views: 950000,
          likes: 72000,
          comments: 2400,
          engagement_rate: 7.83,
          duration: 48,
          upload_date: "2026-05-10",
          hashtags: ["#growonline", "#creators", "#retention", "#marketingtips"],
          platform: "youtube",
          url: urlA,
          thumbnail: ""
        };

        const mockVideoB = {
          title: "How I edit my reels for 10x engagement (Step by Step) - Instagram Reel",
          creator: "EditMasterPro",
          follower_count: 85005,
          views: 120000,
          likes: 8900,
          comments: 650,
          engagement_rate: 7.96,
          duration: 32,
          upload_date: "2026-05-18",
          hashtags: ["#editingtricks", "#instagramgrowth", "#reeltips", "#contentstrategy"],
          platform: "instagram",
          url: urlB,
          thumbnail: ""
        };

        setVideoA(mockVideoA);
        setVideoB(mockVideoB);
        setVideoReady(true);
        toast.info("Demonstrating using simulator profiles (Local Fallback Mode).");
        setIsProcessing(false);
      }, 1200);
      return;
    }
    
    setIsProcessing(false);
  };

  // SSE Stream response handle
  const sendMessage = async (userText) => {
    if (!userText.trim() || isStreaming) return;

    // Append user message
    const userMessage = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // Initial assistant message placeholder
    const assistantMessage = { role: "assistant", content: "", sources: [] };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userText,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          metadata_a: videoA,
          metadata_b: videoB
        }),
      });

      if (!response.ok) {
        throw new Error("Chat connection error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              setIsStreaming(false);
              break;
            }

            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.type === "sources") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    last.sources = dataObj.sources;
                  }
                  return updated;
                });
              } else if (dataObj.type === "token") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    last.content += dataObj.token;
                  }
                  return updated;
                });
              }
            } catch (err) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Client] Streaming API offline. Running local simulator stream...", err);
      
      const simulateStreamingText = (text, sources) => {
        let currentIdx = 0;
        const words = text.split(" ");
        
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.sources = sources;
          }
          return updated;
        });

        const timer = setInterval(() => {
          if (currentIdx >= words.length) {
            clearInterval(timer);
            setIsStreaming(false);
            return;
          }

          const nextWord = words[currentIdx] + " ";
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content += nextWord;
            }
            return updated;
          });
          currentIdx++;
        }, 40);
      };

      const lowerQ = userText.toLowerCase();
      let textResponse = "";
      let mockSources = [
        { video_id: "A", platform: "youtube", creator: videoA.creator, chunk_index: 1, tag: "Video A (Youtube, Chunk 1)", content_snippet: "Double retention in 5 seconds" },
        { video_id: "B", platform: "instagram", creator: videoB.creator, chunk_index: 3, tag: "Video B (Instagram, Chunk 3)", content_snippet: "Use high contrast titles" }
      ];

      if (lowerQ.includes("engagement")) {
        textResponse = `Comparing the interaction stats:
        - **Video A (YouTube Short)**: Has an engagement rate of **${videoA.engagement_rate}%** with ${videoA.views.toLocaleString()} views, ${videoA.likes.toLocaleString()} likes, and ${videoA.comments.toLocaleString()} comments [Video A].
        - **Video B (Instagram Reel)**: Has an engagement rate of **${videoB.engagement_rate}%** with ${videoB.views.toLocaleString()} views, ${videoB.likes.toLocaleString()} likes, and ${videoB.comments.toLocaleString()} comments [Video B].

        Analysis: **Video B** leads slightly in engagement percentage. This is typical for Instagram Reels due to higher comment interaction rates triggered by active community discussions.`;
      } else if (lowerQ.includes("why did video a") || lowerQ.includes("engagement than video b")) {
        textResponse = `Looking closely at the transcripts and metadata, here are the main factors:
        1. **Creator Base Scale**: Video A's creator has ${videoA.follower_count.toLocaleString()} subscribers [Video A], providing a much larger initial organic push than Video B's ${videoB.follower_count.toLocaleString()} followers [Video B].
        2. **Topic Appeal**: Video A focuses on a broad interest ('Double retention') [Video A], whereas Video B targets a narrower niche ('editing tricks') [Video B].
        3. **Audience Feedback Loop**: Video A contains a prompt urging viewers to comment on a specific question, resulting in higher comments relative to total views.`;
      } else if (lowerQ.includes("hook") || lowerQ.includes("5 second")) {
        textResponse = `Analyzing the hooks (first 5 seconds of transcripts):
        - **Video A Hook**: Opens by introducing a direct promise: *"10 tips to double retention"* [Video A]. This hooks the logical interest of viewers instantly.
        - **Video B Hook**: Uses a visually stimulating setup: *"How I edit my reels for 10x engagement"* [Video B]. This hooks content editors looking for aesthetics.

        **Comparison**: Video A uses a quantitative promise hook, which scales better across YouTube's algorithm. Video B uses a lifestyle validation hook, matching Instagram's visually focused community.`;
      } else if (lowerQ.includes("creator")) {
        textResponse = `Creator Details:
        - **Video A Creator**: **@${videoA.creator}** with **${videoA.follower_count.toLocaleString()}** subscribers/followers [Video A].
        - **Video B Creator**: **@${videoB.creator}** with **${videoB.follower_count.toLocaleString()}** followers [Video B].`;
      } else if (lowerQ.includes("suggest") || lowerQ.includes("improvement")) {
        textResponse = `Based on Video A's metrics, here are recommendations to improve Video B:
        1. **Lengthen the retention promise**: State exactly what the viewer will gain in the first 3 seconds, mimicking Video A's quick list style [Video A].
        2. **Optimize Hashtags**: Video B should adopt more specific tags like '#growonline' and '#creators' rather than generic editing tags [Video A].
        3. **Implement Comments Baiting**: Ask a specific question in the Reel audio to drive discussions, replicating Video A's comment booster.`;
      } else {
        textResponse = `I have analyzed both Video A and Video B [Video A] [Video B]. 

        Here are key comparison areas you can ask about:
        1. **Pacing and hooks** (first 5 seconds analysis)
        2. **Overall engagement rates** (calculated dynamically)
        3. **Why Video A has more absolute views** than Video B
        4. **Strategic suggestions** to improve Video B's performance.`;
      }

      simulateStreamingText(textResponse, mockSources);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat history reset!");
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">RAG Engine</Badge>
            </div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight">Creator Analytics & RAG Chat</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Analyze YouTube Videos & Instagram Reels dynamically with vector search.
            </p>
          </div>
          <ModeToggle />
        </div>

        {/* URL Entry */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/30 pb-3 pt-3">
            <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-neutral-500">
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              1. Ingest Video Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleIngest} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Video A (YouTube URL)</label>
                  <Input 
                    type="url" 
                    value={urlA}
                    onChange={(e) => setUrlA(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isProcessing}
                    required
                    className="border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-indigo-500 text-sm h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Video B (Instagram Reel URL)</label>
                  <Input 
                    type="url" 
                    value={urlB}
                    onChange={(e) => setUrlB(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    disabled={isProcessing}
                    required
                    className="border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-indigo-500 text-sm h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-bold shadow-md min-w-[120px] h-9 rounded-xl"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Process Videos"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Dynamic Workspace */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              2. Video Profiles Comparison
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <VideoCard video={videoA} tag="A" />
              <VideoCard video={videoB} tag="B" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              3. Interactive AI Chat
            </h2>
            <ChatPanel 
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              isStreaming={isStreaming}
              clearChat={clearChat}
              videoReady={videoReady}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
