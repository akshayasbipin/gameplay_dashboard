import { useAudio } from '../context/AudioContext';
import './AudioToggle.css';

export function AudioToggle() {
  const { isMuted, toggleMute } = useAudio();

  return (
    <div 
      className="audio-toggle" 
      onClick={toggleMute} 
      style={{ cursor: 'pointer' }}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      <img 
        src={isMuted ? '/bgm_1.jpg' : '/bgm_2.jpg'} 
        alt={isMuted ? 'Muted' : 'Playing'} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
