import React, { useEffect, useRef, useState } from 'react';
import { db } from '../firebase/firebase';
import {
    collection, doc, setDoc, onSnapshot, getDoc, serverTimestamp, deleteDoc, addDoc
} from 'firebase/firestore';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Signal, SignalLow, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Call = ({ user, initialMic = true, initialVideo = true }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [micOn, setMicOn] = useState(initialMic);
    const [videoOn, setVideoOn] = useState(initialVideo);
    const [activeSpeaker, setActiveSpeaker] = useState(null);
    const [localQuality, setLocalQuality] = useState('good');
    const [reconnecting, setReconnecting] = useState(false);
    const [showConnected, setShowConnected] = useState(false);

    const pcs = useRef({});
    const localVideoRef = useRef(null);
    const joinSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
    const leaveSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2355/2355-preview.mp3'));
    const navigate = useNavigate();

    const servers = {
        iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }],
        iceCandidatePoolSize: 10,
    };

    useEffect(() => {
        const initLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                stream.getAudioTracks()[0].enabled = initialMic;
                stream.getVideoTracks()[0].enabled = initialVideo;
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                return stream;
            } catch (e) {
                console.error("Error accessing media devices:", e);
                return null;
            }
        };

        const startCall = async () => {
            const stream = await initLocalStream();
            if (!stream) return;

            const membersRef = collection(db, 'members');
            const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
                const now = Date.now();
                snapshot.docChanges().forEach(async (change) => {
                    const otherUser = change.doc.data();
                    const otherUid = change.doc.id;
                    if (otherUid === user.uid) return;

                    const lastActive = otherUser.lastActive?.toMillis() || 0;
                    const isGhost = now - lastActive > 12000;

                    if (change.type === 'removed' || isGhost) {
                        if (pcs.current[otherUid]) {
                            leaveSound.current.play().catch(() => { });
                            closePeerConnection(otherUid);
                        }
                    } else if (change.type === 'added' || change.type === 'modified') {
                        if (!pcs.current[otherUid] && user.uid < otherUid) {
                            joinSound.current.play().catch(() => { });
                            createPeerConnection(otherUid, otherUser.name, stream, true);
                        }
                    }
                });
            });

            // Signaling Combined
            const unsubOffers = onSnapshot(collection(db, `calls/${user.uid}/offers`), snap => {
                snap.docChanges().forEach(async c => {
                    if (c.type === 'added') {
                        await handleOffer(c.doc.id, c.doc.data().sdp, c.doc.data().senderName, stream);
                        await deleteDoc(c.doc.ref);
                    }
                });
            });

            const unsubAnswers = onSnapshot(collection(db, `calls/${user.uid}/answers`), snap => {
                snap.docChanges().forEach(async c => {
                    if (c.type === 'added') {
                        const pc = pcs.current[c.doc.id];
                        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(c.doc.data().sdp));
                        await deleteDoc(c.doc.ref);
                    }
                });
            });

            const unsubIce = onSnapshot(collection(db, `calls/${user.uid}/candidates`), snap => {
                snap.docChanges().forEach(async c => {
                    if (c.type === 'added') {
                        const pc = pcs.current[c.doc.data().senderId];
                        if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(c.doc.data().candidate));
                        await deleteDoc(c.doc.ref);
                    }
                });
            });

            const statsInterval = setInterval(async () => {
                let maxAudioLevel = 0;
                let loudestUid = null;
                let isAnyReconnecting = false;

                for (const [uid, pc] of Object.entries(pcs.current)) {
                    const state = pc.iceConnectionState;
                    if (state === 'checking' || state === 'disconnected') isAnyReconnecting = true;

                    const stats = await pc.getStats();
                    let quality = 'good';
                    let audioLevel = 0;

                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp' && report.kind === 'video') {
                            if (report.packetsLost > 10) quality = 'bad';
                            else if (report.packetsLost > 2) quality = 'weak';
                        }
                        if (report.type === 'inbound-rtp' && report.kind === 'audio') audioLevel = report.audioLevel || 0;
                    });

                    if (audioLevel > 0.05 && audioLevel > maxAudioLevel) {
                        maxAudioLevel = audioLevel;
                        loudestUid = uid;
                    }

                    setRemoteStreams(prev => ({ ...prev, [uid]: { ...prev[uid], quality, audioLevel } }));
                }

                if (isAnyReconnecting && !reconnecting) setReconnecting(true);
                else if (!isAnyReconnecting && reconnecting) {
                    setReconnecting(false);
                    setShowConnected(true);
                    setTimeout(() => setShowConnected(false), 3000);
                }

                setActiveSpeaker(loudestUid);
            }, 2000);

            const cleanupInterval = setInterval(() => {
                const now = Date.now();
                Object.keys(pcs.current).forEach(async (uid) => {
                    const snap = await getDoc(doc(db, 'members', uid));
                    if (!snap.exists() || (now - (snap.data().lastActive?.toMillis() || 0) > 12000)) {
                        leaveSound.current.play().catch(() => { });
                        closePeerConnection(uid);
                    }
                });
            }, 5000);

            return () => {
                unsubscribeMembers(); unsubOffers(); unsubAnswers(); unsubIce();
                clearInterval(statsInterval); clearInterval(cleanupInterval);
            };
        };

        startCall();
        return () => {
            if (localStream) localStream.getTracks().forEach(track => track.stop());
            Object.keys(pcs.current).forEach(uid => closePeerConnection(uid));
        };
    }, [user]);

    const createPeerConnection = async (otherUid, otherName, stream, isInitiator) => {
        if (pcs.current[otherUid]) return;
        const pc = new RTCPeerConnection(servers);
        pcs.current[otherUid] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            setRemoteStreams(prev => ({
                ...prev,
                [otherUid]: { ...prev[otherUid], stream: event.streams[0], name: otherName }
            }));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                setDoc(doc(collection(db, `calls/${otherUid}/candidates`)), {
                    candidate: event.candidate.toJSON(),
                    senderId: user.uid
                });
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await setDoc(doc(db, `calls/${otherUid}/offers`, user.uid), { sdp: offer, senderName: user.displayName });
        }
        return pc;
    };

    const handleOffer = async (senderId, offerSdp, senderName, stream) => {
        const pc = await createPeerConnection(senderId, senderName, stream, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await setDoc(doc(db, `calls/${senderId}/answers`, user.uid), { sdp: answer });
        joinSound.current.play().catch(() => { });
    };

    const closePeerConnection = (uid) => {
        if (pcs.current[uid]) { pcs.current[uid].close(); delete pcs.current[uid]; }
        setRemoteStreams(prev => { const n = { ...prev }; delete n[uid]; return n; });
    };

    const toggleMic = () => {
        if (localStream) {
            const t = localStream.getAudioTracks()[0];
            t.enabled = !t.enabled;
            setMicOn(t.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const t = localStream.getVideoTracks()[0];
            t.enabled = !t.enabled;
            setVideoOn(t.enabled);
        }
    };

    const renderVideo = (stream, name, isLocal, uid = null) => {
        const isLoud = activeSpeaker === uid;
        const quality = isLocal ? localQuality : (remoteStreams[uid]?.quality || 'good');

        return (
            <div className={`video-wrapper ${isLocal ? 'local-video' : ''} ${isLoud ? 'speaker-active' : ''}`} key={isLocal ? 'local' : uid}>
                <video
                    ref={isLocal ? localVideoRef : (el) => { if (el && stream) el.srcObject = stream; }}
                    autoPlay playsInline muted={isLocal}
                />
                <div className="video-label">{name} {isLocal ? '(You)' : ''}</div>
                <div className={`network-badge ${quality}`}>
                    {quality === 'good' ? <Signal size={14} /> : quality === 'weak' ? <SignalLow size={14} /> : <AlertCircle size={14} />}
                    <span>{quality}</span>
                </div>
            </div>
        );
    };

    const activeUsersCount = Object.keys(remoteStreams).length + 1;
    const gridClass = activeUsersCount === 1 ? 'one-user' : activeUsersCount === 2 ? 'two-users' : 'three-users';

    return (
        <div className="main-content" style={{ height: '100vh', position: 'relative' }}>
            {reconnecting && (
                <div className="reconnect-banner">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Reconnecting...</span>
                </div>
            )}
            {showConnected && (
                <div className="reconnect-banner connected">
                    <CheckCircle2 size={20} />
                    <span>Connected</span>
                </div>
            )}

            <div className={`video-grid ${gridClass}`}>
                {renderVideo(localStream, user.displayName, true)}
                {Object.entries(remoteStreams).map(([uid, data]) => renderVideo(data.stream, data.name, false, uid))}
            </div>

            <div className="video-controls">
                <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>
                    {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button className={`control-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo}>
                    {videoOn ? <Camera size={24} /> : <CameraOff size={24} />}
                </button>
                <button className="control-btn off" onClick={() => navigate('/')}>
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
};

export default Call;
