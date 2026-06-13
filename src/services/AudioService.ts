import { Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

type AlarmPlayer = ReturnType<typeof createAudioPlayer>;

const SOUND_ASSETS: Record<string, any> = {
  'alarm.mpeg': require('../../assets/alarm.mpeg'),
};

class AudioService {
  private player: AlarmPlayer | null = null;
  private previewPlayer: AlarmPlayer | null = null;
  private isPlaying = false;
  private playRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private previewRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private defaultSound = SOUND_ASSETS['alarm.mpeg'];

  async init() {
    console.log("AudioService initialized");
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix'
      });
    } catch (e) {
      // Suppress warning to keep logs clean.
    }
  }

  setAlarmSound() {
    // No-op: alarm always uses default
    if (this.player) {
      try {
        this.player.pause();
      } catch {
        // ignore
      }
      this.player = null;
    }
  }

  private async getPlayerAsync() {
    if (!this.player) {
      this.player = createAudioPlayer(this.defaultSound, {
        updateInterval: 250,
        keepAudioSessionActive: true,
      });
      this.player.loop = true;
      this.player.volume = 1;
      this.player.muted = false;
      if (typeof this.player.setVolumeAsync === 'function') {
        await this.player.setVolumeAsync(1);
      }
      if (typeof this.player.setIsMutedAsync === 'function') {
        await this.player.setIsMutedAsync(false);
      }
    }

    return this.player;
  }

  private async getPreviewPlayerAsync() {
    if (this.previewPlayer) {
      try {
        this.previewPlayer.pause();
      } catch {
        // ignore
      }
      this.previewPlayer = null;
    }

    this.previewPlayer = createAudioPlayer(this.defaultSound, {
      updateInterval: 250,
      keepAudioSessionActive: true,
    });
    this.previewPlayer.loop = false;
    this.previewPlayer.volume = 1;
    this.previewPlayer.muted = false;
    if (typeof this.previewPlayer.setVolumeAsync === 'function') {
      await this.previewPlayer.setVolumeAsync(1);
    }
    if (typeof this.previewPlayer.setIsMutedAsync === 'function') {
      await this.previewPlayer.setIsMutedAsync(false);
    }
    return this.previewPlayer;
  }

  private clearPlayRetry() {
    if (this.playRetryTimer) {
      clearTimeout(this.playRetryTimer);
      this.playRetryTimer = null;
    }
  }

  private clearPreviewRetry() {
    if (this.previewRetryTimer) {
      clearTimeout(this.previewRetryTimer);
      this.previewRetryTimer = null;
    }
  }

  private async startPlayerWhenReady(attempt = 0) {
    const player = await this.getPlayerAsync();

    player.loop = true;
    player.volume = 1;
    player.muted = false;

    if (player.isLoaded) {
      try {
        player.seekTo(0).catch((error) => {
          console.log('Alarm audio seek ignored:', error);
        });
        player.play();
        this.isPlaying = true;
      } catch (error) {
        console.error('Error starting alarm audio', error);
      }
      return;
    }

    if (attempt < 20) {
      this.playRetryTimer = setTimeout(() => {
        this.startPlayerWhenReady(attempt + 1);
      }, 250);
    } else {
      console.warn('Alarm audio did not finish loading in time.');
    }
  }

  private startPreviewWhenReady(player: AlarmPlayer, attempt = 0) {
    if (player.isLoaded) {
      try {
        player.seekTo(0).catch((error) => {
          console.log('Preview seek ignored:', error);
        });
        player.play();
      } catch (error) {
        console.error('Error starting preview audio', error);
      }
      return;
    }

    if (attempt < 20) {
      this.previewRetryTimer = setTimeout(() => {
        this.startPreviewWhenReady(player, attempt + 1);
      }, 250);
    } else {
      console.warn('Preview audio did not finish loading in time.');
    }
  }

  async previewSound() {
    try {
      await setIsAudioActiveAsync(true);
      await this.init();

      this.clearPreviewRetry();
      const previewPlayer = await this.getPreviewPlayerAsync();
      this.startPreviewWhenReady(previewPlayer);
    } catch (e) {
      console.error('Error previewing alarm sound', e);
      throw e;
    }
  }

  async stopPreview() {
    try {
      this.clearPreviewRetry();
      if (this.previewPlayer) {
        try {
          this.previewPlayer.pause();
        } catch {
          // ignore
        }
        this.previewPlayer = null;
      }
    } catch (e) {
      console.error('Error stopping preview', e);
    }
  }

  async playAlarm() {
    try {
      await setIsAudioActiveAsync(true);
      await this.init();

      // Aggressive repeating vibration pattern
      Vibration.vibrate([0, 500, 200, 500, 200, 1000, 1000], true); 

      const player = await this.getPlayerAsync();
      if (!this.isPlaying || !player.playing) {
        this.clearPlayRetry();
        await this.startPlayerWhenReady();
      }

      console.log("Playing alarm sound and vibration...");
    } catch (e) {
      console.error('Error playing alarm', e);
    }
  }

  async stopAlarm() {
    try {
      Vibration.cancel();
      this.clearPlayRetry();
      if (this.player) {
        try {
          this.player.pause();
        } catch (error) {
          console.log('Alarm audio pause ignored:', error);
        }
      }
      this.isPlaying = false;
      console.log("Stopped alarm");
    } catch (e) {
      console.error('Error stopping alarm', e);
    }
  }
}

export default new AudioService();
