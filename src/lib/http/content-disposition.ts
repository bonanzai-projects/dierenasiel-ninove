/**
 * Story 10.74 (adoptie), sinds 10.75 gedeeld: een bestandsnaam uit een upload of mail kan tekens
 * buiten Latin-1 bevatten (bv. ’ of een emoji). Rauw in een header laat de Headers-constructor gooien.
 */

/** RFC 5987: encodeURIComponent laat ' ( ) * staan, die horen ook gecodeerd. */
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Content-Disposition met de naam zoals hij binnenkwam: een veilige ASCII-versie voor oude
 * browsers en de echte naam (UTF-8) voor de rest.
 */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${rfc5987(fileName)}`;
}
