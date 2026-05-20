import { Bot, MonitorPlay, Settings } from "lucide-react";
import { useEffect } from "react";
import type { AppConfig } from "../../shared/config/config";
import type { Room } from "./room_api";
import {
  roomThumbnail,
  roomThumbnailRefreshMilliseconds,
} from "./room_thumbnail";
import { useRooms } from "./useRooms";

type RoomListPageProps = {
  config: AppConfig;
};

export function RoomListPage({ config }: RoomListPageProps) {
  const { refreshRooms, rooms } = useRooms(config);

  useEffect(() => {
    const intervalMilliseconds = roomThumbnailRefreshMilliseconds(rooms);
    if (intervalMilliseconds === null) {
      return;
    }
    const timerId = window.setInterval(() => {
      void refreshRooms();
    }, intervalMilliseconds);
    return () => window.clearInterval(timerId);
  }, [refreshRooms, rooms]);

  return (
    <section className="rooms-shell">
      <header className="topbar">
        <div className="site-mark">
          <span className="site-mark-main">Boke Video</span>
          <span className="site-mark-sub">ROOMS</span>
        </div>
        <nav className="topnav" aria-label="メニュー">
          <a href="/admin">管理</a>
        </nav>
      </header>
      <section className="rooms-board">
        <div className="admin-titlebar">
          <MonitorPlay aria-hidden="true" size={18} />
          <h1>枠一覧</h1>
        </div>
        {rooms.length === 0 ? (
          <div className="rooms-empty">
            <p>現在表示できる枠はありません</p>
            <a href="/admin">
              <Settings aria-hidden="true" size={17} />
              管理
            </a>
          </div>
        ) : (
          <section className="room-card-list">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </section>
        )}
      </section>
    </section>
  );
}

type RoomCardProps = {
  room: Room;
};

function RoomCard({ room }: RoomCardProps) {
  const thumbnail = roomThumbnail(room);

  return (
    <article className="room-card">
      <a
        aria-label={`${room.title}を視聴`}
        className="room-thumbnail-link"
        href={`/watch?room=${encodeURIComponent(room.id)}`}
      >
        <div className={`room-thumbnail ${thumbnail.toneClassName}`}>
          {thumbnail.url === null ? (
            <div className="room-thumbnail-generated">
              <Bot aria-hidden="true" size={34} />
              <strong>{thumbnail.initials}</strong>
              <span>Loading</span>
            </div>
          ) : (
            <img alt="" src={thumbnail.url} />
          )}
        </div>
      </a>
      <div className="room-card-main">
        <a
          className="room-card-title"
          href={`/watch?room=${encodeURIComponent(room.id)}`}
        >
          {room.title}
        </a>
        <p>{room.id}</p>
      </div>
    </article>
  );
}
