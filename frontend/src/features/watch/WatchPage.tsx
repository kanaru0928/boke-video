import {
  Maximize,
  Pause,
  Play,
  Send,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AppConfig } from "../../shared/config/config";
import { directionLabel } from "../comments/comment_labels";
import {
  type CommentCreateRequest,
  type CommentDirection,
  type CommentFontSize,
  commentColors,
  commentDirections,
} from "../comments/types";
import { useRooms } from "../rooms/useRooms";
import { isCommentSubmitShortcut } from "./comment_shortcuts";
import { useCommentRenderer } from "./useCommentRenderer";
import { useCommentSocket } from "./useCommentSocket";
import { useStreamPlayer } from "./useStreamPlayer";

type WatchPageProps = {
  config: AppConfig;
};

const commentSizeOptions: { label: string; value: CommentFontSize }[] = [
  { label: "小", value: "small" },
  { label: "中", value: "medium" },
  { label: "大", value: "large" },
];

export function WatchPage({ config }: WatchPageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [body, setBody] = useState("");
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDirection, setSelectedDirection] =
    useState<CommentDirection>("rightToLeft");
  const [selectedSize, setSelectedSize] = useState<CommentFontSize>("medium");
  const [selectedColor, setSelectedColor] = useState<string>(commentColors[0]);
  const { rooms } = useRooms(config);
  const { clearComments, commentsLayerRef, renderComment } =
    useCommentRenderer();
  const { sendComment } = useCommentSocket(
    config,
    selectedRoomId,
    renderComment,
  );
  const { streamMessage } = useStreamPlayer(config, selectedRoomId, videoRef);

  useEffect(() => {
    if (rooms.length === 0 || selectedRoomId !== "") {
      return;
    }
    const queryRoomId = new URLSearchParams(location.search).get("room");
    const initialRoomId = queryRoomId ?? rooms[0]?.id ?? "";
    setSelectedRoomId(initialRoomId);
    if (queryRoomId === null && initialRoomId !== "") {
      history.replaceState(
        null,
        "",
        `/?room=${encodeURIComponent(initialRoomId)}`,
      );
    }
  }, [rooms, selectedRoomId]);

  const updatePlayerState = (): void => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    setIsPaused(video.paused);
    setIsMuted(video.muted);
  };

  const submitComment = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const request: CommentCreateRequest = {
      body,
      direction: selectedDirection,
      color: selectedColor,
      fontSize: selectedSize,
    };
    sendComment(request);
    setBody("");
  };

  const submitCommentByShortcut = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (!isCommentSubmitShortcut(event)) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const switchRoom = (roomId: string): void => {
    clearComments();
    setSelectedRoomId(roomId);
    history.replaceState(null, "", `/?room=${encodeURIComponent(roomId)}`);
  };

  const togglePlayback = (): void => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
    updatePlayerState();
  };

  const toggleMuted = (): void => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    video.muted = !video.muted;
    updatePlayerState();
  };

  const toggleFullscreen = (): void => {
    if (document.fullscreenElement === null) {
      void stageRef.current?.requestFullscreen();
      return;
    }
    void document.exitFullscreen();
  };

  return (
    <section className="watch-shell">
      <header className="topbar">
        <h1>Boke Video</h1>
        <a className="link-button" href="/admin">
          <Settings aria-hidden="true" size={18} />
          管理
        </a>
      </header>
      <section className="watch-grid">
        <section ref={stageRef} className="stage">
          <video
            ref={videoRef}
            muted
            onPause={updatePlayerState}
            onPlay={updatePlayerState}
            onVolumeChange={updatePlayerState}
            playsInline
          />
          <div ref={commentsLayerRef} className="comments-layer" />
          {streamMessage !== "" ? (
            <div className="stream-status">{streamMessage}</div>
          ) : null}
          <div className="player-controls">
            <button type="button" onClick={togglePlayback}>
              {isPaused ? (
                <Play aria-hidden="true" size={18} />
              ) : (
                <Pause aria-hidden="true" size={18} />
              )}
              {isPaused ? "再生" : "一時停止"}
            </button>
            <span className="live-badge">LIVE</span>
            <button type="button" onClick={toggleMuted}>
              {isMuted ? (
                <VolumeX aria-hidden="true" size={18} />
              ) : (
                <Volume2 aria-hidden="true" size={18} />
              )}
              {isMuted ? "消音中" : "音声"}
            </button>
            <button
              id="fullscreen-toggle"
              type="button"
              onClick={toggleFullscreen}
            >
              <Maximize aria-hidden="true" size={18} />
              全画面
            </button>
          </div>
        </section>
        <aside className="side-panel">
          <label className="field">
            <span>ルーム</span>
            <select
              value={selectedRoomId}
              onChange={(event) => switchRoom(event.currentTarget.value)}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.title}
                </option>
              ))}
            </select>
          </label>
          <form className="comment-form" onSubmit={submitComment}>
            <div className="comment-compose">
              <textarea
                maxLength={100}
                onChange={(event) => setBody(event.currentTarget.value)}
                onKeyDown={submitCommentByShortcut}
                placeholder="コメント"
                required
                value={body}
              />
              <button type="submit">
                <Send aria-hidden="true" size={18} />
                送信
              </button>
            </div>
            <fieldset className="choice-field">
              <legend>方向</legend>
              <div className="choice-grid choice-grid-direction">
                {commentDirections.map((direction) => (
                  <ChoiceChip
                    checked={direction === selectedDirection}
                    key={direction}
                    name="comment-direction"
                    onChange={() => setSelectedDirection(direction)}
                    text={directionLabel(direction)}
                    value={direction}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="choice-field">
              <legend>大きさ</legend>
              <div className="choice-grid choice-grid-size">
                {commentSizeOptions.map((size) => (
                  <ChoiceChip
                    checked={size.value === selectedSize}
                    key={size.value}
                    name="comment-size"
                    onChange={() => setSelectedSize(size.value)}
                    text={size.label}
                    value={size.value}
                  />
                ))}
              </div>
            </fieldset>
            <div className="color-row">
              {commentColors.map((color) => (
                <button
                  aria-label={color}
                  className={
                    color === selectedColor
                      ? "color-button is-selected"
                      : "color-button"
                  }
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
          </form>
        </aside>
      </section>
    </section>
  );
}

type ChoiceChipProps<T extends string> = {
  checked: boolean;
  name: string;
  onChange: () => void;
  text: string;
  value: T;
};

function ChoiceChip<T extends string>({
  checked,
  name,
  onChange,
  text,
  value,
}: ChoiceChipProps<T>) {
  return (
    <label className="choice-chip">
      <input
        checked={checked}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span>{text}</span>
    </label>
  );
}
