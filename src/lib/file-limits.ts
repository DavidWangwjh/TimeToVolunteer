export const MAX_ORGANIZATION_IMAGE_SIZE = 5 * 1024 * 1024;
export const ORGANIZATION_IMAGE_SIZE_LABEL = "5 MB";

export function isOrganizationImageTooLarge(file: File) {
  return file.size > MAX_ORGANIZATION_IMAGE_SIZE;
}
