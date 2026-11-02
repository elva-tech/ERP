import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useListQuery } from "../src/hooks/useListQuery.js";

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useListQuery", () => {
  it("ignores a slow response that arrives after a newer search", async () => {
    const pending = { a: deferred(), ab: deferred() };
    const fetchList = ({ search }) => pending[search].promise;

    const { result, rerender } = renderHook(({ search }) => useListQuery(fetchList, { search }), {
      initialProps: { search: "a" },
    });
    rerender({ search: "ab" });

    await act(async () => {
      pending.ab.resolve({ data: ["ab-result"] });
    });
    await waitFor(() => expect(result.current.data).toEqual(["ab-result"]));

    await act(async () => {
      pending.a.resolve({ data: ["a-result-stale"] });
    });
    expect(result.current.data).toEqual(["ab-result"]);
    expect(result.current.status).toBe("success");
  });

  it("reports errors and recovers on reload", async () => {
    let fail = true;
    const fetchList = async () => {
      if (fail) throw new Error("boom");
      return { data: [1] };
    };
    const { result } = renderHook(() => useListQuery(fetchList, {}));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("boom");

    fail = false;
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual([1]);
  });
});
