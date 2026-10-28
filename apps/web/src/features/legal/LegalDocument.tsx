import { Fragment } from "react";
import { legalDocs, type LegalSlug, type Part } from "@moto-trails/domain";
import { LegalPage } from "./LegalPage";

const link = "underline underline-offset-4";

function Parts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((x, i) =>
        typeof x === "string" ? <Fragment key={i}>{x}</Fragment> : <a key={i} href={x.href} className={link}>{x.text}</a>,
      )}
    </>
  );
}

/** One of the shared Terms, Privacy or About documents, in the site's text-page shell. */
export function LegalDocument({ slug }: { slug: LegalSlug }) {
  const doc = legalDocs[slug];
  return (
    <LegalPage title={doc.title} draft={doc.draft}>
      <p className="text-sm text-muted">Last updated {doc.updated}</p>
      {doc.sections.map((s, i) => (
        <Fragment key={i}>
          {s.heading ? <h2>{s.heading}</h2> : null}
          {s.blocks.map((b, j) =>
            "p" in b ? (
              <p key={j}><Parts parts={b.p} /></p>
            ) : (
              <ul key={j}>
                {b.ul.map((item, k) => (
                  <li key={k}><Parts parts={item} /></li>
                ))}
              </ul>
            ),
          )}
        </Fragment>
      ))}
    </LegalPage>
  );
}
