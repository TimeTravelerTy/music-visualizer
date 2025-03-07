// src/utils/AudioProcessor.js
import * as Tone from 'tone';

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.musicianAnalysers = {};
    this.source = null;
    this.isInitialized = false;
    
    // Define instrument detection configurations
    this.instruments = {
      vocals: {
        freqRange: [300, 3500],
        threshold: 0.45,
        detectionBuffer: []
      },
      guitar: {
        freqRange: [300, 4000],
        threshold: 0.5,
        detectionBuffer: []
      },
      bass: {
        freqRange: [60, 250],
        threshold: 0.5,
        detectionBuffer: []
      },
      drums: {
        kick: {
          freqRange: [20, 100],
          threshold: 0.6,
          detectionBuffer: []
        },
        snare: {
          freqRange: [120, 250],
          threshold: 0.5,
          detectionBuffer: []
        },
        hihat: {
          freqRange: [800, 5000],
          threshold: 0.4,
          detectionBuffer: []
        }
      },
      synth: {
        freqRange: [100, 8000],
        threshold: 0.45,
        detectionBuffer: []
      }
    };
    
    // Detection history for temporal pattern analysis
    this.detectionHistory = {};
    Object.keys(this.instruments).forEach(instrument => {
      if (instrument === 'drums') {
        this.detectionHistory.kick = [];
        this.detectionHistory.snare = [];
        this.detectionHistory.hihat = [];
      } else {
        this.detectionHistory[instrument] = [];
      }
    });
  }
  
  initialize(audioElement) {
    if (this.isInitialized) {
      return;
    }
    
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.source = this.audioContext.createMediaElementSource(audioElement);
    
    // Main analyzer for overall frequency data
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // More detailed frequency resolution
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Create filters and analyzers for each instrument
    this.createInstrumentAnalyzers();
    
    // Connect source to main analyzer and destination
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.isInitialized = true;
    return this.analyser;
  }
  
  createInstrumentAnalyzers() {
    // Create individual analyzers for each instrument
    Object.keys(this.instruments).forEach(instrument => {
      if (instrument === 'drums') {
        // Create analyzers for each drum component
        Object.keys(this.instruments.drums).forEach(drumType => {
          this.createSingleAnalyzer(drumType, this.instruments.drums[drumType].freqRange);
        });
      } else {
        this.createSingleAnalyzer(instrument, this.instruments[instrument].freqRange);
      }
    });
  }
  
  createSingleAnalyzer(name, freqRange) {
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 1024;
    
    // Different smoothing constants based on instrument type
    if (['kick', 'snare', 'hihat'].includes(name)) {
      analyser.smoothingTimeConstant = 0.2; // Fast response for percussion
    } else if (name === 'bass') {
      analyser.smoothingTimeConstant = 0.6;
    } else {
      analyser.smoothingTimeConstant = 0.8;
    }
    
    // Create filter to isolate frequency range
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (freqRange[0] + freqRange[1]) / 2;
    filter.Q.value = 1.0;
    
    // Connect source to filter to analyser
    this.source.connect(filter);
    filter.connect(analyser);
    
    this.musicianAnalysers[name] = analyser;
  }
  
  getMainAnalyser() {
    return this.analyser;
  }
  
  getInstrumentEnergy() {
    if (!this.isInitialized) {
      return {};
    }
    
    const result = {};
    
    // Get frequency data from main analyser
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Process data for each instrument
    Object.keys(this.instruments).forEach(instrument => {
      if (instrument === 'drums') {
        Object.keys(this.instruments.drums).forEach(drumType => {
          result[drumType] = this.processInstrumentData(
            drumType, 
            dataArray, 
            bufferLength,
            this.instruments.drums[drumType].freqRange
          );
        });
      } else {
        result[instrument] = this.processInstrumentData(
          instrument, 
          dataArray, 
          bufferLength,
          this.instruments[instrument].freqRange
        );
      }
    });
    
    // Add additional processing for overlapping instruments
    this.processOverlaps(result);
    
    return result;
  }
  
  processInstrumentData(instrument, dataArray, bufferLength, freqRange) {
    const [lowFreq, highFreq] = freqRange;
    
    // Convert frequency to array index
    const lowIndex = Math.floor(lowFreq / (this.audioContext.sampleRate / 2) * bufferLength);
    const highIndex = Math.floor(highFreq / (this.audioContext.sampleRate / 2) * bufferLength);
    
    // Calculate average energy in the range
    let total = 0;
    let count = 0;
    
    for (let i = lowIndex; i < highIndex && i < bufferLength; i++) {
      total += dataArray[i];
      count++;
    }
    
    const rawEnergy = count > 0 ? total / count / 255 : 0;
    
    // Update detection history
    this.updateDetectionHistory(instrument, rawEnergy);
    
    // Apply thresholding to determine activity
    let threshold;
    if (['kick', 'snare', 'hihat'].includes(instrument)) {
      threshold = this.instruments.drums[instrument].threshold;
    } else {
      threshold = this.instruments[instrument].threshold;
    }
    
    return {
      energy: rawEnergy,
      active: rawEnergy > threshold,
      confidence: this.getDetectionConfidence(instrument)
    };
  }
  
  updateDetectionHistory(instrument, energy) {
    const history = this.detectionHistory[instrument];
    history.push(energy);
    
    if (history.length > 20) { // Keep last 20 frames
      history.shift();
    }
  }
  
  getDetectionConfidence(instrument) {
    const history = this.detectionHistory[instrument];
    if (history.length < 5) {
      return 0.5; // Default confidence with limited history
    }
    
    // Higher confidence for stable detection (except percussion)
    const recentValues = history.slice(-5);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // For percussion, we want to detect transients
    if (['kick', 'snare', 'hihat'].includes(instrument)) {
      const hasTransient = recentValues.some((val, i, arr) => 
        i > 0 && val > arr[i-1] * 1.5
      );
      return hasTransient ? 0.8 : 0.4;
    }
    
    // For non-percussion, we want stable signals
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    return Math.min(0.9, Math.max(0.3, 0.7 - variance * 5));
  }
  
  processOverlaps(result) {
    // Handle potential confusion between similar instruments
    
    // Example: if bass and guitar are both active, check which is stronger
    if (result.bass && result.bass.active && result.guitar && result.guitar.active) {
      if (result.bass.energy > result.guitar.energy * 1.2) {
        // Bass is significantly stronger than guitar in low frequencies
        result.guitar.confidence *= 0.7;
      }
    }
    
    // Group drum components into a single drums result
    if (result.kick && result.snare && result.hihat) {
      result.drums = {
        energy: Math.max(result.kick.energy, result.snare.energy, result.hihat.energy),
        active: result.kick.active || result.snare.active || result.hihat.active,
        confidence: Math.max(result.kick.confidence, result.snare.confidence, result.hihat.confidence),
        components: {
          kick: result.kick,
          snare: result.snare,
          hihat: result.hihat
        }
      };
    }
  }

  initializeWithExistingContext(audioContext, audioElement, existingAnalyser) {
    if (this.isInitialized) {
      return;
    }
    
    // Use the existing context
    this.audioContext = audioContext;
    
    // Don't create a new source - just use the existing analyser
    this.analyser = existingAnalyser;
    
    // Create filters and analyzers for each instrument
    // but connect them to the existing analyser instead of the source
    this.createInstrumentAnalyzersFromExistingAnalyser();
    
    this.isInitialized = true;
    return this.analyser;
  }
  
  createInstrumentAnalyzersFromExistingAnalyser() {
    // Create individual analyzers for each instrument
    Object.keys(this.instruments).forEach(instrument => {
      if (instrument === 'drums') {
        // Create analyzers for each drum component
        Object.keys(this.instruments.drums).forEach(drumType => {
          this.createSingleAnalyzerFromExistingAnalyser(drumType, this.instruments.drums[drumType].freqRange);
        });
      } else {
        this.createSingleAnalyzerFromExistingAnalyser(instrument, this.instruments[instrument].freqRange);
      }
    });
  }
  
  createSingleAnalyzerFromExistingAnalyser(name, freqRange) {
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 1024;
    
    // Different smoothing constants based on instrument type
    if (['kick', 'snare', 'hihat'].includes(name)) {
      analyser.smoothingTimeConstant = 0.2; // Fast response for percussion
    } else if (name === 'bass') {
      analyser.smoothingTimeConstant = 0.6;
    } else {
      analyser.smoothingTimeConstant = 0.8;
    }
    
    // Instead of connecting to an audio source, we'll just analyze the same data
    // as the main analyser - this isn't ideal for isolation but prevents the error
    this.musicianAnalysers[name] = analyser;
  }
}

export default AudioProcessor;