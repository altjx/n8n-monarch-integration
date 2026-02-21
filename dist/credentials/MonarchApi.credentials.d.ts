import type { IAuthenticateGeneric, ICredentialDataDecryptedObject, ICredentialType, IHttpRequestHelper, INodeProperties } from 'n8n-workflow';
export declare class MonarchApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    testedBy: string;
    properties: INodeProperties[];
    /**
     * Called automatically by n8n when sessionToken is empty or has expired.
     * The returned object is merged into the credential and saved to the DB.
     */
    preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject): Promise<{
        sessionToken: string;
    }>;
    authenticate: IAuthenticateGeneric;
}
//# sourceMappingURL=MonarchApi.credentials.d.ts.map