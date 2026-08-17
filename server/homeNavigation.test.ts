import { describe, expect, it } from "vitest";
import { getHomeAccountLabel, getHomePrimaryLabel, getHomeTarget } from "@shared/homeNavigation";

describe("Ana sayfa navigasyon kararları", () => {
  it("oturumsuz kullanıcıyı girişe yönlendirir", () => {
    expect(getHomeAccountLabel(false, false)).toBe("Giriş yap");
    expect(getHomePrimaryLabel(false)).toBe("Başla");
    expect(getHomeTarget(false, "/panel")).toBe("login");
  });

  it("yüklenirken ve oturum açıldığında doğru CTA etiketlerini üretir", () => {
    expect(getHomeAccountLabel(false, true)).toBe("Yükleniyor...");
    expect(getHomeAccountLabel(true, false)).toBe("Panele git");
    expect(getHomePrimaryLabel(true)).toBe("Panele git");
    expect(getHomeTarget(true, "/panel")).toBe("/panel");
  });
});
