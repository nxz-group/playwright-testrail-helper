import { cleanAnsiCodes } from "../../src/utils/ansi-cleaner";

describe("cleanAnsiCodes", () => {
  it("should remove ANSI color codes", () => {
    const input = "\u001b[31mError message\u001b[0m";
    const result = cleanAnsiCodes(input);
    expect(result).toBe("Error message");
  });

  it("should handle text without ANSI codes", () => {
    const input = "Plain text message";
    const result = cleanAnsiCodes(input);
    expect(result).toBe("Plain text message");
  });

  it("should handle empty string", () => {
    const result = cleanAnsiCodes("");
    expect(result).toBe("");
  });

  it("should handle multiple ANSI codes", () => {
    const input = "\u001b[31m\u001b[1mBold red text\u001b[0m\u001b[0m";
    const result = cleanAnsiCodes(input);
    expect(result).toBe("Bold red text");
  });

  it("should handle complex ANSI sequences", () => {
    const input = "\u001b[38;5;196mColored text\u001b[0m and \u001b[4munderlined\u001b[0m";
    const result = cleanAnsiCodes(input);
    expect(result).toBe("Colored text and underlined");
  });
});
