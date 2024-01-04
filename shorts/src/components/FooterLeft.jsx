import React from 'react';
import './FooterLeft.css';

export default function FooterLeft(props) {
  const { username, description, song } = props;

  return (
    <div className="footer-container">
      <div className="footer-left">
        <div className="text">
          <h3>@{username}</h3>
          <p>{description}</p>
          <div className="ticker">
            <marquee direction="left" scrollamount="2">
              <span>{song}</span>
            </marquee>
          </div>
        </div>
      </div>
    </div>
  );
}
