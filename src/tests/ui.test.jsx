import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import Suppliers from "../pages/Suppliers/Suppliers.jsx";

vi.mock("../services/localDB", () => ({
  db: {
    suppliers: {
      getAll: vi.fn(),
    },
  },
}));

const { db } = await import("../services/localDB");

function LanguageConsumer() {
  const { t, lang, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="translation">{t("jobs_new")}</span>
      <span data-testid="lang">{lang}</span>
      <button type="button" onClick={() => setLanguage("fr")}>switch</button>
    </div>
  );
}

describe("LoadingState", () => {
  it("renders the default loading label", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders a custom loading label", () => {
    render(<LoadingState label="Chargement..." />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });
});

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to English and provides translation", () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("translation")).toHaveTextContent("New Job");
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("switches to French and updates the translation", async () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("translation")).toHaveTextContent("New Job");

    await userEvent.click(screen.getByRole("button", { name: /switch/i }));

    await waitFor(() => {
      expect(screen.getByTestId("translation")).toHaveTextContent("Nouveau travail");
      expect(screen.getByTestId("lang")).toHaveTextContent("fr");
    });
  });
});

describe("Suppliers page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("shows a loading state then renders supplier rows", async () => {
    db.suppliers.getAll.mockResolvedValue([
      { id: "s1", name: "AutoCheck", type: "Internal", phone: "+123456789", notes: "Main supplier" },
    ]);

    render(
      <MemoryRouter>
        <LanguageProvider>
          <Suppliers />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);

    const supplierNames = await screen.findAllByText("AutoCheck");
    expect(supplierNames.length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/search by name or type/i)).toBeInTheDocument();
  });
});
