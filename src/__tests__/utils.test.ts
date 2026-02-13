import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatNumber,
  getCategoryEmoji,
  getStatusColor,
  getProviderColor,
} from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string for no truthy values", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats millions", () => {
    expect(formatCurrency(1_500_000)).toBe("$1.5M");
  });

  it("formats thousands", () => {
    expect(formatCurrency(15_420)).toBe("$15.4K");
  });

  it("formats small amounts", () => {
    expect(formatCurrency(42.5)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-149.75)).toBe("$-149.75");
  });
});

describe("formatNumber", () => {
  it("formats millions", () => {
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });

  it("formats thousands", () => {
    expect(formatNumber(14_400)).toBe("14.4K");
  });

  it("formats small numbers as-is", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("getCategoryEmoji", () => {
  it("returns correct emoji for known categories", () => {
    expect(getCategoryEmoji("sports")).toBe("⚽");
    expect(getCategoryEmoji("technology")).toBe("💻");
    expect(getCategoryEmoji("crypto")).toBe("₿");
  });

  it("returns default emoji for unknown category", () => {
    expect(getCategoryEmoji("unknown")).toBe("🌐");
  });
});

describe("getStatusColor", () => {
  it("returns correct colors", () => {
    expect(getStatusColor("open")).toBe("success");
    expect(getStatusColor("closed")).toBe("danger");
    expect(getStatusColor("resolved")).toBe("info");
  });

  it("returns default for unknown status", () => {
    expect(getStatusColor("whatever")).toBe("default");
  });
});

describe("getProviderColor", () => {
  it("returns correct class for known providers", () => {
    expect(getProviderColor("openai")).toBe("bg-green-400");
    expect(getProviderColor("anthropic")).toBe("bg-orange-400");
    expect(getProviderColor("google")).toBe("bg-blue-400");
  });

  it("returns default for unknown provider", () => {
    expect(getProviderColor("unknown")).toBe("bg-gray-400");
  });
});
