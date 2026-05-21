import { requestJSON } from "../../shared/api/http_client";
import type { AppConfig } from "../../shared/config/config";

type UserProfile = {
  subject: string;
  displayName: string;
  updatedAt: string;
};

export async function fetchUserProfile(
  config: AppConfig,
): Promise<UserProfile | null> {
  const parsed = await requestJSON(config, "GET", "/api/me");
  return parseUserProfile(parsed);
}

export async function updateUserProfile(
  config: AppConfig,
  displayName: string,
): Promise<UserProfile | null> {
  const parsed = await requestJSON(config, "PATCH", "/api/me", {
    displayName,
  });
  return parseUserProfile(parsed);
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.subject === "string" &&
    typeof profile.displayName === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function parseUserProfile(value: unknown): UserProfile | null {
  if (!isUserProfile(value)) {
    return null;
  }
  return value;
}
