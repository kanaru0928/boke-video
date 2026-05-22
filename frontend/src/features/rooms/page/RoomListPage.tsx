import {
  Bot,
  Clock3,
  type LucideIcon,
  MonitorPlay,
  Newspaper,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/config/config";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { AppShell } from "../../../shared/ui/AppShell";
import { Board } from "../../../shared/ui/Board";
import { cn } from "../../../shared/ui/classNames";
import type { PublicRoom } from "../api/room_api";
import { formatStartedAgo } from "../lib/public_room_activity";
import {
  roomThumbnail,
  roomThumbnailRefreshMilliseconds,
} from "../lib/room_thumbnail";
import { useRooms } from "../model/useRooms";
import { EmptyRooms } from "../ui/EmptyRooms";

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
    <AppShell>
      <AppHeader
        section="ROOMS"
        links={[
          { href: "/admin", label: "管理" },
          { href: "/user", label: "ユーザー" },
          { href: "/support", label: "サポート" },
        ]}
      />
      <Board
        className="grid min-h-[calc(100vh-96px)] grid-rows-[auto_minmax(0,1fr)]"
        icon={MonitorPlay}
        title="枠一覧"
      >
        {rooms.length === 0 ? (
          <EmptyRooms />
        ) : (
          <section className="grid content-start gap-[10px] border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2 [grid-template-columns:repeat(auto-fill,minmax(238px,1fr))] max-[860px]:grid-cols-2 max-[860px]:gap-[7px] max-[520px]:p-1.5">
            {rooms.map((room) => (
              <RoomCard config={config} key={room.id} room={room} />
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
    </AppShell>
  );
}

type RoomCardProps = {
  config: AppConfig;
  room: PublicRoom;
};

function RoomCard({ config, room }: RoomCardProps) {
  const thumbnail = roomThumbnail(room, config);
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(
    null,
  );
  const visibleThumbnailUrl =
    thumbnail.url === failedThumbnailUrl ? null : thumbnail.url;

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
          {visibleThumbnailUrl === null ? (
            <div className="grid h-full grid-rows-[1fr_auto] p-3 text-white [text-shadow:1px_1px_0_#000000] max-[520px]:p-2">
              <Bot aria-hidden="true" size={34} />
              <span className="col-span-full border-t border-[rgb(255_255_255_/_55%)] pt-[3px] font-[Arial,sans-serif] text-[11px] tracking-normal">
                Loading
              </span>
            </div>
          ) : (
            <img
              alt=""
              className="block h-full w-full object-cover"
              crossOrigin={thumbnail.crossOrigin}
              src={visibleThumbnailUrl}
              onError={() => setFailedThumbnailUrl(visibleThumbnailUrl)}
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
        <dl className="m-0 grid grid-cols-[1fr_auto_auto] items-center gap-[5px] font-[Arial,sans-serif] text-[12px] leading-none text-white max-[520px]:grid-cols-2">
          <RoomCardMetric
            className="min-w-0 max-[520px]:col-span-2"
            icon={UserRound}
            label="ユーザー名"
            value={room.ownerDisplayName}
          />
          <RoomCardMetric
            icon={Clock3}
            label="経過時間"
            value={formatStartedAgo(room.elapsedSeconds)}
          />
          <RoomCardMetric
            icon={Users}
            label="接続中人数"
            value={`${room.currentViewerCount}人`}
          />
        </dl>
      </div>
    </article>
  );
}

type RoomCardMetricProps = {
  className?: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

function RoomCardMetric({
  className,
  icon: Icon,
  label,
  value,
}: RoomCardMetricProps) {
  return (
    <div
      className={cn(
        "grid min-h-[28px] min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-[5px]",
        "rounded-[3px] border border-[#777777] bg-[linear-gradient(#464646,#111111_52%,#565656)] px-[7px] py-[5px]",
        "shadow-[inset_1px_1px_0_#8c8c8c,inset_-1px_-1px_0_#050505] [text-shadow:1px_1px_0_#000000]",
        className,
      )}
    >
      <Icon aria-hidden="true" className="shrink-0 text-[#dcdcdc]" size={14} />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="m-0 truncate font-extrabold tracking-normal">{value}</dd>
      </div>
    </div>
  );
}
