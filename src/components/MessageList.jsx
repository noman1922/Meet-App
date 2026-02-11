import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';

const MessageList = ({ messages, currentUserId }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="message-list" ref={scrollRef}>
            {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px' }}>
                    No messages yet. Start the conversation!
                </div>
            )}
            {messages.map((msg) => (
                <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === currentUserId}
                />
            ))}
        </div>
    );
};

export default MessageList;
