#!/usr/bin/env node
// Myto scenario model. Dependency-free. Single source of every number in the strategy deck.
// Run: node docs/myto-strategy/model.mjs [--json]
//
// EVERY input below is a PLANNING ASSUMPTION, not traction, not a forecast and not market data.
// As of 2026-11-12 Myto has no store release and no billing, so real revenue is zero and the
// real rider count is unknown. Change an input, re-run, then `npm run deck:build`.
//
// Months: m=1 is Nov 2026 ... m=12 is Oct 2027.
// Money: Indian rupees (INR). Customer prices include GST (assumed 18%, see GST_RATE).
//
// Definitions (kept separate on purpose; see financial-assumptions.md):
//   GMV            what customers pay, incl. GST: digital billings + all Shop orders (Originals and curated).
//                  GMV is NOT Myto's income: on curated products Myto only earns a commission.
//   Revenue        what Myto recognises, excl. GST: digital sales, Originals sales, curated commission, partnerships.
//   Gross profit   Revenue - COGS (store fees on digital, product cost of Originals, partnership delivery cost).
//   Contribution   Gross profit - other variable costs (payment gateway, fulfilment, returns).
//   Opex           fixed monthly costs (infra, tools, content, community, legal, marketing). Founder/team pay excluded.
//   Net            Contribution - Opex (pre-tax, pre-founder-pay).

export const MONTHS = ["Nov 26","Dec 26","Jan 27","Feb 27","Mar 27","Apr 27","May 27","Jun 27","Jul 27","Aug 27","Sep 27","Oct 27"];

// ---- shared assumptions (same in every scenario) -------------------------------------------
export const SHARED = {
  GST_RATE: 0.18,            // ASSUMPTION: simplification for digital services and goods. Verify with an accountant; goods rates vary.
  STORE_FEE: 0.15,           // Apple Small Business Program and Google first-USD-1M / subscriptions tier (see monetisation-model.md sources, read 2026-11-12). Falls to 0.30 on Google above USD 1M: not reached here.
  LARGE_PASS_PRICE: 99,      // HYPOTHESIS, INR incl. GST, per ride (max 20 participants). Configurable.
  ORGANISER_PRICE: 279,      // HYPOTHESIS, INR incl. GST per month (midpoint of 249-299). Max 50 participants.
  RIDES_PER_ORGANISER: 1.5,  // ASSUMPTION: group rides a month per rider who organises at all.
  PRE_LAUNCH_MAR: 50,        // ASSUMPTION: invited testers, before any store release.
  SHOP_GATEWAY_FEE: 0.02,    // ASSUMPTION: payment gateway cost on Originals orders (% of order incl. GST).
  SHOP_FULFIL_PER_ORDER: 90, // ASSUMPTION: INR pick, pack, handling per Originals order (customer pays shipping).
  SHOP_RETURN_RATE: 0.05,    // ASSUMPTION: share of Originals revenue refunded.
  PARTNER_DELIVERY_COST: 0.15, // ASSUMPTION: share of a partnership fee spent delivering it (design, moderation, rewards).
};

// ---- scenarios ------------------------------------------------------------------------------
export const SCENARIOS = {
  conservative: {
    label: "Conservative",
    launchMonth: 6,          // store release (needs a paid Apple account and review). Apr 27.
    billingMonth: 6,         // purchases live the same month.
    shopMonth: 7,
    marTarget: 1500,         // monthly active riders reached at m=12 (ASSUMPTION)
    pOrganise: 0.08,         // share of active riders who organise a group ride in a month
    shareLarge: 0.20,        // share of organised rides that need 6-20 people
    passConv: 0.30,          // share of those rides that buy a Large Ride Pass (rest stay at 5 or skip)
    subShare: 0.02,          // share of organisers on Myto Organiser
    shopCtr: 0.03,           // share of active riders who open the Shop link in a month
    shopConv: 0.02,          // share of Shop visitors who order
    aov: 1500,               // INR average order incl. GST
    originalsShare: 0.50,    // share of Shop orders that are Myto Originals
    originalsGM: 0.35,       // gross margin on Originals sales ex-GST
    curatedCommission: 0.08, // commission on curated third-party sales ex-GST
    partnerMonths: [],       // months in which a sponsored challenge is sold and delivered
    partnerFee: 40000,       // INR ex-GST per sponsored challenge
    opex: { infra: 2500, devAccounts: 800, content: 8000, community: 4000, legal: 5000, marketing: 0 },
    marketingFromLaunch: 8000, communityFromMonth: 3,
  },
  base: {
    label: "Base",
    launchMonth: 5, billingMonth: 5, shopMonth: 6,   // Mar 27
    marTarget: 6000,
    pOrganise: 0.10, shareLarge: 0.25, passConv: 0.40, subShare: 0.03,
    shopCtr: 0.05, shopConv: 0.03, aov: 1800, originalsShare: 0.50, originalsGM: 0.40, curatedCommission: 0.10,
    partnerMonths: [9, 12], partnerFee: 50000,
    opex: { infra: 3000, devAccounts: 800, content: 12000, community: 8000, legal: 6000, marketing: 0 },
    marketingFromLaunch: 15000, communityFromMonth: 3,
  },
  ambitious: {
    label: "Ambitious",
    launchMonth: 4, billingMonth: 4, shopMonth: 5,   // Feb 27
    marTarget: 20000,
    pOrganise: 0.12, shareLarge: 0.30, passConv: 0.50, subShare: 0.05,
    shopCtr: 0.08, shopConv: 0.04, aov: 2200, originalsShare: 0.60, originalsGM: 0.45, curatedCommission: 0.12,
    partnerMonths: [8, 10, 12], partnerFee: 75000,
    opex: { infra: 5000, devAccounts: 800, content: 20000, community: 15000, legal: 8000, marketing: 0 },
    marketingFromLaunch: 30000, communityFromMonth: 3,
  },
};

const round = (n) => Math.round(n);

export function runScenario(key) {
  const s = SCENARIOS[key];
  const S = SHARED;
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    // Active riders: flat testers before launch, then linear ramp to the target at m=12.
    const mar = m < s.launchMonth
      ? S.PRE_LAUNCH_MAR
      : S.PRE_LAUNCH_MAR + (s.marTarget - S.PRE_LAUNCH_MAR) * ((m - s.launchMonth + 1) / (12 - s.launchMonth + 1));
    const billing = m >= s.billingMonth;
    const organisers = mar * s.pOrganise;
    const subscribers = billing ? organisers * s.subShare : 0;
    const rides = (organisers - subscribers) * S.RIDES_PER_ORGANISER;
    const passSales = billing ? rides * s.shareLarge * s.passConv : 0;

    // Digital (Apple/Google). GMV = billings incl. GST. Revenue = ex-GST. COGS = store fee.
    const passBillings = passSales * S.LARGE_PASS_PRICE;
    const subBillings = subscribers * S.ORGANISER_PRICE;
    const digitalGMV = passBillings + subBillings;
    const digitalRev = digitalGMV / (1 + S.GST_RATE);
    const storeFees = digitalRev * S.STORE_FEE;

    // Shop (external store, physical goods). GMV is the whole basket; Myto revenue is narrower.
    const shopOn = m >= s.shopMonth;
    const orders = shopOn ? mar * s.shopCtr * s.shopConv : 0;
    const shopGMV = orders * s.aov;
    const origOrders = orders * s.originalsShare;
    const curOrders = orders - origOrders;
    const origRev = origOrders * s.aov / (1 + S.GST_RATE);
    const origCOGS = origRev * (1 - s.originalsGM);
    const curCommission = curOrders * s.aov / (1 + S.GST_RATE) * s.curatedCommission;
    const gateway = origOrders * s.aov * S.SHOP_GATEWAY_FEE;
    const fulfil = origOrders * S.SHOP_FULFIL_PER_ORDER;
    const returns = origRev * S.SHOP_RETURN_RATE;

    // Partnerships (sponsored, labelled challenges). Not GMV: Myto bills the partner directly.
    const partnerRev = s.partnerMonths.includes(m) ? s.partnerFee : 0;
    const partnerCOGS = partnerRev * S.PARTNER_DELIVERY_COST;

    const gmv = digitalGMV + shopGMV;
    const revenue = digitalRev + origRev + curCommission + partnerRev;
    const cogs = storeFees + origCOGS + partnerCOGS;
    const grossProfit = revenue - cogs;
    const otherVar = gateway + fulfil + returns;
    const contribution = grossProfit - otherVar;
    const o = s.opex;
    const opex = o.infra + o.devAccounts + o.content + o.legal
      + (m >= s.communityFromMonth ? o.community : 0)
      + (m >= s.launchMonth ? s.marketingFromLaunch : 0);
    const net = contribution - opex;
    rows.push({ m, month: MONTHS[m - 1], shopRev: round(origRev + curCommission), mar: round(mar), organisers: round(organisers), subscribers: round(subscribers), passSales: round(passSales),
      orders: round(orders), digitalGMV: round(digitalGMV), shopGMV: round(shopGMV), gmv: round(gmv),
      digitalRev: round(digitalRev), origRev: round(origRev), curCommission: round(curCommission), partnerRev: round(partnerRev),
      revenue: round(revenue), cogs: round(cogs), grossProfit: round(grossProfit), otherVar: round(otherVar),
      contribution: round(contribution), opex: round(opex), net: round(net) });
  }
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const keys = ["shopRev","gmv","digitalGMV","shopGMV","revenue","digitalRev","origRev","curCommission","partnerRev","cogs","grossProfit","otherVar","contribution","opex","net"];
  const year = Object.fromEntries(keys.map((k) => [k, sum(k)]));
  const last = rows[11];
  // Break-even active riders at the m=12 mix, product revenue only (partnerships excluded, they do not scale with riders):
  // opex / contribution per active rider.
  const contribPerRider = (last.contribution - last.partnerRev * (1 - S.PARTNER_DELIVERY_COST)) / last.mar;
  const breakEvenMar = round(last.opex / contribPerRider);
  const cumNetMin = rows.reduce((acc, r) => { acc.run += r.net; acc.min = Math.min(acc.min, acc.run); return acc; }, { run: 0, min: 0 }).min;
  return { key, label: s.label, rows, year, last, breakEvenMar, peakCumulativeLoss: cumNetMin, contribPerRider: round(contribPerRider * 100) / 100 };
}

export function runAll() {
  return { shared: SHARED, scenarios: Object.fromEntries(Object.keys(SCENARIOS).map((k) => [k, runScenario(k)])) };
}

export const inr = (n) => (n < 0 ? "-" : "") + "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
export const inrShort = (n) => {
  const a = Math.abs(n), sg = n < 0 ? "-" : "";
  if (a >= 1e7) return `${sg}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sg}₹${(a / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `${sg}₹${(a / 1e3).toFixed(1)}k`;
  return `${sg}₹${Math.round(a)}`;
};

function print() {
  const all = runAll();
  if (process.argv.includes("--json")) { console.log(JSON.stringify(all, null, 2)); return; }
  console.log("MYTO SCENARIO MODEL  (planning assumptions, not forecasts; INR; m1 = Nov 2026)\n");
  console.log("Shared assumptions:", JSON.stringify(SHARED));
  for (const [k, s] of Object.entries(SCENARIOS)) {
    const { launchMonth, billingMonth, shopMonth, marTarget, pOrganise, shareLarge, passConv, subShare, shopCtr, shopConv, aov, originalsShare, originalsGM, curatedCommission, partnerMonths, partnerFee } = s;
    console.log(`\n== ${s.label} inputs ==`, JSON.stringify({ launchMonth, billingMonth, shopMonth, marTarget, pOrganise, shareLarge, passConv, subShare, shopCtr, shopConv, aov, originalsShare, originalsGM, curatedCommission, partnerMonths, partnerFee, opex: s.opex, marketingFromLaunch: s.marketingFromLaunch }));
  }
  for (const r of Object.values(all.scenarios)) {
    console.log(`\n=== ${r.label}: monthly (INR) ===`);
    console.table(r.rows.map(({ month, mar, passSales, subscribers, orders, gmv, revenue, grossProfit, contribution, opex, net }) => ({ month, activeRiders: mar, passSales, subscribers, shopOrders: orders, gmv, revenue, grossProfit, contribution, opex, net })));
    console.log(`Year 1 (Nov 26 - Oct 27): GMV ${inr(r.year.gmv)} | revenue ${inr(r.year.revenue)} | gross profit ${inr(r.year.grossProfit)} | contribution ${inr(r.year.contribution)} | opex ${inr(r.year.opex)} | net ${inr(r.year.net)}`);
    console.log(`Oct 27 run-rate per month: revenue ${inr(r.last.revenue)}, net ${inr(r.last.net)}; product-only break-even active riders at that mix ~ ${r.breakEvenMar.toLocaleString("en-IN")}; peak cumulative loss ${inr(r.peakCumulativeLoss)}`);
  }
  console.log("\nFormulas: see header of this file and docs/myto-strategy/financial-assumptions.md");
}

if (import.meta.url === `file://${process.argv[1]}`) print();
