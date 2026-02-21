"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonarchApi = void 0;
class MonarchApi {
    name = 'monarchApi';
    displayName = 'Monarch Money API';
    documentationUrl = 'monarch';
    properties = [
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
            description: 'Only needed if MFA is enabled. Found under Settings → Security → Enable MFA → "Two-factor text code".',
        },
    ];
}
exports.MonarchApi = MonarchApi;
//# sourceMappingURL=MonarchApi.credentials.js.map