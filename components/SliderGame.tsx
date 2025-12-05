
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TROLL_MESSAGES, INTENSE_MESSAGES, COLORS } from '../constants';
import { ChaosMode, Toast, ToastVariant } from '../types';
import { Button } from './Button';
import { AudioController } from '../utils/audio';

interface SliderGameProps {
  onWin: () => void;
  onBack: () => void;
}

export const SliderGame: React.FC<SliderGameProps> = ({ onWin, onBack }) => {
  const [value, setValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [chaosMode, setChaosMode] = useState<ChaosMode>('normal');
  const [handleSize, setHandleSize] = useState(48); // px
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Game state refs for the loop to access without dependency stale closures
  const valueRef = useRef(0);
  const chaosModeRef = useRef<ChaosMode>('normal');
  const sliderRef = useRef<HTMLDivElement>(null);
  const lastThresholdRef = useRef(0);
  
  // Audio simulation (visual cues)
  const [screenShake, setScreenShake] = useState(false);

  // Constants
  // The threshold is technically unreachable now due to logic overrides
  const WIN_THRESHOLD = 99.9; 

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
        AudioController.instance.stopDrag();
    };
  }, []);

  // Manage drag sound state
  useEffect(() => {
    if (isDragging) {
      AudioController.instance.startDrag();
    } else {
      AudioController.instance.stopDrag();
    }
  }, [isDragging]);

  // Helper to add toast
  const addToast = (text: string, x?: number, y?: number, variant: ToastVariant = 'normal') => {
    const id = Math.random().toString(36).substr(2, 9);
    // Random position if not provided, concentrated near the slider if high value
    const isHighStakes = valueRef.current > 80;
    
    let posX = x;
    let posY = y;

    if (posX === undefined || posY === undefined) {
        if (isHighStakes) {
            // Spawn randomly all over screen
             posX = Math.random() * (window.innerWidth - 100);
             posY = Math.random() * (window.innerHeight - 50);
        } else {
             posX = Math.random() * (window.innerWidth - 200) + 100;
             posY = Math.random() * (window.innerHeight - 100) + 50;
        }
    }
    
    // Play sound
    AudioController.instance.playToast(variant);

    setToasts(prev => [...prev, {
      id,
      text,
      x: posX!,
      y: posY!,
      rotation: (Math.random() - 0.5) * 60,
      variant,
      scale: isHighStakes ? 1 + Math.random() : 1
    }]);

    // Cleanup toast
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, variant === 'glitch' ? 400 : 1500);
  };

  // The Chaos Loop
  useEffect(() => {
    // Dynamic interval based on progress
    let timeoutId: ReturnType<typeof setTimeout>;

    const gameLoop = () => {
        const currentVal = valueRef.current;
        
        // Calculate next tick speed: faster as you get closer
        let nextTick = 800;
        if (currentVal > 50) nextTick = 500;
        if (currentVal > 80) nextTick = 200;
        if (currentVal > 95) nextTick = 100;

        if (isDragging) {
            const roll = Math.random();

            // TOAST SPAWNING LOGIC
            // Chance to spawn toast increases with value
            const spawnChance = currentVal / 120; // 0% at start, ~80% near end
            if (Math.random() < spawnChance) {
                const msgList = currentVal > 90 ? INTENSE_MESSAGES : TROLL_MESSAGES;
                const msg = msgList[Math.floor(Math.random() * msgList.length)];
                const variant = currentVal > 90 ? 'glitch' : (currentVal > 70 ? 'danger' : 'normal');
                addToast(msg, undefined, undefined, variant);
            }

            // CHAOS MODES
            // Progressive difficulty
            if (currentVal < 50) {
                // Easy zone: minimal chaos
                if (roll > 0.8) {
                    setChaosMode('shaking');
                    chaosModeRef.current = 'shaking';
                } else {
                    setChaosMode('normal');
                    chaosModeRef.current = 'normal';
                }
            } else if (currentVal < 80) {
                // Medium zone
                if (roll > 0.7) {
                    setChaosMode('slippery');
                    chaosModeRef.current = 'slippery';
                } else if (roll > 0.9) {
                    setChaosMode('reverse');
                    chaosModeRef.current = 'reverse';
                    addToast("Controls Reversed!", undefined, undefined, 'warning');
                } else {
                    setChaosMode('normal');
                    chaosModeRef.current = 'normal';
                }
            } else {
                // DANGER ZONE (80-100%)
                // Extreme chaos
                if (roll < 0.25) {
                    // SNAP BACK
                    setValue(0);
                    valueRef.current = 0;
                    lastThresholdRef.current = 0; // Reset threshold tracker
                    setIsDragging(false); // Force drop
                    AudioController.instance.playSnap();
                    addToast("NOPE", undefined, undefined, 'danger');
                    setScreenShake(true);
                    setTimeout(() => setScreenShake(false), 300);
                } else if (roll < 0.45) {
                    setChaosMode('invisible');
                    chaosModeRef.current = 'invisible';
                } else if (roll < 0.65) {
                    setChaosMode('frozen');
                    chaosModeRef.current = 'frozen';
                    // Don't toast every time or it gets annoying, just freeze
                } else if (roll < 0.85) {
                    // Fake jump back
                    const jumpTo = Math.max(0, currentVal - (Math.random() * 50 + 20));
                    setValue(jumpTo);
                    valueRef.current = jumpTo;
                    lastThresholdRef.current = jumpTo;
                    AudioController.instance.playSnap();
                    addToast("Whoops!", undefined, undefined, 'normal');
                } else {
                    // Rare luck moment (bait)
                    setChaosMode('normal');
                    chaosModeRef.current = 'normal';
                }
            }
            
            // Handle size manipulation
            if (currentVal > 85) {
                setHandleSize(Math.max(5, 48 - (currentVal - 85) * 3));
            } else {
                setHandleSize(48);
            }
        } else {
            setChaosMode('normal');
            chaosModeRef.current = 'normal';
            setHandleSize(48);
        }

        timeoutId = setTimeout(gameLoop, nextTick);
    };

    timeoutId = setTimeout(gameLoop, 800);
    return () => clearTimeout(timeoutId);
  }, [isDragging]);

  // Handle Dragging Logic
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;
    if (chaosModeRef.current === 'frozen') return;

    let clientX;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = (e as MouseEvent).clientX;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const width = rect.width;
    let offsetX = clientX - rect.left;
    
    // Reverse controls logic
    if (chaosModeRef.current === 'reverse') {
        offsetX = width - offsetX;
    }

    // Slippery logic (exaggerate movement)
    if (chaosModeRef.current === 'slippery') {
        offsetX = offsetX + (Math.random() - 0.5) * 50;
    }

    // Shaking logic (jitter)
    if (chaosModeRef.current === 'shaking') {
        offsetX = offsetX + (Math.random() - 0.5) * 20;
    }

    let percent = (offsetX / width) * 100;

    // --- THE UNBEATABLE LOGIC ---
    if (percent > 95) {
        // Massive jitter near the end
        percent -= Math.random() * 5; 
        
        // Random chance to just fail completely
        if (Math.random() > 0.9) {
            setChaosMode('invisible');
            chaosModeRef.current = 'invisible';
        }
    }

    // Hard Stop at 98.5% to prevent winning
    if (percent >= 98.5) {
        // 1. Visual glitch
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 200);
        
        // 2. Teleport back randomly
        const resetPoint = Math.random() * 40; // Back to 0-40%
        setValue(resetPoint);
        valueRef.current = resetPoint;
        lastThresholdRef.current = resetPoint;
        
        // 3. Mock the user
        addToast(INTENSE_MESSAGES[Math.floor(Math.random() * INTENSE_MESSAGES.length)], clientX, rect.top - 100, 'glitch');
        AudioController.instance.playSnap();

        // 4. Force release sometimes
        if (Math.random() > 0.5) {
            setIsDragging(false);
        }
        return; 
    }

    // Clamp
    percent = Math.max(0, Math.min(100, percent));
    
    setValue(percent);
    valueRef.current = percent;

    // Audio Updates
    AudioController.instance.updateDrag(percent, chaosModeRef.current);
    
    // Threshold Sounds
    const thresholds = [25, 50, 75, 90, 95, 98];
    const crossed = thresholds.find(t => lastThresholdRef.current < t && percent >= t);
    if (crossed) {
        AudioController.instance.playThreshold(crossed);
    }
    lastThresholdRef.current = percent;

    // Check for win (now unreachable due to logic above)
    if (percent >= WIN_THRESHOLD) {
        onWin();
    }
  }, [isDragging, onWin]);

  const handleMouseDown = () => {
    setIsDragging(true);
    // Occasionally jump on click
    if (Math.random() > 0.8) {
      const jump = Math.random() * 100;
      setValue(jump);
      valueRef.current = jump;
      lastThresholdRef.current = jump;
      AudioController.instance.playSnap();
      addToast("Jump start!", undefined, undefined, 'normal');
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Sometimes reset progress on release
    if (valueRef.current > 0) {
        if (Math.random() > 0.5) {
             setValue(0);
             valueRef.current = 0;
             lastThresholdRef.current = 0;
             AudioController.instance.playSnap();
             addToast("Butterfingers!", undefined, undefined, 'normal');
        }
    }
  };

  // Global listeners for drag
  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
    } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div className={`relative w-full max-w-2xl h-full flex flex-col items-center justify-center p-6 ${screenShake ? 'animate-shake' : ''}`}>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <Button variant="secondary" size="sm" onClick={onBack}>
             &larr; Menu
        </Button>
        <div className="text-right">
             <div className="font-mono text-xs opacity-50">STABILITY</div>
             <div className={`font-bold text-xl ${chaosMode === 'normal' ? 'text-green-600' : 'text-red-600 animate-pulse'}`}>
                {chaosMode === 'normal' ? 'STABLE' : 'UNSTABLE'}
             </div>
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black mb-12 text-center select-none" style={{ color: COLORS.dark }}>
        DRAG TO <span className="text-red-500 underline decoration-wavy">100%</span>
      </h1>

      {/* The Slider Container */}
      <div 
        ref={sliderRef}
        className="relative w-full h-16 bg-gray-200 border-4 border-black rounded-full overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none"
      >
        {/* Track Pattern */}
        <div className="absolute inset-0 slider-track pointer-events-none"></div>
        
        {/* Progress Bar */}
        <div 
            className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-75 ease-linear border-r-4 border-black"
            style={{ width: `${value}%` }}
        ></div>

        {/* Target Line */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-green-400 border-l-4 border-black flex items-center justify-center z-10 pointer-events-none opacity-50">
            <span className="text-xs font-bold -rotate-90">GOAL</span>
        </div>

        {/* The Handle */}
        <div 
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 transition-all duration-75
            ${chaosMode === 'invisible' ? 'opacity-0' : 'opacity-100'}
            ${chaosMode === 'shaking' ? 'animate-shake' : ''}
          `}
          style={{ 
            left: `${value}%`,
            width: `${handleSize}px`,
            height: `${handleSize}px`
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="w-full h-full bg-yellow-400 border-4 border-black rounded-lg flex items-center justify-center shadow-sm relative group">
            {/* Handle Face */}
            <div className="flex gap-1 pointer-events-none">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
            {/* Mouth changes based on chaos */}
            <div className={`absolute bottom-2 w-4 h-1 bg-black rounded-full transition-all 
                ${value > 80 ? 'h-3 rounded-t-none rounded-b-full' : ''}
            `}></div>
            
            {/* Tooltip */}
            {isDragging && (
                <div className="absolute -top-10 bg-black text-white px-2 py-1 text-xs rounded whitespace-nowrap font-mono">
                    {value.toFixed(1)}%
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Troll Text */}
      {toasts.map((toast) => {
        // Dynamic styles based on variant
        let variantClasses = "bg-white text-black border-black";
        if (toast.variant === 'warning') variantClasses = "bg-yellow-300 text-black border-black";
        if (toast.variant === 'danger') variantClasses = "bg-red-600 text-white border-white animate-pulse";
        if (toast.variant === 'glitch') variantClasses = "bg-black text-green-400 border-green-400 font-mono animate-glitch";

        return (
            <div
                key={toast.id}
                className={`absolute pointer-events-none z-50 font-black drop-shadow-md border-2 px-2 py-1 whitespace-nowrap ${variantClasses}`}
                style={{
                    left: toast.x,
                    top: toast.y,
                    transform: `rotate(${toast.rotation}deg) scale(${toast.scale})`,
                    fontSize: toast.variant === 'glitch' ? '2rem' : '1.5rem'
                }}
            >
                {toast.text}
            </div>
        );
      })}
      
      {/* Helper Text */}
      <div className="mt-12 text-center opacity-60 font-mono text-sm max-w-md">
        <p className="mb-2">CAUTION: Slider may exhibit unstable behavior.</p>
        <p>Do not trust the handle. Do not trust the bar. Trust nothing.</p>
      </div>

    </div>
  );
};
