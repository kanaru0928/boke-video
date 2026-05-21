import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import type { CommentMessage } from "../comments/types";
import {
  createRoomVisit,
  fetchComments,
  fetchRoomStats,
  type RoomStats,
} from "../rooms/room_api";

type UseRoomActivityResult = {
  comments: CommentMessage[];
  elapsedSeconds: number;
  recordComment: (comment: CommentMessage) => void;
  stats: RoomStats | null;
};

export function useRoomActivity(
  config: AppConfig,
  roomId: string,
): UseRoomActivityResult {
  const [comments, setComments] = useState<CommentMessage[]>([]);
  const [loadedStats, setLoadedStats] = useState<RoomStats | null>(null);
  const [realtimeCommentCount, setRealtimeCommentCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stats = useMemo((): RoomStats | null => {
    if (loadedStats === null) {
      return null;
    }
    return {
      ...loadedStats,
      commentCount: loadedStats.commentCount + realtimeCommentCount,
    };
  }, [loadedStats, realtimeCommentCount]);

  useEffect(() => {
    let canceled = false;

    const loadRoomActivity = async (): Promise<void> => {
      if (roomId === "") {
        setComments([]);
        setLoadedStats(null);
        setRealtimeCommentCount(0);
        setElapsedSeconds(0);
        return;
      }

      const [loadedComments, visitedStats] = await Promise.all([
        fetchComments(config, roomId),
        createRoomVisit(config, roomId),
      ]);
      const loadedStats =
        visitedStats ?? (await fetchRoomStats(config, roomId));
      if (canceled) {
        return;
      }
      setComments(loadedComments);
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

  return { comments, elapsedSeconds, recordComment, stats };
}
