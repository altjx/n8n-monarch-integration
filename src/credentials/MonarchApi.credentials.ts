import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MonarchApi implements ICredentialType {
	name = 'monarchApi';

	displayName = 'Monarch Money API';
	documentationUrl = 'monarch';

	properties: INodeProperties[] = [
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
}
