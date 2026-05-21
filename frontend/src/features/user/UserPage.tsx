import { Save, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { AppConfig } from "../../shared/config/config";
import { AppHeader } from "../../shared/ui/AppHeader";
import { Board } from "../../shared/ui/Board";
import { Button } from "../../shared/ui/Button";
import {
  appShellClassName,
  formControlClassName,
} from "../../shared/ui/styles";
import { fetchUserProfile, updateUserProfile } from "./user_api";

type UserPageProps = {
  config: AppConfig;
};

export function UserPage({ config }: UserPageProps) {
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    void fetchUserProfile(config).then((profile) => {
      if (!active || profile === null) {
        return;
      }
      setDisplayName(profile.displayName);
      setSavedDisplayName(profile.displayName);
    });
    return () => {
      active = false;
    };
  }, [config]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (nextDisplayName === "" || nextDisplayName.length > 40 || saving) {
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const profile = await updateUserProfile(config, nextDisplayName);
      if (profile === null) {
        setStatus("保存に失敗しました");
        return;
      }
      setDisplayName(profile.displayName);
      setSavedDisplayName(profile.displayName);
      setStatus("保存しました");
    } finally {
      setSaving(false);
    }
  };

  const valid = displayName.trim() !== "" && displayName.trim().length <= 40;

  return (
    <section className={appShellClassName}>
      <AppHeader
        section="USER"
        links={[
          { href: "/", label: "枠一覧" },
          { href: "/admin", label: "管理" },
        ]}
      />
      <Board icon={UserRound} title="ユーザー設定">
        <form
          className="grid gap-2 border border-t-0 border-[#c2c2c2] bg-[#f7f7f7] p-2"
          onSubmit={submit}
        >
          <label className="grid gap-1 font-extrabold">
            表示名
            <input
              className={formControlClassName}
              maxLength={40}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
              required
              type="text"
              value={displayName}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                !valid || saving || displayName.trim() === savedDisplayName
              }
              primary
              type="submit"
            >
              <Save aria-hidden="true" size={18} />
              保存
            </Button>
            {status !== "" && (
              <p className="m-0 text-sm font-extrabold text-[#555555]">
                {status}
              </p>
            )}
          </div>
        </form>
      </Board>
    </section>
  );
}
