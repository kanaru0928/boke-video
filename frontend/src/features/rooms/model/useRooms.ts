import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import {
  createRoom,
  fetchRooms,
  type PublicRoom,
  updateRoomTitle,
} from "../api/room_api";

type UseRoomsResult = {
  createRoomFromTitle: (title: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
  rooms: PublicRoom[];
  updateRoomTitleById: (roomId: string, title: string) => Promise<void>;
};

const publicRoomRefreshIntervalMs = 5000;

export function useRooms(config: AppConfig): UseRoomsResult {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);

  const refreshRooms = useCallback(async (): Promise<void> => {
    setRooms(await fetchRooms(config));
  }, [config]);

  const createRoomFromTitle = useCallback(
    async (title: string): Promise<void> => {
      const room = await createRoom(config, title.trim());
      if (room === null) {
        return;
      }
      await refreshRooms();
    },
    [config, refreshRooms],
  );

  const updateRoomTitleById = useCallback(
    async (roomId: string, title: string): Promise<void> => {
      const room = await updateRoomTitle(config, roomId, title.trim());
      if (room === null) {
        return;
      }
      await refreshRooms();
    },
    [config, refreshRooms],
  );

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      void refreshRooms();
    }, publicRoomRefreshIntervalMs);
    return () => window.clearInterval(timerId);
  }, [refreshRooms]);

  return { createRoomFromTitle, refreshRooms, rooms, updateRoomTitleById };
}
