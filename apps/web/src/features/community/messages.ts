/** Plain-words messages for the result codes the community actions put in the page address. */
const MESSAGES: Record<string, { tone: "good" | "caution" | "stop"; text: string }> = {
  ridden: { tone: "good", text: "Thanks. You are on the list of riders who have ridden here." },
  unridden: { tone: "good", text: "Removed from the list of riders who have ridden here." },
  ridden_invalid: { tone: "stop", text: "Check the month, bike and note and try again." },
  ridden_rate_limited: { tone: "caution", text: "That's a lot of changes in a short time. Try again later." },
  ridden_not_found: { tone: "stop", text: "That trail isn't available." },
  comment_posted: { tone: "good", text: "Your comment is posted." },
  comment_pending: { tone: "caution", text: "Thanks. A moderator checks a new member's first comments before they appear. Only you can see it until then." },
  comment_edited: { tone: "good", text: "Your comment was updated." },
  comment_deleted: { tone: "good", text: "Your comment was deleted." },
  comment_reported: { tone: "good", text: "Thank you. A moderator will look at it." },
  comment_invalid: { tone: "stop", text: "Comments need 2 to 1,500 characters, and reports a short reason." },
  comment_no_links: { tone: "stop", text: "Please leave web addresses out of comments." },
  comment_rate_limited: { tone: "caution", text: "You've posted a lot in the last hour. Please wait a little." },
  comment_too_late: { tone: "caution", text: "Comments can only be edited for 10 minutes after posting." },
  comment_not_found: { tone: "stop", text: "That comment or trail isn't available." },
  comment_forbidden: { tone: "stop", text: "That comment can't be edited." },
  comment_not_member: { tone: "stop", text: "Please finish setting up your account first." },
};

export function resultMessage(code: string | undefined) {
  return code ? MESSAGES[code] ?? null : null;
}
