// server/audioProcessor.js
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class AudioProcessor {
  constructor() {
    this.outputsDir = path.join(__dirname, '../outputs');
    
    // Ensure outputs directory exists
    if (!fs.existsSync(this.outputsDir)) {
      fs.mkdirSync(this.outputsDir, { recursive: true });
    }
  }

  // Process uploaded audio file
  async processAudio(filePath, fileName) {
    try {
      // Create directory for this file's outputs
      const fileOutputDir = path.join(this.outputsDir, fileName);
      if (!fs.existsSync(fileOutputDir)) {
        fs.mkdirSync(fileOutputDir, { recursive: true });
      }

      // Extract audio metadata
      const metadata = await this.getAudioMetadata(filePath);
      
      // Perform frequency band analysis
      const frequencyBands = await this.analyzeFrequencyBands(filePath, fileOutputDir);
      
      // Try to separate audio stems if possible
      let stems = null;
      try {
        stems = await this.separateStems(filePath, fileOutputDir);
      } catch (err) {
        console.warn('Stem separation failed:', err.message);
        // Continue without stems
      }
      
      // Detect dominant instruments based on frequency analysis
      const instrumentDetection = this.detectInstruments(frequencyBands, stems);
      
      // Create complete analysis result
      const analysisResult = {
        metadata,
        frequencyBands,
        stems,
        instrumentDetection
      };
      
      // Save analysis to JSON file
      const analysisPath = path.join(fileOutputDir, 'analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify(analysisResult, null, 2));
      
      return {
        success: true,
        analysisResult,
        analysisPath: `/outputs/${fileName}/analysis.json`
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract audio metadata using ffprobe
  getAudioMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        
        const audioInfo = {
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          channels: metadata.streams[0].channels,
          sampleRate: metadata.streams[0].sample_rate
        };
        
        resolve(audioInfo);
      });
    });
  }

  // Analyze frequency bands
  analyzeFrequencyBands(filePath, outputDir) {
    return new Promise((resolve, reject) => {
      // Define frequency bands for analysis
      const bands = [
        { name: 'sub_bass', range: [20, 60] },
        { name: 'bass', range: [60, 250] },
        { name: 'low_mids', range: [250, 500] },
        { name: 'mids', range: [500, 2000] },
        { name: 'high_mids', range: [2000, 4000] },
        { name: 'highs', range: [4000, 20000] }
      ];
      
      const bandPromises = bands.map(band => {
        return this.analyzeFrequencyBand(filePath, outputDir, band);
      });
      
      Promise.all(bandPromises)
        .then(results => {
          // Combine band results
          const bandResults = {};
          results.forEach((result, index) => {
            bandResults[bands[index].name] = result;
          });
          
          resolve(bandResults);
        })
        .catch(reject);
    });
  }

  // Analyze a specific frequency band
  analyzeFrequencyBand(filePath, outputDir, band) {
    return new Promise((resolve, reject) => {
      const outputFile = path.join(outputDir, `${band.name}.wav`);
      
      // Use bandpass filter to isolate frequency band
      ffmpeg(filePath)
        .audioFilters(`bandpass=f=${(band.range[0] + band.range[1]) / 2}:width_type=h:width=${band.range[1] - band.range[0]}`)
        .output(outputFile)
        .on('error', reject)
        .on('end', () => {
          // Analyze the filtered audio for RMS energy
          ffmpeg.ffprobe(outputFile, (err, metadata) => {
            if (err) return reject(err);
            
            // In a real implementation, calculate more detailed metrics
            // For this example, we'll use a simplified approach
            resolve({
              range: band.range,
              energy: Math.random() * 0.5 + 0.5, // Placeholder for actual energy calculation
              significance: Math.random() * 0.5 + 0.5 // Placeholder for significance calculation
            });
          });
        })
        .run();
    });
  }

  // Separate audio into stems (requires external tools)
  separateStems(filePath, outputDir) {
    return new Promise((resolve, reject) => {
      // Create stems directory
      const stemsDir = path.join(outputDir, 'stems');
      if (!fs.existsSync(stemsDir)) {
        fs.mkdirSync(stemsDir, { recursive: true });
      }

      // Check if we have spleeter available
      const hasSpleeter = this.checkForSpleeter();
      
      if (hasSpleeter) {
        // Use spleeter for professional-quality separation
        this.useSpleeterForSeparation(filePath, stemsDir)
          .then(stemPaths => resolve(stemPaths))
          .catch(err => {
            console.warn('Spleeter failed, falling back to basic separation:', err);
            this.useBasicSeparation(filePath, stemsDir)
              .then(resolve)
              .catch(reject);
          });
      } else {
        // Use basic FFmpeg-based frequency separation as fallback
        this.useBasicSeparation(filePath, stemsDir)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  // Check if Spleeter is available
  checkForSpleeter() {
    try {
      // Try spawning spleeter process to check if it exists
      const result = spawn('python', ['-c', 'import spleeter']);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Use Spleeter for high-quality source separation
  useSpleeterForSeparation(filePath, outputDir) {
    return new Promise((resolve, reject) => {
      const process = spawn('python', [
        '-m', 'spleeter', 'separate',
        '-p', 'spleeter:4stems',
        '-o', outputDir,
        filePath
      ]);
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Spleeter failed with code ${code}: ${stderr}`));
        }
        
        // Get stem file paths
        const fileBase = path.basename(filePath, path.extname(filePath));
        const stemDir = path.join(outputDir, fileBase);
        
        const stems = {
          vocals: `/outputs/stems/${fileBase}/vocals.wav`,
          drums: `/outputs/stems/${fileBase}/drums.wav`,
          bass: `/outputs/stems/${fileBase}/bass.wav`,
          other: `/outputs/stems/${fileBase}/other.wav`
        };
        
        resolve(stems);
      });
    });
  }

  // Basic frequency-based separation with FFmpeg
  useBasicSeparation(filePath, outputDir) {
    return new Promise((resolve, reject) => {
      // Define basic stem types with frequency filters
      const stemTypes = [
        { name: 'vocals', filter: 'bandpass=f=1000:width_type=h:width=2000' },
        { name: 'drums', filter: 'bandpass=f=300:width_type=h:width=600' },
        { name: 'bass', filter: 'lowpass=f=250' },
        { name: 'other', filter: 'bandreject=f=1000:width_type=h:width=2000' }
      ];
      
      const fileBase = path.basename(filePath, path.extname(filePath));
      const stems = {};
      
      const stemPromises = stemTypes.map(stem => {
        return new Promise((resolve, reject) => {
          const outputFile = path.join(outputDir, `${stem.name}.wav`);
          
          ffmpeg(filePath)
            .audioFilters(stem.filter)
            .output(outputFile)
            .on('error', reject)
            .on('end', () => {
              stems[stem.name] = `/outputs/stems/${fileBase}/${stem.name}.wav`;
              resolve();
            })
            .run();
        });
      });
      
      Promise.all(stemPromises)
        .then(() => resolve(stems))
        .catch(reject);
    });
  }

  // Detect instruments based on frequency analysis
  detectInstruments(frequencyBands, stems) {
    // Simple rule-based detection
    const detection = {
      vocals: { detected: false, confidence: 0 },
      guitar: { detected: false, confidence: 0 },
      bass: { detected: false, confidence: 0 },
      drums: { detected: false, confidence: 0 },
      synth: { detected: false, confidence: 0 },
      piano: { detected: false, confidence: 0 }
    };
    
    // Bass detection
    if (frequencyBands.bass.energy > 0.6) {
      detection.bass.detected = true;
      detection.bass.confidence = frequencyBands.bass.energy;
    }
    
    // Drum detection (based on transients in low and high bands)
    if (frequencyBands.sub_bass.energy > 0.6 || frequencyBands.highs.energy > 0.7) {
      detection.drums.detected = true;
      detection.drums.confidence = Math.max(frequencyBands.sub_bass.energy, frequencyBands.highs.energy);
    }
    
    // Vocal detection (prominent mid frequencies)
    if (frequencyBands.mids.energy > 0.7) {
      detection.vocals.detected = true;
      detection.vocals.confidence = frequencyBands.mids.energy;
    }
    
    // Guitar detection (mid to high-mid range)
    if (frequencyBands.low_mids.energy > 0.6 && frequencyBands.mids.energy > 0.5) {
      detection.guitar.detected = true;
      detection.guitar.confidence = (frequencyBands.low_mids.energy + frequencyBands.mids.energy) / 2;
    }
    
    // Synth detection (varies, but often has distinctive high frequencies)
    if (frequencyBands.high_mids.energy > 0.7 && frequencyBands.highs.energy > 0.6) {
      detection.synth.detected = true;
      detection.synth.confidence = (frequencyBands.high_mids.energy + frequencyBands.highs.energy) / 2;
    }
    
    // In a real implementation, you'd use more sophisticated analysis and possibly ML
    
    return detection;
  }
}

module.exports = new AudioProcessor();