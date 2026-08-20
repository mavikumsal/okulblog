import { describe, expect, it } from "vitest";
import { clampCropBox, moveCropBox, resizeCropBox } from "./questionCrop";

describe("question crop helpers", () => {
  it("kırpma kutusunu görsel sınırları içinde tutar", () => {
    expect(clampCropBox({ x: 95, y: -4, width: 40, height: 120 })).toEqual({ x: 60, y: 0, width: 40, height: 100 });
  });

  it("sürükleme hareketini sınırlar", () => {
    expect(moveCropBox({ x: 10, y: 10, width: 30, height: 30 }, 80, -20)).toEqual({ x: 70, y: 0, width: 30, height: 30 });
  });

  it("yeniden boyutlandırmayı minimum ölçüde tutar", () => {
    expect(resizeCropBox({ x: 20, y: 20, width: 30, height: 30 }, -40, -40)).toEqual({ x: 20, y: 20, width: 10, height: 10 });
  });
});
