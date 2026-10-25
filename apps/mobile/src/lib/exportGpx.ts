import { Platform, Share } from 'react-native';

/** Web: download a .gpx file. Phone: open the share sheet with the GPX text. */
export async function exportGpx(name: string, gpx: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.gpx`; a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: gpx, title: `${name}.gpx` });
  }
}
