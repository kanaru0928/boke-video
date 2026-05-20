import {
  Maximize,
  Pause,
  Play,
  RefreshCw,
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
  type CommentMessage,
  commentColors,
  commentDirections,
} from "../comments/types";
import { useRooms } from "../rooms/useRooms";
import { isCommentSubmitShortcut } from "./comment_shortcuts";
import { commentLogNumber, formatElapsedTime } from "./room_activity";
import { useCommentRenderer } from "./useCommentRenderer";
import { useCommentSocket } from "./useCommentSocket";
import { useRoomActivity } from "./useRoomActivity";
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
  const { comments, elapsedSeconds, recordComment, stats } = useRoomActivity(
    config,
    selectedRoomId,
  );
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const renderAndRecordComment = (message: CommentMessage): void => {
    renderComment(message);
    recordComment(message);
  };
  const { sendComment } = useCommentSocket(
    config,
    selectedRoomId,
    renderAndRecordComment,
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
        `/watch?room=${encodeURIComponent(initialRoomId)}`,
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
    history.replaceState(null, "", `/watch?room=${encodeURIComponent(roomId)}`);
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
        <a className="site-mark" href="/">
          <span className="site-mark-main">Boke Video</span>
          <span className="site-mark-sub">LIVE</span>
        </a>
        <nav className="topnav" aria-label="メニュー">
          <a href="/">枠一覧</a>
          <a href="/admin">管理</a>
        </nav>
      </header>
      <section className="program-board">
        <div>
          <p className="program-kicker">ON AIR</p>
          <h1>{selectedRoom?.title ?? "番組取得中"}</h1>
        </div>
        <label className="room-select">
          <span>番組</span>
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
      </section>
      <section className="watch-grid">
        <main className="player-column">
          <section ref={stageRef} className="stage">
            <video
              autoPlay
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
          </section>
          <div className="player-controls">
            <button
              aria-label={isPaused ? "再生" : "一時停止"}
              id="play-toggle"
              type="button"
              onClick={togglePlayback}
            >
              {isPaused ? (
                <Play aria-hidden="true" size={18} />
              ) : (
                <Pause aria-hidden="true" size={18} />
              )}
            </button>
            <button
              aria-label={isMuted ? "消音中" : "音声"}
              id="mute-toggle"
              type="button"
              onClick={toggleMuted}
            >
              {isMuted ? (
                <VolumeX aria-hidden="true" size={18} />
              ) : (
                <Volume2 aria-hidden="true" size={18} />
              )}
            </button>
            <span className="play-time">
              経過時間　{formatElapsedTime(elapsedSeconds)}
            </span>
            <span className="live-badge">●LIVE</span>
            <button
              aria-label="更新"
              id="reload-toggle"
              type="button"
              onClick={() => location.reload()}
            >
              <RefreshCw aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="全画面"
              id="fullscreen-toggle"
              type="button"
              onClick={toggleFullscreen}
            >
              <Maximize aria-hidden="true" size={18} />
            </button>
            <a className="setting-link" href="/admin" aria-label="管理">
              <Settings aria-hidden="true" size={18} />
            </a>
          </div>
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
                コメント
              </button>
            </div>
            <div className="comment-options">
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
            </div>
          </form>
        </main>
        <aside className="side-panel">
          <div className="counter-strip">
            <span>
              来場者
              <br />
              {stats?.visitorCount ?? 0}
            </span>
            <span>
              コメント
              <br />
              {stats?.commentCount ?? comments.length}
            </span>
            <span>
              経過
              <br />
              {formatElapsedTime(elapsedSeconds)}
            </span>
          </div>
          <div className="tab-row">
            <button type="button" className="is-active">
              コメント
            </button>
          </div>
          <ol className="comment-log" aria-label="コメント">
            {comments.map((comment, index) => (
              <li key={comment.commentId}>
                <span>
                  {commentLogNumber(
                    index,
                    comments.length,
                    stats?.commentCount ?? comments.length,
                  )}
                </span>
                <p>{comment.body}</p>
              </li>
            ))}
          </ol>
          <div className="info-ticker">
            <span>INFO</span>
            <p>{selectedRoom === null ? "番組取得中" : "コメント受付中"}</p>
          </div>
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
