import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import {
  type CreatedRoom,
  clearRoomPassword,
  createRoom,
  deleteRoom,
  fetchAdminRooms,
  type Room,
  rotateRoomBypassToken,
  rotateRoomIngestToken,
  setRoomPassword,
  updateRoomTitle,
} from "../api/room_api";

type UseAdminRoomsResult = {
  clearPasswordByRoomId: (roomId: string) => Promise<boolean>;
  createRoomFromTitle: (title: string) => Promise<CreatedRoom | null>;
  deleteRoomById: (roomId: string) => Promise<boolean>;
  rotateBypassTokenByRoomId: (
    roomId: string,
  ) => Promise<{ bypassToken: string } | null>;
  rotateIngestTokenByRoomId: (roomId: string) => Promise<string | null>;
  rooms: Room[];
  setPasswordByRoomId: (roomId: string, password: string) => Promise<boolean>;
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

  const setPasswordByRoomId = useCallback(
    async (roomId: string, password: string): Promise<boolean> => {
      const ok = await setRoomPassword(config, roomId, password);
      if (ok) {
        await refreshRooms();
      }
      return ok;
    },
    [config, refreshRooms],
  );

  const clearPasswordByRoomId = useCallback(
    async (roomId: string): Promise<boolean> => {
      const ok = await clearRoomPassword(config, roomId);
      if (ok) {
        await refreshRooms();
      }
      return ok;
    },
    [config, refreshRooms],
  );

  const rotateBypassTokenByRoomId = useCallback(
    async (roomId: string): Promise<{ bypassToken: string } | null> => {
      return rotateRoomBypassToken(config, roomId);
    },
    [config],
  );

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  return {
    clearPasswordByRoomId,
    createRoomFromTitle,
    deleteRoomById,
    rotateBypassTokenByRoomId,
    rotateIngestTokenByRoomId,
    rooms,
    setPasswordByRoomId,
    updateRoomTitleById,
  };
}
