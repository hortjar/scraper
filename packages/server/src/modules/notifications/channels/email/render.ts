import type { ChannelPayload } from "../../notifications.types.js"

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

export const buildEmailHtml = (payload: ChannelPayload): string => {
  const rows = payload.fields
    .map(
      (field) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(field.label)}</td><td>${escapeHtml(field.value)}</td></tr>`,
    )
    .join("")
  return [
    `<h2>${escapeHtml(payload.title)}</h2>`,
    `<table>${rows}</table>`,
    `<p><a href="${payload.url}">View the full run</a></p>`,
  ].join("\n")
}
