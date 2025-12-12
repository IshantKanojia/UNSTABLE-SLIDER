import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './Button';
import { ZEN_MESSAGES, EARLY_FAILURE_TAUNTS } from '../constants';
import { AudioController } from '../utils/audio';

// Access Matter.js from global scope (added via CDN in index.html)
declare const Matter: any;

interface ZenTowerGameProps {
  onBack: () => void;
}

export const ZenTowerGame: React.FC<ZenTowerGameProps> = ({ onBack }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const renderRef = useRef<any>(null);
  const runnerRef = useRef<any>(null);
  
  // Game State
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [isWindy, setIsWindy] = useState(false);
  const [isIntro, setIsIntro] = useState(true);

  // Refs for gameplay logic to avoid closure staleness
  const currentBlockRef = useRef<any>(null);
  const blockDirectionRef = useRef(1);
  const stackHeightRef = useRef(0); // Count of blocks
  const gameActiveRef = useRef(false); // Start false for intro
  const introActiveRef = useRef(true);
  const windIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const BLOCK_WIDTH = 120;
  const BLOCK_HEIGHT = 40;
  
  // Colors (Pastel)
  const PALETTE = ['#FFD1DC', '#E0F4FC', '#D4F0F0', '#FCF4D9', '#E6E6FA'];

  // Initialize Physics Engine
  useEffect(() => {
    // Load best score
    const saved = localStorage.getItem('zenTowerBest');
    if (saved) setBestScore(parseInt(saved, 10));

    if (!sceneRef.current) return;

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Events = Matter.Events;

    // Create engine
    const engine = Engine.create();
    engineRef.current = engine;
    
    // Create renderer
    // Use window dimensions as fallback to ensure non-zero size
    const width = sceneRef.current.clientWidth || window.innerWidth;
    const height = sceneRef.current.clientHeight || window.innerHeight;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: window.devicePixelRatio
      }
    });
    renderRef.current = render;

    // Ground - Narrow platform (pedestal) so collapsed blocks fall into the void
    // This ensures Game Over is triggered when the tower falls
    const ground = Bodies.rectangle(
        width / 2, 
        height - 20, 
        300, // Width reduced to 300 to act as a pedestal
        60, 
        { isStatic: true, render: { fillStyle: '#A0AEC0' } }
    );
    
    Composite.add(engine.world, [ground]);

    // Render loop
    Render.run(render);
    
    // Create runner
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Intro Sequence
    const runIntro = async () => {
        introActiveRef.current = true;
        gameActiveRef.current = false;

        const dropIntroBlock = (delay: number) => new Promise<void>(resolve => {
             setTimeout(() => {
                 if (!sceneRef.current) return resolve();
                 spawnBlock(true); // Spawn static centered
                 
                 // Wait a beat then drop
                 setTimeout(() => {
                     if (currentBlockRef.current) {
                        Matter.Body.setStatic(currentBlockRef.current, false);
                        AudioController.instance.playSoftClick();
                        // Tiny random torque for natural feel
                        Matter.Body.setAngularVelocity(currentBlockRef.current, (Math.random() - 0.5) * 0.01);
                        
                        stackHeightRef.current += 1;
                        setScore(stackHeightRef.current);
                        currentBlockRef.current = null;
                     }
                     resolve();
                 }, 600);
             }, delay);
        });

        // 3 Intro Blocks
        await dropIntroBlock(500);
        await dropIntroBlock(1200);
        await dropIntroBlock(1200);

        // Transition to Player Control
        setTimeout(() => {
            introActiveRef.current = false;
            gameActiveRef.current = true;
            setIsIntro(false);
            spawnBlock(false); // Player block (oscillates)
            startWindCycle();
        }, 1500);
    };

    runIntro();

    // Game Loop (Manual updates for kinematic block)
    const updateLoop = () => {
        // Only move block if game is active AND it's not the intro
        if (gameActiveRef.current && !introActiveRef.current) {
            
            // Move current block if it's kinematic (waiting to drop)
            if (currentBlockRef.current && currentBlockRef.current.isStatic) {
                const body = currentBlockRef.current;
                const speed = 3 + (stackHeightRef.current * 0.2); // Gets faster
                
                Matter.Body.translate(body, { x: speed * blockDirectionRef.current, y: 0 });
                
                // Bounds check for oscillation
                const currentWidth = sceneRef.current?.clientWidth || window.innerWidth;
                if (body.position.x > currentWidth - 50) blockDirectionRef.current = -1;
                if (body.position.x < 50) blockDirectionRef.current = 1;
            }
            
            // Check for Game Over (Any block falls below ground)
            const bodies = Composite.allBodies(engine.world);
            const currentHeight = sceneRef.current?.clientHeight || window.innerHeight;
            
            for (const body of bodies) {
                if (!body.isStatic && body.position.y > currentHeight + 50) {
                    handleGameOver();
                    break; // Trigger once is enough
                }
            }
        }
        
        requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);

    // Collision Event for Sound
    Events.on(engine, 'collisionStart', (event: any) => {
        event.pairs.forEach((pair: any) => {
            const speed = Math.abs(pair.bodyA.velocity.y) + Math.abs(pair.bodyB.velocity.y);
            if (speed > 1) {
                AudioController.instance.playThud();
            }
        });
    });

    // Handle Resize
    const handleResize = () => {
        if (!renderRef.current || !sceneRef.current) return;
        const newWidth = sceneRef.current.clientWidth || window.innerWidth;
        const newHeight = sceneRef.current.clientHeight || window.innerHeight;
        
        renderRef.current.canvas.width = newWidth;
        renderRef.current.canvas.height = newHeight;
        renderRef.current.options.width = newWidth;
        renderRef.current.options.height = newHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      if (windIntervalRef.current) clearTimeout(windIntervalRef.current);
    };
  }, []);

  const spawnBlock = (isIntroSpawn = false) => {
    if (!sceneRef.current || !engineRef.current) return;
    
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;
    const width = sceneRef.current.clientWidth || window.innerWidth;
    
    const color = PALETTE[stackHeightRef.current % PALETTE.length];
    
    // Intro blocks spawn lower (stacking visually), player blocks spawn at fixed top height
    const spawnY = isIntroSpawn ? 100 : 100; 
    
    // Spawn at center
    const block = Bodies.rectangle(width / 2, spawnY, BLOCK_WIDTH, BLOCK_HEIGHT, {
        isStatic: true, 
        render: { fillStyle: color, strokeStyle: '#888', lineWidth: 1 },
        friction: 1.0, 
        restitution: 0.0,
        density: 0.002 // Slightly heavier feel
    });

    currentBlockRef.current = block;
    Composite.add(engineRef.current.world, block);
    
    // If it's a player spawn, randomize direction start
    if (!isIntroSpawn) {
        blockDirectionRef.current = Math.random() > 0.5 ? 1 : -1;
    }
  };

  const handleInput = useCallback(() => {
    if (introActiveRef.current) return; // Ignore input during intro

    if (gameOver) {
        resetGame();
        return;
    }
    
    if (!currentBlockRef.current || !gameActiveRef.current) return;
    
    const Body = Matter.Body;
    
    // Drop the block
    AudioController.instance.playSoftClick();
    const block = currentBlockRef.current;
    
    // Make dynamic
    Body.setStatic(block, false);
    
    // Apply difficulty physics based on height
    const count = stackHeightRef.current;
    
    // Progressive Difficulty Config
    let newFriction = 0.8;
    let newRestitution = 0.0;
    let newDensity = 0.002;
    let angularJitter = 0.0;

    if (count > 10) {
        // Calculate factor based on how far past 10 we are
        // We want changes to be noticeable but gradual
        const level = count - 10;
        
        // Friction: 0.8 -> decays to 0.1 over ~30 levels
        newFriction = Math.max(0.1, 0.8 - (level * 0.025));
        
        // Restitution: 0.0 -> grows to 0.6 over ~30 levels (bouncier)
        newRestitution = Math.min(0.6, level * 0.02);

        // Density: 0.002 -> grows to 0.005 over ~30 levels (heavier/faster fall)
        newDensity = Math.min(0.005, 0.002 + (level * 0.0001));

        // Random spin
        angularJitter = (Math.random() - 0.5) * (0.01 + level * 0.005);
    }

    // Apply properties
    block.friction = newFriction;
    block.restitution = newRestitution;
    Body.setDensity(block, newDensity); // This updates mass automatically
    if (angularJitter !== 0) {
        Body.setAngularVelocity(block, angularJitter);
    }

    // Reduced air friction for faster falling feel at higher levels
    if (count > 10) {
        block.frictionAir = Math.max(0.001, 0.01 - ((count - 10) * 0.0002));
    }

    currentBlockRef.current = null; 
    stackHeightRef.current += 1;
    setScore(stackHeightRef.current);

    // Spawn next block after delay
    setTimeout(() => {
        if (gameActiveRef.current) spawnBlock(false);
    }, 1000);

  }, [gameOver]);

  const startWindCycle = () => {
    if (windIntervalRef.current) clearTimeout(windIntervalRef.current);
    const scheduleNext = () => {
        const delay = Math.random() * 4000 + 8000; // 8-12s
        windIntervalRef.current = setTimeout(() => {
            if (gameActiveRef.current && !introActiveRef.current) triggerWind();
            scheduleNext();
        }, delay);
    };
    scheduleNext();
  };

  const triggerWind = () => {
    if (!engineRef.current) return;
    
    setIsWindy(true);
    AudioController.instance.playWindGust();
    setTimeout(() => setIsWindy(false), 2000);

    const bodies = Matter.Composite.allBodies(engineRef.current.world);
    // Wind force logic
    const forceX = (Math.random() - 0.5) * 0.05 * (stackHeightRef.current > 5 ? 2 : 1);
    
    bodies.forEach((body: any) => {
        if (!body.isStatic) {
            Matter.Body.applyForce(body, body.position, { x: forceX * body.mass, y: 0 });
        }
    });
  };

  const handleGameOver = () => {
    if (!gameActiveRef.current) return;
    gameActiveRef.current = false;
    setGameOver(true);
    
    // Use ref to get current score inside the closure
    const currentScore = stackHeightRef.current;

    // Check for early failure (less than 3 blocks stacked)
    // score tracks attempted drops. If score is 3, 3rd block fell, so only 2 stacked.
    let msgList = ZEN_MESSAGES;
    // We increase threshold slightly because sometimes blocks bounce off early
    if (currentScore <= 4) {
        msgList = EARLY_FAILURE_TAUNTS;
    }
    
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    setMessage(msg);
    
    // Update best score manually to avoid stale state in closure
    const savedBest = parseInt(localStorage.getItem('zenTowerBest') || '0', 10);
    if (currentScore > savedBest) {
        setBestScore(currentScore);
        localStorage.setItem('zenTowerBest', currentScore.toString());
    }
    
    if (windIntervalRef.current) clearTimeout(windIntervalRef.current);
  };

  const resetGame = () => {
    if (!engineRef.current) return;
    
    // Clear dynamic bodies only
    const bodies = Matter.Composite.allBodies(engineRef.current.world);
    bodies.forEach((body: any) => {
        if (!body.isStatic) Matter.World.remove(engineRef.current.world, body);
    });

    setScore(0);
    setGameOver(false);
    setMessage("");
    stackHeightRef.current = 0;
    
    // Restart with player control directly, skipping intro for retry?
    // Let's skip intro on retry for better UX
    gameActiveRef.current = true;
    introActiveRef.current = false;
    spawnBlock(false);
    startWindCycle();
  };

  return (
    <div 
        className="w-full h-full relative bg-purple-50 flex flex-col items-center overflow-hidden touch-none"
        onMouseDown={handleInput}
        onTouchStart={handleInput}
    >
        {/* Ambient Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.8)_100%)]"></div>

        {/* HUD */}
        <div className="absolute top-4 left-4 z-20 flex gap-4">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="!bg-white !text-purple-900 !border-purple-200 hover:!bg-purple-100"
            >
                Back
            </Button>
        </div>

        <div className="absolute top-8 text-center z-10 pointer-events-none select-none transition-opacity duration-500" style={{ opacity: isIntro ? 0.5 : 1 }}>
            <h1 className="text-4xl font-['Quicksand'] font-light text-purple-900 mb-2">Zen Tower</h1>
            <p className="text-purple-400 text-sm">
                {isIntro ? "Building foundation..." : "Tap to drop. Breathe."}
            </p>
        </div>

        <div className="absolute top-8 right-8 text-right z-10 pointer-events-none font-['Quicksand']">
            <div className="text-4xl text-purple-600">{score}</div>
            <div className="text-xs text-purple-400">Best: {bestScore}</div>
        </div>

        {/* Wind Indicator */}
        <div className={`absolute top-32 text-center transition-opacity duration-1000 ${isWindy ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-2xl text-blue-300 font-light">~~~ Wind Gust ~~~</span>
        </div>

        {/* Physics Canvas Container */}
        <div ref={sceneRef} className="w-full h-full absolute inset-0 z-0" />

        {/* Game Over Overlay */}
        {gameOver && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in">
                <h2 className="text-3xl text-slate-600 font-light mb-4 text-center px-4 leading-relaxed">
                    {message}
                </h2>
                <div className="text-purple-500 mb-8 font-mono">
                    Height: {score} | Best: {bestScore}
                </div>
                <Button 
                    onClick={(e) => { e.stopPropagation(); resetGame(); }}
                    className="!bg-purple-300 !text-white !border-transparent hover:!bg-purple-400 shadow-lg"
                >
                    Try Again
                </Button>
            </div>
        )}

        {/* Instructions overlay for first time */}
        {score > 3 && score < 5 && !gameOver && !isIntro && (
             <div className="absolute bottom-20 text-purple-300 animate-pulse text-sm pointer-events-none">
                (Click or Tap to Release)
             </div>
        )}
    </div>
  );
};