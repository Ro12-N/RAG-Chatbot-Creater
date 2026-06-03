# Video metadata extraction
# Will contain: views, likes, comments, creator info, engagement rate  
import yt_dlp
import requests

def get_youtube_metadata(url: str) -> dict:
    ydl_opts = {"quiet": True, "skip_download": True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    
    views = info.get("view_count", 0) or 0
    likes = info.get("like_count", 0) or 0
    comments = info.get("comment_count", 0) or 0
    engagement = round((likes + comments) / views * 100, 2) if views > 0 else 0

    return {
        "platform": "youtube",
        "title": info.get("title", ""),
        "creator": info.get("uploader", ""),
        "views": views,
        "likes": likes,
        "comments": comments,
        "duration": info.get("duration", 0),
        "upload_date": info.get("upload_date", ""),
        "hashtags": info.get("tags", [])[:10],
        "follower_count": info.get("channel_follower_count", 0) or 0,
        "engagement_rate": engagement,
        "thumbnail": info.get("thumbnail", ""),
    }