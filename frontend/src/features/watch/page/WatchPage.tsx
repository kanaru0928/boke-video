import { Volume2 } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { cn } from "../../../shared/ui/classNames";
import {
  type CommentCreateRequest,
  type CommentDirection,
  type CommentFontSize,
  type CommentMessage,
  commentColors,
} from "../../comments/model/types";
import { NotFoundPage } from "../../notFound/page/NotFoundPage";
import { startVideoPlayback } from "../../player/lib/oven_media_engine_player";
import { useRooms } from "../../rooms/model/useRooms";
import { isCommentSubmitShortcut } from "../lib/comment_shortcuts";
import { autoQualityId } from "../lib/stream_quality";
import { useCommentRenderer } from "../model/useCommentRenderer";
import { useCommentSocket } from "../model/useCommentSocket";
import { useFullscreen } from "../model/useFullscreen";
import { useRoomActivity } from "../model/useRoomActivity";
import { useStreamPlayer } from "../model/useStreamPlayer";
import { CommentForm } from "../ui/CommentForm";
import { CommentSidebar } from "../ui/CommentSidebar";
import { WatchPlayer } from "../ui/WatchPlayer";
import { WatchProgramHeader } from "../ui/WatchProgramHeader";

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
    <AppShell>
      <AppHeader
        section="LIVE"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/admin", label: "管理" },
          { href: "/user", label: "ユーザー" },
          { href: "/support", label: "サポート" },
        ]}
      />
      <WatchProgramHeader
        selectedRoom={visibleRoom}
        streamStatus={streamStatus}
      />
      {isMutedAutoplay ? (
        <section
          className={cn(
            "mx-auto mb-2 grid w-[min(720px,100%)] grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
            "border border-[#777777] bg-[#111111] px-3 py-2 text-white",
            "shadow-[2px_2px_0_rgb(0_0_0_/_25%),inset_1px_1px_0_rgb(255_255_255_/_16%)]",
            "max-[640px]:grid-cols-1 max-[640px]:gap-1.5 max-[640px]:px-2 max-[640px]:py-1.5",
          )}
        >
          <p className="m-0 min-w-0 text-xs leading-[1.45] font-extrabold [overflow-wrap:anywhere] [text-shadow:1px_1px_0_#000000]">
            音声なしで再生中です。次回から音声ありで自動再生したい場合は、アドレスバー左のサイト設定で音声を許可してください。
          </p>
          <button
            className={cn(
              "inline-flex min-h-7 items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-[#7fbdff]",
              "bg-[linear-gradient(#4dc7ff,#006fd8)] px-2 py-1 text-xs font-extrabold text-white [text-shadow:1px_1px_0_#003064]",
              "shadow-[inset_1px_1px_0_rgb(255_255_255_/_38%),inset_-1px_-1px_0_rgb(0_0_0_/_32%)]",
            )}
            type="button"
            onClick={toggleMuted}
          >
            <Volume2 aria-hidden="true" size={16} />
            音声をオン
          </button>
        </section>
      ) : null}
      <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-2 max-[1040px]:grid-cols-1">
        <main
          className={cn(
            "relative min-w-0 border border-[#8c8c8c] bg-[#eeeeee] p-[5px]",
            "shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#b8b8b8]",
          )}
        >
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
    </AppShell>
  );
}
