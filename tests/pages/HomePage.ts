import type { Page, Response } from "@playwright/test";
import { Header } from "./Header";

export class HomePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  async goto(): Promise<Response | null> {
    return this.page.goto("/");
  }
}
