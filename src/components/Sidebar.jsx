import React from 'react';
import { MessageSquare, Video, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const startMeeting = () => {
    window.open('/call', '_blank');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-title">TeamSpace</div>
      
      <NavLink to="/" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
        <MessageSquare size={20} />
        <span>Team Room</span>
      </NavLink>

      <button className="btn-start-meeting" onClick={startMeeting}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Video size={20} />
          <span>Start Meeting</span>
        </div>
      </button>
    </div>
  );
};

export default Sidebar;
