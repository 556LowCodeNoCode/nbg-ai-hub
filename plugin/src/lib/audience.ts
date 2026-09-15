import type { Audience, BaseFrontmatter } from "./frontmatter.js";

export function matchesAudience(itemAudience: Audience, userAudience: Audience): boolean {
  if (userAudience === "both") return true;
  if (itemAudience === "both") return true;
  return itemAudience === userAudience;
}

export function filterByAudience<T extends { data: Pick<BaseFrontmatter, "audience"> }>(
  items: T[],
  userAudience: Audience,
): T[] {
  return items.filter((it) => matchesAudience(it.data.audience, userAudience));
}

export function badge(audience: Audience): string {
  switch (audience) {
    case "beginner":
      return "[BEGINNER]";
    case "advanced":
      return "[ADVANCED]";
    case "both":
      return "[BOTH]";
  }
}
