import { describe, expect, it } from "vitest";
import { normalizePhoneNumber, sanitizePhoneInput } from "./phoneNumber";

describe("Philippine mobile number formatting", () => {
  it("formats a local number", () => {
    expect(normalizePhoneNumber("09123456789")).toBe("0912 345 6789");
    expect(normalizePhoneNumber("0912 345 6789")).toBe("0912 345 6789");
  });

  it("converts an international country code to the local prefix", () => {
    expect(normalizePhoneNumber("+63 912 345 6789")).toBe("0912 345 6789");
    expect(normalizePhoneNumber("639123456789")).toBe("0912 345 6789");
  });

  it("rejects incomplete or non-numeric numbers", () => {
    expect(normalizePhoneNumber("0912345678")).toBeNull();
    expect(normalizePhoneNumber("08123456789")).toBeNull();
    expect(normalizePhoneNumber("0912abc6789")).toBeNull();
  });

  it("sanitizes typed characters while retaining an international prefix", () => {
    expect(sanitizePhoneInput("+63 912abc345 6789")).toBe("+63 912345 6789");
  });
});
