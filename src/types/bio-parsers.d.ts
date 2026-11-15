declare module "bio-parsers" {
  export function anyToJson(
    file: File | string | Blob,
    options?: Record<string, unknown>,
  ): Promise<
    Array<{
      parsedSequence?: {
        name?: string;
        sequence?: string;
      };
    }>
  >;
}
