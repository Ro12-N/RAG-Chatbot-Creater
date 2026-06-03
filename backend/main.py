# FastAPI server - main entry point
# Contains: /ingest endpoint, /chat endpoint, /health endpoint, CORS config
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables at the very beginning, checking both backend/ and root directories
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

# Warn if OpenAI key is missing and set a dummy key to prevent startup crash
openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key or openai_key == "your_openai_key_here":
    print("\n" + "="*80)
    print("WARNING: OPENAI_API_KEY is not configured in your .env file!")
    print("The backend server will run, but video analysis and chat functionality will fail.")
    print("Please set the OPENAI_API_KEY in the .env file in the project root.")
    print("="*80 + "\n")
    os.environ["OPENAI_API_KEY"] = "dummy_key_for_startup_validation"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json

# Import custom modules after environment is loaded and configured
from ingest import transcribe_youtube, transcribe_instagram
from embeddings import embed_and_store
from chain import get_or_create_chain

app = FastAPI()

# CORS Middleware
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store metadata for the two videos in memory
video_store = {}

# ========== Request Models ==========
class IngestRequest(BaseModel):
    youtube_url: str
    instagram_url: str

class ChatRequest(BaseModel):
    question: str
    session_id: str

#  Health Check
@app.get("/health")
def health():
    return {"status": "ok"}

# Ingest Endpoint 
@app.post("/ingest")
async def ingest_videos(req: IngestRequest):
    # Process YouTube
    yt_data = transcribe_youtube(req.youtube_url)
    chunks_a = embed_and_store("A", yt_data["transcript"], yt_data["metadata"])
    video_store["A"] = {**yt_data["metadata"], "chunk_count": chunks_a}
    
    # Process Instagram
    ig_data = transcribe_instagram(req.instagram_url)
    chunks_b = embed_and_store("B", ig_data["transcript"], ig_data["metadata"])
    video_store["B"] = {**ig_data["metadata"], "chunk_count": chunks_b}
    
    return {
        "video_a": video_store["A"],
        "video_b": video_store["B"],
        "message": "Both videos processed and indexed"
    }

# Chat Endpoint (Streaming) 
@app.post("/chat")
async def chat(req: ChatRequest):
    chain = get_or_create_chain(req.session_id)
    
    async def generate():
        # Add metadata context to question
        meta_context = ""
        if "A" in video_store and "B" in video_store:
            meta_context = f"""
Video A: {video_store['A']['title']} by {video_store['A']['creator']}
Views: {video_store['A']['views']}, Likes: {video_store['A']['likes']}, 
Engagement Rate: {video_store['A']['engagement_rate']}%

Video B: {video_store['B']['title']} by {video_store['B']['creator']}
Views: {video_store['B']['views']}, Likes: {video_store['B']['likes']},
Engagement Rate: {video_store['B']['engagement_rate']}%

User question: {req.question}"""
        else:
            meta_context = req.question
        
        result = chain({"question": meta_context})
        answer = result["answer"]
        sources = result.get("source_documents", [])
        
        # Stream the answer word by word
        words = answer.split(" ")
        for word in words:
            yield f"data: {json.dumps({'type': 'token', 'content': word + ' '})}\n\n"
            await asyncio.sleep(0.02)
        
        # Send citations
        citations = []
        for doc in sources:
            citations.append({
                "video_id": doc.metadata.get("video_id", ""),
                "chunk_index": doc.metadata.get("chunk_index", 0),
                "text_preview": doc.page_content[:100],
            })
        
        yield f"data: {json.dumps({'type': 'citations', 'content': citations})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# Get Videos Endpoint 
@app.get("/videos")
def get_videos():
    return video_store