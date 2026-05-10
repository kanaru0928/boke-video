import { useEffect, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import {
  fetchRoomStreamStatus,
  type RoomStreamStatus,
} from "../rooms/room_api";

export function useRoomStreamStatus(config: AppConfig, roomId: string): string {
  const [status, setStatus] = useState("確認中");

  useEffect(() => {
    let canceled = false;
    const loadStatus = async (): Promise<void> => {
      const roomStatus = await fetchRoomStreamStatus(config, roomId);
      if (canceled) {
        return;
      }
      setStatus(
        roomStatus === null ? "取得失敗" : streamStatusLabel(roomStatus.stream),
      );
    };
    void loadStatus();
    return () => {
      canceled = true;
    };
  }, [config, roomId]);

  return status;
}

function streamStatusLabel(status: RoomStreamStatus["stream"]): string {
  switch (status) {
    case "ready":
      return "配信中";
    case "stale":
      return "停止中";
    case "missing":
      return "未生成";
  }
}
