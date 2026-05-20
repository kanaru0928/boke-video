import { AdminPage } from "./features/admin/AdminPage";
import { RoomListPage } from "./features/rooms/RoomListPage";
import { WatchPage } from "./features/watch/WatchPage";
import type { AppConfig } from "./shared/config/config";

type AppProps = {
  config: AppConfig;
};

export function App({ config }: AppProps) {
  if (location.pathname.startsWith("/admin")) {
    return <AdminPage config={config} />;
  }
  if (location.pathname.startsWith("/watch")) {
    return <WatchPage config={config} />;
  }
  return <RoomListPage config={config} />;
}
