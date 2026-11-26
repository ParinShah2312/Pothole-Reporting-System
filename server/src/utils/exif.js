import exifr from 'exifr';
import { parseLat, parseLng } from './geo.js';

/**
 * Extracts valid WGS84 GPS coordinates from the first image file that contains EXIF GPS metadata.
 * Corrupt or metadata-stripped files return `{ exifLat: null, exifLng: null }` safely.
 */
export async function extractFirstExifGps(files) {
  for (const file of files || []) {
    try {
      const gps = await exifr.gps(file.path);
      if (!gps) continue;
      const lat = parseLat(gps.latitude);
      const lng = parseLng(gps.longitude);
      if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { exifLat: lat, exifLng: lng };
      }
    } catch {
      // Ignore unreadable or non-JPEG/stripped EXIF headers
    }
  }
  return { exifLat: null, exifLng: null };
}
