import os
import json
from typing import List, Dict, Any, Generator
from .vector_store import get_vector_store

# Conditional imports
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

def get_llm_model():
    """Resolves and returns the LLM client based on available API keys."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

    if openai_key and ChatOpenAI:
        print("[RagChain] Using OpenAI GPT-4o-mini...")
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=openai_key,
            streaming=True
        )
    elif gemini_key and ChatGoogleGenerativeAI:
        print("[RagChain] Using Google Gemini 1.5 Flash...")
        if "GOOGLE_API_KEY" not in os.environ:
            os.environ["GOOGLE_API_KEY"] = gemini_key
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.3,
            streaming=True
        )
    else:
        print("[RagChain] WARNING: No LLM API Key found. Returning None. Fallback generation will be used.")
        return None

def format_history_for_llm(history: List[Dict[str, str]]) -> List[Any]:
    """Converts a standard chat history list to LangChain message formats if needed."""
    formatted_messages = []
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            formatted_messages.append(("user", content))
        elif role == "assistant":
            formatted_messages.append(("assistant", content))
    return formatted_messages

def generate_rag_response_stream(
    question: str, 
    history: List[Dict[str, str]], 
    metadata_a: Dict[str, Any], 
    metadata_b: Dict[str, Any]
) -> Generator[str, None, None]:
    """
    RAG Pipeline orchestrator.
    Retrieves matching documents, formats context, invokes LLM with memory,
    and returns a streaming generator containing source citations and text tokens.
    """
    db = get_vector_store()
    
    # Retrieve documents from Vector DB
    # We retrieve up to 8 matching chunks from the combined video indexes.
    retrieved_docs = []
    try:
        retrieved_docs = db.similarity_search(question, k=8)
    except Exception as e:
        print(f"[RagChain] Error querying Vector DB: {str(e)}")

    # Format source documents
    sources = []
    context_chunks = []
    
    for i, doc in enumerate(retrieved_docs):
        v_id = doc.metadata.get("video_id", "A")
        platform = doc.metadata.get("platform", "unknown")
        creator = doc.metadata.get("creator", "Unknown")
        chunk_idx = doc.metadata.get("chunk_index", 0)
        
        source_tag = f"Video {v_id} ({platform.capitalize()} by @{creator}, Chunk {chunk_idx})"
        
        # Avoid duplicate source logs in references
        if source_tag not in [s["tag"] for s in sources]:
            sources.append({
                "video_id": v_id,
                "platform": platform,
                "creator": creator,
                "chunk_index": chunk_idx,
                "content_snippet": doc.page_content[:150] + "...",
                "tag": source_tag
            })
            
        context_chunks.append(f"[{source_tag}]:\n{doc.page_content}\n")

    context_str = "\n".join(context_chunks) if context_chunks else "No relevant transcript context found in vector DB."

    # Format video metadata comparisons for prompt inject
    metadata_str = f"""
Analyzed Video Profiles:

--- VIDEO A ---
Platform: {metadata_a.get("platform", "YouTube")}
URL: {metadata_a.get("url", "")}
Title: {metadata_a.get("title", "")}
Creator Name: {metadata_a.get("creator", "")}
Follower/Subscriber Count: {metadata_a.get("follower_count", 0)}
Views: {metadata_a.get("views", 0)}
Likes: {metadata_a.get("likes", 0)}
Comments: {metadata_a.get("comments", 0)}
Engagement Rate: {metadata_a.get("engagement_rate", 0.0)}%
Duration: {metadata_a.get("duration", 0)} seconds
Upload Date: {metadata_a.get("upload_date", "")}
Hashtags: {", ".join(metadata_a.get("hashtags", []))}

--- VIDEO B ---
Platform: {metadata_b.get("platform", "Instagram Reel")}
URL: {metadata_b.get("url", "")}
Title: {metadata_b.get("title", "")}
Creator Name: {metadata_b.get("creator", "")}
Follower/Subscriber Count: {metadata_b.get("follower_count", 0)}
Views: {metadata_b.get("views", 0)}
Likes: {metadata_b.get("likes", 0)}
Comments: {metadata_b.get("comments", 0)}
Engagement Rate: {metadata_b.get("engagement_rate", 0.0)}%
Duration: {metadata_b.get("duration", 0)} seconds
Upload Date: {metadata_b.get("upload_date", "")}
Hashtags: {", ".join(metadata_b.get("hashtags", []))}
"""

    # System Instructions
    system_prompt = f"""You are an elite Social Media Growth Consultant & Content Strategist. Your task is to analyze YouTube/Instagram video transcripts and metrics to provide strategic RAG comparisons.

You have access to the exact metrics (views, likes, comments, engagement rates, etc.) and semantic transcript chunks of both videos.

Guidelines for response:
1. When answering, compare metrics like views, likes, comments, and engagement rates directly using the provided numbers.
2. Critically analyze the hooks (first 5 seconds of transcript), pacing, retention strategy, value proposition, and call to action (CTA).
3. Be direct, professional, and highly actionable.
4. **CITATION RULE:** For every analytical claim, transcript statement, or metric comparison, you MUST cite the source from the context using inline brackets like `[Video A]` or `[Video B]`. Be specific (e.g. "Video B got a 7.62% engagement rate, whereas Video A got 7.00% [Video A] [Video B]").
5. Keep track of previous chat history to answer follow-up queries.

Context of transcripts:
{context_str}

Metadata of videos:
{metadata_str}
"""

    # 1. Yield sources immediately so the client can display citations list
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    # Resolve LLM model
    llm = get_llm_model()

    if llm is None:
        # Generate high-quality mock streaming responses for local testing without API keys
        print("[RagChain] Generating mock streaming response...")
        import time
        
        # Craft a specific mock answer based on the question keywords
        lower_q = question.lower()
        if "engagement" in lower_q:
            answer = f"According to the metadata:\n* **Video A** has an engagement rate of **{metadata_a.get('engagement_rate')}%** (views: {metadata_a.get('views')}, likes: {metadata_a.get('likes')}, comments: {metadata_a.get('comments')}) [Video A].\n* **Video B** has an engagement rate of **{metadata_b.get('engagement_rate')}%** (views: {metadata_b.get('views')}, likes: {metadata_b.get('likes')}, comments: {metadata_b.get('comments')}) [Video B].\n\nThus, Video B has a higher overall interaction density relative to its viewership base."
        elif "why did video a" in lower_q or "more engagement" in lower_q:
            answer = f"Comparing Video A and Video B, we notice several differences:\n1. **Audience Scale**: Video A's creator has {metadata_a.get('follower_count')} subscribers [Video A], whereas Video B's creator has {metadata_b.get('follower_count')} followers [Video B].\n2. **Hook Mechanics**: Video A immediately outlines the topic [Video A]. Video B relies on rapid cuts and text overlay [Video B].\n3. **Formatting**: Video A has a {metadata_a.get('duration')}s duration on {metadata_a.get('platform')}, making it highly digestible. Video B is {metadata_b.get('duration')}s. Suggesting optimization on hook pacing for A."
        elif "hook" in lower_q or "5 second" in lower_q:
            answer = "Let's compare the hooks in the first 5 seconds:\n* **Video A Hook**: Opens by introducing the key topic. The transcript starts: *\"" + metadata_a.get("transcript", "")[:80] + "...\"* [Video A]. This sets expectations immediately.\n* **Video B Hook**: Focuses on quick visuals and high energy. The transcript starts: *\"" + metadata_b.get("transcript", "")[:80] + "...\"* [Video B]. This relies heavily on visual curiosity.\n\nRecommendation: Video A has a stronger intellectual hook, while Video B has a stronger visual hook."
        elif "creator" in lower_q or "who's the creator" in lower_q:
            answer = f"The creator of Video A is **@{metadata_a.get('creator')}** with **{metadata_a.get('follower_count')}** subscribers/followers [Video A].\n\nThe creator of Video B is **@{metadata_b.get('creator')}** with **{metadata_b.get('follower_count')}** followers [Video B]."
        elif "suggest" in lower_q or "improvement" in lower_q:
            answer = f"Based on Video A's successful execution, here are 3 improvements for Video B:\n1. **Integrate structured sections**: Video A outlines clear steps [Video A]. Video B should use text-cards to index the stages.\n2. **Enhance CTA**: Video A prompts comments on specific questions [Video A]. Video B should match this interactive strategy.\n3. **Match Keyword Density**: Incorporate hashtags like {', '.join(metadata_a.get('hashtags', []))} to boost search indexing."
        else:
            answer = f"Here is the comparison based on the transcripts and metadata of both videos [Video A] [Video B]:\n\n* **Video A Title**: {metadata_a.get('title')}\n* **Video B Title**: {metadata_b.get('title')}\n\nAsk me specific questions about engagement rates, hook designs, creators, or suggestions for optimization!"

        # Stream mock response word by word
        words = answer.split(" ")
        for word in words:
            time.sleep(0.04) # Simulate network lag
            yield f"data: {json.dumps({'type': 'token', 'token': word + ' '})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Use standard LangChain messages
    messages = [("system", system_prompt)]
    
    # Append conversation history
    messages.extend(format_history_for_llm(history))
    
    # Append user question
    messages.append(("user", question))

    try:
        # Streaming LLM invocation
        for chunk in llm.stream(messages):
            # Google and OpenAI chunk formats differ slightly, standard LangChain handles it
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            if content:
                yield f"data: {json.dumps({'type': 'token', 'token': content})}\n\n"
        
        yield "data: [DONE]\n\n"
    except Exception as e:
        print(f"[RagChain] LLM streaming error: {str(e)}")
        yield f"data: {json.dumps({'type': 'token', 'token': f'Error generating response: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"
