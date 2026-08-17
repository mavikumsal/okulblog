// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUserRoleSelect } from "./AdminUserRoleSelect";

describe("AdminUserRoleSelect", () => {
  afterEach(() => cleanup());

  it("rol değişimini bildirir ve güncel değeri yeniden gösterir", async () => {
    const onRoleChange = vi.fn().mockResolvedValue(undefined);
    render(<AdminUserRoleSelect userId={7} role="member" onRoleChange={onRoleChange} />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("member");

    fireEvent.change(select, { target: { value: "teacher" } });

    await waitFor(() => expect(onRoleChange).toHaveBeenCalledWith({ id: 7, role: "teacher" }));
    expect(select).toHaveValue("teacher");
  });

  it("kaydetme sürerken select’i devre dışı bırakır", async () => {
    let resolveSave!: () => void;
    const onRoleChange = vi.fn().mockImplementation(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    render(<AdminUserRoleSelect userId={8} role="member" onRoleChange={onRoleChange} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "moderator" } });
    expect(select).toBeDisabled();

    resolveSave();
    await waitFor(() => expect(select).not.toBeDisabled());
  });
});
