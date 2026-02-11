import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, query, where, collection } from 'firebase/firestore';
import { auth, db } from './firebase/firebase';
import Room from './pages/Room';
import Call from './pages/Call';
import './styles/styles.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [meetingFull, setMeetingFull] = useState(false);
  const PASSCODE = "192288";

  useEffect(() => {
    if (!isAuthorized) return;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Check member count
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(query(membersRef, where('isOnline', '==', true)));

        if (snapshot.size >= 3 && !snapshot.docs.some(doc => doc.id === authUser.uid)) {
          setMeetingFull(true);
          await auth.signOut();
          setLoading(false);
          return;
        }

        if (!authUser.displayName) {
          const savedName = localStorage.getItem('team_display_name');
          if (savedName) {
            try {
              await updateProfile(authUser, { displayName: savedName });
              setUser({ ...authUser, displayName: savedName });
              updateMemberStatus(authUser.uid, savedName, true);
            } catch (err) {
              setShowNameModal(true);
            }
          } else {
            setShowNameModal(true);
          }
        }
        setUser(authUser);
        if (authUser.displayName) {
          updateMemberStatus(authUser.uid, authUser.displayName, true);
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

  const updateMemberStatus = async (uid, name, isOnline) => {
    try {
      await setDoc(doc(db, 'members', uid), {
        userId: uid,
        name: name,
        lastActive: serverTimestamp(),
        isOnline: isOnline
      });
      // Also update presence for backward compatibility with Room.jsx
      await setDoc(doc(db, 'presence', uid), {
        userId: uid,
        name: name,
        lastActive: serverTimestamp(),
        isOnline: isOnline
      });
    } catch (e) {
      console.error("Error updating member status:", e);
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
    if (localStorage.getItem('enkryx_authorized') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  // Presence logic
  useEffect(() => {
    if (!user || !user.displayName) return;

    const interval = setInterval(() => {
      updateMemberStatus(user.uid, user.displayName, true);
    }, 20000);

    const handleUnload = () => {
      updateMemberStatus(user.uid, user.displayName, false);
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
      updateMemberStatus(user.uid, displayName, true);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Enkryx</h2>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Enter Passcode to Enter Meeting</p>
          <input
            type="password"
            placeholder="Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
          />
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
          <p style={{ color: 'var(--text-secondary)' }}>This meeting has reached the 3-user limit.</p>
        </div>
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
        <Route
          path="/"
          element={
            user ? (
              user.displayName ? <Room user={user} /> : null
            ) : (
              <div className="modal-overlay">Authenticating...</div>
            )
          }
        />
        <Route path="/room" element={<Navigate to="/" />} />
        <Route
          path="/call"
          element={
            user ? (
              user.displayName ? <Call user={user} /> : <Navigate to="/" />
            ) : (
              <div className="modal-overlay">Authenticating...</div>
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
