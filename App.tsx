import React, { useState } from 'react';
import { SliderGame } from './components/SliderGame';
import { Button } from './components/Button';
import { GameState, VICTORY_MESSAGES } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [winMessage, setWinMessage] = useState("");

  const handleWin = () => {
    const msg = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)];
    setWinMessage(msg);
    setGameState(GameState.WON);
    // Simple vibration if supported
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const resetGame = () => {
    setGameState(GameState.PLAYING);
  };

  const goToMenu = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="w-full h-screen bg-yellow-50 overflow-hidden flex items-center justify-center font-sans">
      
      {/* MENU SCREEN */}
      {gameState === GameState.MENU && (
        <div className="flex flex-col items-center gap-8 p-8 max-w-lg w-full animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-2">
            <h1 className="text-6xl md:text-8xl font-black text-black drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
              UNSTABLE<br/>SLIDER
            </h1>
            <p className="text-xl font-bold text-red-500 -rotate-2">
              Warning: May cause rage quitting.
            </p>
          </div>
          
          <div className="p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rotate-1 w-full text-center">
            <p className="mb-4 font-mono text-sm">
              OBJECTIVE: Drag the slider to 100%.<br/>
              OBSTACLE: The slider hates you.
            </p>
            <Button size="lg" onClick={resetGame} className="w-full">
              START GAME
            </Button>
          </div>
        </div>
      )}

      {/* GAME SCREEN */}
      {gameState === GameState.PLAYING && (
        <SliderGame onWin={handleWin} onBack={goToMenu} />
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
            <Button variant="primary" size="lg" onClick={resetGame}>
              Play Again
            </Button>
            <Button variant="secondary" size="lg" onClick={goToMenu}>
              Main Menu
            </Button>
          </div>

          {/* Confetti simulation (simple CSS particles) */}
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