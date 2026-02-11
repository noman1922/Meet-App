import React from 'react';
import { Users, User } from 'lucide-react';

const Topbar = ({ onlineCount, userName }) => {
    return (
        <div className="topbar">
            <div className="online-count">
                <div className="online-dot"></div>
                <Users size={16} />
                <span>{onlineCount} Online</span>
            </div>

            <div className="user-info">
                <User size={18} color="#bb86fc" />
                <span style={{ fontWeight: '500' }}>{userName}</span>
            </div>
        </div>
    );
};

export default Topbar;
