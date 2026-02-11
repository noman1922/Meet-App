import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, timestamp } from '../firebase/firebase';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';

const Room = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [onlineCount, setOnlineCount] = useState(1);

    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, 'rooms/main/messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        });

        // Simple online count simulation based on active presence collection
        const presenceQ = query(collection(db, 'presence'));
        const unsubscribePresence = onSnapshot(presenceQ, (snapshot) => {
            const activeUsers = snapshot.docs.filter(doc => doc.data().isOnline);
            setOnlineCount(activeUsers.length);
        });

        return () => {
            unsubscribe();
            unsubscribePresence();
        };
    }, []);

    const handleSendMessage = async (text) => {
        try {
            await addDoc(collection(db, 'rooms/main/messages'), {
                text,
                senderId: user.uid,
                senderName: user.displayName,
                createdAt: timestamp(),
                type: 'text'
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleFileUpload = async (file) => {
        try {
            const storageRef = ref(storage, `files/main/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const fileURL = await getDownloadURL(uploadTask.ref);

            await addDoc(collection(db, 'rooms/main/messages'), {
                text: null,
                senderId: user.uid,
                senderName: user.displayName,
                createdAt: timestamp(),
                type: 'file',
                fileURL,
                fileName: file.name
            });
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Upload failed.");
        }
    };

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Topbar onlineCount={onlineCount} userName={user.displayName} />
                <div className="chat-container">
                    <MessageList messages={messages} currentUserId={user.uid} />
                    <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} />
                </div>
            </div>
        </div>
    );
};

export default Room;
