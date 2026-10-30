import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test.describe("Smoke de navegación", () => {
  test(
    "NAV-01 la home carga con el título y el logo de la tienda",
    { tag: ["@NAV-01", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      const response = await home.goto();

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle("Sauce Demo");
      await expect(home.header.logoImage).toBeVisible();
      await expect(home.header.logoLink).toHaveAttribute("href", "/");
      await expect(home.header.tagline).toBeVisible();
    },
  );

  test(
    "NAV-02 catalog lleva al listado de productos",
    { tag: ["@NAV-02", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"Catalog\" del menú principal", async () => {
        await home.header.openCatalog();
      });

      await expect(page).toHaveURL(/\/collections\/all$/);
      await expect(page).toHaveTitle("Products – Sauce Demo");
      await expect(page.getByRole("heading", { level: 1, name: "Products", exact: true }))
        .toBeVisible();
    },
  );

  test(
    "NAV-03 blog lleva a la página de noticias",
    { tag: ["@NAV-03", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"Blog\" del menú principal", async () => {
        await home.header.openBlog();
      });

      await expect(page).toHaveURL(/\/blogs\/news$/);
      await expect(page).toHaveTitle("News – Sauce Demo");
      await expect(
        page.getByRole("article").getByRole("link", { name: "First Post", exact: true }).first(),
      ).toBeVisible();
    },
  );

  test(
    "NAV-04 about us lleva a la página informativa",
    { tag: ["@NAV-04", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"About Us\" del menú principal", async () => {
        await home.header.openAboutUs();
      });

      await expect(page).toHaveURL(/\/pages\/about-us$/);
      await expect(page).toHaveTitle("About Us – Sauce Demo");
      await expect(page.getByRole("heading", { level: 1, name: "About Us", exact: true }))
        .toBeVisible();
    },
  );

  test(
    "NAV-05 search lleva a la página de búsqueda vacía",
    { tag: ["@NAV-05", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"Search\" de la barra superior", async () => {
        await home.header.openSearch();
      });

      await expect(page).toHaveURL(/\/search$/);
      await expect(page).toHaveTitle("Search – Sauce Demo");
      await expect(page.getByRole("heading", { level: 1, name: "Search Results", exact: true }))
        .toBeVisible();
      await expect(page.getByText("No search performed.")).toBeVisible();
    },
  );

  test(
    "NAV-06 check out lleva a la página del carrito vacío",
    { tag: ["@NAV-06", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"Check Out\" de la barra superior", async () => {
        await home.header.openCartPage();
      });

      await expect(page).toHaveURL(/\/cart$/);
      await expect(page).toHaveTitle("Your Shopping Cart – Sauce Demo");
      await expect(page.getByRole("heading", { level: 1, name: "My Cart", exact: true }))
        .toBeVisible();
      await expect(
        page.getByText("It appears that your cart is currently empty!"),
      ).toBeVisible();
    },
  );

  test(
    "NAV-07 my cart (0) despliega el mini-carrito vacío sin salir de la página",
    { tag: ["@NAV-07", "@ui"] },
    async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await test.step("Cuando pulso el enlace \"My Cart (0)\" de la barra superior", async () => {
        await expect(home.header.myCartLink).toHaveText("My Cart (0)");
        await home.header.openMiniCart();
      });

      await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/#?$/);
      expect(new URL(page.url()).pathname).toBe("/");
    },
  );
});
