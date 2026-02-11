import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase/firebase';
import Room from './pages/Room';
import Call from './pages/Call';
import './styles/styles.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        if (!authUser.displayName) {
          const savedName = localStorage.getItem('team_display_name');
          if (savedName) {
            updateProfile(authUser, { displayName: savedName }).then(() => {
              setUser({ ...authUser, displayName: savedName });
              updatePresence(authUser.uid, savedName, true);
            });
          } else {
            setShowNameModal(true);
          }
        }
        setUser(authUser);
        if (authUser.displayName) {
          updatePresence(authUser.uid, authUser.displayName, true);
        }
      } else {
        signInAnonymously(auth);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence logic
  useEffect(() => {
    if (!user || !user.displayName) return;

    const interval = setInterval(() => {
      updatePresence(user.uid, user.displayName, true);
    }, 20000);

    const handleUnload = () => {
      updatePresence(user.uid, user.displayName, false);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  const updatePresence = async (uid, name, isOnline) => {
    try {
      await setDoc(doc(db, 'presence', uid), {
        userId: uid,
        name: name,
        lastActive: serverTimestamp(),
        isOnline: isOnline
      });
    } catch (e) {
      console.error("Error updating presence:", e);
    }
  };

  const handleSaveName = async () => {
    if (displayName.trim() && user) {
      localStorage.setItem('team_display_name', displayName);
      await updateProfile(user, { displayName });
      setUser({ ...user, displayName });
      setShowNameModal(false);
      updatePresence(user.uid, displayName, true);
    }
  };

  if (loading) return <div className="modal-overlay">Loading...</div>;

  return (
    <Router>
      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Welcome to TeamSpace</h2>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Please enter your display name to continue.</p>
            <input
              type="text"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button className="btn-primary" onClick={handleSaveName}>Join Team</button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={user?.displayName ? <Room user={user} /> : <div className="modal-overlay">Authenticating...</div>} />
        <Route path="/room" element={<Navigate to="/" />} />
        <Route path="/call" element={user?.displayName ? <Call user={user} /> : <div className="modal-overlay">Authenticating...</div>} />
      </Routes>
    </Router>
  );
};

export default App;
