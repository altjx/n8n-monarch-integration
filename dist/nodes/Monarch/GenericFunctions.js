"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.monarchCredentialTest = monarchCredentialTest;
exports.monarchRequest = monarchRequest;
const crypto = __importStar(require("crypto"));
const n8n_workflow_1 = require("n8n-workflow");
const BASE_URL = 'https://api.monarch.com';
const COMMON_HEADERS = {
    'Client-Platform': 'web',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Origin: 'https://app.monarch.com',
    Referer: 'https://app.monarch.com/',
};
// ---------------------------------------------------------------------------
// TOTP (needed here for the credential test fresh-login fallback)
// ---------------------------------------------------------------------------
function base32Decode(input) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = input.replace(/[\s=]/g, '').toUpperCase();
    let bits = '';
    for (const ch of cleaned) {
        const val = alphabet.indexOf(ch);
        if (val === -1)
            throw new Error(`Invalid base32 character: ${ch}`);
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}
function generateTOTP(secretBase32) {
    const key = base32Decode(secretBase32);
    const counter = Math.floor(Date.now() / 1000 / 30);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(0, 0);
    buf.writeUInt32BE(counter, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (((hmac[offset] & 0x7f) << 24) |
        (hmac[offset + 1] << 16) |
        (hmac[offset + 2] << 8) |
        hmac[offset + 3]) %
        10 ** 6;
    return code.toString().padStart(6, '0');
}
// ---------------------------------------------------------------------------
// Credential test
// ---------------------------------------------------------------------------
/**
 * Credential test.  The ICredentialTestFunctions context doesn't run
 * preAuthentication automatically, so we handle the token ourselves:
 *   1. Use the stored sessionToken if one exists.
 *   2. Fall back to a fresh email/password login if the token is missing.
 * On a 401 we also retry with a fresh login, in case the stored token expired.
 */
async function monarchCredentialTest(credential) {
    const { email, password, mfaSecretKey, sessionToken } = credential.data;
    // Obtain a token — prefer the cached one, fall back to fresh login.
    let token = sessionToken || undefined;
    if (!token) {
        token = (await freshLogin(this, email, password, mfaSecretKey)) ?? undefined;
        if (!token) {
            return { status: 'Error', message: 'Login failed: no token returned' };
        }
    }
    // Test the token with a minimal GraphQL query.
    const result = await testGraphQL(this, token);
    if (result === 'ok')
        return { status: 'OK', message: 'Connection successful!' };
    // On 401, the stored token may be stale — retry with a fresh login.
    if (result === 401) {
        token = (await freshLogin(this, email, password, mfaSecretKey)) ?? undefined;
        if (!token)
            return { status: 'Error', message: 'Login failed: no token returned' };
        const retry = await testGraphQL(this, token);
        if (retry === 'ok')
            return { status: 'OK', message: 'Connection successful!' };
        return { status: 'Error', message: 'Invalid credentials' };
    }
    return { status: 'Error', message: `Could not connect to Monarch Money (${result})` };
}
async function freshLogin(ctx, email, password, mfaSecretKey) {
    const body = {
        username: email,
        password,
        supports_mfa: true,
        trusted_device: false,
    };
    if (mfaSecretKey)
        body.totp = generateTOTP(mfaSecretKey);
    try {
        const response = (await ctx.helpers.request({
            method: 'POST',
            url: `${BASE_URL}/auth/login/`,
            body: JSON.stringify(body),
            headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
            json: true,
        }));
        if (response.error_code === 'mfa_required') {
            throw new Error('MFA is required. Please provide a valid MFA Secret Key in the credential settings.');
        }
        return response.token ?? null;
    }
    catch (error) {
        return null;
    }
}
async function testGraphQL(ctx, token) {
    try {
        await ctx.helpers.request({
            method: 'POST',
            url: `${BASE_URL}/graphql`,
            body: JSON.stringify({
                operationName: 'GetAccounts',
                query: 'query GetAccounts { accounts { id } }',
                variables: {},
            }),
            headers: {
                ...COMMON_HEADERS,
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            },
            json: true,
        });
        return 'ok';
    }
    catch (error) {
        const err = error;
        if (err.statusCode === 401)
            return 401;
        return err.message ?? 'unknown error';
    }
}
async function monarchRequest(operationName, query, variables = {}) {
    let response;
    try {
        response = (await this.helpers.httpRequestWithAuthentication.call(this, 'monarchApi', {
            method: 'POST',
            url: `${BASE_URL}/graphql`,
            body: { operationName, query, variables },
            json: true,
        }));
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, {
            message: `Monarch GraphQL request "${operationName}" failed`,
        });
    }
    if (response.errors) {
        const errors = response.errors;
        throw new n8n_workflow_1.NodeApiError(this.getNode(), response, {
            message: errors[0]?.message || 'GraphQL request failed',
        });
    }
    return response.data ?? {};
}
//# sourceMappingURL=GenericFunctions.js.map