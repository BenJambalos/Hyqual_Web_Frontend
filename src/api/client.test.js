import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

describe("reading requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests readings for the selected farm", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.readings("temperature", { farmId: "12" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/device/readings/temperature?farmId=12",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
