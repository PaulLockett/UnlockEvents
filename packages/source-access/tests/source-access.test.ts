import { describe, it, expect } from "vitest";
import { createSourceAccess } from "../src/source-access.js";

const TENANT = "t-test";

describe("SourceAccess", () => {
  const access = createSourceAccess({});

  describe("onboardSource", () => {
    it("returns a UUID", async () => {
      const id = await access.onboardSource(TENANT, "Test Source", "https://example.com");
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("commissionSource", () => {
    it("resolves without error", async () => {
      await expect(access.commissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("decommissionSource", () => {
    it("resolves without error", async () => {
      await expect(access.decommissionSource(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("retireSource", () => {
    it("resolves without error", async () => {
      await expect(access.retireSource(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("reportNavigationFailure", () => {
    it("resolves without error", async () => {
      await expect(access.reportNavigationFailure(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("acknowledgeNavigationSuccess", () => {
    it("resolves without error", async () => {
      await expect(access.acknowledgeNavigationSuccess(TENANT, "src-1")).resolves.toBeUndefined();
    });
  });

  describe("nominateForNavigation", () => {
    it("returns empty array from stub", async () => {
      const result = await access.nominateForNavigation(TENANT, 10);
      expect(result).toEqual([]);
    });
  });

  describe("resolveNavigationBrief", () => {
    it("returns a NavigationBrief", async () => {
      const brief = await access.resolveNavigationBrief(TENANT, "src-1");
      expect(brief).toHaveProperty("sourceId", "src-1");
      expect(brief).toHaveProperty("name");
      expect(brief).toHaveProperty("url");
    });
  });
});
