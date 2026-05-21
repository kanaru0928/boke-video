import type { CommentAuthor } from "./types";

export function commentAuthorLabel(author: CommentAuthor): string {
  const displayName = author.displayName.trim();
  if (displayName !== "") {
    return displayName;
  }
  const email = author.email.trim();
  if (email !== "") {
    return email;
  }
  return author.subject;
}
