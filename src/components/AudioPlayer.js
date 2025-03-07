import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';
import CosmicVisualizer from './CosmicVisualizer';

const AudioPlayer = ({ audioUrl, audioInfo }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioUrl) return;

    const initAudio = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const analyzerNode = context.createAnalyser();
      analyzerNode.fftSize = 256;
      
      setAudioContext(context);
      setAnalyser(analyzerNode);
      
      // Connect audio nodes
      const audioElement = audioRef.current;
      const source = context.createMediaElementSource(audioElement);
      source.connect(analyzerNode);
      analyzerNode.connect(context.destination);
    };

    if (audioRef.current) {
      initAudio();
      
      // Set up duration and time update listeners
      const audio = audioRef.current;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
    }
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      
      // Resume audio context if it's suspended
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e) => {
    const seekPosition = e.target.value;
    if (audioRef.current) {
      audioRef.current.currentTime = seekPosition;
      setCurrentTime(seekPosition);
    }
  };

  return (
    <div className="audio-player">
      <CosmicVisualizer 
        audioContext={audioContext} 
        analyser={analyser} 
        isPlaying={isPlaying} 
      />
      
      <div className="audio-controls">
        <button className="control-button" onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <div className="timeline">
          <span className="time-display">{formatTime(currentTime)}</span>
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            value={currentTime} 
            onChange={handleSeek}
            className="seek-slider"
          />
          <span className="time-display">{formatTime(duration)}</span>
        </div>
        
        <div className="audio-info-display">
          <div className="song-info">
            {audioInfo && (
              <span>{audioInfo.originalName || 'Unknown Track'}</span>
            )}
          </div>
        </div>
      </div>
      
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;