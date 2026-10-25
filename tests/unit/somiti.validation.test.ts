import { describe, expect, it } from "vitest";
import {
  createSomitiSchema,
  somitiListQuerySchema,
  updateSomitiSchema,
} from "../../src/modules/somiti/validations/somiti.validation.js";

describe("createSomitiSchema", () => {
  it("validates valid somiti creation data", () => {
    const validData = {
      body: {
        name: "পদ্মা মহিলা সমিতি",
        code: "SOM-001",
        meetingDay: "SUNDAY",
        meetingTime: "10:00 AM",
        fieldOfficerId: 1,
        village: "বড়গ্রাম",
        union: "ইউনিয়ন ১",
        upazila: "থানা ১",
        district: "ঢাকা",
        status: "ACTIVE",
      },
    };

    const result = createSomitiSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.name).toBe("পদ্মা মহিলা সমিতি");
      expect(result.data.body.code).toBe("SOM-001");
      expect(result.data.body.meetingDay).toBe("SUNDAY");
    }
  });

  it("applies default meetingDay and status", () => {
    const minimalData = {
      body: {
        name: "মেঘনা সমিতি",
      },
    };

    const result = createSomitiSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.meetingDay).toBe("SUNDAY");
      expect(result.data.body.status).toBe("ACTIVE");
    }
  });

  it("fails when name is too short", () => {
    const invalidData = {
      body: {
        name: "A",
      },
    };

    const result = createSomitiSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when meetingDay is invalid", () => {
    const invalidData = {
      body: {
        name: "যমুনা সমিতি",
        meetingDay: "INVALID_DAY",
      },
    };

    const result = createSomitiSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("somitiListQuerySchema", () => {
  it("parses valid pagination, search, and filters", () => {
    const result = somitiListQuerySchema.safeParse({
      query: {
        page: "1",
        limit: "10",
        search: "পদ্মা",
        status: "ACTIVE",
        meetingDay: "MONDAY",
        fieldOfficerId: "2",
        sortBy: "name",
        sortOrder: "asc",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(10);
      expect(result.data.query.search).toBe("পদ্মা");
      expect(result.data.query.meetingDay).toBe("MONDAY");
      expect(result.data.query.fieldOfficerId).toBe(2);
    }
  });

  it("applies defaults for query params", () => {
    const result = somitiListQuerySchema.safeParse({
      query: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
      expect(result.data.query.status).toBe("ALL");
      expect(result.data.query.meetingDay).toBe("ALL");
      expect(result.data.query.sortBy).toBe("createdAt");
      expect(result.data.query.sortOrder).toBe("desc");
    }
  });
});

describe("updateSomitiSchema", () => {
  it("validates partial updates", () => {
    const result = updateSomitiSchema.safeParse({
      params: { id: "5" },
      body: {
        meetingDay: "WEDNESDAY",
        status: "INACTIVE",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.params.id).toBe(5);
      expect(result.data.body.meetingDay).toBe("WEDNESDAY");
      expect(result.data.body.status).toBe("INACTIVE");
    }
  });
});
