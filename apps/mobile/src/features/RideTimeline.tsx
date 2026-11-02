import { Camera, Flag, Mic, Pause, PenLine, Play, Timer, type LucideIcon } from 'lucide-react-native';
import { useJournal } from '@/store/journal';
import { rideTimeline, rideWaits, type TimelineEvent, type TimelineKind } from '@/lib/rideTimeline';
import { asText, durationParts } from '@/lib/units';
import type { Ride } from '@/store/rides';
import { ListCard, Row } from '@/ui/ListCard';

const ICON: Record<TimelineKind, LucideIcon> = { start: Play, finish: Flag, break: Pause, wait: Timer, waypoint: Flag, note: PenLine, voice: Mic, photo: Camera };
const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function label(e: TimelineEvent): { label: string; sub?: string } {
  switch (e.kind) {
    case 'start': return { label: 'Ride started' };
    case 'finish': return { label: 'Ride finished' };
    case 'break': return { label: 'Stopped', sub: e.durationSec ? asText(durationParts(e.durationSec)) : undefined };
    case 'wait': return { label: 'Long wait', sub: e.durationSec ? asText(durationParts(e.durationSec)) : undefined };
    case 'waypoint': return { label: e.text || 'Waypoint' };
    case 'note': return { label: e.text || 'Note' };
    case 'voice': return { label: 'Voice note', sub: e.durationSec ? `${e.durationSec} s` : undefined };
    case 'photo': return { label: e.text || 'Photo' };
  }
}

/** A finished ride as a list of what happened and when: the start, stops, waypoints, the moments you added, and the finish. */
export function RideTimeline({ ride }: { ride: Ride }) {
  const entries = useJournal((s) => s.entries);
  const events = rideTimeline(ride, entries);
  const w = rideWaits(ride.points, ride.breaks);
  return (
    <ListCard>
      {w.count ? <Row icon={Timer} label="Waiting" sub={`${w.count} ${w.count === 1 ? 'wait' : 'waits'} of a minute or more`} value={asText(durationParts(w.totalSec))} chevron={false} /> : null}
      {events.map((e) => { const l = label(e); return <Row key={e.key} icon={ICON[e.kind]} label={l.label} sub={l.sub} value={clock(e.at)} mono chevron={false} />; })}
    </ListCard>
  );
}
