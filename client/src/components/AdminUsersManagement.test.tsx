// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUsersManagement } from "./AdminUsersManagement";

describe("AdminUsersManagement", () => {
  afterEach(() => cleanup());

  it("kullanıcı rolü değişimini yönetim ekranında bildirir ve yeni rolü gösterir", async () => {
    const onRoleChange = vi.fn().mockResolvedValue(undefined);
    render(<AdminUsersManagement members={[{ id: 7, name: "Ayşe Öğrenci", email: "ayse@example.com", role: "member" }]} isLoading={false} isError={false} isPending={false} onRoleChange={onRoleChange} />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("member");
    fireEvent.change(select, { target: { value: "teacher" } });

    await waitFor(() => expect(onRoleChange).toHaveBeenCalledWith({ id: 7, role: "teacher" }));
    expect(select).toHaveValue("teacher");
  });

  it("marka içeren e-posta adresini nötr hesap etiketiyle gösterir", () => {
    render(<AdminUsersManagement members={[{ id: 8, name: "Pekşen Yayınları", email: "peksenyayınları@example.com", role: "admin" }]} isLoading={false} isError={false} isPending={false} onRoleChange={vi.fn()} />);

    expect(screen.getByText("OkulBlog hesabı")).toBeInTheDocument();
    expect(screen.getByText("Hesap e-postası gizlendi")).toBeInTheDocument();
    expect(screen.queryByText(/peksenyayınları/i)).not.toBeInTheDocument();
  });

  it("yükleniyor, hata ve boş durumlarını gösterir", () => {
    const onRoleChange = vi.fn();
    const { rerender } = render(<AdminUsersManagement members={undefined} isLoading={true} isError={false} isPending={false} onRoleChange={onRoleChange} />);
    expect(screen.getByText("Kullanıcılar yükleniyor...")).toBeInTheDocument();

    rerender(<AdminUsersManagement members={undefined} isLoading={false} isError={true} isPending={false} onRoleChange={onRoleChange} />);
    expect(screen.getByText("Kullanıcı listesi alınamadı. Lütfen tekrar deneyin.")).toBeInTheDocument();

    rerender(<AdminUsersManagement members={[]} isLoading={false} isError={false} isPending={false} onRoleChange={onRoleChange} />);
    expect(screen.getByText("Henüz kayıtlı kullanıcı bulunmuyor.")).toBeInTheDocument();
  });
});
