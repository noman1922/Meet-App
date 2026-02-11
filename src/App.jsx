import React, { useState, useEffect } from 'react';
import './styles/styles.css';

const App = () => {
  const [passcode, setPasscode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const PASSCODE = "192288";

  const handlePasscodeSubmit = () => {
    if (passcode === PASSCODE) {
      setIsAuthorized(true);
      localStorage.setItem('enkryx_auth', 'true');
    } else {
      alert("Incorrect passcode");
    }
  };

  const handleJoinMeeting = () => {
    if (roomCode.trim()) {
      window.open(`https://meet.jit.si/${roomCode.trim()}`, "_blank");
    } else {
      alert("Please enter a meeting room name");
    }
  };

  useEffect(() => {
    if (localStorage.getItem('enkryx_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  if (!isAuthorized) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h1 style={{ color: 'var(--accent)', marginBottom: '10px' }}>Enkryx</h1>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Enter Passcode to Access Launcher</p>
          <input
            type="password"
            placeholder="Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
          />
          <button className="btn-primary" onClick={handlePasscodeSubmit}>Verify</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h1 style={{ color: 'var(--accent)', marginBottom: '10px' }}>Enkryx Launcher</h1>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Enter a room name to start or join a meeting</p>
        <input
          type="text"
          placeholder="Meeting Room Name"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
        />
        <button className="btn-primary" onClick={handleJoinMeeting}>Launch Meeting</button>
        <button
          className="btn-secondary"
          style={{ marginTop: '10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          onClick={() => {
            localStorage.removeItem('enkryx_auth');
            setIsAuthorized(false);
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default App;
