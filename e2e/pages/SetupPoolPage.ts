import { Locator, Page } from '@playwright/test';

export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path: string = '/') {
        await this.page.goto(path);
    }
}

export class WelcomePage extends BasePage {
    readonly welcomeHeading: Locator;
    readonly ctaButton: Locator;

    constructor(page: Page) {
        super(page);
        this.welcomeHeading = page.getByRole('heading', { name: /Welcome to Mindpool/i });
        this.ctaButton = page.getByText('Tạo Mindpool đầu tiên');
    }

    async clickCreatePool() {
        await this.ctaButton.click();
    }
}

export class SetupPage extends BasePage {
    readonly topicInput: Locator;
    readonly greetingAgent: Locator;

    constructor(page: Page) {
        super(page);
        this.topicInput = page.getByPlaceholder(/Mô tả chủ đề/);
        this.greetingAgent = page.locator('div').filter({ hasText: /^MindX$/ }).first();
    }
}
