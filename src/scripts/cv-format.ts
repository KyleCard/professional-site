// Shared formatting for bibliographic copy — used by /cv and /publications so the
// author highlighting and inline markup can never drift between the two pages.

// inline markup in copy: [text](url) → link, *text* → italic (species + journal names)
export const it = (s = ""): string =>
  s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");

export type Author = string | { name: string; role?: string; mentee?: boolean; equal?: boolean };

const isKyle = (name: string) => /^Card\s+K/i.test(name);

// author list: highlight Kyle (by name — covers every entry), underline direct
// mentees, append * for equal contribution. Spans use `au me` / `au mentee`.
export const authors = (list: Author[] = []): string =>
  list
    .map((a) => {
      if (typeof a === "string") return isKyle(a) ? `<span class="au me">${a}</span>` : a;
      const cls = a.role || isKyle(a.name) ? "au me" : a.mentee ? "au mentee" : "au";
      return `<span class="${cls}">${a.name}</span>${a.equal ? "*" : ""}`;
    })
    .join(", ");
