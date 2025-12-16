import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UPLOAD_TAUNTS } from '../constants';
import { AudioController } from '../utils/audio';
import { Button } from './Button';

interface SisypheanUploadGameProps {
  onBack: () => void;
}

export const SisypheanUploadGame: React.FC<SisypheanUploadGameProps> = ({ onBack }) => {
  const [progress, setProgress] = useState(0);
  const [heat, setHeat] = useState(0);
  const [status, setStatus] = useState("WAITING_FOR_INPUT");
  const [isOverheated, setIsOverheated] = useState(false);
  const [isFakeWinning, setIsFakeWinning] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeTaunt, setActiveTaunt] = useState<string | null>(null);
  
  // Refs for loop state
  const isHoldingRef = useRef(false);
  const progressRef = useRef(0);
  const heatRef = useRef(0);
  const lastPacketLossRef = useRef(Date.now());
  const overheatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 99.99% ceiling
  const MAX_PROGRESS = 99.99;

  useEffect(() => {
    return () => {
      AudioController.instance.stopUploadHum();
    };
  }, []);

  const triggerTaunt = () => {
    const msg = UPLOAD_TAUNTS[Math.floor(Math.random() * UPLOAD_TAUNTS.length)];
    // Log to status just in case
    setStatus(`ERROR: ${msg}`);
    
    // Activate visual Jumpscare
    setActiveTaunt(msg);
    AudioController.instance.playTauntScare();

    // Clear after 2 seconds
    setTimeout(() => {
        setActiveTaunt(null);
    }, 2000);
  };

  const packetLoss = () => {
    const loss = Math.random() * 15 + 5; // Lose 5-20%
    progressRef.current = Math.max(0, progressRef.current - loss);
    setProgress(progressRef.current);
    
    setShake(true);
    setTimeout(() => setShake(false), 500);
    
    AudioController.instance.playError();
    setStatus("⚠ PACKET LOSS DETECTED ⚠");
  };

  const handleOverheat = () => {
    isHoldingRef.current = false;
    setIsOverheated(true);
    AudioController.instance.stopUploadHum();
    AudioController.instance.playError();
    setStatus("SYSTEM OVERHEAT! COOLDOWN REQUIRED");
    
    if (overheatTimeoutRef.current) clearTimeout(overheatTimeoutRef.current);
    overheatTimeoutRef.current = setTimeout(() => {
        setIsOverheated(false);
        heatRef.current = 0;
        setHeat(0);
        setStatus("SYSTEM COOLED. RESUME UPLOAD.");
    }, 3000);
  };

  const startHolding = () => {
    if (isOverheated || isFakeWinning) {
        AudioController.instance.playError();
        return;
    }
    isHoldingRef.current = true;
    setStatus("UPLOADING...");
    AudioController.instance.startUploadHum();
  };

  const stopHolding = () => {
    if (isFakeWinning) {
        // If they let go during fake win, reveal the truth
        setIsFakeWinning(false);
        progressRef.current = 80;
        setProgress(80);
        setStatus("PREMATURE DISCONNECTION. ROLLED BACK.");
        AudioController.instance.playError();
        AudioController.instance.stopUploadHum();
        isHoldingRef.current = false;
        return;
    }

    if (isHoldingRef.current) {
        isHoldingRef.current = false;
        AudioController.instance.stopUploadHum();
        AudioController.instance.playShatter();
        
        // Instant reset
        if (progressRef.current > 0) {
            triggerTaunt();
        }
        progressRef.current = 0;
        setProgress(0);
    }
  };

  // The Game Loop
  useEffect(() => {
    let animationFrame: number;

    const loop = () => {
        const now = Date.now();

        if (isHoldingRef.current && !isOverheated && !isFakeWinning) {
            // 1. Calculate Progress Speed (Logarithmic Slowdown)
            // 0-50% in ~2s -> Speed ~25/s
            // 98-99% in ~10s -> Speed ~0.1/s
            
            let speed = 0;
            const p = progressRef.current;
            
            if (p < 50) speed = 0.4; // Fast start
            else if (p < 80) speed = 0.2;
            else if (p < 90) speed = 0.05;
            else if (p < 95) speed = 0.02;
            else if (p < 98) speed = 0.005;
            else speed = 0.001; // Crawl

            // Apply update
            const nextProgress = Math.min(MAX_PROGRESS, p + speed);
            progressRef.current = nextProgress;
            setProgress(nextProgress);

            // Update Audio Pitch
            AudioController.instance.updateUploadHum(nextProgress);

            // 2. Heat Mechanic
            // 15 seconds to overheat (approx 900 frames at 60fps)
            // Heat goes 0 to 100
            heatRef.current += 0.12; 
            if (heatRef.current >= 100) {
                handleOverheat();
            }
            setHeat(heatRef.current);

            // 3. Fake Win Event
            if (p > 95 && p < 95.1 && Math.random() < 0.1) {
                // Rare fake win trigger
                setIsFakeWinning(true);
            }

            // 4. Packet Loss Event
            if (now - lastPacketLossRef.current > 12000) { // Every 12s min
                if (Math.random() < 0.01) { // Chance per frame after timeout
                    packetLoss();
                    lastPacketLossRef.current = now;
                }
            }

        } else if (!isHoldingRef.current && !isOverheated) {
            // Cooldown logic when not holding
            if (heatRef.current > 0) {
                heatRef.current = Math.max(0, heatRef.current - 0.5);
                setHeat(heatRef.current);
            }
        }

        animationFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrame);
  }, [isOverheated, isFakeWinning]);


  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-green-500 font-mono p-4 select-none relative overflow-hidden">
      
      {/* Background Grid */}
      <div 
        className={`absolute inset-0 opacity-20 pointer-events-none ${shake ? 'animate-shake' : ''}`}
        style={{
            backgroundImage: `linear-gradient(transparent 95%, #0F0 95%), linear-gradient(90deg, transparent 95%, #0F0 95%)`,
            backgroundSize: '20px 20px'
        }}
      ></div>

      {/* CRT Effects */}
      <div className="bg-crt-overlay"></div>
      <div className="bg-crt-line"></div>

      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="secondary" size="sm" onClick={onBack} className="!bg-gray-800 !text-green-500 !border-green-500 hover:!bg-gray-700">
             &lt; EXIT_DOS.EXE
        </Button>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        <h1 className="text-2xl md:text-4xl mb-8 tracking-widest text-center">SISYPHEAN_UPLOAD_MANAGER_V1.0</h1>

        {/* Main Display */}
        <div className={`w-full max-w-2xl bg-gray-900 border-4 border-green-700 p-6 shadow-[0_0_20px_rgba(0,255,0,0.2)] mb-8 relative ${shake ? 'translate-x-1' : ''}`}>
            
            {/* Status Text */}
            <div className="h-8 mb-4 text-green-400 font-bold truncate">
                {'>'} {status}<span className="animate-pulse">_</span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative w-full h-16 bg-black border-2 border-green-900 mb-2">
                {/* Segments */}
                <div 
                    className="h-full bg-green-600 shadow-[0_0_10px_#0F0] transition-all duration-75"
                    style={{ width: `${progress}%` }}
                >
                    {/* Scanline effect */}
                    <div className="w-full h-full bg-[linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0.5)_50%,rgba(0,0,0,0))] bg-[length:100%_4px]"></div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white mix-blend-difference font-bold text-xl">
                    {progress.toFixed(2)}%
                </div>
            </div>

            {/* Info Row */}
            <div className="flex justify-between text-xs text-green-700">
                <span>SPEED: {progress > 90 ? '0.1kb/s' : '56kb/s'}</span>
                <span>ETA: ∞</span>
            </div>

        </div>

        {/* Heat Monitor */}
        <div className="w-full max-w-2xl mb-12 flex items-center gap-4">
            <span className="text-sm">CPU TEMP:</span>
            <div className="flex-1 h-4 bg-gray-800 border border-green-900 relative overflow-hidden">
                <div 
                    className={`h-full transition-all duration-200 
                        ${isOverheated 
                            ? 'bg-yellow-600 animate-pulse' 
                            : (heat > 80 ? 'bg-red-500 animate-pulse' : 'bg-green-500')
                        }
                    `}
                    style={{ 
                        width: `${heat}%`,
                        backgroundImage: isOverheated 
                            ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' 
                            : 'none'
                    }}
                >
                </div>
                {/* Visual Text Overlay for Overheat */}
                {isOverheated && (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black bg-yellow-600/20 tracking-[0.2em] animate-pulse">
                        COOLING DOWN...
                    </div>
                )}
            </div>
        </div>

        {/* The Button */}
        <button
            className={`
                relative w-64 h-64 rounded-full border-8 border-red-900 
                flex items-center justify-center 
                text-2xl font-black text-red-900 tracking-tighter
                shadow-[0_0_50px_rgba(255,0,0,0.2)]
                transition-all duration-100
                active:scale-95
                ${isOverheated ? 'bg-gray-700 cursor-not-allowed grayscale' : 'bg-red-600 hover:bg-red-500 active:bg-red-700 cursor-pointer'}
            `}
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            disabled={isOverheated}
        >
            <div className="text-center">
                {isOverheated ? (
                    <span>OVERHEAT</span>
                ) : (
                    <>
                    <span className="block text-4xl mb-2">⚠</span>
                    HOLD TO<br/>UPLOAD
                    </>
                )}
            </div>
            
            {/* Button shine */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none"></div>
        </button>
      </div>

      {/* Stupid Caution - Fixed position and color */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center z-20">
        <div className="text-green-600/60 text-[10px] md:text-xs font-mono text-center max-w-md border border-green-900/30 p-2 bg-black/50 backdrop-blur-sm">
            <div>⚠ WARNING: SERVER RUNNING ON POTATO ⚠</div>
            <div className="mt-1">Connection speeds vary based on your emotional stability.</div>
            <div>Do not blink. The server smells fear.</div>
        </div>
      </div>

      {/* Fake Win Popup */}
      {isFakeWinning && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in">
            <div className="bg-white p-8 border-4 border-black shadow-[10px_10px_0_0_#0F0] text-center">
                <h2 className="text-4xl text-black font-black mb-4">UPLOAD COMPLETE!</h2>
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-black font-sans font-bold">You can let go now.</p>
                <p className="text-xs text-gray-400 mt-4">(This is totally real)</p>
            </div>
         </div>
      )}

      {/* JUMPSCARE TAUNT OVERLAY */}
      {activeTaunt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-none animate-in zoom-in duration-75">
            <div className="border-4 border-red-500 p-8 bg-black animate-pulse shadow-[0_0_50px_#F00] max-w-2xl transform rotate-2">
                <h2 className="text-red-500 font-black text-4xl md:text-6xl text-center uppercase tracking-tighter drop-shadow-md">
                    {activeTaunt}
                </h2>
                <div className="text-red-500 font-mono text-center mt-4">
                    FATAL ERROR: USER_INCOMPETENCE
                </div>
            </div>
          </div>
      )}

    </div>
  );
};