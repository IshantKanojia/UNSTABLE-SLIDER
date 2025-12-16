import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { AudioController } from '../utils/audio';
import { Toast, ToastVariant } from '../types';

// Access Matter.js from global scope
declare const Matter: any;

interface StarDropGameProps {
  onBack: () => void;
  isDarkMode?: boolean;
}

interface Sparkle {
    x: number;
    y: number;
    size: number;
    life: number;
    maxLife: number;
    vx: number;
    vy: number;
}

const STAR_TAUNTS = [
  "NOPE.",
  "NOT TIRED!",
  "TRY HARDER!",
  "TOO SLOW!",
  "YOU CAN'T!",
  "NEVER!",
  "I AM SPEED!",
  "ACCESS DENIED",
  "NICE TRY",
  "BUTTERFINGERS!",
  "I REFUSE!",
  "NO BEDTIME!",
  "CATCH ME!",
  "SYSTEM ERROR",
  "HAHAHA!",
  "LET GO!",
  "UNHAND ME!",
  "I'M BUSY!",
];

const HOLD_TAUNTS = [
  "SEPARATION ANXIETY?",
  "JUST THROW IT!",
  "LET ME GO!",
  "WHY ARE WE HERE?",
  "CLINGY MUCH?",
  "I'M NOT YOURS",
  "TIMING OUT...",
];

export const StarDropGame: React.FC<StarDropGameProps> = ({ onBack, isDarkMode = false }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const runnerRef = useRef<any>(null);
  const starRef = useRef<any>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false); 
  const [bgStars, setBgStars] = useState<{top: number, left: number, delay: number, size: number}[]>([]);
  
  // Logic Refs
  const wasCaughtRef = useRef(false);
  const holdTimerRef = useRef(0);

  // Taunt System
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTauntRef = useRef(0);
  // Ref to hold the toast function so the physics engine can call it without closure issues
  const addToastRef = useRef<(text: string, x: number, y: number, variant?: ToastVariant) => void>(() => {});

  // Constants
  const JAR_WIDTH = 120;
  const JAR_HEIGHT = 160;
  const JAR_THICKNESS = 15;
  const STAR_RADIUS = 25;

  // Initialize Background Stars
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push({
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 3,
            size: Math.random() * 2 + 1
        });
    }
    setBgStars(stars);
  }, []);

  // Update the ref whenever state updates function changes
  useEffect(() => {
    addToastRef.current = (text: string, x: number, y: number, variant: ToastVariant = 'danger') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, {
            id,
            text,
            x,
            y,
            rotation: (Math.random() - 0.5) * 40,
            variant: variant,
            scale: 1 + Math.random() * 0.5
        }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 1000);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !canvasRef.current) return;

    const Engine = Matter.Engine,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Events = Matter.Events,
          Body = Matter.Body;

    const engine = Engine.create();
    engineRef.current = engine;
    
    // Configure Gravity - Normal gravity, we will counteract it for flight
    engine.gravity.y = 1;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    // Canvas Setup
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create Boundaries to keep star in play
    const wallOptions = { 
        isStatic: true, 
        friction: 0,
        restitution: 0.8,
        render: { visible: false } 
    };
    
    // Top, Left, Right Walls
    const wallThickness = 100;
    const wallTop = Bodies.rectangle(width/2, -wallThickness/2, width, wallThickness, wallOptions);
    const wallLeft = Bodies.rectangle(-wallThickness/2, height/2, wallThickness, height * 2, wallOptions);
    const wallRight = Bodies.rectangle(width + wallThickness/2, height/2, wallThickness, height * 2, wallOptions);
    
    // Bottom Floor (Split to allow Jar in middle)
    const jarX = width / 2;
    const jarY = height - 100;
    
    // Difficulty Scaling for Jar
    const openingShrink = Math.min(20, Math.floor(attempts / 2) * 2);
    const effectiveJarWidth = JAR_WIDTH - openingShrink;

    // Left floor segment
    const floorLeftWidth = (width - effectiveJarWidth) / 2 - JAR_THICKNESS;
    const floorLeft = Bodies.rectangle(floorLeftWidth/2, height + wallThickness/2 - 20, floorLeftWidth, wallThickness, wallOptions);
    
    // Right floor segment
    const floorRightWidth = (width - effectiveJarWidth) / 2 - JAR_THICKNESS;
    const floorRight = Bodies.rectangle(width - floorRightWidth/2, height + wallThickness/2 - 20, floorRightWidth, wallThickness, wallOptions);

    Composite.add(engine.world, [wallTop, wallLeft, wallRight, floorLeft, floorRight]);

    // Jar Construction
    const jarOptions = { 
        isStatic: true, 
        friction: 0.1,
        restitution: 0.2, 
        render: { visible: false } 
    };

    const jarLeft = Bodies.rectangle(jarX - effectiveJarWidth/2 - JAR_THICKNESS/2, jarY, JAR_THICKNESS, JAR_HEIGHT, jarOptions);
    const jarRight = Bodies.rectangle(jarX + effectiveJarWidth/2 + JAR_THICKNESS/2, jarY, JAR_THICKNESS, JAR_HEIGHT, jarOptions);
    const jarBottom = Bodies.rectangle(jarX, jarY + JAR_HEIGHT/2 - JAR_THICKNESS/2, effectiveJarWidth + JAR_THICKNESS*2, JAR_THICKNESS, jarOptions);

    Composite.add(engine.world, [jarLeft, jarRight, jarBottom]);

    // Spawn Star
    const spawnStar = () => {
        // Random position in top half
        const startX = Math.random() * (width - 100) + 50;
        const startY = Math.random() * (height / 2) + 50;

        const star = Bodies.circle(startX, startY, STAR_RADIUS, {
            restitution: 0.9, // Super bouncy
            friction: 0.0,
            frictionAir: 0.005, // Very little air resistance for speed
            density: 0.01, // Heavy enough to carry momentum
            label: 'star'
        });
        starRef.current = star;
        Composite.add(engine.world, star);
    };
    spawnStar();

    // Mouse Control
    const mouse = Mouse.create(canvas);
    mouse.pixelRatio = window.devicePixelRatio || 1;
    
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.05, // Very loose grip - harder to control
            damping: 0.1,
            render: { visible: false }
        }
    });
    Composite.add(engine.world, mouseConstraint);

    // Initial Runner
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // --- GAME LOOP & RENDERING ---
    let renderLoopId: number;
    let flightTick = 0;
    
    const render = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // Draw Background Elements
        // Floor line visual
        ctx.beginPath();
        ctx.moveTo(0, height - 20);
        ctx.lineTo(width, height - 20);
        // Toggle floor color based on mode (this logic runs every frame so it picks up the prop change)
        ctx.strokeStyle = isDarkMode ? '#1e293b' : '#E0F7FA';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Update Sparkles Logic
        if (starRef.current) {
            const dist = Math.hypot(starRef.current.position.x - jarX, starRef.current.position.y - (jarY - JAR_HEIGHT/2));
            if (dist < 180) {
                 if (Math.random() < 0.2) {
                    sparklesRef.current.push({
                        x: jarX + (Math.random() - 0.5) * effectiveJarWidth * 0.8,
                        y: (jarY - JAR_HEIGHT/2) + Math.random() * 40, 
                        size: Math.random() * 4 + 2,
                        life: 0,
                        maxLife: 40 + Math.random() * 20,
                        vx: (Math.random() - 0.5) * 0.2,
                        vy: -0.5 - Math.random() * 0.5 
                    });
                }
            }
        }

        // Draw Sparkles
        ctx.save();
        sparklesRef.current.forEach(s => {
            s.life++;
            s.x += s.vx;
            s.y += s.vy;
            s.size *= 0.96;
            
            const alpha = Math.max(0, 1 - (s.life / s.maxLife));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFF59D';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#FFF59D';
            
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - s.size);
            ctx.lineTo(s.x + s.size/2, s.y);
            ctx.lineTo(s.x, s.y + s.size);
            ctx.lineTo(s.x - s.size/2, s.y);
            ctx.fill();
        });
        sparklesRef.current = sparklesRef.current.filter(s => s.life < s.maxLife);
        ctx.restore();

        // Draw Jar (Back layer)
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(jarX - effectiveJarWidth/2, jarY - JAR_HEIGHT/2, effectiveJarWidth, JAR_HEIGHT);

        // Draw Star
        if (starRef.current) {
            const { x, y } = starRef.current.position;
            const angle = starRef.current.angle;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Halo
            const gradient = ctx.createRadialGradient(0, 0, STAR_RADIUS * 0.5, 0, 0, STAR_RADIUS * 1.5);
            gradient.addColorStop(0, 'rgba(255, 238, 88, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 238, 88, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, STAR_RADIUS * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Star Shape
            drawStarShape(ctx, 0, 0, 5, STAR_RADIUS, STAR_RADIUS * 0.5);
            
            // Face
            ctx.rotate(-angle); 
            
            // Angry/Active Eyes
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            // Angry eyebrows
            ctx.moveTo(-12, -8);
            ctx.lineTo(-4, -4);
            ctx.moveTo(12, -8);
            ctx.lineTo(4, -4);
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Eyes
            ctx.beginPath();
            ctx.arc(-8, -2, 3, 0, Math.PI * 2);
            ctx.arc(8, -2, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Smirk/Grin
            ctx.beginPath();
            ctx.arc(0, 5, 6, 0.1, Math.PI - 0.1);
            ctx.stroke();

            ctx.restore();
        }

        // Draw Jar (Front layer)
        ctx.save();
        ctx.translate(jarX, jarY);
        
        ctx.beginPath();
        ctx.moveTo(-effectiveJarWidth/2 - JAR_THICKNESS/2, -JAR_HEIGHT/2);
        ctx.lineTo(-effectiveJarWidth/2 - JAR_THICKNESS/2, JAR_HEIGHT/2);
        ctx.lineTo(effectiveJarWidth/2 + JAR_THICKNESS/2, JAR_HEIGHT/2);
        ctx.lineTo(effectiveJarWidth/2 + JAR_THICKNESS/2, -JAR_HEIGHT/2);
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = isDarkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(179, 229, 252, 0.8)';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Shine
        ctx.beginPath();
        ctx.moveTo(-effectiveJarWidth/2 + 10, -JAR_HEIGHT/2 + 20);
        ctx.lineTo(-effectiveJarWidth/2 + 10, JAR_HEIGHT/2 - 20);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();

        ctx.restore();

        // Mouse Line
        if (mouseConstraint.body) {
            setHasLaunched(true);
            const bodyPos = mouseConstraint.body.position;
            const mousePos = mouse.position;
            ctx.beginPath();
            ctx.moveTo(bodyPos.x, bodyPos.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = isDarkMode ? 'rgba(248, 113, 113, 0.4)' : 'rgba(255,0,0,0.3)'; // Red tension line
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        renderLoopId = requestAnimationFrame(render);
    };
    render();

    function drawStarShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FBC02D';
        ctx.stroke();
        ctx.fillStyle = '#FFF176';
        ctx.fill();
    }

    // --- PHYSICS LOOP ---
    Events.on(engine, 'beforeUpdate', () => {
        if (!starRef.current || isResetting) return;

        const star = starRef.current;
        flightTick += 0.2; // Significantly faster animation tick

        // Check if caught by player
        const isCaught = mouseConstraint.body === star;
        
        // --- RELEASE WOBBLE & CHAOS ---
        // Detect the moment it is released
        if (wasCaughtRef.current && !isCaught) {
            // Apply unpredictable twitch
             Body.setAngularVelocity(star, (Math.random() - 0.5) * 0.8); // Spin
             Body.applyForce(star, star.position, { 
                 x: (Math.random() - 0.5) * 0.15, 
                 y: (Math.random() - 0.5) * 0.15 
             }); // Jerk
             AudioController.instance.playSnap();
        }
        wasCaughtRef.current = isCaught;

        if (!isCaught) {
            holdTimerRef.current = 0;

            // --- FLIGHT MECHANICS (AGGRESSIVE) ---
            
            // 1. Anti-Gravity
            Body.applyForce(star, star.position, { 
                x: 0, 
                y: -engine.gravity.y * engine.gravity.scale * star.mass 
            });

            // 2. High Speed Random Movement
            const noiseX = Math.sin(flightTick) + Math.sin(flightTick * 0.7) + Math.sin(flightTick * 2.5);
            const noiseY = Math.cos(flightTick * 0.9) + Math.cos(flightTick * 1.8);
            
            // Tuned up for "Uncatchable" speed
            const flightPower = 0.005; 
            
            Body.applyForce(star, star.position, {
                x: noiseX * flightPower,
                y: noiseY * flightPower
            });

            // 3. Evasion (Run from mouse)
            const mousePos = mouse.position;
            const dx = star.position.x - mousePos.x;
            const dy = star.position.y - mousePos.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 300) { // Detection range increased
                // Push away strongly
                const force = 0.006 * (1 - dist/300);
                Body.applyForce(star, star.position, {
                    x: (dx / dist) * force,
                    y: (dy / dist) * force
                });
            }

            // 4. Wall Bouncing (Keep it on screen but active)
            const margin = 50;
            if (star.position.x < margin) Body.applyForce(star, star.position, { x: 0.002, y: 0 });
            if (star.position.x > width - margin) Body.applyForce(star, star.position, { x: -0.002, y: 0 });
            if (star.position.y < margin) Body.applyForce(star, star.position, { x: 0, y: 0.002 });
            
        } else {
            // --- CAUGHT STATE LOGIC ---
            holdTimerRef.current++;

            // 1. INCREASING DRAG RESISTANCE (FIGHT BACK)
            // Resistance ramps up over time
            const ramp = Math.min(1, holdTimerRef.current / 180); // Max at ~3 seconds
            const baseResistance = 0.02;
            const addedResistance = ramp * 0.08;
            const resistance = baseResistance + addedResistance;

            Body.applyForce(star, star.position, {
                x: -star.velocity.x * resistance,
                y: -star.velocity.y * resistance
            });

            // 2. Struggle (Random Jitter - increases with time)
            const jitterStrength = 0.02 + (ramp * 0.04);
            Body.applyForce(star, star.position, {
                x: (Math.random() - 0.5) * jitterStrength,
                y: (Math.random() - 0.5) * jitterStrength
            });

            // 3. 5-SECOND HOLD TAUNT
            // 5 seconds * 60 fps = 300 frames
            if (holdTimerRef.current === 300) {
                 const msg = HOLD_TAUNTS[Math.floor(Math.random() * HOLD_TAUNTS.length)];
                 addToastRef.current(msg, star.position.x, star.position.y - 80, 'glitch');
                 AudioController.instance.playTauntScare();
            }

            // 4. Constant Taunting while being handled
            // Cooldown of 600ms to prevent overwhelming the screen, but frequent enough to annoy
            if (Date.now() - lastTauntRef.current > 600) {
                 if (Math.random() < 0.15) { // Slightly increased chance
                     const text = STAR_TAUNTS[Math.floor(Math.random() * STAR_TAUNTS.length)];
                     // Jitter position slightly
                     addToastRef.current(text, star.position.x + (Math.random() - 0.5) * 50, star.position.y - 60);
                     lastTauntRef.current = Date.now();
                 }
            }
        }

        // --- JAR REJECTION (THE FORCE FIELD) ---
        // "Star will never go inside the jar" logic
        
        // Zone check: Just above the rim
        const rejectY = jarY - JAR_HEIGHT/2 - 30;
        
        if (star.position.y > rejectY) {
             // Check X bounds (cylinder of rejection)
             if (Math.abs(star.position.x - jarX) < effectiveJarWidth) {
                 // REJECT!
                 
                 // 1. Force Release Grip
                 mouseConstraint.constraint.bodyB = null;
                 wasCaughtRef.current = false; // Reset catch state
                 
                 // 2. Violent Ejection
                 Body.setVelocity(star, { 
                     x: (Math.random() - 0.5) * 40, // Wild horizontal throw
                     y: -30 // Strong upward throw
                 });

                 // 3. Sound
                 AudioController.instance.playSnap();

                 // 4. Taunt (Throttled)
                 if (Date.now() - lastTauntRef.current > 500) {
                     const text = STAR_TAUNTS[Math.floor(Math.random() * STAR_TAUNTS.length)];
                     addToastRef.current(text, star.position.x, star.position.y - 50);
                     lastTauntRef.current = Date.now();
                 }
             }
        }
        
        // Push UP if near floor to prevent landing anywhere else
        if (star.position.y > height - 100) {
             Body.applyForce(star, star.position, { x: 0, y: -0.005 });
        }
    });

    Events.on(engine, 'collisionStart', (event: any) => {
        event.pairs.forEach((pair: any) => {
            if ((pair.bodyA.label === 'star' || pair.bodyB.label === 'star') && !isResetting) {
                const starBody = pair.bodyA.label === 'star' ? pair.bodyA : pair.bodyB;
                if (starBody.speed > 1) {
                    AudioController.instance.playGlassClink();
                }
            }
        });
    });

    return () => {
        Runner.stop(runner);
        Matter.Engine.clear(engine);
        if (mouse) Matter.Mouse.clearSourceEvents(mouse);
        cancelAnimationFrame(renderLoopId);
    };
  }, [attempts]);

  // isDarkMode in dependency array above would trigger full physics reset, so we handle it visually in render loop
  // However, props like className trigger react re-render which is fine.

  return (
    <div className="w-full h-full relative flex flex-col items-center bg-[#E1F5FE] dark:bg-sky-950 overflow-hidden select-none touch-none transition-colors duration-300">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-pink-50 dark:from-slate-900 dark:to-sky-900 transition-colors duration-1000"></div>

        {/* Twinkling Stars */}
        <div className="absolute inset-0 pointer-events-none">
            {bgStars.map((s, i) => (
                <div 
                    key={i}
                    className="absolute bg-white rounded-full animate-twinkle"
                    style={{
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDelay: `${s.delay}s`,
                        opacity: isDarkMode ? 0.8 : 0.4
                    }}
                ></div>
            ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-pink-50 dark:from-sky-900 dark:to-indigo-900 opacity-30 pointer-events-none" />

        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
            <div className="pointer-events-auto">
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onBack}
                    className="!bg-white/80 !backdrop-blur-sm !text-gray-600 !border-white !rounded-full shadow-sm hover:!bg-white dark:!bg-sky-900/80 dark:!text-sky-200 dark:!border-sky-700"
                >
                    ✕
                </Button>
            </div>
            
            <div className={`transition-opacity duration-1000 text-center ${hasLaunched ? 'opacity-0' : 'opacity-100'}`}>
                <h1 className="text-2xl font-['Quicksand'] font-bold text-gray-600 dark:text-gray-300">Catch the star</h1>
                <p className="text-sm text-gray-400 mt-1 dark:text-gray-500">If you can.</p>
            </div>

            <div className="w-10"></div>
        </div>

        {/* Taunts Layer */}
        {toasts.map((toast) => {
            // Style based on variant
            let variantClasses = "text-red-500 border-red-500 bg-white dark:bg-gray-800 dark:text-red-400";
            if (toast.variant === 'glitch') variantClasses = "text-green-400 bg-black border-green-400 animate-glitch font-mono";
            
            return (
                <div
                    key={toast.id}
                    className={`absolute pointer-events-none z-30 font-black text-2xl drop-shadow-md border-2 px-2 py-1 whitespace-nowrap animate-pop ${variantClasses}`}
                    style={{
                        left: toast.x,
                        top: toast.y,
                        transform: `rotate(${toast.rotation}deg) scale(${toast.scale})`
                    }}
                >
                    {toast.text}
                </div>
            );
        })}

        <div className="absolute bottom-6 right-6 z-20">
             <button 
                onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-white/50 text-gray-400 hover:bg-white dark:bg-black/30 dark:text-gray-300 dark:hover:bg-black/50 flex items-center justify-center transition-all"
                title="Stuck?"
             >
                ⟳
             </button>
        </div>

        <div ref={sceneRef} className="w-full h-full z-10">
            <canvas ref={canvasRef} className="block" />
        </div>

        {/* Stupid Caution */}
        <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none z-20 px-4">
            <p className="text-blue-400/50 dark:text-sky-200/40 text-[10px] md:text-xs font-mono uppercase tracking-wider">
                ⚠ WARNING: Star is highly volatile. Do not make eye contact. It bites.
            </p>
        </div>

    </div>
  );
};