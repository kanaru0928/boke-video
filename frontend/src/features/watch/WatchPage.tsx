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
import { useRooms } from "../rooms/useRooms";
import { CommentForm } from "./CommentForm";
import { CommentSidebar } from "./CommentSidebar";
import { isCommentSubmitShortcut } from "./comment_shortcuts";
import { autoQualityId } from "./stream_quality";
import { useCommentRenderer } from "./useCommentRenderer";
import { useCommentSocket } from "./useCommentSocket";
import { useRoomActivity } from "./useRoomActivity";
import { useStreamPlayer } from "./useStreamPlayer";
import { WatchPlayer } from "./WatchPlayer";
import { WatchProgramHeader } from "./WatchProgramHeader";
import { playerColumnClassName, watchGridClassName } from "./watchStyles";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQualityId, setSelectedQualityId] = useState(autoQualityId);
  const { rooms } = useRooms(config);
  const { clearComments, commentsLayerRef, renderComment } =
    useCommentRenderer();
  const {
    comments,
    elapsedSeconds,
    hasOlderComments,
    isLoadingOlderComments,
    loadOlderComments,
    recordComment,
    stats,
  } = useRoomActivity(config, selectedRoomId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const streamStatus =
    stats?.streamStatus ?? selectedRoom?.streamStatus ?? "waiting";
  const renderAndRecordComment = (message: CommentMessage): void => {
    if (commentsVisible) {
      renderComment(message);
    }
    recordComment(message);
  };
  const { sendComment } = useCommentSocket(
    config,
    selectedRoomId,
    renderAndRecordComment,
  );
  const { isStreamLoading, playbackQualities, streamMessage } = useStreamPlayer(
    config,
    selectedRoomId,
    streamStatus,
    videoRef,
    selectedQualityId,
  );

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

  useEffect(() => {
    const updateFullscreenState = (): void => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
    };
  }, []);

  const updatePlayerState = (): void => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    setIsPaused(video.paused);
    setIsMuted(video.muted);
  };

  const submitComment = (): void => {
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
    setSelectedQualityId(autoQualityId);
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
      <WatchProgramHeader
        rooms={rooms}
        selectedRoom={selectedRoom}
        selectedRoomId={selectedRoomId}
        onSwitchRoom={switchRoom}
      />
      <section className={watchGridClassName}>
        <main className={playerColumnClassName}>
          <WatchPlayer
            commentsVisible={commentsVisible}
            commentsLayerRef={commentsLayerRef}
            elapsedSeconds={elapsedSeconds}
            isMuted={isMuted}
            isPaused={isPaused}
            isFullscreen={isFullscreen}
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
          elapsedSeconds={elapsedSeconds}
          hasOlderComments={hasOlderComments}
          isLoadingOlderComments={isLoadingOlderComments}
          onLoadOlderComments={loadOlderComments}
          stats={stats}
        />
      </section>
    </section>
  );
}
