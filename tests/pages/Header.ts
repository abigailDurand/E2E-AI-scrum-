import type { Locator, Page } from "@playwright/test";

export class Header {
  readonly banner: Locator;
  readonly mainMenu: Locator;
  readonly logoLink: Locator;
  readonly logoImage: Locator;
  readonly tagline: Locator;
  readonly searchLink: Locator;
  readonly myCartLink: Locator;
  readonly checkOutLink: Locator;
  readonly catalogLink: Locator;
  readonly blogLink: Locator;
  readonly aboutUsLink: Locator;

  constructor(readonly page: Page) {
    this.banner = page.getByRole("banner");
    // El menú principal está fuera del banner; se identifica por contener "Catalog".
    this.mainMenu = page
      .getByRole("navigation")
      .filter({ has: page.getByRole("link", { name: "Catalog", exact: true }) });
    this.logoLink = this.banner.getByRole("link", { name: "Sauce Demo", exact: true });
    this.logoImage = this.logoLink.getByRole("img", { name: "Sauce Demo", exact: true });
    this.tagline = this.banner.getByRole("heading", {
      name: "Just a demo site showing off what Sauce can do.",
      exact: true,
    });
    this.searchLink = this.banner.getByRole("link", { name: "Search", exact: true });
    this.myCartLink = this.banner.getByRole("link", { name: /^My Cart \(\d+\)$/ });
    this.checkOutLink = this.banner.getByRole("link", { name: "Check Out", exact: true });
    this.catalogLink = this.mainMenu.getByRole("link", { name: "Catalog", exact: true });
    this.blogLink = this.mainMenu.getByRole("link", { name: "Blog", exact: true });
    this.aboutUsLink = this.mainMenu.getByRole("link", { name: "About Us", exact: true });
  }

  async openCatalog() {
    await this.catalogLink.click();
  }

  async openBlog() {
    await this.blogLink.click();
  }

  async openAboutUs() {
    await this.aboutUsLink.click();
  }

  async openSearch() {
    await this.searchLink.click();
  }

  async openCartPage() {
    await this.checkOutLink.click();
  }

  async openMiniCart() {
    await this.myCartLink.click();
  }
}
