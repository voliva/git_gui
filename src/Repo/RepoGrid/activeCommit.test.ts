import { describe, expect, it } from "vitest";
import { PositionedCommit } from "../repoState";
import { getIsActive } from "./activeCommit";

describe("activeCommit", () => {
  describe("simple case", () => {
    const lookup = createLookup({
      A: { parent: "B", time: 10 },
      B: { parent: "D", time: 9 },
      C: { parent: [], time: 8 },
      D: { parent: [], time: 7 },
    });

    it("goes in the parent direction", () => {
      testCache(lookup, "A", {
        A: true,
        B: true,
        C: false,
        D: true,
      });
    });

    it("goes in the descendant direction", () => {
      testCache(lookup, "D", {
        A: true,
        B: true,
        C: false,
        D: true,
      });
    });

    it("doesn't mark unrelated branches", () => {
      testCache(lookup, "C", {
        A: false,
        B: false,
        C: true,
        D: false,
      });
    });
  });

  describe("merges", () => {
    const lookup = createLookup({
      A: { parent: "B", time: 10 },
      B: { parent: ["C", "F"], time: 9 },
      C: { parent: "D", time: 8 },
      D: { parent: "E", time: 7 },
      E: { parent: "G", time: 6 },
      F: { parent: "G", time: 5 },
      G: { parent: [], time: 4 },
    });

    it("works from the top", () => {
      testCache(lookup, "A", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
        G: true,
      });
    });

    it("works from the bottom", () => {
      testCache(lookup, "G", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
        G: true,
      });
    });

    it("works from the merge commit", () => {
      testCache(lookup, "B", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
        G: true,
      });
    });

    it("works from one of the branches", () => {
      testCache(lookup, "D", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: false,
        G: true,
      });
    });

    it("works from the other branch", () => {
      testCache(lookup, "F", {
        A: true,
        B: true,
        C: false,
        D: false,
        E: false,
        F: true,
        G: true,
      });
    });
  });

  describe("duplicate time", () => {
    const lookup = createLookup({
      A: { parent: "B", time: 10 },
      B: { parent: "D", time: 9 },
      C: { parent: [], time: 9 },
      D: { parent: "E", time: 9 },
      E: { parent: "F", time: 9 },
      F: { parent: [], time: 8 },
    });

    it("works from the top", () => {
      testCache(lookup, "A", {
        A: true,
        B: true,
        C: false,
        D: true,
        E: true,
        F: true,
      });
    });

    it("works from the bottom", () => {
      testCache(lookup, "F", {
        A: true,
        B: true,
        C: false,
        D: true,
        E: true,
        F: true,
      });
    });

    it("works on the middle", () => {
      testCache(lookup, "D", {
        A: true,
        B: true,
        C: false,
        D: true,
        E: true,
        F: true,
      });
    });
  });

  describe("duplicate time with merges", () => {
    const lookup = createLookup({
      A: { parent: "B", time: 9 },
      B: { parent: ["C", "E"], time: 9 },
      C: { parent: "D", time: 9 },
      D: { parent: "F", time: 9 },
      E: { parent: "F", time: 9 },
      F: { parent: [], time: 7 },
    });

    it("works from the top", () => {
      testCache(lookup, "A", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
      });
    });

    it("works from the bottom", () => {
      testCache(lookup, "F", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
      });
    });

    it("works from one branch", () => {
      testCache(lookup, "C", {
        A: true,
        B: true,
        C: true,
        D: true,
        E: false,
        F: true,
      });
    });

    it("works from the other branch", () => {
      testCache(lookup, "E", {
        A: true,
        B: true,
        C: false,
        D: false,
        E: true,
        F: true,
      });
    });
  });
});

function createLookup(
  commits: Record<string, { parent: string | string[]; time: number }>
): Record<string, PositionedCommit> {
  const lookup: Record<string, PositionedCommit> = {};

  const parents = (parent: string | string[]) =>
    typeof parent === "string" ? [parent] : parent;

  Object.entries(commits).forEach(
    ([id, c]) =>
      (lookup[id] = {
        descendants: [],
        commit: {
          id: id,
          time: c.time,
          parents: parents(c.parent),
        },
      } as any as PositionedCommit)
  );

  Object.entries(commits).forEach(([id, c]) =>
    parents(c.parent).forEach((p) => {
      lookup[p].descendants.push(id);
    })
  );

  return lookup;
}

function testCache(
  lookup: Record<string, PositionedCommit>,
  activeId: string,
  testCases: Record<string, boolean>
) {
  // Test individually
  Object.entries(testCases).forEach(([targetId, result]) => {
    // const [targetId, result] = Object.entries(testCases)[3];
    expect(
      getIsActive(activeId, {}, lookup, targetId),
      `${targetId[0]} should be ${result}`
    ).toBe(result);
  });

  // Test beginning on each one of them
  Object.entries(testCases).forEach((initialCase) => {
    // const initialCase = Object.entries(testCases)[5];
    const cache: Record<string, boolean> = {};

    getIsActive(activeId, cache, lookup, initialCase[0]);
    // console.log(cache);
    Object.entries(testCases).forEach((otherCase) => {
      expect(
        getIsActive(activeId, Object.assign({}, cache), lookup, otherCase[0]),
        `Starting on ${initialCase[0]}, ${otherCase[0]} should be ${otherCase[1]}`
      ).toBe(otherCase[1]);
    });
  });
}
