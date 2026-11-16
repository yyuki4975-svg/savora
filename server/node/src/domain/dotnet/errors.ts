// .NET exception shapes the offline tools surface in their console output.
// The C# tools print exception.Message (or GetBaseException().Message), so the
// message text, including the "(Parameter 'x')" suffix .NET appends, is part of
// the observable behaviour.

export type DotnetExceptionType =
  | "System.ArgumentException"
  | "System.ArgumentNullException"
  | "System.ArgumentOutOfRangeException"
  | "System.InvalidOperationException"
  | "System.IO.InvalidDataException"
  | "System.IO.FileNotFoundException"
  | "System.IO.DirectoryNotFoundException"
  | "System.Text.Json.JsonException"
  | "System.FormatException"
  | "System.NotSupportedException"
  | "System.NullReferenceException"
  | "Microsoft.EntityFrameworkCore.DbUpdateException"
  | "Npgsql.PostgresException";

export class DotnetException extends Error {
  constructor(
    readonly dotnetType: DotnetExceptionType,
    message: string,
    readonly innerException?: DotnetException,
  ) {
    super(message);
    this.name = dotnetType;
  }

  /** Exception.GetBaseException(): the innermost exception. */
  baseException(): DotnetException {
    return this.innerException ? this.innerException.baseException() : this;
  }
}

function withParameter(message: string, parameterName: string | undefined): string {
  return parameterName ? `${message} (Parameter '${parameterName}')` : message;
}

export function argumentException(message: string, parameterName?: string): DotnetException {
  return new DotnetException("System.ArgumentException", withParameter(message, parameterName));
}

export function argumentNullException(parameterName: string): DotnetException {
  return new DotnetException("System.ArgumentNullException", withParameter("Value cannot be null.", parameterName));
}

export function argumentOutOfRangeException(parameterName: string, message?: string): DotnetException {
  return new DotnetException(
    "System.ArgumentOutOfRangeException",
    withParameter(message ?? "Specified argument was out of the range of valid values.", parameterName),
  );
}

export function invalidOperation(message: string, inner?: DotnetException): DotnetException {
  return new DotnetException("System.InvalidOperationException", message, inner);
}

export function invalidData(message: string, inner?: DotnetException): DotnetException {
  return new DotnetException("System.IO.InvalidDataException", message, inner);
}

export function jsonException(message: string): DotnetException {
  return new DotnetException("System.Text.Json.JsonException", message);
}

/** ArgumentException.ThrowIfNullOrWhiteSpace. */
export function throwIfNullOrWhiteSpace(
  value: string | null | undefined,
  parameterName: string,
  isNullOrWhiteSpace: (value: string | null | undefined) => boolean,
): asserts value is string {
  if (value == null) throw argumentNullException(parameterName);
  if (isNullOrWhiteSpace(value)) {
    throw argumentException(
      "The value cannot be an empty string or composed entirely of whitespace.",
      parameterName,
    );
  }
}

/** A C# member access on null (NullReferenceException). */
export function nullReference(): DotnetException {
  return new DotnetException("System.NullReferenceException", "Object reference not set to an instance of an object.");
}

/** Dereferences a value the C# code would dereference, throwing NullReferenceException for null. */
export function deref<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw nullReference();
  return value;
}
