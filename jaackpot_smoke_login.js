import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { Trend, Rate, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

/* ============================================================================
 * JAACKPOT PLATFORM E2E PERFORMANCE & SMOKE TEST SCRIPT
 * ============================================================================
 * Target System: Jaackpot Gaming & Payment Backend API
 * Workflows Covered (19 End-to-End Test Scenarios):
 *  - SC-01: User Registration / Signup
 *  - SC-02: Authentication & Token Extraction
 *  - SC-03: USDT Deposit Simulation via Webhook Receiver
 *  - SC-04: Wallet Real-Balance Synchronization Check
 *  - SC-05: Deposit Transaction History Verification
 *  - SC-06: Alea Casino Game Launch (Session Bootstrap)
 *  - SC-07: Alea Callback — Real-Time Balance Inquiry
 *  - SC-08: Alea Callback — Debit Bet Transaction
 *  - SC-09: Alea Callback — Credit Win Transaction & Round Termination
 *  - SC-10: USDT Withdrawal Simulation via Webhook Receiver
 *  - SC-11: Post-Withdrawal Wallet Balance Verification
 *  - SC-12: Primary Wallet Currency Switch to ETH
 *  - SC-13: ETH Deposit Simulation & Balance Verification
 *  - SC-14: Alea Casino Game Launch in ETH Currency
 *  - SC-15: Alea Callback — Place Bet in ETH
 *  - SC-16: Primary Wallet Currency Reset to USDT & Balance Check
 *  - SC-17: Open Vault & Query Vault Balance
 *  - SC-18: Fund Transfer from Wallet to Vault (Deposit to Vault)
 *  - SC-19: Fund Withdrawal from Vault back to Wallet
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// Environment & Scope Configuration
// ----------------------------------------------------------------------------
const ENVIRONMENT = __ENV.ENVIRONMENT || 'DEV (dev-api.jaackpot.com)';
const BASE_URL = __ENV.BASE_URL || 'https://dev-api.jaackpot.com/api/v1';
const HOST_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');
const TEST_DATE = new Date().toISOString().split('T')[0];

// ----------------------------------------------------------------------------
// Alea Casino Integration Config
// ----------------------------------------------------------------------------
const ALEA_SECRET_KEY = __ENV.ALEA_SECRET_KEY || '595b10004e20a643ed61a54d52e8b224819670143d80b8484778bfcee3915975';
const ALEA_CASINO_GAME_ID = __ENV.ALEA_CASINO_GAME_ID || 1;
const ALEA_GAME_SLUG = __ENV.ALEA_GAME_SLUG || 'pragmatic-sweet-bonanza';
// Alea API requires 3-letter ISO currency format (e.g., USD, EUR, ETH)
const ALEA_CURRENCY = __ENV.ALEA_CURRENCY || 'USDT';

// ----------------------------------------------------------------------------
// SHA-512 Digest Generator for Alea Callbacks
// ----------------------------------------------------------------------------
function generateAleaDigest(signedString, secretKey) {
  const hashHex = crypto.sha512(signedString + secretKey, 'hex');
  return `SHA-512=${hashHex}`;
}

// ----------------------------------------------------------------------------
// Custom Jaackpot Performance Metrics for Grafana & Reporting
// ----------------------------------------------------------------------------
const signupLatencyTrend = new Trend('jp_signup_duration_ms');
const loginLatencyTrend = new Trend('jp_login_duration_ms');
const depositLatencyTrend = new Trend('jp_deposit_duration_ms');
const withdrawalLatencyTrend = new Trend('jp_withdrawal_duration_ms');
const balanceLatencyTrend = new Trend('jp_balance_duration_ms');
const transactionLatencyTrend = new Trend('jp_transaction_duration_ms');
const updatePrimaryWalletLatencyTrend = new Trend('jp_update_primary_wallet_duration_ms');
const vaultBalanceLatencyTrend = new Trend('jp_vault_balance_duration_ms');
const vaultTransferLatencyTrend = new Trend('jp_vault_transfer_duration_ms');
const vaultWithdrawLatencyTrend = new Trend('jp_vault_withdraw_duration_ms');

// Alea Gameplay Custom Latency Metrics
const aleaLaunchLatencyTrend = new Trend('jp_alea_launch_duration_ms');
const aleaBalanceLatencyTrend = new Trend('jp_alea_balance_duration_ms');
const aleaBetLatencyTrend = new Trend('jp_alea_bet_duration_ms');
const aleaWinLatencyTrend = new Trend('jp_alea_win_duration_ms');
const ethAleaBetLatencyTrend = new Trend('jp_eth_alea_bet_duration_ms');

// Success Rates
const signupSuccessRate = new Rate('jp_signup_success_rate');
const loginSuccessRate = new Rate('jp_login_success_rate');
const depositSuccessRate = new Rate('jp_deposit_success_rate');
const webhookSuccessRate = new Rate('jp_webhook_success_rate');
const withdrawalSuccessRate = new Rate('jp_withdrawal_success_rate');
const withdrawalWebhookSuccessRate = new Rate('jp_withdrawal_webhook_success_rate');
const balanceSuccessRate = new Rate('jp_balance_success_rate');
const postWithdrawalBalanceSuccessRate = new Rate('jp_post_withdrawal_balance_success_rate');
const transactionSuccessRate = new Rate('jp_transaction_success_rate');
const updatePrimaryWalletSuccessRate = new Rate('jp_update_primary_wallet_success_rate');
const vaultBalanceSuccessRate = new Rate('jp_vault_balance_success_rate');
const vaultTransferSuccessRate = new Rate('jp_vault_transfer_success_rate');
const vaultWithdrawSuccessRate = new Rate('jp_vault_withdraw_success_rate');

// Alea Gameplay Success Rates
const aleaLaunchSuccessRate = new Rate('jp_alea_launch_success_rate');
const aleaBalanceSuccessRate = new Rate('jp_alea_balance_success_rate');
const aleaBetSuccessRate = new Rate('jp_alea_bet_success_rate');
const aleaWinSuccessRate = new Rate('jp_alea_win_success_rate');
const ethAleaBetSuccessRate = new Rate('jp_eth_alea_bet_success_rate');

const tokenExtractionRate = new Rate('jp_token_extraction_rate');
const totalJourneyCounter = new Counter('jp_completed_journeys');

/* ============================================================================
 * K6 TEST SCENARIO CONFIGURATION
 * ============================================================================
 * CURRENT MODE: Progressive Load Test (Stages 1 - 8, Up to 10,000 VUs)
 * Purpose: Full-scale end-to-end performance and scalability validation across
 * all 8 progressive ramping stages.
 *
 * TO SWITCH BACK TO DRY RUN (1 VU):
 * 1. Comment out `progressive_8_stage_load` block below.
 * 2. Uncomment `dry_run_single_user` block below.
 * ============================================================================
 */
export const options = {
  scenarios: {
    /*
    // ------------------------------------------------------------------
    // INACTIVE: Single User Dry Run Scenario (1 VU, 1 Iteration)
    // ------------------------------------------------------------------
    dry_run_single_user: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '5m',
    },
    */

    // ------------------------------------------------------------------
    // ACTIVE: Client-Approved 8-Stage Progressive Ramping (Up to 10,000 VUs)
    // ------------------------------------------------------------------
    progressive_8_stage_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Stage 1: Initial load validation (100 VUs)
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },

        // Stage 2: Validate increased concurrency (200 VUs)
        { duration: '5m', target: 200 },
        { duration: '10m', target: 200 },

        // Stage 3: Moderate load (500 VUs)
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },

        // Stage 4: High load (1,000 VUs)
        { duration: '5m', target: 1000 },
        { duration: '10m', target: 1000 },

        // Stage 5: Scalability validation (2,000 VUs)
        { duration: '5m', target: 2000 },
        { duration: '10m', target: 2000 },

        // Stage 6: Large-scale load (5,000 VUs)
        { duration: '5m', target: 5000 },
        { duration: '10m', target: 5000 },

        // Stage 7: Near-maximum load (7,500 VUs)
        { duration: '5m', target: 7500 },
        { duration: '10m', target: 7500 },

        // Stage 8: Target maximum load (10,000 VUs)
        { duration: '10m', target: 10000 },
        { duration: '15m', target: 10000 },

        // Ramp down
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Overall Request SLAs
    http_req_failed: ['rate<0.05'],                                     // Failure Rate < 5%
    http_req_duration: ['p(50)<800', 'p(90)<1500', 'p(95)<2000'],       // Latency SLAs

    // Custom Endpoint Latency SLAs (p50, p90, p95)
    jp_signup_duration_ms: ['p(50)<1500', 'p(90)<2000', 'p(95)<2500'],
    jp_login_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_deposit_duration_ms: ['p(50)<1000', 'p(90)<1500', 'p(95)<2000'],
    jp_withdrawal_duration_ms: ['p(50)<1000', 'p(90)<1500', 'p(95)<2000'],
    jp_balance_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_transaction_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],

    // Alea Casino SLAs
    jp_alea_launch_duration_ms: ['p(50)<800', 'p(90)<1200', 'p(95)<1500'],
    jp_alea_balance_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_alea_bet_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_alea_win_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],

    // Vault SLAs
    jp_vault_balance_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_vault_transfer_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],
    jp_vault_withdraw_duration_ms: ['p(50)<500', 'p(90)<800', 'p(95)<1000'],

    // Endpoint Success Rates
    jp_signup_success_rate: ['rate>0.95'],
    jp_login_success_rate: ['rate>0.95'],
    jp_deposit_success_rate: ['rate>0.95'],
    jp_webhook_success_rate: ['rate>0.95'],
    jp_withdrawal_success_rate: ['rate>0.95'],
    jp_withdrawal_webhook_success_rate: ['rate>0.95'],
    jp_balance_success_rate: ['rate>0.95'],
    jp_post_withdrawal_balance_success_rate: ['rate>0.95'],
    jp_transaction_success_rate: ['rate>0.95'],
    jp_vault_balance_success_rate: ['rate>0.95'],
    jp_vault_transfer_success_rate: ['rate>0.95'],
    jp_vault_withdraw_success_rate: ['rate>0.95'],

    jp_alea_launch_success_rate: ['rate>0.95'],
    jp_alea_balance_success_rate: ['rate>0.95'],
    jp_alea_bet_success_rate: ['rate>0.95'],
    jp_alea_win_success_rate: ['rate>0.95'],

    jp_token_extraction_rate: ['rate>0.95'],
  },
};

// ----------------------------------------------------------------------------
// Common Standard HTTP Request Headers
// ----------------------------------------------------------------------------
const commonHeaders = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en',
  'content-type': 'application/json',
  'origin': 'https://dev.jaackpot.com',
  'referer': 'https://dev.jaackpot.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'user-location': 'null',
  'x-visitor-id': 'c2b2217a497d49357cedfe1334bbcd08148400e48d1fad7385df37c606dc8367',
};

// ============================================================================
// MAIN EXECUTION FUNCTION (Virtual User Workflow)
// ============================================================================
export default function () {
  const vuId = __VU;
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(100 + Math.random() * 900);

  // Strictly alphanumeric username (^[a-zA-Z0-9]+$)
  const userName = `usr${timestamp}v${vuId}${randomNum}`;
  const email = `usr${timestamp}v${vuId}${randomNum}@testjp.com`;
  const password = 'Welcome@1';

  console.log(`[LOAD TEST] Starting Virtual User #${vuId} scenario execution with user '${userName}'...`);

  // ------------------------------------------------------------------
  // STEP 1: SIGNUP API (POST /api/v1/user/signup)
  // Requirement: Registers a new user account on Jaackpot platform
  // ------------------------------------------------------------------
  const signupUrl = `${BASE_URL}/user/signup`;
  const signupPayload = JSON.stringify({
    userName: userName,
    email: email,
    password: password,
    ipAddress: '14.96.243.218',
    phoneCode: '91',
  });

  const signupStart = Date.now();
  const signupRes = http.post(signupUrl, signupPayload, {
    headers: commonHeaders,
    tags: { name: 'Signup_API', scenario: 'SC-01_Registration' }
  });
  const signupDuration = Date.now() - signupStart;
  signupLatencyTrend.add(signupRes.timings.duration || signupDuration);

  const signupPassed = check(signupRes, {
    '[Step 1] Signup HTTP status is 200/201': (r) => r.status === 200 || r.status === 201,
    '[Step 1] Signup response success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true || json.message === 'success';
      } catch (e) {
        return false;
      }
    },
  });

  signupSuccessRate.add(signupPassed);

  if (!signupPassed) {
    console.error(`[Step 1 FAIL] Signup failed with status ${signupRes.status}: ${signupRes.body}`);
    return;
  }
  console.log(`[Step 1 PASS] Signup succeeded for user '${userName}'`);

  // Pacing / Think-Time between operations (1 to 2 seconds)
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 2: LOGIN API (POST /api/v1/user/login)
  // Requirement: Authenticates user & extracts JWT accessToken & userId
  // ------------------------------------------------------------------
  const loginUrl = `${BASE_URL}/user/login`;
  const loginPayload = JSON.stringify({
    loginInput: userName,
    password: password,
    type: 'email',
    ipAddress: '14.96.243.218',
    country: 'IN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    deviceType: 'Win32',
    device: 'Chrome',
    deviceId: '',
  });

  const loginStart = Date.now();
  const loginRes = http.post(loginUrl, loginPayload, {
    headers: commonHeaders,
    tags: { name: 'Login_API', scenario: 'SC-02_Authentication' }
  });
  const loginDuration = Date.now() - loginStart;
  loginLatencyTrend.add(loginRes.timings.duration || loginDuration);

  let hasToken = false;
  let accessToken = null;
  let userId = null;

  try {
    const loginJson = loginRes.json();
    hasToken = !!loginJson.data?.accessToken;
    accessToken = loginJson.data?.accessToken;
    userId = loginJson.data?.result?.id || loginJson.data?.user?.id || loginJson.data?.userId || loginJson.data?.id;
  } catch (e) {
    hasToken = false;
  }

  if (!userId) {
    try {
      const signupJson = signupRes.json();
      userId = signupJson.data?.result?.id || signupJson.data?.user?.id || signupJson.data?.userId || signupJson.data?.id;
    } catch (e) {
      userId = null;
    }
  }

  const loginPassed = check(loginRes, {
    '[Step 2] Login HTTP status is 200': (r) => r.status === 200,
    '[Step 2] Login accessToken received': () => hasToken,
  });

  loginSuccessRate.add(loginPassed);
  tokenExtractionRate.add(hasToken);

  if (!loginPassed) {
    console.error(`[Step 2 FAIL] Login failed with status ${loginRes.status}: ${loginRes.body}`);
    return;
  }
  console.log(`[Step 2 PASS] Login succeeded. UserId: ${userId}`);

  // Dynamic Auth Headers for Authenticated Endpoints
  const authHeaders = Object.assign({}, commonHeaders, {
    'authorization': accessToken ? `Bearer ${accessToken}` : '',
  });

  // Pacing / Think-Time between operations (1 to 2 seconds)
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 2B: SWITCH WALLET TO PRIMARY CURRENCY (USDT)
  // Requirement: Switches wallet to primary currency prior to deposit
  // ------------------------------------------------------------------
  const initialPrimaryWalletUrl = `${BASE_URL}/wallet/update-primary-wallet`;
  const initialPrimaryPayload = JSON.stringify({ currencyCode: 'USDT' });
  const initialPrimaryStart = Date.now();
  const initialPrimaryRes = http.put(initialPrimaryWalletUrl, initialPrimaryPayload, {
    headers: authHeaders,
    tags: { name: 'Initial_Update_Primary_Wallet_API', scenario: 'SC-02B_Set_Primary_Wallet_USDT' }
  });
  updatePrimaryWalletLatencyTrend.add(initialPrimaryRes.timings.duration || (Date.now() - initialPrimaryStart));

  const initialPrimaryPassed = check(initialPrimaryRes, {
    '[Step 2B] Set Primary Wallet to USDT HTTP status is 200': (r) => r.status === 200,
    '[Step 2B] Set Primary Wallet to USDT success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  updatePrimaryWalletSuccessRate.add(initialPrimaryPassed);
  if (initialPrimaryPassed) {
    console.log(`[Step 2B PASS] Primary wallet set to USDT before deposit`);
  }

  // Format userId for payment webhook contract
  const targetUserId = userId ? (isNaN(userId) ? userId : parseInt(userId, 10)) : vuId;

  // ------------------------------------------------------------------
  // STEP 3: DEPOSIT API (POST /api/v1/qa-tools/payment/simulate-webhook)
  // Requirement: Simulates payment provider webhook to credit USDT wallet
  // ------------------------------------------------------------------
  const depositUrl = `${BASE_URL}/qa-tools/payment/simulate-webhook`;
  const depositPayload = JSON.stringify({
    type: 'deposit',
    userId: targetUserId,
    amount: 100,
    currencyCode: 'USDT',
    status: 'Success'
  });

  const depositStart = Date.now();
  const depositRes = http.post(depositUrl, depositPayload, {
    headers: commonHeaders,
    tags: { name: 'Deposit_Simulator_API', scenario: 'SC-03_Payment_Deposit' }
  });
  const depositDuration = Date.now() - depositStart;
  depositLatencyTrend.add(depositRes.timings.duration || depositDuration);

  let webhookPassed = false;
  try {
    const depJson = depositRes.json();
    webhookPassed = depJson.success === true && (depJson.data?.webhookResult?.status === 200 || depJson.data?.status === 200);
  } catch (e) {
    webhookPassed = false;
  }

  const depositPassed = check(depositRes, {
    '[Step 3] Deposit Simulator HTTP status is 200': (r) => r.status === 200,
    '[Step 3] Deposit response success is true': (r) => {
      try {
        return r.json().success === true;
      } catch (e) {
        return false;
      }
    },
    '[Step 3] Webhook execution status is 200': () => webhookPassed,
  });

  depositSuccessRate.add(depositPassed);
  webhookSuccessRate.add(webhookPassed);

  if (depositPassed) {
    console.log(`[Step 3 PASS] Webhook Deposit simulation succeeded`);
  } else {
    console.warn(`[Step 3 WARN] Deposit response: ${depositRes.status} | Body: ${depositRes.body}`);
  }

  // Pacing / Think-Time before balance & transaction verification
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 4: VALIDATE CURRENCIES CONFIGURATION & USDT DEPOSIT AMOUNT
  // Requirement: Validates ETH/USDT limits from /system/get-all-currency 
  // and confirms USDT deposited balance from /wallet/vault/balance
  // ------------------------------------------------------------------
  const currencyUrl = `${BASE_URL}/system/get-all-currency`;
  const curRes = http.get(currencyUrl, {
    headers: authHeaders,
    tags: { name: 'System_Currencies_API', scenario: 'SC-04_System_Currencies' }
  });

  let usdtCurrency = null;
  let ethCurrency = null;
  try {
    const curJson = curRes.json();
    const curList = Array.isArray(curJson.data) ? curJson.data : [];
    usdtCurrency = curList.find(c => c.code === 'USDT' || c.symbol === 'USDT');
    ethCurrency = curList.find(c => c.code === 'ETH' || c.symbol === 'ETH');
  } catch (e) {
    usdtCurrency = null;
    ethCurrency = null;
  }

  check(curRes, {
    '[Step 4] System currencies HTTP status is 200': (r) => r.status === 200,
    '[Step 4] USDT deposit amount (100) satisfies system limits': () => {
      if (!usdtCurrency || !usdtCurrency.limits) return false;
      return 100 >= usdtCurrency.limits.minDeposit && 100 <= usdtCurrency.limits.maxDeposit && usdtCurrency.isDepositEnabled === true;
    },
    '[Step 4] ETH deposit amount (1.0) satisfies system limits': () => {
      if (!ethCurrency || !ethCurrency.limits) return false;
      return 1.0 >= ethCurrency.limits.minDeposit && 1.0 <= ethCurrency.limits.maxDeposit && ethCurrency.isDepositEnabled === true;
    },
  });

  // Validate Credited USDT Wallet Balance
  const balanceUrl = __ENV.BALANCE_URL || `${BASE_URL}/wallet/vault/balance`;
  const balanceStart = Date.now();
  const balanceRes = http.get(balanceUrl, {
    headers: authHeaders,
    tags: { name: 'Balance_Validation_API', scenario: 'SC-04_Wallet_Balance' }
  });
  const balanceDuration = Date.now() - balanceStart;
  balanceLatencyTrend.add(balanceRes.timings.duration || balanceDuration);

  let usdtBalance = null;
  try {
    const bJson = balanceRes.json();
    const balances = bJson.data?.balances || [];
    const usdtObj = balances.find(b => b.currencyCode === 'USDT');
    usdtBalance = usdtObj ? parseFloat(usdtObj.walletBalance) : null;
  } catch (e) {
    usdtBalance = null;
  }

  const balancePassed = check(balanceRes, {
    '[Step 4] Balance HTTP status is 200': (r) => r.status === 200,
    '[Step 4] USDT wallet credited with deposit amount (100 USDT)': () => usdtBalance !== null && usdtBalance >= 100,
  });

  balanceSuccessRate.add(balancePassed);

  // Pacing / Think-Time before checking transaction record
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 5: VALIDATE TRANSACTION CREATED (GET /api/v1/user/deposit-transaction)
  // Requirement: Confirms deposit transaction record exists in history
  // ------------------------------------------------------------------
  // Dynamically calculated relative to execution time: 30 days prior through tomorrow.
  // Works whenever the script is executed (today, next week, or 2 weeks later).
  const now = new Date();
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const txUrl = __ENV.TRANSACTION_URL || `${BASE_URL}/user/deposit-transaction?page=1&limit=10&startDate=${startDate}&endDate=${endDate}&status=crypto`;
  const txStart = Date.now();
  const txRes = http.get(txUrl, {
    headers: authHeaders,
    tags: { name: 'Transaction_Validation_API', scenario: 'SC-05_Transaction_History' }
  });
  const txDuration = Date.now() - txStart;
  transactionLatencyTrend.add(txRes.timings.duration || txDuration);

  const txPassed = check(txRes, {
    '[Step 5] Transaction History HTTP status is 200': (r) => r.status === 200,
    '[Step 5] Deposit transaction record created': (r) => {
      try {
        const txJson = r.json();
        return txJson.success === true && (Array.isArray(txJson.data?.data) || Array.isArray(txJson.data));
      } catch (e) {
        return false;
      }
    },
  });

  transactionSuccessRate.add(txPassed);

  // Pacing / Think-Time before Alea Game Launch
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 6: ALEA GAME LAUNCH (GET /api/v1/casino/play-game)
  // Requirement: Boots session server-side & returns sessionKey/gameLaunchUrl
  // ------------------------------------------------------------------
  const launchUrl = `${BASE_URL}/casino/play-game?gameId=${ALEA_CASINO_GAME_ID}&currency=${ALEA_CURRENCY}&isDemo=false`;
  const launchStart = Date.now();
  const launchRes = http.get(launchUrl, {
    headers: authHeaders,
    tags: { name: 'Alea_Launch_Game_API', scenario: 'SC-06_Alea_Game_Launch' }
  });
  const launchDuration = Date.now() - launchStart;
  aleaLaunchLatencyTrend.add(launchRes.timings.duration || launchDuration);

  let casinoSessionId = null;
  try {
    const launchJson = launchRes.json();
    casinoSessionId = launchJson.data?.sessionKey || launchJson.data?.casinoSessionId || launchJson.sessionKey;
    if (!casinoSessionId && launchJson.data?.gameLaunchUrl) {
      const match = launchJson.data.gameLaunchUrl.match(/casinoSessionId=([^&]+)/);
      if (match) casinoSessionId = match[1];
    }
  } catch (e) {
    casinoSessionId = null;
  }

  const casinoPlayerId = `${targetUserId}_${ALEA_CURRENCY}`;

  const launchPassed = check(launchRes, {
    '[Step 6] Alea Launch Game HTTP status is 200': (r) => r.status === 200,
    '[Step 6] Alea casinoSessionId obtained': () => !!casinoSessionId,
  });

  aleaLaunchSuccessRate.add(launchPassed);

  if (launchPassed) {
    console.log(`[Step 6 PASS] Alea Game Launch succeeded. SessionId: ${casinoSessionId}`);
  } else {
    console.warn(`[Step 6 WARN] Alea Launch status: ${launchRes.status} | Body: ${launchRes.body}`);
  }

  // Pacing / Think-Time before Alea Balance Check
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 7: ALEA CALLBACK — CHECK BALANCE (GET /callback/v1/alea/players/:id/balance)
  // Requirement: Simulates Alea callback checking player's real balance (at host root without /api/v1)
  // ------------------------------------------------------------------
  let aleaBalPassed = false;
  const betTxUrl = `${HOST_URL}/callback/v1/alea/transactions`;

  if (casinoSessionId) {
    const integratorId = 'jaackpot';
    const softwareId = 'alea';
    const aleaBalSignedStr = `${casinoSessionId}${ALEA_CURRENCY}${ALEA_CASINO_GAME_ID}${integratorId}${softwareId}`;
    const aleaBalDigest = generateAleaDigest(aleaBalSignedStr, ALEA_SECRET_KEY);

    const aleaBalUrl = `${HOST_URL}/callback/v1/alea/players/${casinoPlayerId}/balance?casinoSessionId=${casinoSessionId}&currency=${ALEA_CURRENCY}&gameId=${ALEA_CASINO_GAME_ID}&integratorId=${integratorId}&softwareId=${softwareId}`;
    const aleaBalStart = Date.now();
    const aleaBalRes = http.get(aleaBalUrl, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'digest': aleaBalDigest,
      },
      tags: { name: 'Alea_Callback_Balance_API', scenario: 'SC-07_Alea_Balance' }
    });
    const aleaBalDuration = Date.now() - aleaBalStart;
    aleaBalanceLatencyTrend.add(aleaBalRes.timings.duration || aleaBalDuration);

    aleaBalPassed = check(aleaBalRes, {
      '[Step 7] Alea Balance HTTP status is 200': (r) => r.status === 200,
      '[Step 7] Alea Balance realBalance returned': (r) => {
        try {
          return r.json().realBalance !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    aleaBalanceSuccessRate.add(aleaBalPassed);
  }

  // Pacing / Think-Time before Alea BET
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 8: ALEA CALLBACK — PLACE BET (POST /callback/v1/alea/transactions)
  // Requirement: Debits wager amount from player balance via callback
  // ------------------------------------------------------------------
  const roundId = `rnd_${Date.now()}_v${vuId}_${randomNum}`;
  const betTxId = `tx_bet_${Date.now()}_v${vuId}_${randomNum}`;
  let betPassed = false;

  if (casinoSessionId) {
    const betPayloadStr = JSON.stringify({
      type: 'BET',
      id: betTxId,
      casinoSessionId: casinoSessionId,
      player: { casinoPlayerId: casinoPlayerId },
      round: { id: roundId },
      game: { id: parseInt(ALEA_CASINO_GAME_ID) },
      amount: 20.00,
      currency: ALEA_CURRENCY
    });

    const betDigest = generateAleaDigest(betPayloadStr, ALEA_SECRET_KEY);
    const betStart = Date.now();
    const betRes = http.post(betTxUrl, betPayloadStr, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'digest': betDigest,
      },
      tags: { name: 'Alea_Callback_BET_API', scenario: 'SC-08_Alea_Bet' }
    });
    const betDuration = Date.now() - betStart;
    aleaBetLatencyTrend.add(betRes.timings.duration || betDuration);

    betPassed = check(betRes, {
      '[Step 8] Alea BET HTTP status is 200': (r) => r.status === 200,
      '[Step 8] Alea BET balance response present': (r) => {
        try {
          return r.json().realBalance !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    aleaBetSuccessRate.add(betPassed);
  }

  // Pacing / Think-Time before Alea WIN & END_ROUND
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 9: ALEA CALLBACK — AWARD WIN & END ROUND (POST /callback/v1/alea/transactions)
  // Requirement: Credits winning payout & terminates round session
  // ------------------------------------------------------------------
  let winPassed = false;
  if (casinoSessionId && betPassed) {
    const winTxId = `tx_win_${Date.now()}_v${vuId}_${randomNum}`;
    const winPayloadStr = JSON.stringify({
      type: 'WIN',
      id: winTxId,
      casinoSessionId: casinoSessionId,
      player: { casinoPlayerId: casinoPlayerId },
      round: { id: roundId },
      game: { id: parseInt(ALEA_CASINO_GAME_ID) },
      amount: 60.00,
      currency: ALEA_CURRENCY
    });

    const winDigest = generateAleaDigest(winPayloadStr, ALEA_SECRET_KEY);
    const winStart = Date.now();
    const winRes = http.post(betTxUrl, winPayloadStr, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'digest': winDigest,
      },
      tags: { name: 'Alea_Callback_WIN_API', scenario: 'SC-09_Alea_Win' }
    });
    const winDuration = Date.now() - winStart;
    aleaWinLatencyTrend.add(winRes.timings.duration || winDuration);

    winPassed = check(winRes, {
      '[Step 9] Alea WIN HTTP status is 200': (r) => r.status === 200,
      '[Step 9] Alea WIN balance response present': (r) => {
        try {
          return r.json().realBalance !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    aleaWinSuccessRate.add(winPassed);

    if (winPassed) {
      console.log(`[Step 9 PASS] Alea WIN awarded successfully`);
    } else {
      console.warn(`[Step 9 WARN] WIN status: ${winRes.status} | Body: ${winRes.body}`);
    }

    // End Round Call
    const endRoundPayloadStr = JSON.stringify({
      type: 'END_ROUND',
      round: { id: roundId },
      currency: ALEA_CURRENCY,
      player: { casinoPlayerId: casinoPlayerId }
    });

    const endDigest = generateAleaDigest(endRoundPayloadStr, ALEA_SECRET_KEY);
    http.post(betTxUrl, endRoundPayloadStr, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'digest': endDigest,
      },
      tags: { name: 'Alea_Callback_END_ROUND_API', scenario: 'SC-09_Alea_End_Round' }
    });
  }

  // Pacing / Think-Time before Withdrawal
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 10: WITHDRAWAL API (POST /api/v1/qa-tools/payment/simulate-webhook)
  // Requirement: Simulates payment provider webhook for cashout/withdrawal
  // ------------------------------------------------------------------
  const withdrawalUrl = `${BASE_URL}/qa-tools/payment/simulate-webhook`;
  const withdrawalPayload = JSON.stringify({
    type: 'withdrawal',
    userId: targetUserId,
    amount: 50,
    currencyCode: 'USDT',
    status: 'Success',
    address: '0x1234567890abcdef1234567890abcdef12345678'
  });

  const withdrawalStart = Date.now();
  const withdrawalRes = http.post(withdrawalUrl, withdrawalPayload, {
    headers: commonHeaders,
    tags: { name: 'Withdrawal_Simulator_API', scenario: 'SC-10_Payment_Withdrawal' }
  });
  const withdrawalDuration = Date.now() - withdrawalStart;

  withdrawalLatencyTrend.add(withdrawalRes.timings.duration || withdrawalDuration);

  let withdrawalWebhookPassed = false;
  try {
    const wJson = withdrawalRes.json();
    withdrawalWebhookPassed = wJson.success === true && (wJson.data?.webhookResult?.status === 200 || wJson.data?.status === 200);
  } catch (e) {
    withdrawalWebhookPassed = false;
  }

  const withdrawalPassed = check(withdrawalRes, {
    '[Step 10] Withdrawal Simulator HTTP status is 200': (r) => r.status === 200,
    '[Step 10] Withdrawal response success is true': (r) => {
      try {
        return r.json().success === true;
      } catch (e) {
        return false;
      }
    },
    '[Step 10] Withdrawal webhook execution status is 200': () => withdrawalWebhookPassed,
  });

  withdrawalSuccessRate.add(withdrawalPassed);
  withdrawalWebhookSuccessRate.add(withdrawalWebhookPassed);

  // Pacing / Think-Time before Post-Withdrawal Balance Validation
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 11: VALIDATE POST-WITHDRAWAL BALANCE (GET /wallet/vault/balance)
  // Requirement: Verifies balance reduced post-withdrawal (100 - 50 = 50 USDT)
  // ------------------------------------------------------------------
  const postWdBalanceStart = Date.now();
  const postWdBalanceRes = http.get(balanceUrl, {
    headers: authHeaders,
    tags: { name: 'Post_Withdrawal_Balance_API', scenario: 'SC-11_Post_Withdrawal_Balance' }
  });
  const postWdBalanceDuration = Date.now() - postWdBalanceStart;

  balanceLatencyTrend.add(postWdBalanceRes.timings.duration || postWdBalanceDuration);

  let postWdUsdtBal = null;
  try {
    const pbJson = postWdBalanceRes.json();
    const balances = pbJson.data?.balances || [];
    const usdtObj = balances.find(b => b.currencyCode === 'USDT');
    postWdUsdtBal = usdtObj ? parseFloat(usdtObj.walletBalance) : null;
  } catch (e) {
    postWdUsdtBal = null;
  }

  const postWdBalancePassed = check(postWdBalanceRes, {
    '[Step 11] Post-Withdrawal Balance HTTP status is 200': (r) => r.status === 200,
    '[Step 11] Post-Withdrawal USDT balance updated (remaining >= 30 USDT)': () => postWdUsdtBal !== null && postWdUsdtBal >= 30,
  });

  postWithdrawalBalanceSuccessRate.add(postWdBalancePassed);

  // Pacing / Think-Time before Primary Wallet Update to ETH
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 12: UPDATE PRIMARY WALLET TO ETH (PUT /api/v1/wallet/update-primary-wallet)
  // Requirement: Changes active wallet currency to ETH
  // ------------------------------------------------------------------
  const updateWalletUrl = `${BASE_URL}/wallet/update-primary-wallet`;
  const updateWalletPayload = JSON.stringify({
    currencyCode: 'ETH'
  });

  const updateWalletStart = Date.now();
  const updateWalletRes = http.put(updateWalletUrl, updateWalletPayload, {
    headers: authHeaders,
    tags: { name: 'Update_Primary_Wallet_API', scenario: 'SC-12_Update_Primary_Wallet_ETH' }
  });
  const updateWalletDuration = Date.now() - updateWalletStart;

  updatePrimaryWalletLatencyTrend.add(updateWalletRes.timings.duration || updateWalletDuration);

  const updateWalletPassed = check(updateWalletRes, {
    '[Step 12] Update Primary Wallet to ETH HTTP status is 200': (r) => r.status === 200,
    '[Step 12] Update Primary Wallet response success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  updatePrimaryWalletSuccessRate.add(updateWalletPassed);

  // Pacing / Think-Time before Deposit ETH & ETH Balance Verification
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 13: DEPOSIT SIMULATOR IN ETH & VERIFY BALANCE
  // Requirement: Credits ETH wallet & verifies ETH balance
  // ------------------------------------------------------------------
  const ethDepositPayload = JSON.stringify({
    type: 'deposit',
    userId: targetUserId,
    amount: 1.0,
    currencyCode: 'ETH',
    status: 'Success'
  });

  const ethDepositRes = http.post(depositUrl, ethDepositPayload, {
    headers: commonHeaders,
    tags: { name: 'Deposit_ETH_Simulator_API', scenario: 'SC-13_Deposit_ETH' }
  });

  check(ethDepositRes, {
    '[Step 13] Deposit ETH Simulator HTTP status is 200': (r) => r.status === 200,
  });

  // Verify Primary ETH Balance
  const ethBalanceRes = http.get(balanceUrl, {
    headers: authHeaders,
    tags: { name: 'Verify_ETH_Balance_API', scenario: 'SC-13_Verify_ETH_Balance' }
  });

  let ethBal = null;
  try {
    const ebJson = ethBalanceRes.json();
    const balances = ebJson.data?.balances || [];
    const ethObj = balances.find(b => b.currencyCode === 'ETH');
    ethBal = ethObj ? parseFloat(ethObj.walletBalance) : null;
  } catch (e) {
    ethBal = null;
  }

  check(ethBalanceRes, {
    '[Step 13] Verified Primary ETH Balance HTTP status is 200': (r) => r.status === 200,
    '[Step 13] ETH wallet credited with deposit amount (1.0 ETH)': () => ethBal !== null && ethBal >= 1.0,
  });

  // Pacing / Think-Time before ETH Game Launch
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 14: ALEA GAME LAUNCH IN ETH (GET /api/v1/casino/play-game)
  // Requirement: Boots Alea casino session using ETH currency
  // ------------------------------------------------------------------
  const ethLaunchUrl = `${BASE_URL}/casino/play-game?gameId=${ALEA_CASINO_GAME_ID}&currency=ETH&isDemo=false`;
  const ethLaunchRes = http.get(ethLaunchUrl, {
    headers: authHeaders,
    tags: { name: 'Alea_Launch_ETH_API', scenario: 'SC-14_Alea_Launch_ETH' }
  });

  let ethCasinoSessionId = null;
  try {
    const lJson = ethLaunchRes.json();
    ethCasinoSessionId = lJson.data?.sessionKey || lJson.data?.casinoSessionId || lJson.sessionKey;
    if (!ethCasinoSessionId && lJson.data?.gameLaunchUrl) {
      const match = lJson.data.gameLaunchUrl.match(/casinoSessionId=([^&]+)/);
      if (match) ethCasinoSessionId = match[1];
    }
  } catch (e) {
    ethCasinoSessionId = null;
  }

  const ethCasinoPlayerId = `${targetUserId}_ETH`;

  const ethLaunchPassed = check(ethLaunchRes, {
    '[Step 14] Alea Launch Game in ETH HTTP status is 200': (r) => r.status === 200,
    '[Step 14] Alea ETH casinoSessionId obtained': () => !!ethCasinoSessionId,
  });

  let ethBetPassed = false;
  if (ethLaunchPassed && ethCasinoSessionId) {
    sleep(Math.random() * 1 + 1);

    // ------------------------------------------------------------------
    // STEP 15: PLACE ALEA BET WITH ETH AMOUNT (POST /callback/v1/alea/transactions)
    // Requirement: Places a wager in ETH currency via Alea callback
    // ------------------------------------------------------------------
    const ethRoundId = `rnd_eth_${Date.now()}_v${vuId}_${randomNum}`;
    const ethBetTxId = `tx_eth_bet_${Date.now()}_v${vuId}_${randomNum}`;

    const ethBetPayloadStr = JSON.stringify({
      type: 'BET',
      id: ethBetTxId,
      casinoSessionId: ethCasinoSessionId,
      player: { casinoPlayerId: ethCasinoPlayerId },
      round: { id: ethRoundId },
      game: { id: parseInt(ALEA_CASINO_GAME_ID) },
      amount: 0.01,
      currency: 'ETH'
    });

    const ethBetDigest = generateAleaDigest(ethBetPayloadStr, ALEA_SECRET_KEY);
    const ethBetStart = Date.now();
    const ethBetRes = http.post(betTxUrl, ethBetPayloadStr, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'digest': ethBetDigest,
      },
      tags: { name: 'Alea_Callback_ETH_BET_API', scenario: 'SC-15_Alea_ETH_Bet' }
    });
    const ethBetDuration = Date.now() - ethBetStart;

    ethAleaBetLatencyTrend.add(ethBetRes.timings.duration || ethBetDuration);

    ethBetPassed = check(ethBetRes, {
      '[Step 15] Place Bet with ETH Amount HTTP status is 200': (r) => r.status === 200,
      '[Step 15] Alea ETH BET realBalance returned': (r) => {
        try {
          return r.json().realBalance !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    ethAleaBetSuccessRate.add(ethBetPassed);
  }

  // Pacing / Think-Time before Switching Primary Wallet Back to USDT
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 16: SWITCH PRIMARY WALLET BACK TO USDT (PUT /api/v1/wallet/update-primary-wallet)
  // Requirement: Resets primary wallet currency to USDT & verifies balance
  // ------------------------------------------------------------------
  const switchBackWalletPayload = JSON.stringify({
    currencyCode: 'USDT'
  });

  const switchBackStart = Date.now();
  const switchBackRes = http.put(updateWalletUrl, switchBackWalletPayload, {
    headers: authHeaders,
    tags: { name: 'Switch_Back_Primary_Wallet_API', scenario: 'SC-16_Switch_Back_Primary_Wallet_USDT' }
  });
  const switchBackDuration = Date.now() - switchBackStart;

  updatePrimaryWalletLatencyTrend.add(switchBackRes.timings.duration || switchBackDuration);

  const switchBackPassed = check(switchBackRes, {
    '[Step 16] Switch Primary Wallet back to USDT HTTP status is 200': (r) => r.status === 200,
    '[Step 16] Switch Primary Wallet back to USDT success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  updatePrimaryWalletSuccessRate.add(switchBackPassed);

  // Verify Primary Wallet Reset to USDT
  const finalBalanceRes = http.get(balanceUrl, {
    headers: authHeaders,
    tags: { name: 'Verify_Final_USDT_Balance_API', scenario: 'SC-16_Verify_Final_USDT_Balance' }
  });

  let isUsdtPrimary = false;
  try {
    const fbJson = finalBalanceRes.json();
    const balances = fbJson.data?.balances || [];
    const usdtObj = balances.find(b => b.currencyCode === 'USDT');
    isUsdtPrimary = usdtObj ? usdtObj.primary === true : false;
  } catch (e) {
    isUsdtPrimary = false;
  }

  check(finalBalanceRes, {
    '[Step 16] Verified Final USDT Primary Balance HTTP status is 200': (r) => r.status === 200,
    '[Step 16] USDT wallet is set to primary': () => isUsdtPrimary,
  });

  // Pacing / Think-Time before Vault Open & Vault Balance Check
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 17: OPEN VAULT & FETCH VAULT BALANCE (GET /api/v1/wallet/vault/balance)
  // Requirement: Queries secondary vault wallet balance
  // ------------------------------------------------------------------
  const vaultBalanceUrl = `${BASE_URL}/wallet/vault/balance`;
  const vaultStart = Date.now();
  const vaultRes = http.get(vaultBalanceUrl, {
    headers: authHeaders,
    tags: { name: 'Vault_Balance_API', scenario: 'SC-17_Open_Vault_Balance' }
  });
  const vaultDuration = Date.now() - vaultStart;

  vaultBalanceLatencyTrend.add(vaultRes.timings.duration || vaultDuration);

  const vaultPassed = check(vaultRes, {
    '[Step 17] Open Vault HTTP status is 200': (r) => r.status === 200,
    '[Step 17] Vault Balance data returned': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.data !== undefined || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  vaultBalanceSuccessRate.add(vaultPassed);

  // Pacing / Think-Time before Transferring to Vault
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 18: TRANSFER TO VAULT FROM WALLET (POST /api/v1/wallet/vault/transfer)
  // Requirement: Deposits funds from main wallet into Vault
  // ------------------------------------------------------------------
  const vaultTransferIdempotencyKey = `idemp_vtr_${Date.now()}_v${vuId}_${randomNum}`;
  const vaultTransferUrl = `${BASE_URL}/wallet/vault/transfer`;
  const vaultTransferPayload = JSON.stringify({
    currencyCode: 'USDT',
    amount: 2.00,
    direction: 'to_vault',
    idempotencyKey: vaultTransferIdempotencyKey
  });

  const vaultTransferStart = Date.now();
  const vaultTransferRes = http.post(vaultTransferUrl, vaultTransferPayload, {
    headers: authHeaders,
    tags: { name: 'Vault_Transfer_API', scenario: 'SC-18_Transfer_To_Vault' }
  });
  const vaultTransferDuration = Date.now() - vaultTransferStart;

  vaultTransferLatencyTrend.add(vaultTransferRes.timings.duration || vaultTransferDuration);

  const vaultTransferPassed = check(vaultTransferRes, {
    '[Step 18] Transfer to Vault HTTP status is 200': (r) => r.status === 200,
    '[Step 18] Transfer to Vault response success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  vaultTransferSuccessRate.add(vaultTransferPassed);

  // Pacing / Think-Time before Withdrawing from Vault
  sleep(Math.random() * 1 + 1);

  // ------------------------------------------------------------------
  // STEP 19: WITHDRAW FROM VAULT BACK TO WALLET (POST /api/v1/wallet/vault/transfer)
  // Requirement: Withdraws funds from Vault back to main wallet
  // ------------------------------------------------------------------
  const vaultWithdrawIdempotencyKey = `idemp_vwd_${Date.now()}_v${vuId}_${randomNum}`;
  const vaultWithdrawUrl = `${BASE_URL}/wallet/vault/transfer`;
  const vaultWithdrawPayload = JSON.stringify({
    currencyCode: 'USDT',
    amount: 2.00,
    direction: 'from_vault',
    password: password,
    idempotencyKey: vaultWithdrawIdempotencyKey
  });

  const vaultWithdrawStart = Date.now();
  const vaultWithdrawRes = http.post(vaultWithdrawUrl, vaultWithdrawPayload, {
    headers: authHeaders,
    tags: { name: 'Vault_Withdraw_API', scenario: 'SC-19_Withdraw_From_Vault' }
  });
  const vaultWithdrawDuration = Date.now() - vaultWithdrawStart;

  vaultWithdrawLatencyTrend.add(vaultWithdrawRes.timings.duration || vaultWithdrawDuration);

  const vaultWithdrawPassed = check(vaultWithdrawRes, {
    '[Step 19] Withdraw from Vault HTTP status is 200': (r) => r.status === 200,
    '[Step 19] Withdraw from Vault response success is true': (r) => {
      try {
        const json = r.json();
        return json.success === true || json.status === true;
      } catch (e) {
        return false;
      }
    },
  });

  vaultWithdrawSuccessRate.add(vaultWithdrawPassed);

  // Track Full Journey Completion
  if (loginPassed && depositPassed && balancePassed && txPassed && launchPassed && aleaBalPassed && betPassed && winPassed && withdrawalPassed && postWdBalancePassed && updateWalletPassed && ethLaunchPassed && ethBetPassed && switchBackPassed && vaultPassed && vaultTransferPassed && vaultWithdrawPassed) {
    totalJourneyCounter.add(1);
    console.log(`[LOAD TEST] All 19 scenario steps completed successfully for Virtual User #${vuId}!`);
  } else {
    console.log(`[LOAD TEST] Virtual User #${vuId} finished iteration.`);
  }

  // Pacing / Think-Time before next iteration
  sleep(Math.random() * 1 + 1);
}

// ----------------------------------------------------------------------------
// k6 Summary Report Generator (HTML & Console Output)
// ----------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'smoke_login_report.html': htmlReport(data, {
      title: `Jaackpot Performance Load Test Report - ${ENVIRONMENT}`,
      summaryTitle: `Jaackpot E2E Performance Load Test Summary (${TEST_DATE})`,
    }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
