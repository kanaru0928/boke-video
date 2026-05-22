import type { CommentAuthor } from "../model/types";

export function commentAuthorLabel(author: CommentAuthor): string {
  return author.displayName;
}
