import { describe, expect, it } from "vitest"

import {
  PUBLIC_CODE_ALPHABET,
  isId,
  isPublicCode,
  isTimeId,
  newId,
  newPublicCode,
  newTimeId,
  newUrlToken,
} from "./ids"

const many = <T>(make: () => T, n = 500) => Array.from({ length: n }, make)

describe("newId (CUID2)", () => {
  it("is a valid, unique, lower-case CUID2", () => {
    const ids = many(newId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(isId(id)).toBe(true)
      expect(id).toMatch(/^[a-z][a-z0-9]{23}$/)
    }
  })
})

describe("newTimeId (UUID v7)", () => {
  it("is a valid UUID version 7", () => {
    const id = newTimeId()
    expect(isTimeId(id)).toBe(true)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it("sorts in creation order, so inserts stay at the end of the index", () => {
    const ids = many(newTimeId, 200)
    expect([...ids].sort()).toEqual(ids)
  })
})

describe("newPublicCode", () => {
  it("uses only the unambiguous alphabet, at the requested length", () => {
    for (const code of many(() => newPublicCode())) {
      expect(code).toHaveLength(8)
      expect(isPublicCode(code)).toBe(true)
    }
    expect(newPublicCode(10)).toHaveLength(10)
  })

  it("leaves out characters people confuse", () => {
    for (const confusing of ["0", "O", "1", "I", "L"]) expect(PUBLIC_CODE_ALPHABET).not.toContain(confusing)
  })

  it("refuses lengths too short to be useful or too long to read", () => {
    expect(() => newPublicCode(5)).toThrow(RangeError)
    expect(() => newPublicCode(33)).toThrow(RangeError)
  })
})

describe("newUrlToken", () => {
  it("is URL-safe and 21 characters by default", () => {
    const token = newUrlToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{21}$/)
  })

  it("refuses tokens too short to be unguessable", () => {
    expect(() => newUrlToken(15)).toThrow(RangeError)
  })
})
