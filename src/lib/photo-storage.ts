/** Accept only this account's current or legacy avatar keys. */
export function isVolunteerAvatarPath(path: unknown, userId: string): path is string {
  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) return false;
  return /^(profile|[a-f0-9-]+)\.webp$/.test(path.slice(userId.length + 1));
}

/** Never turn arbitrary external URLs or another bucket into deletion targets. */
export function organizationImagePath(url: string | null, supabaseUrl: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(supabaseUrl).origin) return null;
    const prefix = "/storage/v1/object/public/organization-images/";
    if (!parsed.pathname.startsWith(prefix)) return null;
    const path = parsed.pathname.slice(prefix.length);
    return /^profiles\/[a-f0-9-]+(?:\/cover)?\.[a-z0-9]+$/.test(path) ? path : null;
  } catch { return null; }
}

interface PhotoStorage {
  list(prefix: string, options: { limit: number; offset: number; sortBy: { column: string; order: string } }): PromiseLike<{ data: { name: string }[] | null; error: unknown }>;
  remove(paths: string[]): PromiseLike<{ error: unknown }>;
}

// Also remove legacy UUID uploads left behind by earlier failed cleanup attempts.
// Only this user's validated keys are eligible; preserve the reusable current key.
export async function removeOldVolunteerPhotos(storage: PhotoStorage, userId: string, keep?: string) {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list(userId, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) return "Photo updated, but old files could not be cleaned up. Please try again or contact support.";
    for (const file of data ?? []) {
      const path = `${userId}/${file.name}`;
      if (isVolunteerAvatarPath(path, userId) && path !== keep) paths.push(path);
    }
    if (!data || data.length < 100) break;
  }
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await storage.remove(paths.slice(offset, offset + 100));
    if (error) return "Photo updated, but old files could not be cleaned up. Please try again or contact support.";
  }
}
