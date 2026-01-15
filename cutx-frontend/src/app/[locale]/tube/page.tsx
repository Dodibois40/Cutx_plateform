'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Eye } from 'lucide-react';

import localShortsData from '@/data/local-shorts.json';

interface LocalShort {
  id: string;
  title: string;
  author: string;
  channelId: string;
  thumbnail: string;
  views: number;
  likes: number;
  query: string;
  localPath: string;
  cdnPath?: string;
}

const videos = localShortsData as LocalShort[];

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default function TubePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isScrolling = useRef(false);

  const currentVideo = videos[currentIndex];

  // Précharger vidéos adjacentes
  const getVisibleIndices = useCallback(() => {
    const indices = [currentIndex];
    if (currentIndex > 0) indices.unshift(currentIndex - 1);
    if (currentIndex < videos.length - 1) indices.push(currentIndex + 1);
    return indices;
  }, [currentIndex]);

  // Gérer lecture/pause des vidéos
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const videoIndex = videos.findIndex(v => v.id === id);
      const isCurrent = videoIndex === currentIndex;

      if (isCurrent && !isPaused) {
        video.currentTime = 0;
        video.muted = isMuted;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.muted = true;
      }
    });
  }, [currentIndex, isMuted, isPaused, getVisibleIndices]);

  // Navigation
  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < videos.length && !isScrolling.current) {
      isScrolling.current = true;
      setCurrentIndex(index);
      setIsPaused(false);
      setTimeout(() => { isScrolling.current = false; }, 300);
    }
  }, []);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Swipe rapide ou distance suffisante
    if (velocity > 0.5 || Math.abs(deltaY) > 80) {
      if (deltaY > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  };

  // Tap pour pause
  const handleTap = () => {
    setIsPaused(p => !p);
  };

  // Keyboard & wheel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goTo(currentIndex + 1);
      else if (e.key === 'ArrowUp' || e.key === 'k') goTo(currentIndex - 1);
      else if (e.key === ' ') { e.preventDefault(); setIsPaused(p => !p); }
      else if (e.key === 'm') setIsMuted(m => !m);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentIndex, goTo]);

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentVideo) return;
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(currentVideo.id)) next.delete(currentVideo.id);
      else next.add(currentVideo.id);
      return next;
    });
  };

  const isLiked = currentVideo ? likedVideos.has(currentVideo.id) : false;
  const visibleIndices = getVisibleIndices();

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white px-8">
          <p className="text-xl mb-4">Aucune vidéo</p>
          <p className="text-white/60 text-sm">
            Lancez: node scripts/download-shorts.js
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black select-none"
      style={{ height: '100dvh' }}
    >
      {/* Video Stack */}
      <div className="relative w-full h-full overflow-hidden">
        {visibleIndices.map(index => {
          const video = videos[index];
          const offset = index - currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={video.id}
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{
                transform: `translateY(${offset * 100}%)`,
                zIndex: isCurrent ? 10 : 5,
              }}
            >
              <video
                ref={el => {
                  if (el) videoRefs.current.set(video.id, el);
                  else videoRefs.current.delete(video.id);
                }}
                src={video.cdnPath || video.localPath}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                loop
                muted={!isCurrent || isMuted}
                preload="auto"
                poster={video.thumbnail}
              />

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Touch overlay */}
      <div
        className="absolute inset-0 z-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      />

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
            <Play size={40} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <h1 className="text-white font-bold text-xl drop-shadow-lg">CutX Tube</h1>
        <button
          onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); }}
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX size={20} className="text-white" />
          ) : (
            <Volume2 size={20} className="text-white" />
          )}
        </button>
      </div>

      {/* Right side actions - TikTok style */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/40'}`}>
            <Heart size={26} className={isLiked ? 'text-white fill-white' : 'text-white'} />
          </div>
          <span className="text-white text-xs mt-1 font-medium">
            {formatNumber(currentVideo.likes + (isLiked ? 1 : 0))}
          </span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
            <Eye size={26} className="text-white" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">
            {formatNumber(currentVideo.views)}
          </span>
        </div>

        {/* Comments placeholder */}
        <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
            <MessageCircle size={26} className="text-white" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">0</span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.share?.({
              title: currentVideo.title,
              url: `https://youtube.com/shorts/${currentVideo.id}`
            });
          }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
            <Share2 size={26} className="text-white" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">Share</span>
        </button>

        {/* Author avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border-2 border-white">
          <span className="text-white font-bold text-lg">
            {currentVideo.author.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Bottom info */}
      <div
        className="absolute bottom-4 left-4 right-20 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-base">
            @{currentVideo.author.slice(0, 20)}
          </span>
        </div>
        <p className="text-white text-sm leading-snug line-clamp-2 drop-shadow-lg">
          {currentVideo.title}
        </p>
      </div>
    </div>
  );
}
