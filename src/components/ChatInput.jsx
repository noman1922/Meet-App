import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

const ChatInput = ({ onSendMessage, onFileUpload }) => {
    const [text, setText] = useState('');
    const fileInputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text);
            setText('');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                alert('File size exceeds 50MB limit.');
                return;
            }
            onFileUpload(file);
        }
    };

    return (
        <div className="chat-input-container">
            <form onSubmit={handleSubmit} className="chat-input-wrapper">
                <button
                    type="button"
                    className="icon-button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <button type="button" className="icon-button">
                    <Smile size={20} />
                </button>

                <button type="submit" className="icon-button" style={{ color: 'var(--accent)' }}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
