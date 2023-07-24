import { hello } from "ifm";

describe("the hello function", () => {
  it("returns a default value", () => {
    expect(hello())
      .toBe("Hello, world!");
  });

  it("greets the author", () => {
    expect(hello("Claudia Pellegrino"))
      .toBe("Hello, Claudia Pellegrino!")
  });
});
