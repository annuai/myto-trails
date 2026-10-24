import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";

const ITEMS = [
  { kind: "public" as const, title: "Open to everyone", text: "Public land or roads where anyone may ride. We still show when it was last checked." },
  { kind: "permission_required" as const, title: "You need permission", text: "A pass, permit or someone's say-so. We say how to get it, and you read it before you download the GPX." },
  { kind: "restricted" as const, title: "Restricted or private", text: "Protected or private ground. Two moderators must agree before such a trail is published, and a GPX is not offered by default." },
];

/** Explains the access labels in plain words: the reason the site exists. */
export function AccessExplainer() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {ITEMS.map((i) => (
        <li key={i.kind} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <StatusBadge kind="access" value={i.kind} chip />
          <h3 className="text-lg font-semibold">{i.title}</h3>
          <p className="text-muted">{i.text}</p>
        </li>
      ))}
    </ul>
  );
}
