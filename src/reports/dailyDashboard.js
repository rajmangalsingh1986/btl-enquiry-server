const prisma = require("../lib/prisma");

// Mirrors the Admin dashboard's own grouping logic (app/src/components/DayGroupTable.js
// and the by-dealership/by-final-status breakdowns) so the emailed report matches what's
// visible in the app. Email clients strip <style> blocks unpredictably, so everything
// here uses inline styles on plain tables rather than CSS classes.

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || "Unspecified";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function buildDayGroupMatrix(enquiries, groupFn) {
  const dates = [...new Set(enquiries.map((e) => e.activityDate))].sort().reverse();
  const groups = [...new Set(enquiries.map(groupFn))].sort();

  const counts = {};
  for (const e of enquiries) {
    const g = groupFn(e);
    counts[e.activityDate] = counts[e.activityDate] || {};
    counts[e.activityDate][g] = (counts[e.activityDate][g] || 0) + 1;
  }

  const groupTotals = {};
  for (const g of groups) {
    groupTotals[g] = dates.reduce((sum, date) => sum + (counts[date]?.[g] || 0), 0);
  }

  return { dates, groups, counts, groupTotals };
}

const TD = 'style="padding:6px 10px;border:1px solid #E5E7EB;font-size:13px;color:#374151;"';
const TD_BOLD = 'style="padding:6px 10px;border:1px solid #E5E7EB;font-size:13px;color:#111827;font-weight:700;"';
const TH = 'style="padding:6px 10px;border:1px solid #E5E7EB;font-size:13px;color:#111827;font-weight:700;background:#F9FAFB;text-align:left;"';

function renderDayGroupTable(enquiries, groupFn, title) {
  if (!enquiries.length) return "";
  const { dates, groups, counts, groupTotals } = buildDayGroupMatrix(enquiries, groupFn);

  const headerCells = [`<th ${TH}>Date</th>`, ...groups.map((g) => `<th ${TH}>${g}</th>`), `<th ${TH}>Total</th>`].join("");
  const bodyRows = dates
    .map((date) => {
      const rowTotal = groups.reduce((sum, g) => sum + (counts[date]?.[g] || 0), 0);
      const cells = [
        `<td ${TD}>${date}</td>`,
        ...groups.map((g) => `<td ${TD}>${counts[date]?.[g] || 0}</td>`),
        `<td ${TD_BOLD}>${rowTotal}</td>`,
      ].join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const totalCells = [
    `<td ${TD_BOLD}>Total</td>`,
    ...groups.map((g) => `<td ${TD_BOLD}>${groupTotals[g]}</td>`),
    `<td ${TD_BOLD}>${enquiries.length}</td>`,
  ].join("");

  return `
    <h3 style="font-size:15px;color:#111827;margin:24px 0 8px;">${title}</h3>
    <table style="border-collapse:collapse;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}<tr>${totalCells}</tr></tbody>
    </table>
  `;
}

// PV = Personal Vehicle, CV = Commercial Vehicle - matches the PV/CV role
// naming already used for CRE/SM accounts. BEV counts as PV, same as the
// CRE/SM segment-routing rule elsewhere in the app.
function vehicleType(segment) {
  return segment === "Commercial" ? "CV" : "PV";
}

function renderDealershipVehicleTypeTable(enquiries, title) {
  if (!enquiries.length) return "";
  const dealerships = [...new Set(enquiries.map((e) => e.dealershipName))].sort();

  const bodyRows = dealerships
    .map((dealershipName) => {
      let pv = 0;
      let cv = 0;
      for (const e of enquiries) {
        if (e.dealershipName !== dealershipName) continue;
        if (vehicleType(e.segment) === "CV") cv += 1;
        else pv += 1;
      }
      return `<tr><td ${TD}>${dealershipName}</td><td ${TD}>${pv}</td><td ${TD}>${cv}</td><td ${TD_BOLD}>${pv + cv}</td></tr>`;
    })
    .join("");

  const totals = enquiries.reduce(
    (acc, e) => {
      if (vehicleType(e.segment) === "CV") acc.cv += 1;
      else acc.pv += 1;
      return acc;
    },
    { pv: 0, cv: 0 }
  );

  return `
    <h3 style="font-size:15px;color:#111827;margin:24px 0 8px;">${title}</h3>
    <table style="border-collapse:collapse;">
      <thead><tr><th ${TH}>Dealership</th><th ${TH}>PV</th><th ${TH}>CV</th><th ${TH}>Total</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr><td ${TD_BOLD}>Total</td><td ${TD_BOLD}>${totals.pv}</td><td ${TD_BOLD}>${totals.cv}</td><td ${TD_BOLD}>${enquiries.length}</td></tr>
      </tbody>
    </table>
  `;
}

function renderBreakdownList(entries, title) {
  const rows = Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `<tr><td ${TD}>${label}</td><td ${TD_BOLD}>${count}</td></tr>`)
    .join("");
  if (!rows) return "";
  return `
    <h3 style="font-size:15px;color:#111827;margin:24px 0 8px;">${title}</h3>
    <table style="border-collapse:collapse;">${rows}</table>
  `;
}

async function buildDailyDashboardHtml() {
  const rows = await prisma.enquiry.findMany({
    include: { dealership: { select: { name: true } } },
  });
  const enquiries = rows.map((row) => ({
    activityDate: row.activityDate.toISOString().slice(0, 10),
    dealershipName: row.dealership?.name || "Unassigned",
    segment: row.segment,
    stage: row.stage,
    asmStatus: row.asmStatus,
  }));

  const byFinalStatus = countBy(
    enquiries.filter((e) => e.stage === "ASM_TAGGED"),
    (e) => e.asmStatus
  );

  const today = new Date().toISOString().slice(0, 10);

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;max-width:700px;">
      <h2 style="font-size:18px;margin-bottom:4px;">Sarpanch Ka Samman - Daily Enquiry Report</h2>
      <p style="font-size:13px;color:#6B7280;margin-top:0;">${today} &middot; ${enquiries.length} total enquiries</p>
      ${renderDayGroupTable(enquiries, (e) => e.dealershipName, "Enquiry Flow by Day & Dealership")}
      ${renderDayGroupTable(enquiries, (e) => e.segment, "Enquiry Flow by Day & Segment")}
      ${renderDealershipVehicleTypeTable(enquiries, "Enquiries by Dealership")}
      ${renderBreakdownList(byFinalStatus, "Closed Enquiries by Final Status")}
    </div>
  `;
}

module.exports = { buildDailyDashboardHtml };
