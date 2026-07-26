import { parseHTML } from "linkedom"

export interface DomElement {
  readonly tagName: string
  readonly children: readonly DomElement[]
  readonly textContent: string | null
  readonly outerHTML: string | null
  innerHTML: string
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  getAttributeNames(): readonly string[]
  removeAttribute(name: string): void
  remove(): void
  querySelector(selector: string): DomElement | null
  querySelectorAll(selector: string): readonly DomElement[]
}

export interface ParsedDocument {
  readonly body: DomElement
  readonly documentElement: DomElement | null
  querySelector(selector: string): DomElement | null
}

const EMPTY_HTML_SHELL = "<!DOCTYPE html><html><body></body></html>"

export interface ParsedFragment {
  readonly document: ParsedDocument
  readonly body: DomElement
}

export const parseFragment = (html: string): ParsedFragment => {
  const { document } = parseHTML(EMPTY_HTML_SHELL) as unknown as { document: ParsedDocument }
  const { body } = document
  body.innerHTML = html
  return { document, body }
}

export const queryAll = (root: DomElement, selector: string): readonly DomElement[] =>
  root.querySelectorAll(selector)

export const attributeNames = (element: DomElement): readonly string[] =>
  element.getAttributeNames()
