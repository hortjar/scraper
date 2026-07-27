import type {
  ChangePasswordData,
  CreateApiKeyData,
  CreateApiKeyResponse,
  GetCurrentUserResponse,
  ListApiKeysResponse,
  ListSessionsResponse,
  LoginData,
  RegisterData,
  RequestPasswordResetData,
  ResetPasswordData,
  UpdateCurrentUserData,
} from "../../api"

export type CurrentUser = GetCurrentUserResponse
export type LoginBody = LoginData["body"]
export type RegisterBody = RegisterData["body"]
export type UpdateProfileBody = UpdateCurrentUserData["body"]
export type ChangePasswordBody = ChangePasswordData["body"]
export type RequestPasswordResetBody = RequestPasswordResetData["body"]
export type ResetPasswordBody = ResetPasswordData["body"]

export type SessionListItem = ListSessionsResponse["items"][number]

export type ApiKeyListItem = ListApiKeysResponse["items"][number]
export type ApiKeyScope = ApiKeyListItem["scopes"][number]
export type CreateApiKeyBody = CreateApiKeyData["body"]
export type CreatedApiKey = CreateApiKeyResponse
