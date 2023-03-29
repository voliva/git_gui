export const isNullish = <T>(v: T | null | undefined): v is null | undefined =>
  v == null;
export const isNotNullish = <T>(v: T | null | undefined): v is T => v != null;
