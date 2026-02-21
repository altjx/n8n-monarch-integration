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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monarchLogin = monarchLogin;
exports.monarchRequest = monarchRequest;
exports.monarchCredentialTest = monarchCredentialTest;
const crypto = __importStar(require("crypto"));
const n8n_workflow_1 = require("n8n-workflow");
const BASE_URL = 'https://api.monarch.com';
/**
 * Decode a base-32 (RFC 4648) string into a Buffer.
 */
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
/**
 * Generate a 6-digit TOTP code (RFC 6238 / SHA-1, 30-second step).
 */
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
        (10 ** 6);
    return code.toString().padStart(6, '0');
}
/**
 * Build the login request body matching the Monarch Money API contract.
 */
function buildLoginBody(email, password, mfaSecretKey) {
    const body = {
        username: email,
        password,
        supports_mfa: true,
        trusted_device: false,
    };
    if (mfaSecretKey) {
        body.totp = generateTOTP(mfaSecretKey);
    }
    return body;
}
async function monarchLogin() {
    const credentials = await this.getCredentials('monarchApi');
    const { email, password, mfaSecretKey } = credentials;
    let response;
    try {
        response = (await this.helpers.httpRequest({
            method: 'POST',
            url: `${BASE_URL}/auth/login/`,
            body: buildLoginBody(email, password, mfaSecretKey),
            headers: {
                'Content-Type': 'application/json',
                'Client-Platform': 'web',
            },
            json: true,
        }));
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, {
            message: 'Failed to authenticate with Monarch Money',
        });
    }
    // Handle MFA requirement (API returns this when MFA is needed but no TOTP was provided)
    if (response.error_code === 'mfa_required') {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), response, {
            message: 'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
        });
    }
    const token = response.token;
    if (!token) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), response, {
            message: 'Login succeeded but no token was returned',
        });
    }
    return token;
}
async function monarchRequest(token, operationName, query, variables = {}) {
    let response;
    try {
        response = (await this.helpers.httpRequest({
            method: 'POST',
            url: `${BASE_URL}/graphql`,
            headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
                'Client-Platform': 'web',
            },
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
/**
 * Credential test function — runs inside ICredentialTestFunctions context where
 * only this.helpers.request() is available (not httpRequest).
 */
async function monarchCredentialTest(credential) {
    const { email, password, mfaSecretKey } = credential.data;
    let response;
    try {
        response = (await this.helpers.request({
            method: 'POST',
            url: `${BASE_URL}/auth/login/`,
            body: JSON.stringify(buildLoginBody(email, password, mfaSecretKey)),
            headers: {
                'Content-Type': 'application/json',
                'Client-Platform': 'web',
            },
            json: true,
        }));
    }
    catch (error) {
        const err = error;
        if (err.statusCode === 403) {
            return {
                status: 'Error',
                message: 'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
            };
        }
        if (err.statusCode === 400 || err.statusCode === 401) {
            return { status: 'Error', message: 'Invalid email or password' };
        }
        return {
            status: 'Error',
            message: `Could not connect to Monarch Money: ${err.message ?? 'Unknown error'}`,
        };
    }
    if (response.error_code === 'mfa_required') {
        return {
            status: 'Error',
            message: 'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
        };
    }
    if (!response.token) {
        return { status: 'Error', message: 'Login succeeded but no token was returned' };
    }
    return { status: 'OK', message: 'Connection successful!' };
}
//# sourceMappingURL=GenericFunctions.js.map
