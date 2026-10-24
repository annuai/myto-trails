import { Notice } from "@/ui/Notice/Notice";
import { formatDate } from "@/lib/format";
import type { TrailDetailDto } from "@/server/queries/types";
import { conditionReasonLabel } from "./labels";

/** Notices for anything a rider must read before going: sample data, access limits and closures. */
export function TrailNotices({ trail }: { trail: TrailDetailDto }) {
  const notices: React.ReactNode[] = [];

  if (trail.isSample) {
    notices.push(<Notice key="sample" tone="info" title="Sample data">Sample data for development. This is not a real trail.</Notice>);
  }

  switch (trail.accessClass) {
    case "permission_required":
      notices.push(<Notice key="access" tone="caution" title="Permission required">{trail.permissionInstructions ?? "Get permission before you ride."}</Notice>);
      break;
    case "restricted":
      notices.push(<Notice key="access" tone="caution" title="Restricted access">{trail.permissionInstructions ?? "Rules or permits apply here. Check the regulations before you go."}</Notice>);
      break;
    case "private_no_access":
      notices.push(<Notice key="access" tone="stop" title="Do not ride this trail">This is private property with no public access.</Notice>);
      break;
    case "unknown":
      notices.push(<Notice key="access" tone="caution" title="Access unknown. Do not assume permission to ride here." />);
      break;
    case "public":
      break;
  }

  switch (trail.condition) {
    case "temporarily_closed":
      notices.push(
        <Notice key="condition" tone="stop" title="Temporarily closed">
          <p>
            {trail.conditionReason ? `Reason: ${conditionReasonLabel(trail.conditionReason)}. ` : ""}
            {trail.conditionExpectedUntil ? `Expected to reopen by ${formatDate(trail.conditionExpectedUntil)}.` : "No reopening date is known."}
          </p>
          {trail.conditionNote ? <p>{trail.conditionNote}</p> : null}
        </Notice>,
      );
      break;
    case "permanently_closed":
      notices.push(
        <Notice key="condition" tone="stop" title="Permanently closed">
          <p>This trail is closed for good. The page stays for reference.</p>
          {trail.conditionNote ? <p>{trail.conditionNote}</p> : null}
        </Notice>,
      );
      break;
    case "seasonal":
      notices.push(<Notice key="condition" tone="caution" title="Seasonal access">{trail.seasonNotes ?? trail.conditionNote ?? "Access depends on the season."}</Notice>);
      break;
    case "unknown":
      notices.push(<Notice key="condition" tone="caution" title="Condition unknown">We have no current report on this trail&apos;s condition. Check locally before you go.</Notice>);
      break;
    case "open":
      break;
  }

  if (notices.length === 0) return null;
  return <div className="flex flex-col gap-4">{notices}</div>;
}
