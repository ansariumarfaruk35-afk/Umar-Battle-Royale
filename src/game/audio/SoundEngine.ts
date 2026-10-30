/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeaponType } from '../core/GameTypes';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicInterval: number | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.5;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.createNoiseBuffer();
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  private ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.ctx && this.masterGain && this.sfxGain && this.musicGain) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, t);
      this.sfxGain.gain.setValueAtTime(sfx, t);
      this.musicGain.gain.setValueAtTime(music, t);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- WEAPON SOUNDS ---
  public playGunshot(type: WeaponType, isPlayer: boolean = true, distance: number = 0) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const volScale = isPlayer ? 1.0 : Math.max(0.05, 1.0 - distance / 160);
    if (volScale <= 0.05 && !isPlayer) return;

    // Transient noise pop
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    // Body tonal oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    switch (type) {
      case 'pistol':
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(600, t);
        noiseGain.gain.setValueAtTime(0.7 * volScale, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        oscGain.gain.setValueAtTime(0.6 * volScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        break;

      case 'smg':
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1400, t);
        noiseGain.gain.setValueAtTime(0.6 * volScale, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
        oscGain.gain.setValueAtTime(0.4 * volScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        break;

      case 'rifle':
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(2200, t);
        noiseGain.gain.setValueAtTime(0.85 * volScale, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);
        oscGain.gain.setValueAtTime(0.7 * volScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        break;

      case 'shotgun':
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1800, t);
        noiseGain.gain.setValueAtTime(1.0 * volScale, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

        osc.type = 'square';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.28);
        oscGain.gain.setValueAtTime(0.9 * volScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        break;

      case 'sniper':
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(3200, t);
        noiseGain.gain.setValueAtTime(1.2 * volScale, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.45);
        oscGain.gain.setValueAtTime(1.0 * volScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        break;
    }

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.6);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  public playReload() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Mag out click
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(800, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.08);
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.09);

    // Mag in click
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(400, t + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(700, t + 0.45);
    g2.gain.setValueAtTime(0.4, t + 0.35);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(t + 0.35);
    osc2.stop(t + 0.46);

    // Cock slide click
    const osc3 = this.ctx.createOscillator();
    const g3 = this.ctx.createGain();
    osc3.frequency.setValueAtTime(1200, t + 0.7);
    osc3.frequency.exponentialRampToValueAtTime(450, t + 0.8);
    g3.gain.setValueAtTime(0.35, t + 0.7);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc3.connect(g3);
    g3.connect(this.sfxGain);
    osc3.start(t + 0.7);
    osc3.stop(t + 0.82);
  }

  public playHitMarker(isHeadshot: boolean = false) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isHeadshot ? 'triangle' : 'sine';
    const startFreq = isHeadshot ? 1760 : 950;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2640 : 1300, t + 0.08);

    gain.gain.setValueAtTime(isHeadshot ? 0.6 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playFootstep() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400 + Math.random() * 200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.08);
  }

  public playJump() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.14);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playLand() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.18);
  }

  public playPickup() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.05); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.1); // G5
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playHeal() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  public playParachuteDeploy() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.55);
  }

  public playExplosion(distance: number = 0) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const vol = Math.max(0.1, 1.2 - distance / 150);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 1.5);
  }

  public playStormWarning() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(350, t + 0.2);
    osc.frequency.setValueAtTime(440, t + 0.4);
    osc.frequency.setValueAtTime(350, t + 0.6);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.92);
  }

  public playVictoryFanfare() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C E G C5 E5 G5
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0.45, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.45);
    });
  }

  public startMenuMusic() {
    this.ensureContext();
    if (this.musicInterval) return;
    if (!this.ctx || !this.musicGain) return;

    // Atmospheric low bass drone + arp
    const scale = [110, 130.81, 146.83, 164.81, 196.0, 220]; // A minor pentatonic
    let step = 0;

    const playBeat = () => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const freq = scale[step % scale.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = step % 4 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const dur = 0.28;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);

      step++;
    };

    playBeat();
    this.musicInterval = window.setInterval(playBeat, 320);
  }

  public stopMenuMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();
