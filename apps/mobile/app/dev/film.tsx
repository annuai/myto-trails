import { useState } from 'react';
import { FilmSheet } from '@/features/film/FilmSheet';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';

/** A drawn landscape (sky, sun, hills, road, a green field and a red barn) with the colours a look needs to show itself; a real photo is only available on a phone. */
const SCENE = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="steelblue"/><stop offset=".6" stop-color="navajowhite"/><stop offset="1" stop-color="sandybrown"/></linearGradient></defs><rect width="1200" height="800" fill="url(#s)"/><circle cx="850" cy="430" r="70" fill="cornsilk"/><path d="M0 520 L260 380 L520 500 L780 360 L1200 520 V800 H0Z" fill="slategray"/><path d="M0 600 Q300 500 600 580 T1200 560 V800 H0Z" fill="forestgreen"/><path d="M500 800 L640 590 L700 590 L900 800Z" fill="dimgray"/><rect x="170" y="520" width="150" height="110" fill="firebrick"/><path d="M150 520 L245 450 L340 520Z" fill="maroon"/><rect x="0" y="700" width="1200" height="100" fill="darkolivegreen" opacity=".5"/></svg>';
const photo = `data:image/svg+xml;utf8,${encodeURIComponent(SCENE)}`;

/** The Film step with a bundled photo, so the looks can be checked in a browser. Baking needs a phone; here "Save" only closes the sheet. */
export default function FilmPreview() {
  const [open, setOpen] = useState(true);
  return (
    <Screen overlay={<FilmSheet open={open} source={photo} onSave={async () => setOpen(false)} onClose={() => setOpen(false)} />}>
      <BackHeader title="Film" />
      <PageTitle sub="Dev only.">Film looks</PageTitle>
      <Button label="Open Film" onPress={() => setOpen(true)} />
    </Screen>
  );
}
