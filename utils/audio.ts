

export class AudioController {
  private ctx: AudioContext | null = null;
  private dragOsc: OscillatorNode | null = null;
  private dragGain: GainNode | null = null;
  
  // Upload Game specific
  private uploadOsc: OscillatorNode | null = null;
  private uploadGain: GainNode | null = null;

  // Zen Game specific
  private windOsc: OscillatorNode | null = null;
  private windGain: GainNode | null = null;

  // Singleton instance
  static instance = new AudioController();

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- SLIDER GAME AUDIO ---

  playToast(variant: 'normal' | 'warning' | 'danger' | 'glitch') {
    this.init();
    if (!this.ctx) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch(variant) {
        case 'normal': // Pop
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.2);
            break;
        case 'warning': // Double beep
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.setValueAtTime(0, t + 0.1);
            osc.frequency.setValueAtTime(300, t + 0.15);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.setTargetAtTime(0, t + 0.3, 0.05);
            osc.start(t);
            osc.stop(t + 0.4);
            break;
        case 'danger': // Siren
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
            osc.frequency.linearRampToValueAtTime(800, t + 0.2);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
            break;
        case 'glitch': // Noise-ish
            osc.type = 'sawtooth';
            // Rapid random frequency changes
            osc.frequency.setValueAtTime(Math.random() * 1000 + 100, t);
            osc.frequency.linearRampToValueAtTime(Math.random() * 1000 + 100, t + 0.05);
            osc.frequency.linearRampToValueAtTime(Math.random() * 1000 + 100, t + 0.1);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
            break;
    }
  }

  startDrag() {
    this.init();
    if (!this.ctx) return;
    
    if (this.dragOsc) this.stopDrag();

    this.dragOsc = this.ctx.createOscillator();
    this.dragGain = this.ctx.createGain();
    
    this.dragOsc.type = 'triangle';
    this.dragOsc.frequency.setValueAtTime(220, this.ctx.currentTime);
    
    this.dragGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.dragGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1);

    this.dragOsc.connect(this.dragGain);
    this.dragGain.connect(this.ctx.destination);
    
    this.dragOsc.start();
  }

  updateDrag(percent: number, chaosMode: string) {
    if (!this.ctx || !this.dragOsc) return;
    
    const t = this.ctx.currentTime;
    let targetFreq = 220 + (percent * 8); 

    if (chaosMode === 'shaking') {
        targetFreq += Math.sin(t * 50) * 50;
    } else if (chaosMode === 'slippery') {
        targetFreq += Math.sin(t * 10) * 20;
    } else if (chaosMode === 'glitch') {
        targetFreq = Math.random() * 1000;
    }

    this.dragOsc.frequency.setTargetAtTime(targetFreq, t, 0.05);
  }

  stopDrag() {
    if (!this.ctx || !this.dragGain) return;
    
    const t = this.ctx.currentTime;
    this.dragGain.gain.setTargetAtTime(0, t, 0.05);
    
    const osc = this.dragOsc;
    const gain = this.dragGain;
    
    this.dragOsc = null;
    this.dragGain = null;

    setTimeout(() => {
        if (osc) try { osc.stop(); osc.disconnect(); } catch(e){}
        if (gain) try { gain.disconnect(); } catch(e){}
    }, 100);
  }

  playSnap() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }
  
  playThreshold(level: number) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(level * 5 + 400, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      
      osc.start(t);
      osc.stop(t + 0.1);
  }

  // --- UPLOAD GAME AUDIO ---

  startUploadHum() {
    this.init();
    if (!this.ctx) return;
    if (this.uploadOsc) return; 

    this.uploadOsc = this.ctx.createOscillator();
    this.uploadGain = this.ctx.createGain();

    this.uploadOsc.type = 'sawtooth'; // Grittier sound for retro feel
    this.uploadOsc.frequency.setValueAtTime(100, this.ctx.currentTime);

    this.uploadGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.uploadGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1);

    // Lowpass filter to muffle it initially
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    this.uploadOsc.connect(filter);
    filter.connect(this.uploadGain);
    this.uploadGain.connect(this.ctx.destination);

    this.uploadOsc.start();
  }

  updateUploadHum(percent: number) {
    if (!this.ctx || !this.uploadOsc) return;
    const t = this.ctx.currentTime;
    
    // Pitch rises dramatically
    // 0% = 100Hz, 50% = 400Hz, 99% = 2000Hz
    const freq = 100 + (percent * 10) + (percent > 90 ? (percent - 90) * 100 : 0);
    this.uploadOsc.frequency.setTargetAtTime(freq, t, 0.1);
  }

  stopUploadHum() {
    if (!this.ctx || !this.uploadGain) return;
    const t = this.ctx.currentTime;
    
    this.uploadGain.gain.setTargetAtTime(0, t, 0.05);
    const osc = this.uploadOsc;
    const gain = this.uploadGain;
    
    this.uploadOsc = null;
    this.uploadGain = null;

    setTimeout(() => {
        if (osc) try { osc.stop(); osc.disconnect(); } catch(e){}
        if (gain) try { gain.disconnect(); } catch(e){}
    }, 100);
  }

  playError() {
    // Windows XP Error style
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playShatter() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // White noise buffer
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playTauntScare() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // A loud, discordant buzzy sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(100, t);
    osc1.frequency.linearRampToValueAtTime(50, t + 0.2);

    osc2.frequency.setValueAtTime(105, t); // Slight detune for dissonance
    osc2.frequency.linearRampToValueAtTime(55, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  // --- ZEN GAME AUDIO ---

  playThud() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Low frequency thud
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playWindGust() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Pink noise buffer for wind
    const bufferSize = this.ctx.sampleRate * 2.0; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02; // Simple pinking filter
        lastOut = data[i];
        data[i] *= 3.5; 
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(600, t + 1);
    filter.frequency.linearRampToValueAtTime(200, t + 2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 1);
    gain.gain.linearRampToValueAtTime(0, t + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(t);
  }

  playSoftClick() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

// Helper for pink noise state
let lastOut = 0;