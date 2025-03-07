import React, { useRef, useEffect } from 'react';
import './CosmicVisualizer.css';

const CosmicVisualizer = ({ audioContext, analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Setup canvas and visualization
  useEffect(() => {
    if (!canvasRef.current || !analyser) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Create data array for frequency analysis
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Stars background
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
    
    // Create musician objects
    const musicians = [
      { 
        type: 'vocalist', 
        x: canvas.width * 0.5, 
        y: canvas.height * 0.4,
        color: '#ff9ed8',
        freqRange: [300, 2000], // Vocal frequency range
        animationPhase: 0,
        scale: 1.0
      },
      { 
        type: 'guitarist', 
        x: canvas.width * 0.3, 
        y: canvas.height * 0.5,
        color: '#5ee7df',
        freqRange: [80, 300],  // Guitar frequency range
        animationPhase: 0,
        scale: 0.8
      },
      { 
        type: 'drummer', 
        x: canvas.width * 0.7, 
        y: canvas.height * 0.55,
        color: '#b6a4ff',
        freqRange: [0, 150],   // Drum frequency range
        animationPhase: 0,
        scale: 0.8
      },
      { 
        type: 'bassist', 
        x: canvas.width * 0.8, 
        y: canvas.height * 0.45,
        color: '#42c9ff',
        freqRange: [40, 200],  // Bass frequency range
        animationPhase: 0,
        scale: 0.8
      }
    ];
    
    // Function to draw a single musician
    function drawMusician(musician, energy) {
      const { x, y, color, type, scale } = musician;
      const glowAmount = Math.min(energy * 0.3, 0.6);
      const moveAmount = energy * 5;
      
      // Save context state
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      
      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + (glowAmount * 30);
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.lineWidth = 2;
      
      // Draw musician based on type
      switch(type) {
        case 'vocalist':
          // Head
          ctx.beginPath();
          ctx.ellipse(0, -45, 15, 20, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Body
          ctx.beginPath();
          ctx.moveTo(-15, -25);
          ctx.lineTo(-15, 30);
          ctx.lineTo(15, 30);
          ctx.lineTo(15, -25);
          ctx.stroke();
          
          // Arms
          ctx.beginPath();
          ctx.moveTo(-15, 0);
          ctx.lineTo(-30 - moveAmount, -15 + Math.sin(musician.animationPhase) * 5);
          ctx.moveTo(15, 0);
          ctx.lineTo(30 + moveAmount, -15 + Math.cos(musician.animationPhase) * 5);
          ctx.stroke();
          
          // Legs
          ctx.beginPath();
          ctx.moveTo(-15, 30);
          ctx.lineTo(-20, 80);
          ctx.moveTo(15, 30);
          ctx.lineTo(20, 80);
          ctx.stroke();
          
          // Mouth (lip-sync)
          ctx.beginPath();
          const mouthOpen = Math.min(energy * 15, 10);
          ctx.moveTo(-8, -40);
          ctx.quadraticCurveTo(0, -40 + mouthOpen, 8, -40);
          ctx.stroke();
          break;
          
        case 'guitarist':
          // Head
          ctx.beginPath();
          ctx.ellipse(0, -45, 12, 16, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Body
          ctx.beginPath();
          ctx.moveTo(-12, -29);
          ctx.lineTo(-12, 20);
          ctx.lineTo(12, 20);
          ctx.lineTo(12, -29);
          ctx.stroke();
          
          // Guitar arm position changing with energy
          const guitarPos = -10 + (Math.sin(musician.animationPhase) * moveAmount);
          
          // Arms & Guitar
          ctx.beginPath();
          ctx.moveTo(-12, -10);
          ctx.lineTo(-30, guitarPos);
          ctx.lineTo(40, guitarPos + 50);
          ctx.moveTo(12, -10);
          ctx.lineTo(20, guitarPos + 10);
          ctx.stroke();
          
          // Guitar body
          ctx.beginPath();
          ctx.ellipse(20, guitarPos + 40, 15, 20, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Legs
          ctx.beginPath();
          ctx.moveTo(-12, 20);
          ctx.lineTo(-16, 60);
          ctx.moveTo(12, 20);
          ctx.lineTo(16, 60);
          ctx.stroke();
          break;
          
        case 'drummer':
          // Head
          ctx.beginPath();
          ctx.ellipse(0, -45, 12, 16, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Body
          ctx.beginPath();
          ctx.moveTo(-12, -29);
          ctx.lineTo(-12, 20);
          ctx.lineTo(12, 20);
          ctx.lineTo(12, -29);
          ctx.stroke();
          
          // Drum sticks moving with energy
          const stickPos = Math.sin(musician.animationPhase) * moveAmount;
          
          // Arms
          ctx.beginPath();
          ctx.moveTo(-12, -10);
          ctx.lineTo(-25, -15 + stickPos);
          ctx.moveTo(12, -10);
          ctx.lineTo(25, -15 - stickPos);
          ctx.stroke();
          
          // Drums
          ctx.beginPath();
          ctx.ellipse(-20, 0, 15, 10, 0, 0, 2 * Math.PI);
          ctx.ellipse(20, 10, 15, 10, 0, 0, 2 * Math.PI);
          ctx.ellipse(0, -10, 10, 5, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Legs
          ctx.beginPath();
          ctx.moveTo(-12, 20);
          ctx.lineTo(-16, 40);
          ctx.moveTo(12, 20);
          ctx.lineTo(16, 40);
          ctx.stroke();
          break;
          
        case 'bassist':
          // Head
          ctx.beginPath();
          ctx.ellipse(0, -45, 12, 16, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Body
          ctx.beginPath();
          ctx.moveTo(-12, -29);
          ctx.lineTo(-12, 20);
          ctx.lineTo(12, 20);
          ctx.lineTo(12, -29);
          ctx.stroke();
          
          // Bass position changing with energy
          const bassPos = -10 + (Math.sin(musician.animationPhase) * moveAmount);
          
          // Arms & Bass
          ctx.beginPath();
          ctx.moveTo(-12, -10);
          ctx.lineTo(-25, bassPos);
          ctx.lineTo(40, bassPos + 40);
          ctx.moveTo(12, -10);
          ctx.lineTo(20, bassPos + 15);
          ctx.stroke();
          
          // Bass body
          ctx.beginPath();
          ctx.ellipse(20, bassPos + 30, 18, 22, 0, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Legs
          ctx.beginPath();
          ctx.moveTo(-12, 20);
          ctx.lineTo(-16, 60);
          ctx.moveTo(12, 20);
          ctx.lineTo(16, 60);
          ctx.stroke();
          break;
      }
      
      // Restore context state
      ctx.restore();
    }
    
    // Animation function
    const animate = () => {
      if (!canvas || !ctx || !isPlaying) {
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw deep space background
      ctx.fillStyle = '#050216';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw nebula
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(42, 8, 69, 0.3)');
      gradient.addColorStop(0.5, 'rgba(19, 2, 48, 0.2)');
      gradient.addColorStop(1, 'rgba(5, 2, 22, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw stars
      stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Get audio data
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate energy for each frequency range
      musicians.forEach(musician => {
        const [lowFreq, highFreq] = musician.freqRange;
        
        // Map frequency range to array indices
        const lowIndex = Math.floor(lowFreq / (22050 / bufferLength));
        const highIndex = Math.floor(highFreq / (22050 / bufferLength));
        
        // Calculate average energy in the range
        let total = 0;
        for (let i = lowIndex; i < highIndex && i < dataArray.length; i++) {
          total += dataArray[i];
        }
        
        const avgEnergy = total / (highIndex - lowIndex) / 255;
        
        // Update animation phase based on energy
        musician.animationPhase += 0.1 + avgEnergy * 0.3;
        
        // Draw the musician
        drawMusician(musician, avgEnergy);
      });
      
      // Draw audio waves
      ctx.beginPath();
      ctx.strokeStyle = '#9c4dcc';
      ctx.lineWidth = 2;
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start/stop animation
    if (isPlaying) {
      animate();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);
  
  return (
    <div className="cosmic-visualizer">
      <canvas ref={canvasRef} width="800" height="400" />
    </div>
  );
};

export default CosmicVisualizer;