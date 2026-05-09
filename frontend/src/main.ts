import { AdminView } from "./features/admin/admin_view";
import { WatchView } from "./features/watch/watch_view";
import { appConfig } from "./shared/config/config";
import "./styles.css";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) {
  throw new Error("app element is missing");
}

if (location.pathname.startsWith("/admin")) {
  await new AdminView(app, appConfig).mount();
} else {
  await new WatchView(app, appConfig).mount();
}
