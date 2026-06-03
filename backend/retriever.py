# Semantic search and retrieval
# Will contain: similarity search, relevant chunk fetching
from embeddings import get_collection, embeddings

def retrieve_relevant_chunks(query: str, top_k: int = 5) -> list:
    collection = get_collection()
    query_embedding = embeddings.embed_query(query)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    chunks = []
    for i in range(len(results["documents"][0])):
        chunks.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score": results["distances"][0][i],
        })
    
    return chunks