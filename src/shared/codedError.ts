export class CodedError<Code extends string> extends Error {
  constructor(
    name: string,
    readonly code: Code,
    message: string,
  ) {
    super(message);
    this.name = name;
  }
}
