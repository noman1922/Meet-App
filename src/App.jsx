import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, query, where, collection, runTransaction, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/firebase';
import Room from './pages/Room';
import Call from './pages/Call';
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react';
import './styles/styles.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [meetingFull, setMeetingFull] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyStream, setLobbyStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const lobbyVideoRef = useRef(null);
  const PASSCODE = "192288";

  useEffect(() => {
    if (!isAuthorized) return;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const name = authUser.displayName || localStorage.getItem('team_display_name');

        if (name) {
          // If we have a name, show lobby instead of joining immediately
          setShowLobby(true);
        } else {
          setShowNameModal(true);
        }
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  useEffect(() => {
    if (showLobby && !lobbyStream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLobbyStream(stream);
          if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Lobby media error:", err));
    }
    return () => {
      if (lobbyStream) {
        lobbyStream.getTracks().forEach(t => t.stop());
        setLobbyStream(null);
      }
    };
  }, [showLobby]);

  const handleJoinRoom = async (uid, name) => {
    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'meta', 'room');
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) transaction.set(roomRef, { count: 0 });

        const count = roomSnap.exists() ? roomSnap.data().count : 0;
        const memberRef = doc(db, 'members', uid);
        const memberSnap = await transaction.get(memberRef);

        if (!memberSnap.exists()) {
          if (count >= 3) throw new Error('FULL');
          transaction.set(memberRef, { userId: uid, name, joinedAt: serverTimestamp(), online: true });
          transaction.update(roomRef, { count: increment(1) });
        } else {
          transaction.update(memberRef, { online: true, lastActive: serverTimestamp() });
        }
      });
      setShowLobby(false);
    } catch (e) {
      if (e.message === 'FULL') throw e;
      console.error("Join failed:", e);
    }
  };

  const handleLeaveRoom = async (uid) => {
    if (!uid) return;
    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'meta', 'room');
        const memberRef = doc(db, 'members', uid);
        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists()) {
          transaction.delete(memberRef);
          transaction.update(roomRef, { count: increment(-1) });
        }
      });
    } catch (e) {
      console.error("Leave failed:", e);
    }
  };

  const handlePasscodeSubmit = () => {
    if (passcode === PASSCODE) {
      setIsAuthorized(true);
      localStorage.setItem('enkryx_authorized', 'true');
    } else {
      alert("Incorrect passcode");
    }
  };

  useEffect(() => {
    if (localStorage.getItem('enkryx_authorized') === 'true') setIsAuthorized(true);
  }, []);

  useEffect(() => {
    if (!user || !user.displayName || showLobby) return;
    const interval = setInterval(() => {
      setDoc(doc(db, 'members', user.uid), { lastActive: serverTimestamp() }, { merge: true });
    }, 5000);
    const handleCleanup = () => handleLeaveRoom(user.uid);
    window.addEventListener('beforeunload', handleCleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleCleanup();
    });
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleCleanup);
    };
  }, [user, showLobby]);

  const handleSaveName = async () => {
    if (displayName.trim() && user) {
      localStorage.setItem('team_display_name', displayName);
      await updateProfile(user, { displayName });
      setUser({ ...user, displayName });
      setShowNameModal(false);
      setShowLobby(true);
    }
  };

  const toggleMic = () => {
    if (lobbyStream) {
      const track = lobbyStream.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleVideo = () => {
    if (lobbyStream) {
      const track = lobbyStream.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setVideoOn(track.enabled);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Enkryx</h2>
          <p style={{ marginBottom: '15px' }}>Enter Passcode to Enter Meeting</p>
          <input type="password" placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePasscodeSubmit()} />
          <button className="btn-primary" onClick={handlePasscodeSubmit}>Enter</button>
        </div>
      </div>
    );
  }

  if (meetingFull) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Meeting Full</h2>
          <p>This meeting has reached the 3-user limit.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (showLobby) {
    return (
      <div className="lobby-container">
        <h2>Ready to join?</h2>
        <div className="lobby-preview">
          <video ref={lobbyVideoRef} autoPlay playsInline muted />
          <div className="video-label">{user?.displayName || 'Preview'}</div>
        </div>
        <div className="lobby-controls">
          <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button className={`control-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo}>
            {videoOn ? <Camera size={24} /> : <CameraOff size={24} />}
          </button>
        </div>
        <button className="btn-primary" style={{ padding: '12px 40px' }} onClick={() => handleJoinRoom(user.uid, user.displayName)}>
          Join Meeting
        </button>
      </div>
    );
  }

  if (loading) return <div className="modal-overlay">Loading...</div>;

  return (
    <Router>
      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Welcome to Enkryx</h2>
            <p style={{ marginBottom: '15px' }}>Please enter your display name to continue.</p>
            <input type="text" placeholder="Your Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSaveName()} />
            <button className="btn-primary" onClick={handleSaveName}>Proceed to Lobby</button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={user && user.displayName ? <Room user={user} /> : <div className="modal-overlay">Authenticating...</div>} />
        <Route path="/room" element={<Navigate to="/" />} />
        <Route path="/call" element={user && user.displayName ? <Call user={user} initialMic={micOn} initialVideo={videoOn} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
