import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App", () => {
  it("loads the workspace with its header, client list, and default document", async () => {
    render(<App />);

    expect(screen.getByText("GGCPA AI Tax Engine")).toBeInTheDocument();
    expect(screen.getAllByText("John A. Doe").length).toBeGreaterThan(0);
    expect(await screen.findByText("Form W-2.pdf")).toBeInTheDocument();
  });
});
