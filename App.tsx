
import React, { useState } from 'react';
import { SliderGame } from './components/SliderGame';
import { SisypheanUploadGame } from './components/SisypheanUploadGame';
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

  const resetGame = (game: GameState) => {
    setGameState(game);
  };

  const goToMenu = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="w-full h-screen bg-yellow-50 overflow-hidden flex items-center justify-center font-sans">
      
      {/* MENU SCREEN */}
      {gameState === GameState.MENU && (
        <div className="flex flex-col items-center gap-8 p-4 md:p-8 max-w-4xl w-full animate-in fade-in zoom-in duration-300 h-full justify-center">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-5xl md:text-8xl font-black text-black drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
              RAGE ARCADE
            </h1>
            <p className="text-xl font-bold text-red-500 -rotate-2">
              Choose your suffering.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-stretch">
            
            {/* GAME 1 CARD */}
            <div className="flex-1 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-6 flex flex-col items-center hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#000] transition-all">
                <div className="text-4xl mb-4">🎚️</div>
                <h2 className="text-2xl font-black mb-2 uppercase">Unstable Slider</h2>
                <p className="text-sm font-mono text-center mb-6 opacity-70 flex-1">
                    Drag the slider to 100%. It fights back. It lies. It cheats.
                </p>
                <Button size="lg" onClick={() => resetGame(GameState.PLAYING_SLIDER)} className="w-full">
                PLAY
                </Button>
            </div>

            {/* GAME 2 CARD */}
            <div className="flex-1 bg-black border-4 border-green-500 shadow-[8px_8px_0_0_#15803d] p-6 flex flex-col items-center hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#15803d] transition-all text-green-500">
                <div className="text-4xl mb-4">💾</div>
                <h2 className="text-2xl font-black mb-2 uppercase tracking-widest">Sisyphean Upload</h2>
                <p className="text-sm font-mono text-center mb-6 opacity-70 flex-1">
                    Hold to upload. Manage heat. Endure packet loss. 99.99% is not enough.
                </p>
                <Button variant="secondary" size="lg" onClick={() => resetGame(GameState.PLAYING_UPLOAD)} className="w-full !bg-green-600 !border-green-800 !text-black hover:!bg-green-500">
                UPLOAD
                </Button>
            </div>

          </div>
        </div>
      )}

      {/* GAME SCREENS */}
      {gameState === GameState.PLAYING_SLIDER && (
        <SliderGame onWin={handleWin} onBack={goToMenu} />
      )}

      {gameState === GameState.PLAYING_UPLOAD && (
        <SisypheanUploadGame onBack={goToMenu} />
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
