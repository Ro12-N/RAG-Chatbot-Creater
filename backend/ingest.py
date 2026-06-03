# Video ingestion - transcript + metadata extraction
# Will contain: YouTube transcript, Instagram Reel processing 
import whisper
import yt_dlp
import os
from metadata import get_youtube_metadata

model = whisper.load_model("base")

def transcribe_youtube(url: str) -> dict:
    meta = get_youtube_metadata(url)
    
    # Download audio only
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "/tmp/yt_audio.%(ext)s",
        "quiet": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # Transcribe
    result = model.transcribe("yt_audio.mp3")
    transcript = result["text"]
    
    # Clean up
    if os.path.exists("yt_audio.mp3"):
        os.remove("yt_audio.mp3")
    
    return {"transcript": transcript, "metadata": meta}