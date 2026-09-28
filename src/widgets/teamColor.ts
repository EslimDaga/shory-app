const TEAM_COLORS = ['#E63946', '#1D4ED8', '#16A34A', '#F59E0B', '#7C3AED', '#0EA5E9', '#DB2777', '#111827'];

// A stable crest color per team name, so "Barcelona" always gets the same badge.
export function teamColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

export function initials(name: string, length = 3): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1)
    return words
      .map((word) => word[0])
      .join('')
      .slice(0, length)
      .toUpperCase();
  return name.trim().slice(0, length).toUpperCase();
}
