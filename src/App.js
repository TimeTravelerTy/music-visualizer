import React, { useState } from 'react';
import './App.css';
import AudioPlayer from './components/AudioPlayer';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [audioInfo, setAudioInfo] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('audioFile', selectedFile);

    setUploading(true);
    setUploadStatus('Uploading file...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus('File uploaded successfully!');
        setAudioInfo(data.audioInfo);
        setAudioUrl(data.audioInfo.fileUrl);
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cosmic Music Visualizer</h1>
        <p>Upload your music to create a unique visualization with virtual musicians</p>
      </header>

      <main className="app-main">
        <div className="upload-section">
          <div className="file-input-container">
            <input
              type="file"
              id="file-upload"
              accept="audio/*"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="file-upload" className="file-label">
              {selectedFile ? selectedFile.name : 'Choose an audio file'}
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="upload-button"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>

          {uploadStatus && (
            <div className="status-message">
              {uploadStatus}
            </div>
          )}
        </div>

        {audioUrl && (
          <AudioPlayer 
            audioUrl={audioUrl} 
            audioInfo={{
              originalName: selectedFile ? selectedFile.name : 'Unknown Track',
              ...audioInfo,
              instrumentDetection: uploadStatus?.instrumentDetection
            }} 
          />
        )}

        {audioInfo && !audioUrl && (
          <div className="audio-info">
            <h2>Audio Information</h2>
            <ul>
              <li>Duration: {Math.round(audioInfo.duration)} seconds</li>
              <li>Bitrate: {Math.round(audioInfo.bitrate / 1000)} kbps</li>
              <li>Format: {audioInfo.format}</li>
              <li>Channels: {audioInfo.channels}</li>
              <li>Sample Rate: {audioInfo.sampleRate} Hz</li>
            </ul>
            <p>Your visualization is being processed. This may take some time...</p>
            <div className="processing-visualization">
              <div className="processing-indicator"></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;