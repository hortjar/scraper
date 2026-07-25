const ALLOWED =
  /^(\s*(eslint|prettier|@ts-|global|globals|jsx|type|reference|#__PURE__|v8 ignore|c8 ignore|istanbul|vite-ignore|webpackChunkName))/

export const noComments = {
  meta: {
    type: "problem",
    docs: { description: "Disallow comments; documentation belongs in README and docs" },
    schema: [],
    messages: {
      noComment:
        "No comments. Rename, extract a function, or document it in the module README (see AGENTS.md §3a).",
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode()
    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (ALLOWED.test(comment.value)) continue
          context.report({ node: comment, messageId: "noComment" })
        }
      },
    }
  },
}

export default { rules: { "no-comments": noComments } }
