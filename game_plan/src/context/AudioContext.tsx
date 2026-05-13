import React, { createContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playButtonClick: () => void;
  playSnakeHiss: () => void;
  playVictory: () => void;
  bgmRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('audio-muted');
    if (saved !== null) return JSON.parse(saved);
    // First load — play by default (not muted)
    return false;
  });

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Update BGM when mute state changes
  useEffect(() => {
    if (bgmRef.current) {
      if (isMuted) {
        bgmRef.current.pause();
        isPlayingRef.current = false;
      } else {
        // Only play if not already playing to avoid multiple instances
        if (!isPlayingRef.current) {
          bgmRef.current.play().catch((error) => {
            console.log('Audio autoplay failed:', error);
          });
          isPlayingRef.current = true;
        }
      }
    }
    // Persist preference
    localStorage.setItem('audio-muted', JSON.stringify(isMuted));
  }, [isMuted]);

  // Ensure audio continues playing when component remounts
  useEffect(() => {
    if (bgmRef.current && !isMuted && !isPlayingRef.current) {
      bgmRef.current.play().catch((error) => {
        console.log('Audio autoplay failed on remount:', error);
      });
      isPlayingRef.current = true;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const playButtonClick = useCallback(() => {
    const audio = new Audio('/button_click.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silent fail if audio can't play
    });
  }, []);

  const playSnakeHiss = useCallback(() => {
    const audio = new Audio('/snake_hiss.mp3');
    audio.volume = 1;
    audio.play().catch(() => {
      // Silent fail if audio can't play
    });
  }, []);

  const playVictory = useCallback(() => {
    const audio = new Audio('/victory.mp3');
    audio.volume = 1;
    audio.play().catch(() => {
      // Silent fail if audio can't play
    });
  }, []);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playButtonClick, playSnakeHiss, playVictory, bgmRef }}>
      {/* Global BGM Audio Element - Do NOT override this ref from child components */}
      <audio
        ref={bgmRef}
        loop
        preload="auto"
        style={{ display: 'none' }}
      >
        <source src="/bgm.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = React.useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};
