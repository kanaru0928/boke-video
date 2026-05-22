import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import {
  createRoom,
  fetchRooms,
  type Room,
  updateRoomTitle,
} from "../api/room_api";

type UseRoomsResult = {
  createRoomFromTitle: (title: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
  rooms: Room[];
  updateRoomTitleById: (roomId: string, title: string) => Promise<void>;
};

export function useRooms(config: AppConfig): UseRoomsResult {
  const [rooms, setRooms] = useState<Room[]>([]);

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

  return { createRoomFromTitle, refreshRooms, rooms, updateRoomTitleById };
}
