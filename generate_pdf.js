const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 40, size: 'A4' });
const stream = fs.createWriteStream('Jaackpot_Postman_Collection_Requirements.pdf');
doc.pipe(stream);

// Colors
const primaryColor = '#1A365D'; // Navy
const secondaryColor = '#2B6CB0'; // Blue
const textColor = '#2D3748';
const lightBg = '#F7FAFC';
const borderColor = '#E2E8F0';

// Title Header
doc.fillColor(primaryColor).fontSize(20).text('Jaackpot — Postman Collection Requirements', { align: 'center' });
doc.fontSize(10).fillColor('#718096').text('Required Endpoints, Headers, Request & Response Details for Load Testing', { align: 'center' });
doc.moveDown(1.5);

// Overview Box
doc.rect(40, doc.y, 515, 65).fillAndStroke(lightBg, borderColor);
doc.fillColor(textColor).fontSize(10);
doc.text('This document outlines the exact Postman Collection details required from the Backend Development team to enable automated performance/load testing (k6/JMeter) across Dev and UAT environments.', 50, doc.y - 55, { width: 495 });
doc.moveDown(2);

// Function for section headers
function drawSectionHeader(title) {
    doc.moveDown(0.5);
    doc.fillColor(primaryColor).fontSize(14).text(title);
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor(secondaryColor).lineWidth(1.5).stroke();
    doc.moveDown(0.8);
}

// Function for scenario details
function drawEndpointTable(scenarioId, title, priority, endpoints) {
    if (doc.y > 680) doc.addPage();
    
    doc.fillColor(secondaryColor).fontSize(11).text(`${scenarioId}: ${title}`, { underline: true });
    doc.fillColor('#718096').fontSize(9).text(`Priority: ${priority}`);
    doc.moveDown(0.4);

    endpoints.forEach((ep) => {
        if (doc.y > 720) doc.addPage();
        
        // Endpoint box
        const startY = doc.y;
        doc.rect(40, startY, 515, 60).strokeColor(borderColor).stroke();
        
        doc.fillColor(primaryColor).fontSize(9).text(`[${ep.method}] ${ep.path}`, 50, startY + 8, { bold: true });
        doc.fillColor(textColor).fontSize(8.5).text(`Purpose: ${ep.purpose}`, 50, startY + 22);
        doc.text(`Required Headers: ${ep.headers}`, 50, startY + 34);
        doc.text(`Payload / Params: ${ep.payload}`, 50, startY + 46);

        doc.y = startY + 66;
    });
    doc.moveDown(0.5);
}

// Section 1: Global Requirements
drawSectionHeader('1. Global Requirements for the Postman Export');
doc.fillColor(textColor).fontSize(9);
doc.text('• Format: Postman Collection v2.1 (Exported JSON) + Environment File JSON.', { indent: 10 });
doc.text('• Environments Required: DEV Base URL & UAT Base URL.', { indent: 10 });
doc.text('• Pre-request Scripts / Auth: Clear specification of Bearer Token insertion, session cookies, or CSRF headers.', { indent: 10 });
doc.text('• Test Accounts: Data pool or endpoint to generate test player credentials without OTP block.', { indent: 10 });
doc.moveDown(1);

// Section 2: Endpoints by Scenario
drawSectionHeader('2. Required Endpoints by Test Journey');

drawEndpointTable('SC-02', 'Player Authentication & Session (Entry for All Scenarios)', 'High', [
    {
        method: 'POST',
        path: '/api/v1/auth/login',
        purpose: 'Authenticate player and retrieve session token',
        headers: 'Content-Type: application/json, X-Client-Type (if applicable)',
        payload: 'Body: { "username": "<username/email>", "password": "<password>" }'
    },
    {
        method: 'GET',
        path: '/api/v1/player/profile',
        purpose: 'Retrieve logged-in player details',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'None (Query params if filtered)'
    }
]);

drawEndpointTable('SC-01', 'Player Registration (If Automatable in Staging/Dev)', 'High', [
    {
        method: 'POST',
        path: '/api/v1/auth/register',
        purpose: 'Register new player account',
        headers: 'Content-Type: application/json',
        payload: 'Body: { "username", "email", "password", "currency" }'
    },
    {
        method: 'POST',
        path: '/api/v1/auth/verify-otp (or Bypass API)',
        purpose: 'Complete OTP/Email verification (Needs bypass or mock for load test)',
        headers: 'Content-Type: application/json',
        payload: 'Body: { "email/phone", "otpCode" }'
    }
]);

drawEndpointTable('SC-05', 'Game Lobby & Gameplay Session', 'High', [
    {
        method: 'GET',
        path: '/api/v1/games/lobby',
        purpose: 'Fetch available game list & provider details',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'None'
    },
    {
        method: 'POST',
        path: '/api/v1/games/launch',
        purpose: 'Launch game session & pass balance to session',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "gameId": "<game_id>", "currency": "USDT" }'
    },
    {
        method: 'POST',
        path: '/api/v1/games/wager (or Provider API)',
        purpose: 'Place bet / complete game round',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "gameId", "wagerAmount", "currency" }'
    }
]);

drawEndpointTable('SC-06', 'Wallet Management & Multi-Currency Switching', 'Medium', [
    {
        method: 'GET',
        path: '/api/v1/wallet/balances',
        purpose: 'Fetch active balances across all currency wallets (USDT, BTC, etc.)',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'None (Must support 8-decimal precision verification)'
    },
    {
        method: 'POST / PATCH',
        path: '/api/v1/wallet/switch-active',
        purpose: 'Switch active playing wallet',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "currency": "USDT" }'
    }
]);

drawEndpointTable('SC-07', 'Vault Transfers (Wallet <-> Vault)', 'Medium', [
    {
        method: 'GET',
        path: '/api/v1/vault/summary',
        purpose: 'Fetch Vault balance and withdrawable limits',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'None'
    },
    {
        method: 'POST',
        path: '/api/v1/vault/deposit',
        purpose: 'Transfer funds from main wallet to Vault',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "currency": "USDT", "amount": 100.00000000 }'
    },
    {
        method: 'POST',
        path: '/api/v1/vault/withdraw',
        purpose: 'Transfer funds from Vault back to main wallet',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "currency": "USDT", "amount": 50.00000000 }'
    }
]);

drawEndpointTable('SC-03 & SC-04', 'Crypto Deposits & Backoffice Verification', 'Critical', [
    {
        method: 'GET / POST',
        path: '/api/v1/wallet/crypto/deposit-address',
        purpose: 'Generate/retrieve crypto deposit wallet address',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Params: currency=USDT, network=Ethereum'
    },
    {
        method: 'GET',
        path: '/api/v1/wallet/transactions/history',
        purpose: 'Verify deposit, wager, and withdrawal history status',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Params: page, limit, type'
    },
    {
        method: 'POST (Dev Only)',
        path: '/api/v1/mock/credit-deposit',
        purpose: 'Staging API to credit test deposits without real on-chain waiting',
        headers: 'Authorization: Bearer {{token}}',
        payload: 'Body: { "userId", "currency", "amount" }'
    }
]);

// Section 3: Information Request for Backend Dev
drawSectionHeader('3. Specific Checklist to Send to Backend Developer');
doc.fillColor(textColor).fontSize(9);
doc.text('Please ask the Backend Developer to provide:', { bold: true });
doc.moveDown(0.3);
doc.text('1. Full Postman Collection JSON export with example request bodies & successful response payloads.', { indent: 10 });
doc.text('2. Postman Environment JSON file containing {{baseUrl}}, {{apiUrl}}, {{backofficeUrl}} for DEV and UAT.', { indent: 10 });
doc.text('3. Exact token response field structure (e.g., res.data.token vs res.accessToken).', { indent: 10 });
doc.text('4. Confirmation on how to bypass OTP/2FA during automated load runs for Registration and Login.', { indent: 10 });
doc.text('5. Approval on test game IDs that can be safely scripted for wagering.', { indent: 10 });
doc.text('6. Staging/Mock API endpoint details to credit crypto deposits for test accounts.', { indent: 10 });

doc.end();
