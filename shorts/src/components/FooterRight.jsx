import React, { useState } from 'react';
import './FooterRight.css';

function FooterRight({ likes, comments, saves, shares, profilePic }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // Function to convert likes count to a number
  const parseLikesCount = (count) => {
    if (typeof count === 'string') {
      if (count.endsWith('K')) {
        return parseFloat(count) * 1000;
      }
      return parseInt(count);
    }
    return count;
  };

  // Function to format likes count
  const formatLikesCount = (count) => {
    if (count >= 10000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count;
  };

  const handleLikeClick = () => {
    setLiked((prevLiked) => !prevLiked);
  };

  return (
    <div className="footer-right">
      <div className="sidebar-icon">
        {profilePic ? (
          // Displaying the user profile picture
          <img src={profilePic} className='userprofile' alt='Profile' style={{ width: '45px', height: '45px', color: '#616161' }} />
        ) : null}
      </div>
      <div className="sidebar-icon">
        {/* The heart icon for liking */}
        {/* Displaying the formatted likes count */}
        <p>{formatLikesCount(parseLikesCount(likes) + (liked ? 1 : 0))}</p>
      </div>
      <div className="sidebar-icon">
        {/* The comment icon */}
        {/* Displaying the number of comments */}
        <p>{comments}</p>
      </div>
      <div className="sidebar-icon">
        {/* Displaying the number of saves */}
        <p>{saved ? saves + 1 : saves}</p>
      </div>
      <div className="sidebar-icon">
        {/* The share icon */}
        {/* Displaying the number of shares */}
        <p>{shares}</p>
      </div>
      <div className="sidebar-icon record">
        {/* Displaying the record icon */}
        <img src="https://static.thenounproject.com/png/934821-200.png" alt='Record Icon' />
      </div>
    </div>
  );
}

export default FooterRight;
