export const EMAIL_MAX_LENGTH = 320
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 200
export const DISPLAY_NAME_MAX_LENGTH = 120
export const API_KEY_NAME_MAX_LENGTH = 80

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (value: string): boolean =>
  value.trim().length > 0 && value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value)

export const isValidNewPassword = (value: string): boolean =>
  value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH

export type FieldErrors<T extends string> = Partial<Record<T, string>>

export const hasFieldErrors = (errors: FieldErrors<string>): boolean =>
  Object.values(errors).some((value) => value !== undefined)

export interface LoginFormValues {
  readonly email: string
  readonly password: string
}

export type LoginField = keyof LoginFormValues

export const validateLoginForm = (values: LoginFormValues): FieldErrors<LoginField> => {
  const errors: FieldErrors<LoginField> = {}
  if (values.email.trim().length === 0) errors.email = "validation.emailRequired"
  else if (!isValidEmail(values.email)) errors.email = "validation.emailInvalid"
  if (values.password.length === 0) errors.password = "validation.passwordRequired"
  return errors
}

export interface RegisterFormValues {
  readonly email: string
  readonly password: string
  readonly confirmPassword: string
  readonly displayName: string
}

export type RegisterField = keyof RegisterFormValues

export const validateRegisterForm = (values: RegisterFormValues): FieldErrors<RegisterField> => {
  const errors: FieldErrors<RegisterField> = {}
  if (values.email.trim().length === 0) errors.email = "validation.emailRequired"
  else if (!isValidEmail(values.email)) errors.email = "validation.emailInvalid"
  if (!isValidNewPassword(values.password)) errors.password = "validation.passwordTooShort"
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "validation.passwordsDoNotMatch"
  }
  if (values.displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = "validation.displayNameTooLong"
  }
  return errors
}

export interface ForgotPasswordFormValues {
  readonly email: string
}

export type ForgotPasswordField = keyof ForgotPasswordFormValues

export const validateForgotPasswordForm = (
  values: ForgotPasswordFormValues,
): FieldErrors<ForgotPasswordField> => {
  const errors: FieldErrors<ForgotPasswordField> = {}
  if (values.email.trim().length === 0) errors.email = "validation.emailRequired"
  else if (!isValidEmail(values.email)) errors.email = "validation.emailInvalid"
  return errors
}

export interface ResetPasswordFormValues {
  readonly password: string
  readonly confirmPassword: string
}

export type ResetPasswordField = keyof ResetPasswordFormValues

export const validateResetPasswordForm = (
  values: ResetPasswordFormValues,
): FieldErrors<ResetPasswordField> => {
  const errors: FieldErrors<ResetPasswordField> = {}
  if (!isValidNewPassword(values.password)) errors.password = "validation.passwordTooShort"
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "validation.passwordsDoNotMatch"
  }
  return errors
}

export interface ChangePasswordFormValues {
  readonly currentPassword: string
  readonly newPassword: string
  readonly confirmPassword: string
}

export type ChangePasswordField = keyof ChangePasswordFormValues

export const validateChangePasswordForm = (
  values: ChangePasswordFormValues,
): FieldErrors<ChangePasswordField> => {
  const errors: FieldErrors<ChangePasswordField> = {}
  if (values.currentPassword.length === 0) {
    errors.currentPassword = "validation.currentPasswordRequired"
  }
  if (!isValidNewPassword(values.newPassword)) errors.newPassword = "validation.passwordTooShort"
  if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "validation.passwordsDoNotMatch"
  }
  return errors
}

export interface ProfileFormValues {
  readonly displayName: string
  readonly timezone: string
  readonly locale: string
}

export type ProfileField = keyof ProfileFormValues

export const validateProfileForm = (values: ProfileFormValues): FieldErrors<ProfileField> => {
  const errors: FieldErrors<ProfileField> = {}
  if (values.displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = "validation.displayNameTooLong"
  }
  if (values.timezone.trim().length === 0) errors.timezone = "validation.timezoneRequired"
  if (values.locale.trim().length === 0) errors.locale = "validation.localeRequired"
  return errors
}

export interface ApiKeyFormValues {
  readonly name: string
  readonly scopes: readonly string[]
}

export type ApiKeyField = keyof ApiKeyFormValues

export const validateApiKeyForm = (values: ApiKeyFormValues): FieldErrors<ApiKeyField> => {
  const errors: FieldErrors<ApiKeyField> = {}
  const trimmedName = values.name.trim()
  if (trimmedName.length === 0) errors.name = "validation.apiKeyNameRequired"
  else if (trimmedName.length > API_KEY_NAME_MAX_LENGTH) {
    errors.name = "validation.apiKeyNameTooLong"
  }
  if (values.scopes.length === 0) errors.scopes = "validation.apiKeyScopesRequired"
  return errors
}
