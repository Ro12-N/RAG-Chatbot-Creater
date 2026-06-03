# Embedding generation and vector storage
# Will contain: ChromaDB setup, chunking, embedding functions 
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import os

from langchain_text_splitters import RecursiveCharacterTextSplitter

client = chromadb.PersistentClient(path="./chroma_db")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

def embed_and_store(video_id: str, transcript: str, metadata: dict):
    """
    video_id = "A" or "B"
    Splits transcript into chunks, embeds them, stores in ChromaDB
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
    )
    chunks = splitter.split_text(transcript)
    if not chunks:
        return 0
    
    collection = client.get_or_create_collection("videos")
    
    # Batch embed chunks and store them in one go to optimize speed and API costs
    embeddings_list = embeddings.embed_documents(chunks)
    ids = [f"{video_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{
        "video_id": video_id,
        "chunk_index": i,
        "creator": metadata.get("creator", ""),
        "platform": metadata.get("platform", ""),
        "title": metadata.get("title", ""),
    } for i in range(len(chunks))]
    
    collection.add(
        ids=ids,
        embeddings=embeddings_list,
        documents=chunks,
        metadatas=metadatas
    )
    
    return len(chunks)

def get_collection():
    return client.get_or_create_collection("videos")