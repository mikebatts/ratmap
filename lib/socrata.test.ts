import { describe, it, expect } from "vitest";
import {
  normalize311,
  normalizeRodent,
  categorize311,
  categorizeInspection,
  boroFromCode,
} from "./socrata";

describe("categorize311", () => {
  it("maps rat sighting descriptors to 'sighting'", () => {
    expect(categorize311("Rat Sighting")).toBe("sighting");
    expect(categorize311("rat sighting")).toBe("sighting");
  });

  it("maps mouse / signs of rodents to 'other_rodent'", () => {
    expect(categorize311("Mouse Sighting")).toBe("other_rodent");
    expect(categorize311("Signs of Rodents")).toBe("other_rodent");
  });

  it("maps conditions to 'condition'", () => {
    expect(categorize311("Condition Attractive to Rodents")).toBe("condition");
  });

  it("falls back to 'other' for unknown or missing descriptors", () => {
    expect(categorize311("Something Else")).toBe("other");
    expect(categorize311(undefined)).toBe("other");
  });
});

describe("categorizeInspection", () => {
  it("maps baiting and cleanup inspection types", () => {
    expect(categorizeInspection("BAIT", "Bait applied")).toBe("baiting");
    expect(categorizeInspection("Clean Up", "")).toBe("cleanup");
  });

  it("maps active rat signs / failures to 'inspection_fail'", () => {
    expect(categorizeInspection("Initial", "Rat Activity")).toBe("inspection_fail");
    expect(categorizeInspection("Initial", "Failed for Other R")).toBe(
      "inspection_fail",
    );
  });

  it("maps passing results to 'inspection_pass'", () => {
    expect(categorizeInspection("Initial", "Passed")).toBe("inspection_pass");
    expect(categorizeInspection("Initial", "No Problem")).toBe("inspection_pass");
    expect(categorizeInspection("Compliance", "Monitoring")).toBe(
      "inspection_pass",
    );
  });

  it("falls back to 'other'", () => {
    expect(categorizeInspection(undefined, undefined)).toBe("other");
    expect(categorizeInspection("Mystery", "Mystery")).toBe("other");
  });
});

describe("boroFromCode", () => {
  it("maps codes 1-5 to borough names", () => {
    expect(boroFromCode("1")).toBe("MANHATTAN");
    expect(boroFromCode("2")).toBe("BRONX");
    expect(boroFromCode("3")).toBe("BROOKLYN");
    expect(boroFromCode("4")).toBe("QUEENS");
    expect(boroFromCode("5")).toBe("STATEN ISLAND");
  });

  it("returns null for unknown / missing codes", () => {
    expect(boroFromCode("0")).toBeNull();
    expect(boroFromCode(undefined)).toBeNull();
  });
});

describe("normalize311", () => {
  const valid = {
    unique_key: "12345",
    created_date: "2024-01-15T00:00:00.000",
    descriptor: "Rat Sighting",
    incident_address: "123 Main St",
    borough: "brooklyn",
    incident_zip: "11201",
    latitude: "40.7",
    longitude: "-73.9",
  };

  it("normalizes a valid row", () => {
    const rec = normalize311({ ...valid });
    expect(rec).not.toBeNull();
    expect(rec).toMatchObject({
      source: "311",
      source_id: "12345",
      address: "123 Main St",
      borough: "BROOKLYN", // uppercased
      zipcode: "11201",
      latitude: 40.7,
      longitude: -73.9,
      category: "sighting",
      detail: "Rat Sighting",
    });
    expect(rec?.observed_at).toBe(new Date(valid.created_date).toISOString());
  });

  it("returns null when latitude/longitude are missing", () => {
    expect(normalize311({ ...valid, latitude: "", longitude: "" })).toBeNull();
    const { latitude, ...noLat } = valid;
    void latitude;
    expect(normalize311(noLat)).toBeNull();
  });

  it("returns null when unique_key is missing", () => {
    const { unique_key, ...noKey } = valid;
    void unique_key;
    expect(normalize311(noKey)).toBeNull();
  });

  it("uppercases borough names", () => {
    const rec = normalize311({ ...valid, borough: "manhattan" });
    expect(rec?.borough).toBe("MANHATTAN");
  });

  it("falls back to street_name when incident_address is absent", () => {
    const { incident_address, ...row } = valid;
    void incident_address;
    const rec = normalize311({ ...row, street_name: "Main St" });
    expect(rec?.address).toBe("Main St");
  });
});

describe("normalizeRodent", () => {
  const valid = {
    job_id: "JOB-1",
    inspection_date: "2024-02-20T00:00:00.000",
    inspection_type: "Initial",
    result: "Rat Activity",
    house_number: "123",
    street_name: "Broadway",
    boro_code: "1",
    zip_code: "10001",
    latitude: "40.75",
    longitude: "-73.99",
  };

  it("normalizes a valid row", () => {
    const rec = normalizeRodent({ ...valid });
    expect(rec).toMatchObject({
      source: "rodent_inspection",
      source_id: "JOB-1",
      address: "123 Broadway",
      borough: "MANHATTAN",
      zipcode: "10001",
      latitude: 40.75,
      longitude: -73.99,
      category: "inspection_fail",
    });
  });

  it("prefers job_ticket_or_work_order_id as source_id", () => {
    const rec = normalizeRodent({
      ...valid,
      job_ticket_or_work_order_id: "TICKET-9",
    });
    expect(rec?.source_id).toBe("TICKET-9");
  });

  it("returns null when lat/long missing", () => {
    expect(normalizeRodent({ ...valid, latitude: "" })).toBeNull();
  });

  it("returns null when there is no source id", () => {
    const { job_id, ...row } = valid;
    void job_id;
    expect(normalizeRodent(row)).toBeNull();
  });

  it("returns null address when house number and street are absent", () => {
    const { house_number, street_name, ...row } = valid;
    void house_number;
    void street_name;
    const rec = normalizeRodent(row);
    expect(rec?.address).toBeNull();
  });
});
