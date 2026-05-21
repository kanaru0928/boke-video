import { Settings } from "lucide-react";
import { Mascot } from "../../shared/ui/Mascot";
import { buttonClassName } from "../../shared/ui/styles";

export function EmptyRooms() {
  return (
    <div className="grid min-h-[240px] content-center justify-items-center gap-4 border border-t-0 border-[#a7a7a7] bg-white p-4 text-center max-[520px]:p-3">
      <div className="grid justify-items-center gap-2">
        <p className="m-0 text-base font-extrabold">
          現在表示できる枠はありません
        </p>
        <a className={buttonClassName({ className: "w-fit" })} href="/admin">
          <Settings aria-hidden="true" size={17} />
          管理
        </a>
      </div>
      <Mascot
        className="justify-self-center"
        mood="disappointed"
        title="残念そうなマスコット"
      />
    </div>
  );
}
