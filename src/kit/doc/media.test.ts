import { describe, expect, it } from "vitest";
import { commonsApi, commonsTitle, creditsMarkdown, extFor, mediaProblems, type Media } from "./media";

const photo: Media = {
  id: "plume", kind: "image", url: "https://commons.wikimedia.org/wiki/File:Pinatubo91eruption_plume.jpg",
  page: "https://commons.wikimedia.org/wiki/File:Pinatubo91eruption_plume.jpg", author: "Dave Harlow, USGS",
  licence: "Public domain (US government work)", rights: "free", credit: "Dave Harlow / USGS",
};
const clip: Media = { ...photo, id: "news", kind: "video", rights: "fair-use", fairUse: "the film comments on this broadcast; 4 s, muted, regraded", use: { from: 10, to: 14 } };

describe("mediaProblems", () => {
  it("passes a clean list", () => expect(mediaProblems([photo, clip])).toEqual([]));
  it("flags duplicate ids, also ones that differ only in case", () => {
    expect(mediaProblems([photo, { ...photo }])[0]).toContain("plume");
    expect(mediaProblems([photo, { ...photo, id: "Plume" }])[0]).toContain("Plume");
  });
  it("flags fair use with no reason", () => expect(mediaProblems([{ ...clip, fairUse: undefined }])[0]).toContain("news"));
  it("flags fair-use video with no use, or a use over 5 s", () => {
    expect(mediaProblems([{ ...clip, use: undefined }])[0]).toContain("news");
    expect(mediaProblems([{ ...clip, use: { from: 0, to: 5.5 } }])[0]).toContain("5");
  });
  it("refuses fair-use audio", () => expect(mediaProblems([{ ...clip, kind: "audio" }])[0]).toContain("audio"));
  it("flags an empty licence or credit", () => {
    expect(mediaProblems([{ ...photo, licence: "" }])).toHaveLength(1);
    expect(mediaProblems([{ ...photo, credit: " " }])).toHaveLength(1);
  });
  it("flags a use that ends before it starts", () => expect(mediaProblems([{ ...photo, kind: "video", use: { from: 3, to: 3 } }])).toHaveLength(1));
});

describe("Commons", () => {
  it("reads the file title from a file page", () => {
    expect(commonsTitle("https://commons.wikimedia.org/wiki/File:Pinatubo91eruption_plume.jpg")).toBe("File:Pinatubo91eruption_plume.jpg");
    expect(commonsTitle("https://pubs.usgs.gov/fs/1997/fs113-97/plume.jpg")).toBeNull();
  });
  it("asks the API for the original file's url, size and type", () => {
    const u = new URL(commonsApi("File:A b.jpg"));
    expect(u.searchParams.get("titles")).toBe("File:A b.jpg");
    expect(u.searchParams.get("iiprop")).toBe("url|size|mime");
  });
});

describe("extFor", () => {
  it("knows media types and refuses anything else", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("video/mp4")).toBe("mp4");
    expect(extFor("audio/mpeg")).toBe("mp3");
    expect(extFor("audio/x-wav")).toBe("wav");
    expect(extFor("text/html")).toBeNull();
  });
});

describe("creditsMarkdown", () => {
  it("lists each item with its licence and marks fair use", () => {
    const md = creditsMarkdown([photo, clip]);
    expect(md).toContain("Dave Harlow / USGS");
    expect(md).toContain("(fair use)");
  });
});
