import { put, get, del } from "@vercel/blob";

/**
 * Story 10.74 — de PRIVATE Blob-opslag (`dierenasiel-privaat`). Bestanden zijn
 * er enkel met deze sleutel te openen; de app levert ze via een eigen route,
 * na controle van login en rechten.
 *
 * Bewust géén terugval op `BLOB_READ_WRITE_TOKEN`: dat is de publieke opslag,
 * waar wie de link heeft het bestand kan openen.
 */

function sleutel(): string {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("PRIVATE_BLOB_READ_WRITE_TOKEN ontbreekt");
  return token;
}

export async function putPrivateFile(
  pathname: string,
  body: Buffer | Blob | ArrayBuffer,
  contentType: string,
): Promise<{ pathname: string }> {
  const blob = await put(pathname, body, {
    access: "private",
    token: sleutel(),
    contentType,
    addRandomSuffix: true,
  });
  return { pathname: blob.pathname };
}

export async function getPrivateFile(
  pathname: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; size: number } | null> {
  const result = await get(pathname, { access: "private", token: sleutel() });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
}

/** De volledige inhoud, bv. om een mail te lezen. */
export async function readPrivateFile(pathname: string): Promise<ArrayBuffer | null> {
  const file = await getPrivateFile(pathname);
  return file ? new Response(file.stream).arrayBuffer() : null;
}

export async function deletePrivateFiles(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  await del(pathnames, { token: sleutel() });
}
