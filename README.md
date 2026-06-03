# 🎙️ Creator RAG Chatbot (Social Media Video Analytics)

A premium, full-stack Retrieval-Augmented Generation (RAG) chatbot and analytics comparison platform. It enables content creators to compare YouTube and Instagram Reels videos dynamically.

## ✨ Features
- 📊 **Dynamic Ingestion**: Fetch metadata (views, likes, comments, creator, subscriber count, upload date, duration) and transcripts for any YouTube video & Instagram Reel URL.
- ⚡ **Engagement Rate Calculation**: Computes `engagement_rate = (likes + comments) / views * 100` automatically.
- 📂 **Semantic Vector DB**: Chunks transcripts and stores them with custom metadata tags (`video_id = A` or `B`) using a local persistent ChromaDB (or Pinecone).
- 💬 **Streaming RAG Chat**: Streaming RAG interface built on LangChain or LangGraph with chat history memory and inline citations.
- 🖥️ **Premium Dashboard**: Side-by-side video analytics comparison cards and active chat panel. Includes local simulator fallback mode.

## 🛠️ Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS, Shadcn UI
- **Backend Framework**: FastAPI (Python)
- **RAG Orchestrator**: LangChain & LangGraph
- **Vector DB**: ChromaDB (default local persistent) / Pinecone (optional)
- **APIs & Models**: OpenAI GPT-4o-mini & Whisper, Google Gemini 1.5 Flash

---

                    ┌──────────────────────────────┐
                    │      NEXT.JS FRONTEND        │
                    │   React client + Tailwind    │
                    │   Port: 3000 (Vercel)        │
                    └──────────────┬───────────────┘
                                   │
                                   │ HTTPS Requests /
                                   │ SSE (Server-Sent Events) Streaming
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      FASTAPI BACKEND         │
                    │   Uvicorn (Render/Railway)   │
                    │   Port: 8000                 │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │   EXTRACTOR SERVICE    │    │  VECTOR STORE SERVICE  │
       │   - yt-dlp Metadata    │    │  - ChromaDB (Local)    │
       │   - Whisper (Audio)    │    │  - Gemini Embeddings   │
       └────────────────────────┘    └────────────────────────┘


<img width="1237" height="951" alt="Screenshot 2026-06-03 204216" src="https://github.com/user-attachments/assets/1ce91fff-e198-40bf-98e6-f8e05fbc203d" />
<img width="1134" height="946" alt="Screenshot 2026-06-03 204233" src="https://github.com/user-attachments/assets/4de31c56-959e-45fc-9cb2-a1e1c85a62c8" />
<img width="1458" height="770" alt="Screenshot 2026-06-03 204256" src="https://github.com/user-attachments/assets/ad3f0329-c028-479c-89bb-3781ff909b5f" />
<img width="1141" height="949" alt="Screenshot 2026-06-03 204333" src="https://github.com/user-attachments/assets/d3ebc9b4-820e-4f26-a293-44f64be6e350" />



## 🚀 Running the Project

### 1. Start the Backend
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Setup environment variables:
   Copy `backend/.env.example` to `backend/.env` and add your `GOOGLE_API_KEY` (Gemini) or `OPENAI_API_KEY`.
5. Run the FastAPI development server:
   ```bash
   python main.py
   ```
   The backend will run at `http://localhost:8000`.

### 2. Run the Frontend
1. Open a new terminal in the project root.
2. Setup environment variables:
   Copy `.env.example` to `.env` and verify `NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"`.
3. Install node dependencies:
   ```bash
   npm install
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.
