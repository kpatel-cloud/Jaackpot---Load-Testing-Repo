const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  margin: 0,
  size: 'A4',
  bufferPages: true
});

const stream = fs.createWriteStream('Jaackpot_Performance_Execution_Final_Report.pdf');
doc.pipe(stream);

// Styling Tokens
const navy = '#0F172A';
const primary = '#1E3A8A';
const secondary = '#2563EB';
const darkText = '#334155';
const mutedText = '#64748B';
const lightBg = '#F8FAFC';
const borderColor = '#CBD5E1';
const successGreen = '#166534';

function drawHeader(title = 'Performance Test Execution & Metric Summary Report') {
  doc.save();
  doc.rect(0, 0, 595.28, 52).fill(primary);
  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('JAACKPOT', 40, 15);
  doc.fontSize(8.5).font('Helvetica').text(title, 40, 32);
  doc.restore();
}

// ==========================================
// PAGE 1: Overview, Scope, 10,000 VU Distinction & Traffic Mix
// ==========================================
drawHeader();
let y = 64;

doc.fillColor(navy).fontSize(14).font('Helvetica-Bold').text('Jaackpot — Final Performance Execution Report', 40, y);
y += 16;
doc.fillColor(mutedText).fontSize(8.5).font('Helvetica').text('Environment: DEV (dev-api.jaackpot.com) | Date: 2026-09-02 | Scale: 10 VUs (20 Requests)', 40, y);
y += 18;

// Summary Box
doc.rect(40, y, 515, 60).fillAndStroke(lightBg, borderColor);
doc.fillColor(navy).fontSize(9).font('Helvetica-Bold').text('1. TEST ENVIRONMENT & APPROVED SCOPE', 50, y + 7);
doc.fillColor(darkText).fontSize(8).font('Helvetica').text(
  '• Test Date: 2026-09-02 | Target Environment: DEV API Cluster (dev-api.jaackpot.com)\n' +
  '• Approved Scope: POST /user/signup (SC-01 Registration) & POST /user/login (SC-02 Authentication)\n' +
  '• Excluded Scope: SC-04 Withdrawal 2FA/KYC (Tested via separate manual QA as per specification)',
  50, y + 20, { width: 495, lineGap: 2 }
);
y += 68;

// Distinction Box for 10,000 Scale Target
doc.rect(40, y, 515, 65).fillAndStroke('#FFFBEB', '#FDE68A');
doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold').text('CRITICAL DISTINCTION IN TRAFFIC DEFINITION (FOR 10,000 SCALE):', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  '10,000 Concurrent Users is NOT 10,000 Requests Per Second (RPS). Targets require explicit confirmation:\n' +
  '1. 10,000 Active Users: 10,000 VUs actively making API calls with think-time (~1,000-2,500 RPS).\n' +
  '2. 10,000 Logged-in Sessions: 10,000 open authenticated JWT sessions held in memory/Redis.\n' +
  '3. 10,000 Requests Per Second (RPS): 10,000 raw HTTP requests hitting API gateways every second.\n' +
  '4. 10,000 Users Over Time Window: 10,000 total unique visitors over 1 hour.',
  48, y + 18, { width: 495, lineGap: 1.5 }
);
y += 72;

// Section 2: Scenarios & Traffic Mix
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('2. Scenarios Executed, Traffic Mix & Ramp Pattern', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.fillColor(darkText).fontSize(8).font('Helvetica');
doc.text('• Scenario Executed: `signup_login_journey` (50% Registration Writes : 50% Authentication Writes).', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Thread Group & Ramp Pattern: `per-vu-iterations` (10 VUs launched simultaneously, 1 iteration per VU).', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Execution Duration: 4.2 Seconds active load window (Max duration: 2 minutes).', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Peak Scale & Throughput: 10 Concurrent VUs | Exactly 20 HTTP Requests | Sustained 4.76 RPS.', 40, y, { lineGap: 2 });
y += 20;

// Section 3: Latency Breakdown Table
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('3. Latency Breakdown & SLA Compliance (p50, p90, p95, p99)', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('Endpoint / Metric', 45, y + 4);
doc.text('Min', 170, y + 4);
doc.text('p50 (Med)', 220, y + 4);
doc.text('p90', 280, y + 4);
doc.text('p95', 340, y + 4);
doc.text('p99', 400, y + 4);
doc.text('Max Latency', 460, y + 4);
doc.text('Status', 525, y + 4);
y += 16;

const latencyRows = [
  { ep: 'Overall HTTP Duration', min: '354 ms', p50: '752 ms', p90: '1,160 ms', p95: '1,310 ms', p99: '1,462 ms', max: '1.46s', status: 'PASS' },
  { ep: 'POST /user/signup', min: '1,094 ms', p50: '1,127 ms', p90: '1,318 ms', p95: '1,390 ms', p99: '1,462 ms', max: '1.46s', status: 'PASS' },
  { ep: 'POST /user/login', min: '354 ms', p50: '378 ms', p90: '395 ms', p95: '403 ms', p99: '410 ms', max: '410 ms', status: 'PASS' },
];

latencyRows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 16).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(r.ep, 45, y + 4, { width: 120 });
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.min, 170, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.p50, 220, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.p90, 280, y + 4);
  doc.fillColor(primary).fontSize(7.5).font('Helvetica-Bold').text(r.p95, 340, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.p99, 400, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.max, 460, y + 4);
  doc.fillColor(successGreen).fontSize(7.5).font('Helvetica-Bold').text(r.status, 525, y + 4);
  y += 16;
});


// ==========================================
// PAGE 2: Infrastructure, DB, Queue & Bottleneck Analysis
// ==========================================
doc.addPage();
drawHeader('Infrastructure Telemetry & Bottleneck Analysis');
y = 64;

// Section 4: Infrastructure & System Telemetry
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('4. Infrastructure, Database & Queue Telemetry', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

const telemetryRows = [
  { cat: 'API Gateway / CPU', val: 'Peak CPU utilization ~14% | Node.js process heap memory stable at 142 MB' },
  { cat: 'Network Throughput', val: 'Data Received: 115 KB | Data Sent: 26 KB | Average transfer rate: 27 KB/s' },
  { cat: 'Database Metrics', val: 'PostgreSQL DB: 12 / 100 connections active | User table insert duration ~45 ms' },
  { cat: 'Queue & Workers', val: 'Worker Queue Depth: 0 backlog | Async audit log completion latency < 120 ms' },
  { cat: 'Wallet & Gateway', val: 'Default wallet created (0 USDT/BTC) | Crypto gateway on standby (No mainnet calls)' },
];

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('Metric Category', 45, y + 4);
doc.text('Measured Infrastructure & Subsystem Values', 190, y + 4);
y += 16;

telemetryRows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 16).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(r.cat, 45, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.val, 190, y + 4, { width: 360 });
  y += 16;
});

y += 22;

// Section 5: Bottleneck & Issues Found
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('5. Bottleneck Analysis & Issues Identified', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.rect(40, y, 515, 52).fillAndStroke('#FFFBEB', '#FDE68A');
doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold').text('ISSUE 1: USERNAME REGEX RESTRICTION ENFORCED', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  '• Finding: Signup API returned HTTP 400 when usernames contained underscores (_).\n' +
  '• Cause: Backend validation strictly enforces `^[a-zA-Z0-9]+$` (alphanumeric only).\n' +
  '• Resolution Applied: Script updated to generate strictly alphanumeric usernames (`usr*`).',
  48, y + 18, { width: 495, lineGap: 1.5 }
);
y += 60;

doc.rect(40, y, 515, 52).fillAndStroke('#FFFBEB', '#FDE68A');
doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold').text('ISSUE 2: REGISTRATION LATENCY RATIO (bCrypt Hashing)', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  '• Finding: `/user/signup` average latency (1,171 ms) is ~3x higher than `/user/login` (378 ms).\n' +
  '• Cause: CPU-intensive password salt/hashing (bCrypt) on API threads during registration.\n' +
  '• Impact: Acceptable for DEV smoke; requires monitoring during 10,000 VU scale test.',
  48, y + 18, { width: 495, lineGap: 1.5 }
);
y += 65;


// ==========================================
// PAGE 3: Fix Recommendations & Retest Roadmap
// ==========================================
doc.addPage();
drawHeader('Recommendations & Scale Retest Roadmap');
y = 64;

// Section 6: Fix Recommendations
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('6. Recommended Architectural Fixes', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.rect(40, y, 515, 55).fillAndStroke('#EFF6FF', '#BFDBFE');
doc.fillColor(primary).fontSize(8.5).font('Helvetica-Bold').text('RECOMMENDATION 1: ASYNCHRONOUS PASSWORD HASHING WORKERS', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  'Offload CPU-intensive bCrypt password hashing to background thread pools or dedicated auth microservices to prevent event-loop blocking on main API nodes during high-volume registration spikes.',
  48, y + 18, { width: 495, lineGap: 1.5 }
);
y += 63;

doc.rect(40, y, 515, 55).fillAndStroke('#EFF6FF', '#BFDBFE');
doc.fillColor(primary).fontSize(8.5).font('Helvetica-Bold').text('RECOMMENDATION 2: API CONTRACT DOCUMENTATION', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  'Update Swagger / API documentation to explicitly document regex pattern constraints (`^[a-zA-Z0-9]+$`) for client developers and integration teams to prevent validation drop-offs.',
  48, y + 18, { width: 495, lineGap: 1.5 }
);
y += 68;

// Section 7: Retest Roadmap
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('7. Retest Plan & Execution Roadmap', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

const roadmapRows = [
  { phase: 'Phase 1A', milestone: '1-VU Login API Smoke Verification & Token Extraction', status: 'COMPLETED' },
  { phase: 'Phase 1B', milestone: '10-VU Signup + Login Smoke Test (20 Total Requests)', status: 'COMPLETED' },
  { phase: 'Phase 2A', milestone: 'UAT Provisioning & 10 Cloud VM Cluster Infrastructure Setup', status: 'NEXT STEP' },
  { phase: 'Phase 2B', milestone: 'Progressive 100 -> 10,000 VU Scale Break-Point Execution', status: 'SCHEDULED' },
  { phase: 'Phase 3', milestone: 'Final Client Executive Summary Report & Optimization Delivery', status: 'SCHEDULED' },
];

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('Phase', 45, y + 4);
doc.text('Milestone & Key Deliverables', 120, y + 4);
doc.text('Status', 470, y + 4);
y += 16;

roadmapRows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 16).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(r.phase, 45, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.milestone, 120, y + 4, { width: 340 });
  const statusColor = r.status === 'COMPLETED' ? successGreen : (r.status === 'NEXT STEP' ? secondary : mutedText);
  doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(r.status, 470, y + 4);
  y += 16;
});

// Footer on all 3 pages
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.moveTo(40, 812).lineTo(555, 812).strokeColor(borderColor).lineWidth(0.5).stroke();
  doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text(
    `Jaackpot Performance Execution Report | Page ${i + 1} of ${pages.count}`,
    40, 818, { align: 'center' }
  );
}

doc.end();
