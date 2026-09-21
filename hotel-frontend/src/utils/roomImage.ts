/**
 * Room photography is stored as the raw Cloudinary `secure_url` the upload
 * endpoint returns — the full-size original, with no transformation baked in.
 *
 * Pointing an `<img>` straight at that means the browser downloads a
 * multi-megabyte upload and then shrinks it into a card, which reads as soft
 * and costs the guest seconds of blank space. These helpers splice a
 * transformation segment into the delivery URL so Cloudinary sends a rendition
 * sized and framed for the slot it lands in.
 *
 * Anything that is not a Cloudinary upload — a hand-entered link, or a record
 * seeded before the upload flow existed — is returned untouched.
 */

const UPLOAD_MARKER = '/image/upload/';

/**
 * Room photos are shot landscape, so the card crops to 4:3 and asks Cloudinary
 * for the same ratio. Matching the two means the browser does not have to
 * re-crop an already-cropped image, which is what made the old 4/5 cards look
 * like someone had zoomed in on the middle of the frame.
 */
const CARD_ASPECT = '4:3';

function isCloudinaryUpload(url: string): boolean {
  return typeof url === 'string' && url.includes(UPLOAD_MARKER);
}

/**
 * A delivery URL for `url` at `width` CSS pixels.
 *
 * `c_fill` with `g_auto` crops around whatever Cloudinary's saliency detection
 * picks as the subject — usually the bed or the window — instead of the centre.
 * `f_auto` and `q_auto` serve WebP or AVIF at a quality that suits the format,
 * so the same visual sharpness arrives in a fraction of the bytes.
 */
export function roomImageUrl(url: string, width: number): string {
  if (!isCloudinaryUpload(url)) return url;

  const transform = ['f_auto', 'q_auto', 'c_fill', 'g_auto', `ar_${CARD_ASPECT}`, `w_${width}`].join(
    ',',
  );

  return url.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}${transform}/`);
}

/**
 * A `srcset` across `widths`, so a phone downloads a phone-sized rendition and
 * a desktop card gets enough pixels to stay sharp.
 *
 * Returns `undefined` when the source is not on Cloudinary: with no variants to
 * offer, the plain `src` is the only correct answer.
 */
export function roomImageSrcSet(url: string, widths: number[]): string | undefined {
  if (!isCloudinaryUpload(url)) return undefined;

  return widths.map((width) => `${roomImageUrl(url, width)} ${width}w`).join(', ');
}
