import { useEffect, useRef } from 'react';
import './RemoteVideo.css';

function RemoteVideo({ stream, participant }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container remote-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={!participant.videoEnabled ? 'video-hidden' : ''}
      />
      {!participant.videoEnabled && (
        <div className="video-off-placeholder">
          <div className="avatar">{participant.name?.charAt(0) || 'U'}</div>
        </div>
      )}
      <div className="video-overlay">
        <span className="video-name">{participant.name}</span>
        <div className="video-status">
          {!participant.audioEnabled && <span className="status-badge">🔇</span>}
          {!participant.videoEnabled && <span className="status-badge">📷</span>}
        </div>
      </div>
    </div>
  );
}

export default RemoteVideo;