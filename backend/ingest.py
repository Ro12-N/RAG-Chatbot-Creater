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
        "outtmpl": "yt_audio.%(ext)s",
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
        result = model.transcribe(video_file)
        transcript = result["text"]
    
    # Clean up temp folder
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)
    
    return {"transcript": transcript, "metadata": meta}