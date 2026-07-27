export const covering =
  <T extends string>() =>
  <const M extends Readonly<Record<string, T>>>(
    map: M & ([Exclude<T, M[keyof M]>] extends [never] ? unknown : never),
  ): M =>
    map
