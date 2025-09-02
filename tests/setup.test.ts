/**
 * Test setup and configuration validation
 */

describe("Test Setup", () => {
  it("should have Jest configured correctly", () => {
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
    expect(typeof expect).toBe("function");
  });

  it("should have TypeScript compilation working", () => {
    const testObject: { name: string; value: number } = {
      name: "test",
      value: 42
    };

    expect(testObject.name).toBe("test");
    expect(testObject.value).toBe(42);
  });

  it("should support async/await", async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve("async result"), 10);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe("async result");
  });

  it("should support ES6+ features", () => {
    // Destructuring
    const { name, value } = { name: "test", value: 123 };
    expect(name).toBe("test");
    expect(value).toBe(123);

    // Arrow functions
    const multiply = (a: number, b: number): number => a * b;
    expect(multiply(3, 4)).toBe(12);

    // Template literals
    const message = `Hello ${name}!`;
    expect(message).toBe("Hello test!");

    // Spread operator
    const arr1 = [1, 2, 3];
    const arr2 = [...arr1, 4, 5];
    expect(arr2).toEqual([1, 2, 3, 4, 5]);
  });

  it("should handle error throwing and catching", () => {
    const throwError = (): void => {
      throw new Error("Test error");
    };

    expect(throwError).toThrow("Test error");
    expect(throwError).toThrow(Error);
  });

  it("should support mocking", () => {
    const mockFunction = jest.fn();
    mockFunction("test argument");

    expect(mockFunction).toHaveBeenCalledWith("test argument");
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });
});
