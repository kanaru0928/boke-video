import { AdminPage } from "./features/admin/AdminPage";
import { NotFoundPage } from "./features/notFound/NotFoundPage";
import { RoomListPage } from "./features/rooms/RoomListPage";
import { WatchPage } from "./features/watch/WatchPage";
import type { AppConfig } from "./shared/config/config";

type AppProps = {
  config: AppConfig;
};

export function App({ config }: AppProps) {
  const pathname = location.pathname;
  if (pathname === "/") {
    return <RoomListPage config={config} />;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminPage config={config} />;
  }
  if (pathname === "/watch" || pathname.startsWith("/watch/")) {
    return <WatchPage config={config} />;
  }
  return <NotFoundPage />;
}
