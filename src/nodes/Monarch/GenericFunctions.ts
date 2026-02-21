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

/**
 * Decode a base-32 (RFC 4648) string into a Buffer.
 */
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

/**
 * Generate a 6-digit TOTP code (RFC 6238 / SHA-1, 30-second step).
 */
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

/**
 * Build the login request body matching the Monarch Money API contract.
 */
function buildLoginBody(email: string, password: string, mfaSecretKey?: string) {
	const body: Record<string, unknown> = {
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

export async function monarchLogin(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
	const credentials = await this.getCredentials<{
		email: string;
		password: string;
		mfaSecretKey?: string;
	}>('monarchApi');

	const { email, password, mfaSecretKey } = credentials;

	let response: IDataObject;

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
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Failed to authenticate with Monarch Money',
		});
	}

	// Handle MFA requirement (API returns this when MFA is needed but no TOTP was provided)
	if (response.error_code === 'mfa_required') {
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message:
				'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
		});
	}

	const token = response.token as string | undefined;

	if (!token) {
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message: 'Login succeeded but no token was returned',
		});
	}

	return token;
}

export async function monarchRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	token: string,
	operationName: string,
	query: string,
	variables: IDataObject = {},
): Promise<IDataObject> {
	let response: IDataObject;

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

/**
 * Credential test function — runs inside ICredentialTestFunctions context where
 * only this.helpers.request() is available (not httpRequest).
 */
export async function monarchCredentialTest(
	this: ICredentialTestFunctions,
	credential: { data: ICredentialDataDecryptedObject },
): Promise<INodeCredentialTestResult> {
	const { email, password, mfaSecretKey } = credential.data as {
		email: string;
		password: string;
		mfaSecretKey?: string;
	};

	let response: IDataObject;

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
		})) as IDataObject;
	} catch (error) {
		const err = error as { statusCode?: number; message?: string };
		if (err.statusCode === 403) {
			return {
				status: 'Error',
				message:
					'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
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
			message:
				'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
		};
	}

	if (!response.token) {
		return { status: 'Error', message: 'Login succeeded but no token was returned' };
	}

	return { status: 'OK', message: 'Connection successful!' };
}
