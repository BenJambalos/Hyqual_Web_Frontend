import { describe, expect, it } from "vitest";
import { isValidEmail } from "./email";

describe("email validation", () => {
  it.each(["user@example.com", "debug@hyquai.demo", "debug@hyqual.demo"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each(["", "user", "user@localhost", "user..name@example.com", "user@-example.com"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
