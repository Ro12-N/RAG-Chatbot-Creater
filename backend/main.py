import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

from services.extractor import extract_video_data
from services.vector_store import save_transcript_to_vector_db, clear_vector_store
from services.rag_chain import generate_rag_response_stream

app = FastAPI(title="Creator RAG Backend", description="FastAPI Backend for Creator Insights RAG Chatbot")

# Enable CORS for frontend requests (Next.js runs on 3000, 3001, etc.)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "https://rag-chatbot-creater.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    url_a: str
    url_b: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: List[ChatMessage]
    metadata_a: Dict[str, Any]
    metadata_b: Dict[str, Any]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Creator RAG service is running."}

@app.post("/api/ingest")
async def ingest_videos(req: IngestRequest):
    print(f"[API] Ingest request received. URL A: {req.url_a}, URL B: {req.url_b}")
    
    # 1. Clear previous comparison data in vector store to avoid bleed
    try:
        clear_vector_store()
    except Exception as e:
        print(f"[API] Warning during vector store clear: {str(e)}")
        
    # 2. Extract Video A data
    try:
        data_a = extract_video_data(req.url_a, "A")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Video A: {str(e)}")
        
    # 3. Extract Video B data
    try:
        data_b = extract_video_data(req.url_b, "B")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Video B: {str(e)}")

    # 4. Save transcripts to Vector DB
    try:
        save_transcript_to_vector_db(data_a)
        save_transcript_to_vector_db(data_b)
    except Exception as e:
        print(f"[API] Error saving to vector DB: {str(e)}")
        # Continue and return metadata even if DB save fails, to prevent entire flow crash.
        
    # Return processed details (without transcript to keep payload light)
    response_data = {
        "video_a": {k: v for k, v in data_a.items() if k != "transcript"},
        "video_b": {k: v for k, v in data_b.items() if k != "transcript"}
    }
    
    return response_data

@app.post("/api/chat")
async def chat_stream(req: ChatRequest):
    print(f"[API] Chat request received: {req.question}")
    
    # Parse history back to list of dicts
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
    
    # We return an SSE stream (text/event-stream)
    return StreamingResponse(
        generate_rag_response_stream(
            question=req.question,
            history=history_dicts,
            metadata_a=req.metadata_a,
            metadata_b=req.metadata_b
        ),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    # Read port from env or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
