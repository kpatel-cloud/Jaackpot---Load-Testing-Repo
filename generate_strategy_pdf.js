const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  margin: 0,
  size: 'A4',
  bufferPages: true
});

const stream = fs.createWriteStream('Jaackpot_Load_Testing_Strategy_Master_Plan.pdf');
doc.pipe(stream);

// Color Palette
const navy = '#0F172A';        // Slate 900
const primary = '#1E3A8A';     // Blue 900
const secondary = '#2563EB';   // Blue 600
const darkText = '#334155';    // Slate 700
const mutedText = '#64748B';   // Slate 500
const lightBg = '#F8FAFC';     // Slate 50
const borderColor = '#CBD5E1'; // Slate 300

function drawHeader() {
  doc.save();
  doc.rect(0, 0, 595.28, 52).fill(primary);
  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('JAACKPOT', 40, 15);
  doc.fontSize(8.5).font('Helvetica').text('Performance & 8-Stage Progressive Load Testing Strategy (100 to 10,000 VUs)', 40, 32);
  doc.restore();
}

// ==========================================
// PAGE 1: Core Strategy, Objectives, Environments, Scenario Matrix
// ==========================================
drawHeader();
let y = 64;

// Title Block
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold').text('Jaackpot — Performance & Distributed Break-Point Strategy', 40, y);
y += 16;
doc.fillColor(mutedText).fontSize(8.5).font('Helvetica').text('Target Scale: 100 to 10,000 Concurrent Virtual Users | 8-Stage Ramping Profile', 40, y);
y += 18;

// Executive Summary Box
doc.rect(40, y, 515, 58).fillAndStroke(lightBg, borderColor);
doc.fillColor(navy).fontSize(9).font('Helvetica-Bold').text('EXECUTIVE SUMMARY & CORE STRATEGY', 50, y + 7);
doc.fillColor(darkText).fontSize(8).font('Helvetica').text(
  'This master plan defines the load testing strategy for the Jaackpot real-money casino platform. Testing follows a progressive 8-stage step-up stress methodology starting from 100 concurrent Virtual Users (VUs) and scaling via a distributed cloud VM infrastructure up to 10,000 VUs to identify maximum sustained throughput (RPS), system capacity limits, and performance bottlenecks.',
  50, y + 20, { width: 495, lineGap: 1.5 }
);
y += 68;

// Section 1: Objectives
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('1. Primary Objectives & Break-Point Approach', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.fillColor(darkText).fontSize(8).font('Helvetica');
doc.text('• Starting Baseline Floor: 100 Concurrent Active Virtual Users (VUs).', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Progressive 8-Stage Profile: Stepped ramp stages (100 -> 200 -> 500 -> 1k -> 2k -> 5k -> 7.5k -> 10k VUs).', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Scale Target: Up to 10,000 concurrent active users utilizing distributed cloud VM load generators.', 40, y, { lineGap: 2 });
y += 13;
doc.text('• Limit Identification: Isolate exact RPS & VU counts where response time exceeds SLA (p95 > 800ms) or errors > 0.5%.', 40, y, { lineGap: 2 });
y += 20;

// Section 2: Environment Strategy
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('2. Multi-Phase Environment Progression', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

// Phase 1 Card
doc.rect(40, y, 250, 62).fillAndStroke('#EFF6FF', '#BFDBFE');
doc.fillColor(primary).fontSize(8.5).font('Helvetica-Bold').text('PHASE 1: DEV ENVIRONMENT', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text('• Scope: Functional Smoke Validation\n• Scale: 1 to 10 VUs\n• Focus: Login API, Token Extraction & BO Logs', 48, y + 18, { width: 230, lineGap: 1.5 });

// Phase 2 Card
doc.rect(305, y, 250, 62).fillAndStroke('#F0FDF4', '#BBF7D0');
doc.fillColor('#166534').fontSize(8.5).font('Helvetica-Bold').text('PHASE 2: UAT ENVIRONMENT', 313, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text('• Scope: Full Break-Point Stress Testing\n• Scale: 100 -> 1,000 -> 5,000 -> 10,000 VUs\n• Focus: Latency Degradation & Max RPS Limits', 313, y + 18, { width: 230, lineGap: 1.5 });

y += 72;

// Section 3: Scenario Coverage Matrix
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('3. Scenario Coverage Matrix (SC-01 to SC-07)', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

const scenarios = [
  { id: 'SC-01', name: 'New Player Registration', prio: 'High', status: 'Included', notes: 'Direct account creation (No OTP required)' },
  { id: 'SC-02', name: 'Player Login & Session', prio: 'High', status: 'Included', notes: 'Full JWT session tracking & validation' },
  { id: 'SC-03', name: 'Crypto Deposit & Verify', prio: 'Critical', status: 'Included (Mock)', notes: 'Address fetch & staging deposit credit' },
  { id: 'SC-04', name: 'Withdrawal (2FA & KYC)', prio: 'Critical', status: 'Excluded (Load)', notes: 'Tested separately via manual QA' },
  { id: 'SC-05', name: 'Game Play Session', prio: 'High', status: 'Included', notes: 'Game lobby, launch & wager settlement' },
  { id: 'SC-06', name: 'Wallet Switching', prio: 'Medium', status: 'Included', notes: 'Multi-currency (USDT/BTC) switch' },
  { id: 'SC-07', name: 'Vault Transfer', prio: 'Medium', status: 'Included', notes: 'Wallet <-> Vault transfers' },
];

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('ID', 45, y + 4);
doc.text('Scenario Name', 85, y + 4);
doc.text('Priority', 235, y + 4);
doc.text('Status', 285, y + 4);
doc.text('Execution Notes', 360, y + 4);
y += 16;

scenarios.forEach((s, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 16).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(s.id, 45, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(s.name, 85, y + 4, { width: 145 });
  doc.fillColor(secondary).fontSize(7).font('Helvetica-Bold').text(s.prio, 235, y + 4);
  doc.fillColor(darkText).fontSize(7).font('Helvetica-Bold').text(s.status, 285, y + 4);
  doc.fillColor(mutedText).fontSize(7).font('Helvetica').text(s.notes, 360, y + 4, { width: 190 });
  y += 16;
});


// ==========================================
// PAGE 2: Client-Approved 8-Stage Ramp Schedule & 10k VU Strategy
// ==========================================
doc.addPage();
drawHeader();
y = 64;

// Section 4: 8-Stage Ramp Schedule
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('4. Client-Approved 8-Stage Progressive Load Schedule', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

const rampRows = [
  { stage: 'Stage 1', vus: '100 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Initial load validation & baseline establishment' },
  { stage: 'Stage 2', vus: '200 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Validate increased concurrency & session pool' },
  { stage: 'Stage 3', vus: '500 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Moderate load assessment' },
  { stage: 'Stage 4', vus: '1,000 VUs', ramp: '5 mins', steady: '10 mins', obj: 'High load & Redis cache sync check' },
  { stage: 'Stage 5', vus: '2,000 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Scalability validation & DB pool monitoring' },
  { stage: 'Stage 6', vus: '5,000 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Large-scale load assessment' },
  { stage: 'Stage 7', vus: '7,500 VUs', ramp: '5 mins', steady: '10 mins', obj: 'Near-maximum capacity validation' },
  { stage: 'Stage 8', vus: '10,000 VUs', ramp: '10 mins', steady: '15 mins', obj: 'Target maximum scale break-point test' },
];

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('Stage', 45, y + 4);
doc.text('Concurrent VUs', 110, y + 4);
doc.text('Ramp-Up', 200, y + 4);
doc.text('Steady State', 260, y + 4);
doc.text('Stage Objective', 330, y + 4);
y += 16;

rampRows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 15).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(r.stage, 45, y + 3.5);
  doc.fillColor(primary).fontSize(7.5).font('Helvetica-Bold').text(r.vus, 110, y + 3.5);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.ramp, 200, y + 3.5);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.steady, 260, y + 3.5);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.obj, 330, y + 3.5, { width: 220 });
  y += 15;
});

y += 20;

// Section 5: 10,000 VU Strategy & Traffic Distinctions
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('5. Distributed Infrastructure & Traffic Metric Distinctions', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

// Distinction Warning Box
doc.rect(40, y, 515, 68).fillAndStroke('#FFFBEB', '#FDE68A');
doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('CRITICAL DISTINCTION IN TRAFFIC DEFINITION (10,000 USERS IS NOT 10,000 RPS):', 48, y + 5);
doc.fillColor(darkText).fontSize(7).font('Helvetica').text(
  '1. 10,000 Concurrent Active Users: 10,000 VUs actively calling APIs with think-time (~1,000-2,500 RPS).\n' +
  '2. 10,000 Logged-in Sessions: 10,000 open authenticated JWT sessions held in memory/Redis (Low RPS, High RAM).\n' +
  '3. 10,000 Requests Per Second (RPS): 10,000 raw HTTP requests hitting API gateways every second.\n' +
  '4. 10,000 Users Over Time Window: 10,000 total unique visitors over 1 hour (~100-300 active VUs).',
  48, y + 16, { width: 495, lineGap: 1.5 }
);
y += 76;

doc.rect(40, y, 515, 42).fillAndStroke('#F8FAFC', borderColor);
doc.fillColor(navy).fontSize(8).font('Helvetica-Bold').text('DISTRIBUTED CLOUD INFRASTRUCTURE (FOR 10,000 VUs):', 48, y + 5);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(
  '• 10 Dedicated Cloud VMs (AWS EC2 c6i.2xlarge / 8 vCPUs / 16GB RAM) running k6 in parallel.\n' +
  '• Each VM handles 1,000 VUs with partitioned CSV data files (users_vm01.csv to users_vm10.csv).\n' +
  '• 10 Elastic Public IPs allowlisted in Cloudflare / WAF prior to execution.',
  48, y + 17, { width: 495, lineGap: 1.5 }
);


// ==========================================
// PAGE 3: Request Math & KPIs / Abort Safeguards
// ==========================================
doc.addPage();
drawHeader();
y = 64;

// Section 6: Deterministic Request Math
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('6. Deterministic Request Math (1 Pass Per VU)', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

doc.fillColor(darkText).fontSize(8).font('Helvetica');
doc.text('All test scripts enforce `per-vu-iterations` with `iterations: 1`. Each Virtual User completes the user journey exactly once without arbitrary loops.', 40, y);
y += 16;

const mathRows = [
  { stage: 'Smoke Phase', vus: '10 VUs', infra: '1 Local Machine', eps: '2 Endpoints', total: '20 Requests' },
  { stage: 'Stage 1 (Baseline)', vus: '100 VUs', infra: '1 Cloud VM', eps: '7 Endpoints', total: '700 Requests' },
  { stage: 'Stage 4 (High)', vus: '1,000 VUs', infra: '1 Cloud VM', eps: '7 Endpoints', total: '7,000 Requests' },
  { stage: 'Stage 6 (Large)', vus: '5,000 VUs', infra: '5 Cloud VMs', eps: '7 Endpoints', total: '35,000 Requests' },
  { stage: 'Stage 8 (Peak Scale)', vus: '10,000 VUs', infra: '10 Cloud VMs', eps: '7 Endpoints', total: '70,000 Requests' },
];

doc.rect(40, y, 515, 16).fill('#1E293B');
doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
doc.text('Stage', 45, y + 4);
doc.text('Concurrent VUs', 150, y + 4);
doc.text('Infrastructure', 240, y + 4);
doc.text('Endpoints / Flow', 350, y + 4);
doc.text('Total HTTP Requests', 440, y + 4);
y += 16;

mathRows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
  doc.rect(40, y, 515, 16).fillAndStroke(bg, borderColor);
  doc.fillColor(navy).fontSize(7.5).font('Helvetica-Bold').text(r.stage, 45, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.vus, 150, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.infra, 240, y + 4);
  doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text(r.eps, 350, y + 4);
  doc.fillColor(primary).fontSize(7.5).font('Helvetica-Bold').text(r.total, 440, y + 4);
  y += 16;
});
y += 22;

// Section 7: KPIs and Abort Safeguards
doc.fillColor(primary).fontSize(10.5).font('Helvetica-Bold').text('7. Key Performance Indicators (KPIs) & Abort Safeguards', 40, y);
doc.moveTo(40, y + 12).lineTo(555, y + 12).strokeColor(secondary).lineWidth(1).stroke();
y += 18;

// Card A: TARGET OPERATIONAL SLAs
doc.rect(40, y, 515, 54).fillAndStroke('#F8FAFC', borderColor);
doc.fillColor(navy).fontSize(8.5).font('Helvetica-Bold').text('TARGET OPERATIONAL SLAs:', 48, y + 6);
doc.fillColor(darkText).fontSize(7.5).font('Helvetica').text('• Overall Response Latency: p95 <= 800 ms (Login p95 <= 500 ms, Wager p95 <= 1,000 ms)', 48, y + 18);
doc.text('• Request Failure Rate: < 0.5% total HTTP errors across all endpoints', 48, y + 29);
doc.text('• Login Success Rate: > 99.5% success under 10,000 VU load', 48, y + 40);
y += 62;

// Card B: AUTOMATED EMERGENCY ABORT CONDITIONS
doc.rect(40, y, 515, 54).fillAndStroke('#FEF2F2', '#FECACA');
doc.fillColor('#991B1B').fontSize(8.5).font('Helvetica-Bold').text('AUTOMATED EMERGENCY ABORT CONDITIONS:', 48, y + 6);
doc.fillColor('#7F1D1D').fontSize(7.5).font('Helvetica').text('1. Sustained Error Spike: HTTP error rate exceeds 2.0% over a sustained 30-second window.', 48, y + 18);
doc.text('2. Latency Collapse: p95 response time exceeds 3,000 ms over a 1-minute window.', 48, y + 29);
doc.text('3. Database Saturation: DB connection pool reaches 100% with queuing timeouts.', 48, y + 40);

// Footer on all pages
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.moveTo(40, 812).lineTo(555, 812).strokeColor(borderColor).lineWidth(0.5).stroke();
  doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text(
    `Jaackpot Performance Testing Strategy Master Plan | Page ${i + 1} of ${pages.count}`,
    40, 818, { align: 'center' }
  );
}

doc.end();
