import { AdminPage } from "./features/admin/AdminPage";
import { WatchPage } from "./features/watch/WatchPage";
import type { AppConfig } from "./shared/config/config";

type AppProps = {
  config: AppConfig;
};

export function App({ config }: AppProps) {
  if (location.pathname.startsWith("/admin")) {
    return <AdminPage config={config} />;
  }
  return <WatchPage config={config} />;
}
