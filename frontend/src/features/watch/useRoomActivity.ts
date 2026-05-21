import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import type { CommentMessage, PresenceMessage } from "../comments/types";
import {
  createRoomVisit,
  fetchCommentPage,
  fetchRoomStats,
  type RoomStats,
} from "../rooms/room_api";

type UseRoomActivityResult = {
  comments: CommentMessage[];
  elapsedSeconds: number;
  hasOlderComments: boolean;
  isLoadingOlderComments: boolean;
  loadOlderComments: () => Promise<void>;
  recordComment: (comment: CommentMessage) => void;
  stats: RoomStats | null;
  updatePresence: (presence: PresenceMessage) => void;
};

export function useRoomActivity(
  config: AppConfig,
  roomId: string,
): UseRoomActivityResult {
  const [comments, setComments] = useState<CommentMessage[]>([]);
  const [loadedStats, setLoadedStats] = useState<RoomStats | null>(null);
  const [nextCommentCursor, setNextCommentCursor] = useState<string | null>(
    null,
  );
  const [isLoadingOlderComments, setIsLoadingOlderComments] = useState(false);
  const [realtimeCommentCount, setRealtimeCommentCount] = useState(0);
  const [presence, setPresence] = useState<PresenceMessage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stats = useMemo((): RoomStats | null => {
    if (loadedStats === null) {
      return null;
    }
    return {
      ...loadedStats,
      commentCount: loadedStats.commentCount + realtimeCommentCount,
      currentViewerCount:
        presence?.roomId === loadedStats.roomId
          ? presence.currentViewerCount
          : loadedStats.currentViewerCount,
      maxConcurrentViewerCount:
        presence?.roomId === loadedStats.roomId
          ? presence.maxConcurrentViewerCount
          : loadedStats.maxConcurrentViewerCount,
    };
  }, [loadedStats, presence, realtimeCommentCount]);

  useEffect(() => {
    let canceled = false;

    const loadRoomActivity = async (): Promise<void> => {
      if (roomId === "") {
        setComments([]);
        setLoadedStats(null);
        setNextCommentCursor(null);
        setRealtimeCommentCount(0);
        setPresence(null);
        setElapsedSeconds(0);
        return;
      }

      setPresence(null);
      const [commentPage, visitedStats] = await Promise.all([
        fetchCommentPage(config, roomId),
        createRoomVisit(config, roomId),
      ]);
      const loadedStats =
        visitedStats ?? (await fetchRoomStats(config, roomId));
      if (canceled) {
        return;
      }
      setComments(commentPage.comments);
      setNextCommentCursor(commentPage.nextCursor);
      setLoadedStats(loadedStats);
      setRealtimeCommentCount(0);
      setElapsedSeconds(loadedStats?.elapsedSeconds ?? 0);
    };

    void loadRoomActivity();
    return () => {
      canceled = true;
    };
  }, [config, roomId]);

  useEffect(() => {
    if (loadedStats === null) {
      return;
    }
    setElapsedSeconds(loadedStats.elapsedSeconds);
    if (loadedStats.streamStatus !== "live") {
      return;
    }
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [loadedStats]);

  useEffect(() => {
    if (roomId === "") {
      return;
    }
    let canceled = false;
    const refreshStats = async (): Promise<void> => {
      const nextStats = await fetchRoomStats(config, roomId);
      if (canceled || nextStats === null) {
        return;
      }
      setLoadedStats(nextStats);
      setRealtimeCommentCount(0);
      setElapsedSeconds(nextStats.elapsedSeconds);
    };
    const timerId = window.setInterval(() => {
      void refreshStats();
    }, 5000);
    return () => {
      canceled = true;
      window.clearInterval(timerId);
    };
  }, [config, roomId]);

  const recordComment = useCallback((comment: CommentMessage): void => {
    setComments((current) => [...current, comment]);
    setRealtimeCommentCount((current) => current + 1);
  }, []);

  const updatePresence = useCallback(
    (presence: PresenceMessage): void => {
      if (presence.roomId !== roomId) {
        return;
      }
      setPresence(presence);
    },
    [roomId],
  );

  const loadOlderComments = useCallback(async (): Promise<void> => {
    if (roomId === "" || nextCommentCursor === null || isLoadingOlderComments) {
      return;
    }
    setIsLoadingOlderComments(true);
    try {
      const page = await fetchCommentPage(config, roomId, nextCommentCursor);
      setComments((current) => [...page.comments, ...current]);
      setNextCommentCursor(page.nextCursor);
    } finally {
      setIsLoadingOlderComments(false);
    }
  }, [config, isLoadingOlderComments, nextCommentCursor, roomId]);

  return {
    comments,
    elapsedSeconds,
    hasOlderComments: nextCommentCursor !== null,
    isLoadingOlderComments,
    loadOlderComments,
    recordComment,
    stats,
    updatePresence,
  };
}
