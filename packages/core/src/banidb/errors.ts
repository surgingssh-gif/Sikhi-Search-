export class BaniDbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BaniDbError";
  }
}

/** BaniDB answered, but the requested shabad/verse does not exist. */
export class BaniDbNotFoundError extends BaniDbError {
  constructor(message: string) {
    super(message, 404);
    this.name = "BaniDbNotFoundError";
  }
}

/** BaniDB answered with data we refuse to display (e.g. missing Unicode or Ang). */
export class BaniDbDataError extends BaniDbError {
  constructor(message: string) {
    super(message);
    this.name = "BaniDbDataError";
  }
}
