import React from 'react';
import { FileText, Download } from 'lucide-react';

const MessageItem = ({ message, isOwn }) => {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isImage = (fileName) => {
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
    };

    return (
        <div className={`message-item ${isOwn ? 'own' : ''}`}>
            {!isOwn && <div className="sender-name">{message.senderName}</div>}
            <div className="message-bubble">
                {message.type === 'text' && <div>{message.text}</div>}

                {message.type === 'file' && (
                    <div className="file-content">
                        {isImage(message.fileName) ? (
                            <div className="file-preview">
                                <img src={message.fileURL} alt={message.fileName} loading="lazy" />
                            </div>
                        ) : (
                            <div className="file-attachment">
                                <FileText size={20} />
                                <span style={{ fontSize: '0.9rem', flex: 1 }}>{message.fileName}</span>
                                <a href={message.fileURL} target="_blank" rel="noopener noreferrer" className="icon-button">
                                    <Download size={18} />
                                </a>
                            </div>
                        )}
                    </div>
                )}
                <div className="message-header" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                    <div className="message-time">{formatTime(message.createdAt)}</div>
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
