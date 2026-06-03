import React from "react";
import { 
  Play, 
  ThumbsUp, 
  MessageSquare, 
  Eye, 
  Users, 
  Calendar, 
  Clock, 
  Link as LinkIcon 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VideoCard({ video, tag }) {
  if (!video) {
    return (
      <Card className="h-full min-h-[300px] flex items-center justify-center border-dashed border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20 backdrop-blur-sm rounded-2xl">
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Play className="w-5 h-5 text-neutral-400 dark:text-neutral-600" />
          </div>
          <p className="text-sm font-semibold text-neutral-500">Video {tag} Not Processed</p>
          <p className="text-xs text-neutral-400 mt-1">Submit a URL to analyze stats & transcript</p>
        </div>
      </Card>
    );
  }

  const {
    title,
    creator,
    follower_count,
    views,
    likes,
    comments,
    engagement_rate,
    duration,
    upload_date,
    hashtags,
    platform,
    url
  } = video;

  const isYouTube = platform === "youtube";
  
  // Format numbers to short format (e.g. 1.2K, 50K)
  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Convert seconds to readable duration
  const formatDuration = (secs) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Convert YYYYMMDD upload date to human-readable date if string of length 8
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "Unknown Date") return "Unknown Date";
    if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    return dateStr;
  };

  return (
    <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col h-full">
      {/* Platform & Tag Header */}
      <div className="relative p-4 pb-0 flex justify-between items-center">
        <Badge className={`px-2 py-0.5 font-semibold tracking-wider text-xs rounded-md ${
          isYouTube 
            ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" 
            : "bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800"
        }`}>
          {isYouTube ? "YouTube" : "Instagram Reel"}
        </Badge>
        
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-md">
          {tag}
        </Badge>
      </div>

      <CardHeader className="pt-3 pb-2">
        <CardTitle className="line-clamp-2 text-base font-bold text-neutral-900 dark:text-neutral-50" title={title}>
          {title}
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase">
            {creator ? creator[0] : "C"}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">@{creator}</p>
            <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>{formatNumber(follower_count)} followers</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4 flex-1 flex flex-col justify-between gap-4">
        {/* Engagement Analytics Panel */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-900/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-900">
          <div className="col-span-2 flex justify-between items-center pb-2 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <span className="text-xs font-semibold text-neutral-500">Engagement Rate</span>
            <span className={`text-base font-black px-2.5 py-0.5 rounded-full ${
              engagement_rate >= 8 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : engagement_rate >= 5 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            }`}>
              {engagement_rate}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Views</span>
            <div className="flex items-center text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
              <Eye className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              {formatNumber(views)}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Likes</span>
            <div className="flex items-center text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
              <ThumbsUp className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              {formatNumber(likes)}
            </div>
          </div>

          <div className="flex flex-col col-span-2">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Comments</span>
            <div className="flex items-center text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              {formatNumber(comments)}
            </div>
          </div>
        </div>

        {/* Video Duration / Upload Date info */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-900 pt-3">
          <div className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-neutral-400" />
            <span>{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-neutral-400" />
            <span>{formatDate(upload_date)}</span>
          </div>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-auto font-medium transition-colors"
          >
            <LinkIcon className="w-3 h-3 mr-1" />
            Link
          </a>
        </div>

        {/* Hashtags display */}
        {hashtags && hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto scrollbar-thin mt-1">
            {hashtags.slice(0, 6).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] text-neutral-500 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 font-normal py-0">
                {tag}
              </Badge>
            ))}
            {hashtags.length > 6 && (
              <Badge variant="outline" className="text-[10px] text-neutral-400 py-0">
                +{hashtags.length - 6} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
