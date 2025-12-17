import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import Button from '../ui/Button';
import './VideoControls.css';

function VideoControls({ 
  isAudioEnabled, 
  isVideoEnabled, 
  onToggleAudio, 
  onToggleVideo, 
  onLeave 
}) {
  return (
    <div className="video-controls">
      <div className="controls-group">
        <button
          className={`control-button ${!isAudioEnabled ? 'disabled' : ''}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button
          className={`control-button ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        <button
          className="control-button leave-button"
          onClick={onLeave}
          title="Leave call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}

export default VideoControls;