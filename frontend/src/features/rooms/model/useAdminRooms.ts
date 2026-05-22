import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import {
  type CreatedRoom,
  createRoom,
  deleteRoom,
  fetchAdminRooms,
  type Room,
  rotateRoomIngestToken,
  updateRoomTitle,
} from "../api/room_api";

type UseAdminRoomsResult = {
  createRoomFromTitle: (title: string) => Promise<CreatedRoom | null>;
  deleteRoomById: (roomId: string) => Promise<boolean>;
  rotateIngestTokenByRoomId: (roomId: string) => Promise<string | null>;
  rooms: Room[];
  updateRoomTitleById: (roomId: string, title: string) => Promise<void>;
};

export function useAdminRooms(config: AppConfig): UseAdminRoomsResult {
  const [rooms, setRooms] = useState<Room[]>([]);

  const refreshRooms = useCallback(async (): Promise<void> => {
    setRooms(await fetchAdminRooms(config));
  }, [config]);

  const createRoomFromTitle = useCallback(
    async (title: string): Promise<CreatedRoom | null> => {
      const room = await createRoom(config, title.trim());
      if (room === null) {
        return null;
      }
      await refreshRooms();
      return room;
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

  const deleteRoomById = useCallback(
    async (roomId: string): Promise<boolean> => {
      if (!(await deleteRoom(config, roomId))) {
        return false;
      }
      await refreshRooms();
      return true;
    },
    [config, refreshRooms],
  );

  const rotateIngestTokenByRoomId = useCallback(
    async (roomId: string): Promise<string | null> => {
      const token = await rotateRoomIngestToken(config, roomId);
      return token?.whipBearerToken ?? null;
    },
    [config],
  );

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  return {
    createRoomFromTitle,
    deleteRoomById,
    rotateIngestTokenByRoomId,
    rooms,
    updateRoomTitleById,
  };
}
