import React from 'react';

function BottomNavbar() {
  return (
      <div className="bottom-navbar">
        <div className="nav-item">
          <span className="item-name active">Home</span>
        </div>
        <div className="nav-item">
          <span className="item-name">Friends</span>
        </div>
        <div className="nav-item">
          <span className="item-name">Create</span>
        </div>
        <div className="nav-item">
          <span className="item-name">Inbox</span>
        </div>
        <div className="nav-item">
          <span className="item-name">Profile</span>
        </div>
      </div>
  );
}

export default BottomNavbar;
