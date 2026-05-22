import { AdminPage } from "./features/admin/page/AdminPage";
import { NotFoundPage } from "./features/notFound/page/NotFoundPage";
import { RoomListPage } from "./features/rooms/page/RoomListPage";
import { UserPage } from "./features/user/page/UserPage";
import { WatchPage } from "./features/watch/page/WatchPage";
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
  if (pathname === "/user" || pathname.startsWith("/user/")) {
    return <UserPage config={config} />;
  }
  if (pathname === "/watch" || pathname.startsWith("/watch/")) {
    return <WatchPage config={config} />;
  }
  return <NotFoundPage />;
}
