import React, { useEffect, useState, useRef } from 'react';
import VideoCard from './components/VideoCard';
import BottomNavbar from './components/BottomNavbar';
import TopNavbar from './components/TopNavbar';
import { NextUIProvider } from "@nextui-org/react";
import './App.css';

// This array holds information about different videos
const videoUrls = Array(20).fill({
  url: '/api/random-file?type=video',
  profilePic: '/api/random-file?type=image',
  username: 'csjackie',
  description: 'Lol nvm #compsci #chatgpt #ai #openai #techtok',
  song: 'Original sound - Famed Flames',
  likes: 430,
  comments: 13,
  saves: 23,
  shares: 1,
});

function Main() {
  const [videos, setVideos] = useState([]);
  const videoRefs = useRef([]);

  useEffect(() => {
    setVideos(videoUrls);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.8, // Adjust this value to change the scroll trigger point
    };

    // This function handles the intersection of videos
    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const videoElement = entry.target;
          videoElement.play();
        } else {
          const videoElement = entry.target;
          videoElement.pause();
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // We observe each video reference to trigger play/pause
    videoRefs.current.forEach((videoRef) => {
      observer.observe(videoRef);
    });

    // We disconnect the observer when the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, [videos]);

  // This function handles the reference of each video
  const handleVideoRef = (index) => (ref) => {
    videoRefs.current[index] = ref;
  };

  return (
    <div className="app">
      <div className="container">
        <TopNavbar className="top-navbar" />
        {/* Here we map over the videos array and create VideoCard components */}
        {videos.map((video, index) => (
          <VideoCard
            key={index}
            username={video.username}
            description={video.description}
            song={video.song}
            likes={video.likes}
            saves={video.saves}
            comments={video.comments}
            shares={video.shares}
            url={video.url}
            profilePic={video.profilePic}
            setVideoRef={handleVideoRef(index)}
          />
        ))}
        <BottomNavbar className="bottom-navbar" />
      </div>
    </div>
  );

}

function App() {
  return <NextUIProvider>
    <Main />
  </NextUIProvider>
}

export default App;
