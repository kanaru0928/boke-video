import { Settings } from "lucide-react";
import { Mascot } from "../../shared/ui/Mascot";
import { buttonClassName } from "../../shared/ui/styles";

export function EmptyRooms() {
  return (
    <div className="grid min-h-[240px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border border-t-0 border-[#a7a7a7] bg-white p-4 max-[520px]:grid-cols-1 max-[520px]:justify-items-start max-[520px]:p-3">
      <div className="grid gap-2">
        <p className="m-0 text-base font-extrabold">
          現在表示できる枠はありません
        </p>
        <a className={buttonClassName()} href="/admin">
          <Settings aria-hidden="true" size={17} />
          管理
        </a>
      </div>
      <Mascot
        className="justify-self-end max-[520px]:justify-self-center"
        mood="disappointed"
        title="残念そうなマスコット"
      />
    </div>
  );
}
