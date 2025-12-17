import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Zap, Shield, Users, Globe, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { createRoom } from '../services/apiService';
import { logger } from '../utils/logger';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  

  const handleCreateRoom = async () => {
  setIsCreating(true);
  setError('');

  try {
    const response = await createRoom();
    const createdRoomId = response && (response.roomId || response.roomID || response.data?.roomId);

    if (!createdRoomId) {
      // defensive: backend responded OK but didn't include expected id
      const message = `Create room succeeded but missing roomId in response: ${JSON.stringify(response)}`;
      logger.error(message);
      setError('Unexpected server response. Check console.');
      return;
    }

    logger.info('Room created successfully:', createdRoomId);

    // Defer navigation one microtask to reduce StrictMode mount/unmount race
    setTimeout(() => {
      navigate(`/room/${String(createdRoomId).toUpperCase()}`);
    }, 0);
  } catch (err) {
    // Show the real reason to user (helpful during dev / QA)
    logger.error('Failed to create room:', err);
    const friendly = err && err.message ? err.message : 'Failed to create room. Please try again.';
    setError(friendly);
  } finally {
    setIsCreating(false);
  }
};

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a meeting code');
      return;
    }

    navigate(`/room/${roomId.trim().toUpperCase()}`);
  };

  const advantages = [
    {
      icon: <Zap size={28} />,
      title: 'Lightning Fast',
      description: 'Peer-to-peer connections ensure minimal latency and crystal-clear quality'
    },
    {
      icon: <Shield size={28} />,
      title: 'Secure & Private',
      description: 'End-to-end encrypted connections. Your conversations stay private'
    },
    {
      icon: <Users size={28} />,
      title: 'No Account Required',
      description: 'Jump into meetings instantly. No sign-ups or downloads needed'
    },
    {
      icon: <Globe size={28} />,
      title: 'Works Everywhere',
      description: 'Access from any browser on any device. Cross-platform compatibility'
    },
    {
      icon: <Video size={28} />,
      title: 'HD Video Quality',
      description: 'Experience smooth video at up to 720p with adaptive bitrate'
    },
    {
      icon: <Lock size={28} />,
      title: 'Open Source',
      description: 'Built with WebRTC technology. Transparent and community-driven'
    }
  ];

  return (
    <div className="home-new">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Connect With Anyone, <br />
            <span className="gradient-text">Anywhere</span>
          </h1>
          
          <p className="hero-subtitle">
            Experience seamless video conferencing with crystal-clear quality. Perfect
            for teams, classrooms, and social gatherings.
          </p>

          {/* Meeting Card */}
          <div className="meeting-card">
            <Input 
              placeholder="Enter meeting code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="meeting-input"
            />
            
            <Button 
              onClick={handleJoinRoom}
              className="join-button"
            >
              Join Meeting
            </Button>

            <div className="divider-new">
              <span>OR</span>
            </div>

            <Button 
              onClick={handleCreateRoom} 
              disabled={isCreating}
              variant="secondary"
              className="start-button"
            >
              {isCreating ? <LoadingSpinner size="small" /> : 'Start New Meeting'}
            </Button>

            {error && (
              <div className="error-message-new">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2 className="features-title">Why Choose Our Platform?</h2>
        <p className="features-subtitle">
          Built with cutting-edge WebRTC technology for the best video conferencing experience
        </p>

        <div className="features-grid">
          {advantages.map((advantage, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {advantage.icon}
              </div>
              <h3 className="feature-title">{advantage.title}</h3>
              <p className="feature-description">{advantage.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2024 WebRTC Conference. Built with React & Spring Boot</p>
      </footer>
    </div>
  );
}

export default Home;