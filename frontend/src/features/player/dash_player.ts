import * as dashjs from "dashjs";

export class DashPlayer {
  private player: dashjs.MediaPlayerClass | null = null;

  attach(video: HTMLVideoElement, manifestUrl: string): void {
    this.destroy();
    this.player = dashjs.MediaPlayer().create();
    this.player.updateSettings({
      streaming: {
        delay: {
          liveDelay: 2,
        },
        buffer: {
          bufferTimeDefault: 2,
          bufferTimeAtTopQuality: 2,
          bufferTimeAtTopQualityLongForm: 2,
        },
        liveCatchup: {
          enabled: true,
          maxDrift: 1,
          playbackRate: {
            min: -0.05,
            max: 0.1,
          },
        },
        abr: {
          autoSwitchBitrate: {
            video: true,
            audio: true,
          },
          initialBitrate: {
            video: 1500,
          },
        },
      },
    });
    this.player.initialize(video, manifestUrl, true);
  }

  destroy(): void {
    if (this.player !== null) {
      this.player.destroy();
      this.player = null;
    }
  }
}
