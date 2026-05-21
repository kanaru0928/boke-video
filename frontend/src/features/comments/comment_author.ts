import type { CommentAuthor } from "./types";

export function commentAuthorLabel(author: CommentAuthor): string {
  return author.displayName;
}
