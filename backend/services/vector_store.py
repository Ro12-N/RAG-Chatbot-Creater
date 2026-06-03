import os
from typing import List, Dict, Any, Optional
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

# Conditional imports with fallback
try:
    from langchain_openai import OpenAIEmbeddings
except ImportError:
    OpenAIEmbeddings = None

try:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
except ImportError:
    GoogleGenerativeAIEmbeddings = None

# Custom Mock Embeddings class to ensure the project runs even if API keys are missing
class MockEmbeddings(Embeddings):
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Return a simple mock vector (e.g., all 0s or deterministic values)
        return [[0.1] * self.dimension for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return [0.1] * self.dimension

# Determine which embeddings to use
def get_embeddings_model() -> Embeddings:
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

    if openai_key and OpenAIEmbeddings:
        print("[VectorStore] Using OpenAI Embeddings...")
        return OpenAIEmbeddings(openai_api_key=openai_key)
    elif gemini_key and GoogleGenerativeAIEmbeddings:
        print("[VectorStore] Using Google Gemini Embeddings...")
        # Note: langchain-google-genai uses GOOGLE_API_KEY by default
        if "GOOGLE_API_KEY" not in os.environ:
            os.environ["GOOGLE_API_KEY"] = gemini_key
        return GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    else:
        print("[VectorStore] WARNING: No OpenAI or Gemini API Key found. Using MockEmbeddings for local testing.")
        return MockEmbeddings()

# Global database setup (using Chroma or Pinecone)
_vector_store_instance = None

def get_vector_store():
    """Initializes and returns the vector store instance (ChromaDB)."""
    global _vector_store_instance
    if _vector_store_instance is not None:
        return _vector_store_instance

    embeddings = get_embeddings_model()
    
    # We will use Chroma DB locally since it is fully self-contained and persistent.
    # To support Pinecone, we check environment variables.
    pinecone_key = os.environ.get("PINECONE_API_KEY")
    pinecone_env = os.environ.get("PINECONE_ENV")
    pinecone_index = os.environ.get("PINECONE_INDEX", "creator-rag")

    if pinecone_key and pinecone_env:
        try:
            from langchain_community.vectorstores import Pinecone as LangChainPinecone
            from pinecone import Pinecone, ServerlessSpec
            
            print(f"[VectorStore] Connecting to Pinecone Index '{pinecone_index}'...")
            pc = Pinecone(api_key=pinecone_key)
            
            # Create index if it does not exist
            active_indexes = [index.name for index in pc.list_indexes()]
            if pinecone_index not in active_indexes:
                pc.create_index(
                    name=pinecone_index,
                    dimension=1536,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region=pinecone_env)
                )
            
            _vector_store_instance = LangChainPinecone.from_existing_index(
                index_name=pinecone_index,
                embedding=embeddings
            )
            return _vector_store_instance
        except Exception as e:
            print(f"[VectorStore] Failed to connect to Pinecone: {str(e)}. Falling back to local Chroma.")

    # Local Chroma DB fallback (persistent storage in backend/chroma_db)
    try:
        from langchain_community.vectorstores import Chroma
        persist_directory = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
        print(f"[VectorStore] Initializing local ChromaDB at {persist_directory}...")
        _vector_store_instance = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings
        )
        return _vector_store_instance
    except Exception as e:
        print(f"[VectorStore] Error initializing Chroma: {str(e)}")
        # Ultimate fallback to in-memory Chroma
        from langchain_community.vectorstores import Chroma
        print("[VectorStore] Initializing in-memory ChromaDB...")
        _vector_store_instance = Chroma(
            embedding_function=embeddings
        )
        return _vector_store_instance

def save_transcript_to_vector_db(video_data: Dict[str, Any]):
    """Chunks transcript and saves to vector DB tagged with video_id (A or B)."""
    transcript = video_data.get("transcript", "")
    video_id_tag = video_data.get("video_id_tag", "A")
    url = video_data.get("url", "")
    platform = video_data.get("platform", "unknown")
    creator = video_data.get("creator", "Unknown")
    
    if not transcript:
        print(f"[VectorStore] No transcript to save for Video {video_id_tag}")
        return

    # Text Splitting
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        length_function=len
    )
    
    # Create Document objects
    chunks = text_splitter.split_text(transcript)
    documents = []
    
    for i, chunk in enumerate(chunks):
        doc = Document(
            page_content=chunk,
            metadata={
                "video_id": video_id_tag,
                "url": url,
                "platform": platform,
                "creator": creator,
                "chunk_index": i,
                "source": f"Video {video_id_tag} ({platform.capitalize()})"
            }
        )
        documents.append(doc)
        
    print(f"[VectorStore] Saving {len(documents)} chunks to vector DB for Video {video_id_tag}...")
    
    # Add to database
    db = get_vector_store()
    db.add_documents(documents)
    print(f"[VectorStore] Successfully saved chunks for Video {video_id_tag}!")

def clear_vector_store():
    """Clear all documents in the vector store to start fresh."""
    global _vector_store_instance
    db = get_vector_store()
    # For ChromaDB we can clean local files or recreate
    # To keep it simple, we reset the global instance and delete the directory if it exists
    _vector_store_instance = None
    persist_directory = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
    if os.path.exists(persist_directory):
        import shutil
        try:
            shutil.rmtree(persist_directory)
            print("[VectorStore] Cleared local ChromaDB directory.")
        except Exception as e:
            print(f"[VectorStore] Error deleting Chroma directory: {str(e)}")
