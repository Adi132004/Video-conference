import { useEffect, useRef } from 'react';
import './LocalVideo.css';

function LocalVideo({ stream, userName, isMuted, isVideoOff }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container local-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={isVideoOff ? 'video-hidden' : ''}
      />
      {isVideoOff && (
        <div className="video-off-placeholder">
          <div className="avatar">{userName?.charAt(0) || 'U'}</div>
        </div>
      )}
      <div className="video-overlay">
        <span className="video-name">{userName} (You)</span>
        <div className="video-status">
          {isMuted && <span className="status-badge">🔇</span>}
          {isVideoOff && <span className="status-badge">📷</span>}
        </div>
      </div>
    </div>
  );
}

export default LocalVideo;