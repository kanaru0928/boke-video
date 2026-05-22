import { Volume2 } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { AppHeader } from "../../shared/ui/AppHeader";
import { appShellClassName } from "../../shared/ui/styles";
import {
  type CommentCreateRequest,
  type CommentDirection,
  type CommentFontSize,
  type CommentMessage,
  commentColors,
} from "../comments/types";
import { NotFoundPage } from "../notFound/NotFoundPage";
import { startVideoPlayback } from "../player/oven_media_engine_player";
import { useRooms } from "../rooms/useRooms";
import { CommentForm } from "./CommentForm";
import { CommentSidebar } from "./CommentSidebar";
import { isCommentSubmitShortcut } from "./comment_shortcuts";
import { autoQualityId } from "./stream_quality";
import { useCommentRenderer } from "./useCommentRenderer";
import { useCommentSocket } from "./useCommentSocket";
import { useFullscreen } from "./useFullscreen";
import { useRoomActivity } from "./useRoomActivity";
import { useStreamPlayer } from "./useStreamPlayer";
import { WatchPlayer } from "./WatchPlayer";
import { WatchProgramHeader } from "./WatchProgramHeader";
import {
  mutedAutoplayButtonClassName,
  mutedAutoplayNoticeClassName,
  mutedAutoplayNoticeTextClassName,
  playerColumnClassName,
  watchGridClassName,
} from "./watchStyles";

type WatchPageProps = {
  config: AppConfig;
};

export function WatchPage({ config }: WatchPageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [body, setBody] = useState("");
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDirection, setSelectedDirection] =
    useState<CommentDirection>("rightToLeft");
  const [selectedSize, setSelectedSize] = useState<CommentFontSize>("medium");
  const [selectedColor, setSelectedColor] = useState<string>(commentColors[0]);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [selectedQualityId, setSelectedQualityId] = useState(autoQualityId);
  const { rooms } = useRooms(config);
  const { commentsLayerRef, renderComment } = useCommentRenderer();
  const {
    comments,
    elapsedSeconds,
    hasOlderComments,
    isLoadingOlderComments,
    loadOlderComments,
    recordComment,
    roomNotFound,
    stats,
    streamEnded,
    updatePresence,
  } = useRoomActivity(config, selectedRoomId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const [lastSelectedRoom, setLastSelectedRoom] = useState(selectedRoom);
  useEffect(() => {
    if (selectedRoom !== null) {
      setLastSelectedRoom(selectedRoom);
    }
  }, [selectedRoom]);
  const visibleRoom = selectedRoom ?? lastSelectedRoom;
  const streamStatus =
    stats?.streamStatus ?? visibleRoom?.streamStatus ?? "waiting";
  const commentsDisabled = streamEnded || streamStatus === "ended";
  const activeRoomId = roomNotFound || commentsDisabled ? "" : selectedRoomId;
  const renderAndRecordComment = (message: CommentMessage): void => {
    if (commentsVisible) {
      renderComment(message);
    }
    recordComment(message);
  };
  const { sendComment } = useCommentSocket(
    config,
    activeRoomId,
    renderAndRecordComment,
    updatePresence,
  );
  const {
    dismissMutedAutoplayNotice,
    isManualPlaybackRequired,
    isMutedAutoplay,
    isStreamLoading,
    playbackQualities,
    streamMessage,
  } = useStreamPlayer(
    config,
    activeRoomId,
    streamStatus,
    videoRef,
    selectedQualityId,
  );
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef);

  useEffect(() => {
    if (selectedRoomId !== "") {
      return;
    }
    const queryRoomId = new URLSearchParams(location.search).get("room");
    if (queryRoomId !== null) {
      setSelectedRoomId(queryRoomId);
      return;
    }
    if (rooms.length === 0) {
      return;
    }
    const initialRoomId = queryRoomId ?? rooms[0]?.id ?? "";
    setSelectedRoomId(initialRoomId);
    if (initialRoomId !== "") {
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

  const submitComment = (): void => {
    if (commentsDisabled) {
      return;
    }
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

  const togglePlayback = async (): Promise<void> => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    if (video.paused) {
      await startVideoPlayback(video, { sound: "unmute" });
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
    if (!video.muted) {
      dismissMutedAutoplayNotice();
    }
    updatePlayerState();
  };

  if (roomNotFound) {
    return <NotFoundPage />;
  }

  return (
    <section className={appShellClassName}>
      <AppHeader
        section="LIVE"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/admin", label: "管理" },
          { href: "/user", label: "ユーザー" },
        ]}
      />
      <WatchProgramHeader
        selectedRoom={visibleRoom}
        streamStatus={streamStatus}
      />
      {isMutedAutoplay ? (
        <section className={mutedAutoplayNoticeClassName}>
          <p className={mutedAutoplayNoticeTextClassName}>
            音声なしで再生中です。次回から音声ありで自動再生したい場合は、アドレスバー左のサイト設定で音声を許可してください。
          </p>
          <button
            className={mutedAutoplayButtonClassName}
            type="button"
            onClick={toggleMuted}
          >
            <Volume2 aria-hidden="true" size={16} />
            音声をオン
          </button>
        </section>
      ) : null}
      <section className={watchGridClassName}>
        <main className={playerColumnClassName}>
          <WatchPlayer
            commentsVisible={commentsVisible}
            commentsLayerRef={commentsLayerRef}
            elapsedSeconds={elapsedSeconds}
            isMuted={isMuted}
            isPaused={isPaused}
            isFullscreen={isFullscreen}
            isManualPlaybackRequired={isManualPlaybackRequired}
            isStreamLoading={isStreamLoading}
            playbackQualities={playbackQualities}
            selectedQualityId={selectedQualityId}
            onCommentsVisibleChange={setCommentsVisible}
            onQualityChange={setSelectedQualityId}
            onToggleFullscreen={toggleFullscreen}
            onToggleMuted={toggleMuted}
            onTogglePlayback={togglePlayback}
            onUpdatePlayerState={updatePlayerState}
            stageRef={stageRef}
            streamMessage={streamMessage}
            streamStatus={streamStatus}
            videoRef={videoRef}
          />
          <CommentForm
            body={body}
            disabled={commentsDisabled}
            selectedColor={selectedColor}
            selectedDirection={selectedDirection}
            selectedSize={selectedSize}
            onBodyChange={setBody}
            onColorChange={setSelectedColor}
            onDirectionChange={setSelectedDirection}
            onShortcut={submitCommentByShortcut}
            onSizeChange={setSelectedSize}
            onSubmit={submitComment}
          />
        </main>
        <CommentSidebar
          comments={comments}
          hasOlderComments={hasOlderComments}
          isLoadingOlderComments={isLoadingOlderComments}
          onLoadOlderComments={loadOlderComments}
          stats={stats}
        />
      </section>
    </section>
  );
}
