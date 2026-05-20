import { ExternalLink, MonitorPlay, Settings } from "lucide-react";
import type { AppConfig } from "../../shared/config/config";
import { useRooms } from "./useRooms";

type RoomListPageProps = {
  config: AppConfig;
};

export function RoomListPage({ config }: RoomListPageProps) {
  const { rooms } = useRooms(config);

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
              <article className="room-card" key={room.id}>
                <div className="room-card-main">
                  <h2>{room.title}</h2>
                  <p>{room.id}</p>
                </div>
                <a href={`/watch?room=${encodeURIComponent(room.id)}`}>
                  <ExternalLink aria-hidden="true" size={17} />
                  視聴
                </a>
              </article>
            ))}
          </section>
        )}
      </section>
    </section>
  );
}
