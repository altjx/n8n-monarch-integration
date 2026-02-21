import * as crypto from 'crypto';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const BASE_URL = 'https://api.monarch.com';

const COMMON_HEADERS: Record<string, string> = {
	'Client-Platform': 'web',
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	Origin: 'https://app.monarch.com',
	Referer: 'https://app.monarch.com/',
};

// ---------------------------------------------------------------------------
// TOTP (needed here for the credential test fresh-login fallback)
// ---------------------------------------------------------------------------

function base32Decode(input: string): Buffer {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const cleaned = input.replace(/[\s=]/g, '').toUpperCase();
	let bits = '';
	for (const ch of cleaned) {
		const val = alphabet.indexOf(ch);
		if (val === -1) throw new Error(`Invalid base32 character: ${ch}`);
		bits += val.toString(2).padStart(5, '0');
	}
	const bytes: number[] = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		bytes.push(parseInt(bits.substring(i, i + 8), 2));
	}
	return Buffer.from(bytes);
}

function generateTOTP(secretBase32: string): string {
	const key = base32Decode(secretBase32);
	const counter = Math.floor(Date.now() / 1000 / 30);
	const buf = Buffer.alloc(8);
	buf.writeUInt32BE(0, 0);
	buf.writeUInt32BE(counter, 4);
	const hmac = crypto.createHmac('sha1', key).update(buf).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;
	const code =
		(((hmac[offset] & 0x7f) << 24) |
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
export async function monarchCredentialTest(
	this: ICredentialTestFunctions,
	credential: { data: ICredentialDataDecryptedObject },
): Promise<INodeCredentialTestResult> {
	const { email, password, mfaSecretKey, sessionToken } = credential.data as {
		email: string;
		password: string;
		mfaSecretKey?: string;
		sessionToken?: string;
	};

	// Obtain a token — prefer the cached one, fall back to fresh login.
	let token: string | undefined = sessionToken || undefined;
	if (!token) {
		token = (await freshLogin(this, email, password, mfaSecretKey)) ?? undefined;
		if (!token) {
			return { status: 'Error', message: 'Login failed: no token returned' };
		}
	}

	// Test the token with a minimal GraphQL query.
	const result = await testGraphQL(this, token);
	if (result === 'ok') return { status: 'OK', message: 'Connection successful!' };

	// On 401, the stored token may be stale — retry with a fresh login.
	if (result === 401) {
		token = (await freshLogin(this, email, password, mfaSecretKey)) ?? undefined;
		if (!token) return { status: 'Error', message: 'Login failed: no token returned' };
		const retry = await testGraphQL(this, token);
		if (retry === 'ok') return { status: 'OK', message: 'Connection successful!' };
		return { status: 'Error', message: 'Invalid credentials' };
	}

	return { status: 'Error', message: `Could not connect to Monarch Money (${result})` };
}

async function freshLogin(
	ctx: ICredentialTestFunctions,
	email: string,
	password: string,
	mfaSecretKey?: string,
): Promise<string | null> {
	const body: Record<string, unknown> = {
		username: email,
		password,
		supports_mfa: true,
		trusted_device: false,
	};
	if (mfaSecretKey) body.totp = generateTOTP(mfaSecretKey);

	try {
		const response = (await ctx.helpers.request({
			method: 'POST',
			url: `${BASE_URL}/auth/login/`,
			body: JSON.stringify(body),
			headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
			json: true,
		})) as { token?: string; error_code?: string };

		if (response.error_code === 'mfa_required') {
			throw new Error(
				'MFA is required. Please provide a valid MFA Secret Key in the credential settings.',
			);
		}
		return response.token ?? null;
	} catch (error) {
		return null;
	}
}

async function testGraphQL(
	ctx: ICredentialTestFunctions,
	token: string,
): Promise<'ok' | 401 | string> {
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
	} catch (error) {
		const err = error as { statusCode?: number; message?: string };
		if (err.statusCode === 401) return 401;
		return err.message ?? 'unknown error';
	}
}

export async function monarchRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	operationName: string,
	query: string,
	variables: IDataObject = {},
): Promise<IDataObject> {
	let response: IDataObject;

	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(this, 'monarchApi', {
			method: 'POST',
			url: `${BASE_URL}/graphql`,
			body: { operationName, query, variables },
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Monarch GraphQL request "${operationName}" failed`,
		});
	}

	if (response.errors) {
		const errors = response.errors as IDataObject[];
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message: (errors[0]?.message as string) || 'GraphQL request failed',
		});
	}

	return (response.data as IDataObject) ?? {};
}
