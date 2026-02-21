import * as crypto from 'crypto';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

const BASE_URL = 'https://api.monarch.com';

const COMMON_HEADERS: Record<string, string> = {
	'Client-Platform': 'web',
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	Origin: 'https://app.monarch.com',
	Referer: 'https://app.monarch.com/',
};

export class MonarchApi implements ICredentialType {
	name = 'monarchApi';

	displayName = 'Monarch Money API';
	documentationUrl = 'https://github.com/altjx/n8n-monarch-integration#readme';
	testedBy = 'monarchCredentialTest';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'MFA Secret Key',
			name: 'mfaSecretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Only needed if MFA is enabled. Found under Settings → Security → Enable MFA → "Two-factor text code".',
		},
	];

	/**
	 * Called automatically by n8n when sessionToken is empty or has expired.
	 * The returned object is merged into the credential and saved to the DB.
	 */
	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<{ sessionToken: string }> {
		const { email, password, mfaSecretKey } = credentials as {
			email: string;
			password: string;
			mfaSecretKey?: string;
		};

		const body: Record<string, unknown> = {
			username: email,
			password,
			supports_mfa: true,
			trusted_device: false,
		};

		if (mfaSecretKey) {
			body.totp = generateTOTP(mfaSecretKey);
		}

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${BASE_URL}/auth/login/`,
			body,
			headers: {
				...COMMON_HEADERS,
				'Content-Type': 'application/json',
			},
			json: true,
		})) as { token?: string; error_code?: string };

		if (response.error_code === 'mfa_required') {
			throw new Error(
				'MFA is required for this account. Please provide a valid MFA Secret Key in the credential settings.',
			);
		}

		if (!response.token) {
			throw new Error('Login succeeded but no token was returned');
		}

		return { sessionToken: response.token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				...COMMON_HEADERS,
				Authorization: '=Token {{$credentials.sessionToken}}',
				'Content-Type': 'application/json',
			},
		},
	};
}

// ---------------------------------------------------------------------------
// TOTP helpers (duplicated from GenericFunctions to keep credentials self-contained)
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
