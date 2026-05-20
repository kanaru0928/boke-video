import { Bot, MonitorPlay, Newspaper, Settings } from "lucide-react";
import { useEffect } from "react";
import type { AppConfig } from "../../shared/config/config";
import { AppHeader } from "../../shared/ui/AppHeader";
import { Board } from "../../shared/ui/Board";
import { cn } from "../../shared/ui/classNames";
import { appShellClassName, buttonClassName } from "../../shared/ui/styles";
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
    <section className={appShellClassName}>
      <AppHeader section="ROOMS" links={[{ href: "/admin", label: "管理" }]} />
      <Board
        className="grid min-h-[calc(100vh-96px)] grid-rows-[auto_minmax(0,1fr)]"
        icon={MonitorPlay}
        title="枠一覧"
      >
        {rooms.length === 0 ? (
          <div className="flex items-center justify-between gap-2 border border-t-0 border-[#a7a7a7] bg-white p-[7px]">
            <p>現在表示できる枠はありません</p>
            <a className={buttonClassName()} href="/admin">
              <Settings aria-hidden="true" size={17} />
              管理
            </a>
          </div>
        ) : (
          <section className="grid content-start gap-[10px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2 [grid-template-columns:repeat(auto-fill,minmax(238px,1fr))] max-[860px]:grid-cols-2 max-[860px]:gap-[7px] max-[520px]:p-1.5">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </section>
        )}
      </Board>
      <Board icon={Newspaper} title="記事">
        <div className="border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-[18px]">
          <p className="m-0 border border-[#a7a7a7] bg-white p-[14px] text-sm text-[#555555]">
            準備中
          </p>
        </div>
      </Board>
    </section>
  );
}

type RoomCardProps = {
  room: Room;
};

function RoomCard({ room }: RoomCardProps) {
  const thumbnail = roomThumbnail(room);

  return (
    <article className="grid grid-rows-[auto_minmax(92px,1fr)] gap-0 border border-[#a7a7a7] bg-white">
      <a
        aria-label={`${room.title}を視聴`}
        className="block min-h-0 min-w-0 p-0 no-underline"
        href={`/watch?room=${encodeURIComponent(room.id)}`}
      >
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden border-b border-[#b8b8b8] bg-[#dcdcdc] shadow-[inset_1px_1px_0_rgb(255_255_255_/_70%),inset_-1px_-1px_0_rgb(0_0_0_/_35%)]",
            thumbnail.toneClassName,
          )}
        >
          {thumbnail.url === null ? (
            <div className="grid h-full grid-cols-[auto_minmax(0,1fr)] grid-rows-[1fr_auto] items-center gap-x-[9px] p-3 text-white [text-shadow:1px_1px_0_#000000] max-[520px]:gap-x-1.5 max-[520px]:p-2">
              <Bot aria-hidden="true" size={34} />
              <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[28px] leading-none max-[520px]:text-xl">
                {thumbnail.initials}
              </strong>
              <span className="col-span-full border-t border-[rgb(255_255_255_/_55%)] pt-[3px] font-[Arial,sans-serif] text-[11px] tracking-normal">
                Loading
              </span>
            </div>
          ) : (
            <img
              alt=""
              className="block h-full w-full object-cover"
              src={thumbnail.url}
            />
          )}
        </div>
      </a>
      <div className="grid min-w-0 content-start gap-2 px-3 pt-[10px] pb-3 max-[520px]:min-h-[104px] max-[520px]:p-2">
        <a
          className="line-clamp-2 min-h-14 overflow-hidden bg-transparent p-0 text-[19px] leading-[1.45] font-extrabold whitespace-normal text-[#202020] no-underline hover:text-[#004fb8] hover:underline max-[520px]:min-h-12 max-[520px]:text-[15px] max-[520px]:leading-[1.6]"
          href={`/watch?room=${encodeURIComponent(room.id)}`}
        >
          {room.title}
        </a>
        <p className="m-0 [overflow-wrap:anywhere] font-[Arial,sans-serif] text-xs text-[#666666]">
          {room.id}
        </p>
      </div>
    </article>
  );
}
