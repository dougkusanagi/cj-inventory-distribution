export type UserRole = 'admin' | 'stock' | 'marketing';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole | null;
    is_active: boolean;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    can: {
        manageUsers: boolean;
        manageOperations: boolean;
        managePhotos: boolean;
    };
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
