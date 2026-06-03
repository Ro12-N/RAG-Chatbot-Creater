# Video ingestion - transcript + metadata extraction
# Will contain: YouTube transcript, Instagram Reel processing 
import yt_dlp
import os
import re
from youtube_transcript_api import YouTubeTranscriptApi
from metadata import get_youtube_metadata

_whisper_model = None

def get_whisper_model():
    """Lazy load Whisper model to save startup memory. Uses 'tiny' for 512MB RAM limits."""
    global _whisper_model
    if _whisper_model is None:
        import whisper
        print("Loading Whisper 'tiny' model (optimized for low memory)...")
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model

def extract_youtube_video_id(url: str) -> str or None:
    """Extract 11-character video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/embed\/|\/v\/|watch\?v=|&v=)([^#\&\?]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_youtube_transcript(video_id: str) -> str or None:
    """Fetch transcripts directly from YouTube API without downloading/transcribing."""
    try:
        srt = YouTubeTranscriptApi.get_transcript(video_id)
        transcript = " ".join([entry['text'] for entry in srt])
        return transcript
    except Exception as e:
        print(f"Could not retrieve YouTube transcript for video {video_id}: {e}")
        return None

def transcribe_youtube(url: str) -> dict:
    meta = get_youtube_metadata(url)
    
    # Try fetching transcript directly first (super fast, uses ~0 RAM)
    video_id = extract_youtube_video_id(url)
    if video_id:
        print(f"Attempting to fetch pre-existing transcript for video ID: {video_id}")
        transcript = get_youtube_transcript(video_id)
        if transcript:
            print("Successfully retrieved transcript directly from YouTube API.")
            return {"transcript": transcript, "metadata": meta}
            
    print("Direct transcript API failed. Falling back to Whisper transcription...")
    
    # Download audio only
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "yt_audio.%(ext)s",
        "quiet": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # Transcribe with lazy-loaded tiny model
    model = get_whisper_model()
    result = model.transcribe("yt_audio.mp3")
    transcript = result["text"]
    
    # Clean up
    if os.path.exists("yt_audio.mp3"):
        os.remove("yt_audio.mp3")
    
    return {"transcript": transcript, "metadata": meta}

import instaloader
import os
import tempfile

def transcribe_instagram(url: str) -> dict:
    # Extract shortcode from URL like https://www.instagram.com/reel/ABC123/
    shortcode = url.rstrip("/").split("/")[-1]
    
    L = instaloader.Instaloader()
    username = os.getenv("INSTAGRAM_USERNAME")
    password = os.getenv("INSTAGRAM_PASSWORD")
    
    if username and password:
        L.login(username, password)
    
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    
    views = post.video_view_count or 0
    likes = post.likes or 0
    comments = post.comments or 0
    engagement = round((likes + comments) / views * 100, 2) if views > 0 else 0
    
    meta = {
        "platform": "instagram",
        "title": post.caption[:100] if post.caption else "",
        "creator": post.owner_username,
        "views": views,
        "likes": likes,
        "comments": comments,
        "duration": post.video_duration or 0,
        "upload_date": str(post.date),
        "hashtags": post.caption_hashtags[:10] if post.caption_hashtags else [],
        "follower_count": post.owner_profile.followers,
        "engagement_rate": engagement,
        "thumbnail": post.url,
    }
    
    # Create temp directory for Windows
    temp_dir = tempfile.mkdtemp()
    video_folder = os.path.join(temp_dir, "insta_video")
    os.makedirs(video_folder, exist_ok=True)
    
    # Download video
    L.download_post(post, target=video_folder)
    
    # Find video file
    video_file = None
    for f in os.listdir(video_folder):
        if f.endswith(".mp4"):
            video_file = os.path.join(video_folder, f)
            break
    
    transcript = ""
    if video_file and os.path.exists(video_file):
        model = get_whisper_model()
        result = model.transcribe(video_file)
        transcript = result["text"]
    
    # Clean up temp folder
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)
    
    return {"transcript": transcript, "metadata": meta}