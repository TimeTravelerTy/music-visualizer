const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log('FFmpeg path:', ffmpegPath);
console.log('FFprobe path:', ffprobePath);

const app = express();
const PORT = process.env.PORT || 3001;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/outputs', express.static(path.join(__dirname, '../outputs')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API endpoint for file upload
app.post('/api/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file);
    const filePath = req.file.path;
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Create directories for processed files
    const outputsDir = path.join(__dirname, '../outputs');
    const processedDir = path.join(outputsDir, fileName);
    
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    // Process the audio file
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error analyzing audio:', err);
        return res.status(500).json({ error: 'Error analyzing audio file' });
      }

      console.log('Audio metadata extracted successfully');

      // Extract basic audio information
      const audioInfo = {
        duration: metadata.format.duration,
        bitrate: metadata.format.bit_rate,
        format: metadata.format.format_name,
        channels: metadata.streams[0].channels,
        sampleRate: metadata.streams[0].sample_rate,
        fileUrl: `/api/audio/${req.file.filename}`
      };

      // In the full implementation, here we would:
      // 1. Queue the file for stem separation
      // 2. Analyze the audio for beat detection, mood, etc.
      // 3. Generate visualization data

      // For now, we'll just return the audio info and a visualization placeholder
      res.json({
        success: true,
        message: 'File uploaded and analyzed',
        audioInfo,
        fileName: fileName,
        originalName: req.file.originalname,
        visualizationUrl: `/outputs/${fileName}/visualization.mp4` // This would be the generated visualization
      });
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Server error processing upload' });
  }
});

app.get('/api/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

// In your server/index.js, add this function:
function cleanupFiles() {
    const uploadDir = path.join(__dirname, '../uploads');
    // Keep only files from the last 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);

    fs.readdir(uploadDir, (err, files) => {
        if (err) return console.error('Error reading upload directory:', err);
        
        files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        fs.stat(filePath, (err, stats) => {
            if (err) return console.error('Error getting file stats:', err);
            
            if (stats.mtime.getTime() < cutoffTime) {
            fs.unlink(filePath, err => {
                if (err) return console.error('Error deleting file:', err);
                console.log('Deleted old file:', file);
            });
            }
        });
        });
    });
}
  
// Run cleanup on server start and every 6 hours
cleanupFiles();
setInterval(cleanupFiles, 6 * 60 * 60 * 1000);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});