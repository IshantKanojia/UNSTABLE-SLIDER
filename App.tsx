import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SliderGame } from './components/SliderGame';
import { SisypheanUploadGame } from './components/SisypheanUploadGame';
import { ZenTowerGame } from './components/ZenTowerGame';
import { StarDropGame } from './components/StarDropGame';
import { Button } from './components/Button';
import { GameState, VICTORY_MESSAGES } from './constants';

const GLYPHS = "ABCDEFGHIJKLMOPQRSTUVWXYZ!@#$%^&*()_+1234567890";

const ShuffleText: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number | null>(null);
  const isShufflingRef = useRef(false);

  const triggerShuffle = useCallback(() => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;
    
    let iteration = 0;
    const originalText = text;
    
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setDisplayText(
        originalText
          .split("")
          .map((char, index) => {
            if (index < iteration) {
              return originalText[index];
            }
            if (char === " ") return " ";
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );

      iteration += 1 / 3;

      if (iteration >= originalText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(originalText);
        isShufflingRef.current = false;
      }
    }, 30);
  }, [text]);

  useEffect(() => {
    const timer = setInterval(triggerShuffle, 6000);
    triggerShuffle(); // Initial trigger

    return () => {
      clearInterval(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [triggerShuffle]);

  return (
    <span 
      onMouseEnter={triggerShuffle} 
      className="cursor-default inline-block hover:scale-105 transition-transform"
    >
      {displayText}
    </span>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [winMessage, setWinMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleWin = () => {
    const msg = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)];
    setWinMessage(msg);
    setGameState(GameState.WON);
    // Simple vibration if supported
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const resetGame = (game: GameState) => {
    setGameState(game);
  };

  const goToMenu = () => {
    setGameState(GameState.MENU);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="w-full h-screen bg-yellow-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center font-sans transition-colors duration-300">
      
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button 
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all"
        >
            {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      {/* MENU SCREEN */}
      {gameState === GameState.MENU && (
        <div className="flex flex-col items-center gap-8 p-4 md:p-8 max-w-6xl w-full animate-in fade-in zoom-in duration-300 h-full justify-center">
          <div className="text-center space-y-2 mb-4 md:mb-8 shrink-0">
            <h1 className="text-4xl md:text-8xl font-black text-black dark:text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)] dark:drop-shadow-[4px_4px_0_rgba(255,255,255,0.2)] min-h-[1.2em] font-mono">
              <ShuffleText text="RAGE ARCADE" />
            </h1>
            <p className="text-xl font-bold text-red-500 -rotate-2">
              Choose your suffering.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full justify-center items-stretch flex-1 min-h-0 overflow-y-auto md:overflow-visible p-2 md:p-0">
            
            {/* GAME 1 CARD */}
            <div className="flex-1 min-w-[200px] min-h-[200px] bg-white dark:bg-zinc-800 border-4 border-black dark:border-zinc-500 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#666] p-6 flex flex-col items-center hover:-translate-y-1 transition-all shrink-0">
                <div className="text-4xl mb-4">🎚️</div>
                <h2 className="text-xl font-black mb-2 uppercase text-center dark:text-white">Unstable Slider</h2>
                <p className="text-xs font-mono text-center mb-6 opacity-70 flex-1 dark:text-gray-300">
                    Drag the slider to 100%. It fights back. It lies. It cheats.
                </p>
                <Button size="md" onClick={() => resetGame(GameState.PLAYING_SLIDER)} className="w-full">
                PLAY
                </Button>
            </div>

            {/* GAME 2 CARD */}
            <div className="flex-1 min-w-[200px] min-h-[200px] bg-black border-4 border-green-500 shadow-[8px_8px_0_0_#15803d] p-6 flex flex-col items-center hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#15803d] transition-all text-green-500 shrink-0">
                <div className="text-4xl mb-4">💾</div>
                <h2 className="text-xl font-black mb-2 uppercase tracking-widest text-center">Sisyphean Upload</h2>
                <p className="text-xs font-mono text-center mb-6 opacity-70 flex-1">
                    Hold to upload. Manage heat. Endure packet loss. 99.99% is not enough.
                </p>
                <Button variant="secondary" size="md" onClick={() => resetGame(GameState.PLAYING_UPLOAD)} className="w-full !bg-green-600 !border-green-800 !text-black hover:!bg-green-500">
                UPLOAD
                </Button>
            </div>

            {/* GAME 3 CARD */}
            <div className="flex-1 min-w-[200px] min-h-[200px] bg-purple-50 dark:bg-indigo-950 border-4 border-purple-300 dark:border-indigo-700 shadow-[8px_8px_0_0_#d8b4fe] dark:shadow-[8px_8px_0_0_#4338ca] p-6 flex flex-col items-center hover:-translate-y-1 transition-all text-purple-900 dark:text-purple-100 shrink-0">
                <div className="text-4xl mb-4">🏯</div>
                <h2 className="text-xl font-black mb-2 uppercase text-center font-['Quicksand']">Zen Tower</h2>
                <p className="text-xs font-sans text-center mb-6 opacity-70 flex-1 dark:text-indigo-200">
                    Relax and stack. The wind is just a suggestion. Physics is a state of mind.
                </p>
                <Button variant="secondary" size="md" onClick={() => resetGame(GameState.PLAYING_ZEN)} className="w-full !bg-purple-300 !border-purple-400 !text-white hover:!bg-purple-400 dark:!bg-indigo-600 dark:!border-indigo-500">
                RELAX
                </Button>
            </div>

            {/* GAME 4 CARD (NEW) */}
            <div className="flex-1 min-w-[200px] min-h-[200px] bg-[#E1F5FE] dark:bg-sky-950 border-4 border-[#81D4FA] dark:border-sky-700 shadow-[8px_8px_0_0_#29B6F6] dark:shadow-[8px_8px_0_0_#0369a1] p-6 flex flex-col items-center hover:-translate-y-1 transition-all text-blue-900 dark:text-sky-100 shrink-0">
                <div className="text-4xl mb-4">⭐</div>
                <h2 className="text-xl font-black mb-2 uppercase text-center font-['Quicksand']">Sleepy Star</h2>
                <p className="text-xs font-sans text-center mb-6 opacity-70 flex-1 dark:text-sky-200">
                    Help the star rest. Gentle movements. It's very tired.
                </p>
                <Button variant="secondary" size="md" onClick={() => resetGame(GameState.PLAYING_STAR)} className="w-full !bg-white !border-blue-200 !text-blue-500 hover:!bg-blue-50 dark:!bg-sky-900 dark:!border-sky-700 dark:!text-sky-200">
                HUSH
                </Button>
            </div>

          </div>
        </div>
      )}

      {/* GAME SCREENS */}
      {gameState === GameState.PLAYING_SLIDER && (
        <SliderGame onWin={handleWin} onBack={goToMenu} isDarkMode={isDarkMode} />
      )}

      {/* GAME SCREENS */}
      {gameState === GameState.PLAYING_UPLOAD && (
        <SisypheanUploadGame onBack={goToMenu} />
      )}

      {gameState === GameState.PLAYING_ZEN && (
        <ZenTowerGame onBack={goToMenu} isDarkMode={isDarkMode} />
      )}

      {gameState === GameState.PLAYING_STAR && (
        <StarDropGame onBack={goToMenu} isDarkMode={isDarkMode} />
      )}

      {/* WIN SCREEN */}
      {gameState === GameState.WON && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-white p-4 text-center">
          <div className="animate-bounce mb-8">
            <span className="text-6xl">🏆</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-yellow-400 mb-4 animate-pulse">
            {winMessage}
          </h1>
          <p className="text-xl md:text-2xl mb-12 font-mono text-gray-300">
            We honestly didn't think that was possible.
          </p>
          
          <div className="flex gap-4 flex-wrap justify-center">
            <Button variant="primary" size="lg" onClick={goToMenu}>
              Back to Menu
            </Button>
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {[...Array(20)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute w-4 h-4 bg-red-500 animate-spin"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                   animationDuration: `${Math.random() * 3 + 1}s`,
                   backgroundColor: ['#ff0', '#f0f', '#0ff', '#0f0'][i % 4]
                 }}
               ></div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;