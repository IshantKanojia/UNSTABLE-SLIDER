
export class AudioController {
  private ctx: AudioContext | null = null;
  private dragOsc: OscillatorNode | null = null;
  private dragGain: GainNode | null = null;
  
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
    
    // Stop existing if any
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
    let targetFreq = 220 + (percent * 8); // 220Hz to ~1000Hz

    // Modulate based on chaos
    if (chaosMode === 'shaking') {
        targetFreq += Math.sin(t * 50) * 50;
    } else if (chaosMode === 'slippery') {
        targetFreq += Math.sin(t * 10) * 20;
    } else if (chaosMode === 'glitch') {
        targetFreq = Math.random() * 1000;
    }

    // Use setTargetAtTime for smooth transition but quick enough
    this.dragOsc.frequency.setTargetAtTime(targetFreq, t, 0.05);
  }

  stopDrag() {
    if (!this.ctx || !this.dragGain) return;
    
    const t = this.ctx.currentTime;
    // Fade out
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
}
