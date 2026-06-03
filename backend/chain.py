from langchain_openai import ChatOpenAI
from langchain.chains.conversational_retrieval import ConversationalRetrievalChain
from langchain.memory.buffer import ConversationBufferMemory
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.prompts.prompt import PromptTemplate

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# In-memory sessions: session_id -> memory object
sessions: dict = {}

SYSTEM_PROMPT = """You are an expert social media analyst helping creators understand their video performance.
You have access to transcripts and metadata for Video A and Video B.

When answering:
- Always cite which video and chunk your answer comes from, like [Video A - chunk 2]
- Compute engagement rate as: (likes + comments) / views × 100
- Be specific and data-driven
- If comparing videos, be balanced

Context from videos:
{context}

Chat History:
{chat_history}

Question: {question}
Answer:"""

def get_or_create_chain(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
    
    llm = ChatOpenAI(model="gpt-4o", streaming=True, temperature=0.3)
    
    vectorstore = Chroma(
        collection_name="videos",
        embedding_function=embeddings,
        persist_directory="./chroma_db"
    )
    
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=sessions[session_id],
        return_source_documents=True,
        verbose=True,
    )
    
    return chain