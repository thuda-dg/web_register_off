export interface LoginRequest {
  email?: string;
  identifier?: string;
  password: string;
}

export interface RegisterRequest {
  empCode?: string;
  empName?: string;
  empEmail?: string;
  email?: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  empEmail?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthUser {
  userAccountId?: number;
  empId?: number;
  empCode?: string;
  empName?: string;
  empEmail?: string;
  accountStatus?: string;
  roles?: Array<{ roleCode?: string; roleName?: string }>;
}

export interface AuthApiResponse {
  ok: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  accessTokenExpiresAt?: string;
  user?: AuthUser;
  code?: string;
}
