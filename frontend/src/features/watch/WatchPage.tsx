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
import { AppHeader } from "../../shared/ui/AppHeader";
import { cn } from "../../shared/ui/classNames";
import {
  appShellClassName,
  buttonClassName,
  formControlClassName,
  textareaClassName,
} from "../../shared/ui/styles";
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
import {
  activeTabButtonClassName,
  choiceChipInputClassName,
  choiceChipLabelClassName,
  choiceChipTextClassName,
  choiceFieldClassName,
  colorButtonClassName,
  colorRowClassName,
  commentComposeClassName,
  commentFormClassName,
  commentLogBodyClassName,
  commentLogClassName,
  commentLogItemClassName,
  commentLogNumberClassName,
  commentOptionsClassName,
  commentSubmitButtonClassName,
  commentsLayerClassName,
  counterStripClassName,
  directionChoiceGridClassName,
  infoTickerClassName,
  liveBadgeClassName,
  playerColumnClassName,
  playerControlsClassName,
  playTimeClassName,
  programBoardClassName,
  programKickerClassName,
  programTitleClassName,
  roomSelectClassName,
  secondCommentLogBodyClassName,
  selectedColorButtonClassName,
  sidePanelClassName,
  sizeChoiceGridClassName,
  stageClassName,
  streamStatusClassName,
  tabRowClassName,
  watchGridClassName,
} from "./watchStyles";

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
    <section className={appShellClassName}>
      <AppHeader
        section="LIVE"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/admin", label: "管理" },
        ]}
      />
      <section className={programBoardClassName}>
        <div>
          <p className={programKickerClassName}>ON AIR</p>
          <h1 className={programTitleClassName}>
            {selectedRoom?.title ?? "番組取得中"}
          </h1>
        </div>
        <label className={roomSelectClassName}>
          <span>番組</span>
          <select
            className={formControlClassName}
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
      <section className={watchGridClassName}>
        <main className={playerColumnClassName}>
          <section ref={stageRef} className={stageClassName}>
            <video
              autoPlay
              className="block h-full w-full bg-[#020202]"
              ref={videoRef}
              muted
              onPause={updatePlayerState}
              onPlay={updatePlayerState}
              onVolumeChange={updatePlayerState}
              playsInline
            />
            <div ref={commentsLayerRef} className={commentsLayerClassName} />
            {streamMessage !== "" ? (
              <div className={streamStatusClassName}>{streamMessage}</div>
            ) : null}
          </section>
          <div className={playerControlsClassName}>
            <button
              aria-label={isPaused ? "再生" : "一時停止"}
              className={buttonClassName({ square: true })}
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
              className={buttonClassName({ square: true })}
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
            <span className={playTimeClassName}>
              経過時間　{formatElapsedTime(elapsedSeconds)}
            </span>
            <span className={liveBadgeClassName}>●LIVE</span>
            <button
              aria-label="更新"
              className={buttonClassName({ square: true })}
              id="reload-toggle"
              type="button"
              onClick={() => location.reload()}
            >
              <RefreshCw aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="全画面"
              className={buttonClassName({
                className: "max-[520px]:hidden",
                square: true,
              })}
              id="fullscreen-toggle"
              type="button"
              onClick={toggleFullscreen}
            >
              <Maximize aria-hidden="true" size={18} />
            </button>
            <a
              className={buttonClassName({ square: true })}
              href="/admin"
              aria-label="管理"
            >
              <Settings aria-hidden="true" size={18} />
            </a>
          </div>
          <form className={commentFormClassName} onSubmit={submitComment}>
            <div className={commentComposeClassName}>
              <textarea
                className={textareaClassName}
                maxLength={100}
                onChange={(event) => setBody(event.currentTarget.value)}
                onKeyDown={submitCommentByShortcut}
                placeholder="コメント"
                required
                value={body}
              />
              <button className={commentSubmitButtonClassName} type="submit">
                <Send aria-hidden="true" size={18} />
                コメント
              </button>
            </div>
            <div className={commentOptionsClassName}>
              <fieldset className={choiceFieldClassName}>
                <legend>方向</legend>
                <div className={directionChoiceGridClassName}>
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
              <fieldset className={choiceFieldClassName}>
                <legend>大きさ</legend>
                <div className={sizeChoiceGridClassName}>
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
              <div className={colorRowClassName}>
                {commentColors.map((color) => (
                  <button
                    aria-label={color}
                    className={cn(
                      buttonClassName({ className: colorButtonClassName }),
                      color === selectedColor && selectedColorButtonClassName,
                    )}
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
        <aside className={sidePanelClassName}>
          <div className={counterStripClassName}>
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
          <div className={tabRowClassName}>
            <button type="button" className={activeTabButtonClassName}>
              コメント
            </button>
          </div>
          <ol className={commentLogClassName} aria-label="コメント">
            {comments.map((comment, index) => (
              <li className={commentLogItemClassName} key={comment.commentId}>
                <span className={commentLogNumberClassName}>
                  {commentLogNumber(
                    index,
                    comments.length,
                    stats?.commentCount ?? comments.length,
                  )}
                </span>
                <p
                  className={cn(
                    commentLogBodyClassName,
                    index === 1 && secondCommentLogBodyClassName,
                  )}
                >
                  {comment.body}
                </p>
              </li>
            ))}
          </ol>
          <div className={infoTickerClassName}>
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
    <label className={choiceChipLabelClassName}>
      <input
        checked={checked}
        className={choiceChipInputClassName}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className={choiceChipTextClassName}>{text}</span>
    </label>
  );
}
