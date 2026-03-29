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

  // Update BGM when mute state changes
  useEffect(() => {
    if (bgmRef.current) {
      if (isMuted) {
        bgmRef.current.pause();
      } else {
        bgmRef.current.play().catch((error) => {
          console.log('Audio autoplay failed:', error);
        });
      }
    }
    // Persist preference
    localStorage.setItem('audio-muted', JSON.stringify(isMuted));
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
  }, [isMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playButtonClick, playSnakeHiss, playVictory, bgmRef }}>
      {/* Global BGM Audio Element */}
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
