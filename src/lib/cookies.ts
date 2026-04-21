export function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';').map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${name}=`)) continue;
    return decodeURIComponent(part.slice(name.length + 1));
  }

  return null;
}
