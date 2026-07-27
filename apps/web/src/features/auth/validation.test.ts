import { describe, expect, it } from "vitest"

import {
  hasFieldErrors,
  isValidEmail,
  isValidNewPassword,
  validateApiKeyForm,
  validateChangePasswordForm,
  validateForgotPasswordForm,
  validateLoginForm,
  validateProfileForm,
  validateRegisterForm,
  validateResetPasswordForm,
} from "./validation"

describe("isValidEmail", () => {
  it("accepts a well-formed address", () => {
    expect(isValidEmail("person@example.com")).toBe(true)
  })

  it("rejects a missing @", () => {
    expect(isValidEmail("person.example.com")).toBe(false)
  })

  it("rejects blank input", () => {
    expect(isValidEmail(" ".repeat(3))).toBe(false)
  })
})

describe("isValidNewPassword", () => {
  it("rejects passwords shorter than the minimum", () => {
    expect(isValidNewPassword("short")).toBe(false)
  })

  it("accepts a password at the minimum length", () => {
    expect(isValidNewPassword("a".repeat(12))).toBe(true)
  })
})

describe("validateLoginForm", () => {
  it("flags an empty email and password", () => {
    const errors = validateLoginForm({ email: "", password: "" })
    expect(errors.email).toBe("validation.emailRequired")
    expect(errors.password).toBe("validation.passwordRequired")
  })

  it("passes for a valid login", () => {
    const errors = validateLoginForm({ email: "person@example.com", password: "anything" })
    expect(hasFieldErrors(errors)).toBe(false)
  })
})

describe("validateRegisterForm", () => {
  const base = {
    email: "person@example.com",
    password: "a".repeat(12),
    confirmPassword: "a".repeat(12),
    displayName: "",
  }

  it("passes for a valid registration", () => {
    expect(hasFieldErrors(validateRegisterForm(base))).toBe(false)
  })

  it("flags a short password", () => {
    const errors = validateRegisterForm({ ...base, password: "short", confirmPassword: "short" })
    expect(errors.password).toBe("validation.passwordTooShort")
  })

  it("flags mismatched confirmation", () => {
    const errors = validateRegisterForm({ ...base, confirmPassword: "different" })
    expect(errors.confirmPassword).toBe("validation.passwordsDoNotMatch")
  })

  it("flags a display name over the limit", () => {
    const errors = validateRegisterForm({ ...base, displayName: "x".repeat(121) })
    expect(errors.displayName).toBe("validation.displayNameTooLong")
  })
})

describe("validateForgotPasswordForm", () => {
  it("requires an email", () => {
    expect(validateForgotPasswordForm({ email: "" }).email).toBe("validation.emailRequired")
  })

  it("passes for a valid email", () => {
    expect(hasFieldErrors(validateForgotPasswordForm({ email: "a@b.com" }))).toBe(false)
  })
})

describe("validateResetPasswordForm", () => {
  it("flags a short password and mismatched confirmation together", () => {
    const errors = validateResetPasswordForm({ password: "short", confirmPassword: "other" })
    expect(errors.password).toBe("validation.passwordTooShort")
    expect(errors.confirmPassword).toBe("validation.passwordsDoNotMatch")
  })
})

describe("validateChangePasswordForm", () => {
  it("requires the current password", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "",
      newPassword: "a".repeat(12),
      confirmPassword: "a".repeat(12),
    })
    expect(errors.currentPassword).toBe("validation.currentPasswordRequired")
  })
})

describe("validateProfileForm", () => {
  it("requires timezone and locale", () => {
    const errors = validateProfileForm({ displayName: "", timezone: "", locale: "" })
    expect(errors.timezone).toBe("validation.timezoneRequired")
    expect(errors.locale).toBe("validation.localeRequired")
  })
})

describe("validateApiKeyForm", () => {
  it("requires a name and at least one scope", () => {
    const errors = validateApiKeyForm({ name: "  ", scopes: [] })
    expect(errors.name).toBe("validation.apiKeyNameRequired")
    expect(errors.scopes).toBe("validation.apiKeyScopesRequired")
  })

  it("passes for a valid key request", () => {
    const errors = validateApiKeyForm({ name: "deploy", scopes: ["monitors:read"] })
    expect(hasFieldErrors(errors)).toBe(false)
  })
})
