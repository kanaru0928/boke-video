import * as dashjs from "dashjs";

export class DashPlayer {
  private player: dashjs.MediaPlayerClass | null = null;

  attach(video: HTMLVideoElement, manifestUrl: string): void {
    this.destroy();
    this.player = dashjs.MediaPlayer().create();
    this.player.updateSettings({
      streaming: {
        delay: {
          liveDelay: 1.5,
        },
        buffer: {
          bufferTimeDefault: 1,
          bufferTimeAtTopQuality: 1,
          bufferTimeAtTopQualityLongForm: 1,
        },
        liveCatchup: {
          enabled: true,
          maxDrift: 0.5,
          playbackRate: {
            min: -0.05,
            max: 0.15,
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
    video.autoplay = true;
    video.muted = true;
    void video.play();
  }

  destroy(): void {
    if (this.player !== null) {
      this.player.destroy();
      this.player = null;
    }
  }
}
