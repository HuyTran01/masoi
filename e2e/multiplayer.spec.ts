import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function attachErrorTracker(page: Page, label: string, errors: string[]) {
  page.on('pageerror', (err) => {
    errors.push(`[${label} pageerror] ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign dev-mode HMR / WebGL fallback warnings in headless CI
      if (text.includes('WebSocket') && text.includes('vite')) return;
      errors.push(`[${label} console.error] ${text}`);
    }
  });
}

async function setLanguageOnTitle(page: Page, lang: 'vi' | 'en') {
  const select = page.getByTestId('language-select');
  await expect(select).toBeVisible();
  await select.selectOption(lang);
}

test.describe('[Wave 5 Tier B] Multi-Context Browser E2E (Online + GM Assistant)', () => {
  test('Online Multiplayer: 4 browser contexts (Host vi, Guest vi, Guest en, Mobile Guest vi)', async ({
    browser,
  }) => {
    const errors: string[] = [];
    const contexts: BrowserContext[] = [];

    try {
      const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const guestViCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const guestEnCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const mobileGuestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      contexts.push(hostCtx, guestViCtx, guestEnCtx, mobileGuestCtx);

      const hostPage = await hostCtx.newPage();
      const guestViPage = await guestViCtx.newPage();
      const guestEnPage = await guestEnCtx.newPage();
      const mobilePage = await mobileGuestCtx.newPage();

      await attachErrorTracker(hostPage, 'host-vi', errors);
      await attachErrorTracker(guestViPage, 'guest-vi', errors);
      await attachErrorTracker(guestEnPage, 'guest-en', errors);
      await attachErrorTracker(mobilePage, 'mobile-vi', errors);

      await Promise.all([
        hostPage.goto('/'),
        guestViPage.goto('/'),
        guestEnPage.goto('/'),
        mobilePage.goto('/'),
      ]);

      // Verify language selector strictly exposes only vi & en
      const langOptions = await hostPage
        .getByTestId('language-select')
        .locator('option')
        .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
      expect(langOptions).toEqual(['vi', 'en']);

      // Set guestEn to English
      await setLanguageOnTitle(guestEnPage, 'en');

      // Host opens Online Lobby & creates room
      await hostPage.getByTestId('title-play-online-btn').click();
      await expect(hostPage.getByTestId('room-lobby-modal')).toBeVisible();
      await expect(hostPage.getByTestId('lobby-room-code')).toBeVisible();
      const roomCode = (await hostPage.getByTestId('lobby-room-code').innerText()).trim();
      expect(roomCode.length).toBeGreaterThanOrEqual(4);

      // All 3 guests join the Host's room code
      const joinGuest = async (page: Page) => {
        await page.getByTestId('title-play-online-btn').click();
        await expect(page.getByTestId('room-lobby-modal')).toBeVisible();
        await page.getByTestId('lobby-subtab-join').click();
        await page.getByTestId('lobby-join-code-input').fill(roomCode);
        await page.getByTestId('lobby-join-submit-btn').click();
        await expect(page.getByTestId('lobby-guest-readonly-badge')).toBeVisible();
      };

      await joinGuest(guestViPage);
      await joinGuest(guestEnPage);
      await joinGuest(mobilePage);

      // Host verifies 4 humans joined, fills bots if needed to reach min room size, and starts
      await expect(hostPage.getByTestId('lobby-human-count')).toContainText('4');
      const fillBtn = hostPage.getByTestId('lobby-fill-bots-btn');
      if (await fillBtn.isVisible()) {
        await fillBtn.click();
      }
      await hostPage.getByTestId('lobby-start-online-btn').click();

      // Verify authoritative Role Card modal opens reliably on all 4 contexts!
      for (const page of [hostPage, guestViPage, guestEnPage, mobilePage]) {
        await expect(page.getByTestId('role-card-modal')).toBeVisible({ timeout: 20_000 });
        await page.getByTestId('role-card-enter-match-btn').click();
      }

      // Verify localized HUD on EN guest vs VI host
      const enBody = await guestEnPage.locator('body').innerText();
      const viBody = await hostPage.locator('body').innerText();
      expect(enBody).toMatch(/Night|Dawn|Day|Survivors|Alive/i);
      expect(viBody).toMatch(/Đêm|Bình Minh|Ngày|Sống sót|Còn sống/i);

      // Verify zero console/page errors across all 4 browser contexts
      expect(errors).toEqual([]);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });

  test('GM Assistant (?gm=CODE): Host virtual deck + 2 guests claim seats + Rematch redeal', async ({
    browser,
  }) => {
    const errors: string[] = [];
    const contexts: BrowserContext[] = [];

    try {
      const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const guest1Ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const guest2Ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      contexts.push(hostCtx, guest1Ctx, guest2Ctx);

      const hostPage = await hostCtx.newPage();
      const guest1Page = await guest1Ctx.newPage();
      const guest2Page = await guest2Ctx.newPage();

      await attachErrorTracker(hostPage, 'gm-host', errors);
      await attachErrorTracker(guest1Page, 'gm-guest-1', errors);
      await attachErrorTracker(guest2Page, 'gm-guest-2', errors);

      await hostPage.goto('/');
      await hostPage.getByTestId('title-play-gm-btn').click();
      await expect(hostPage.getByTestId('room-lobby-modal')).toBeVisible();
      await hostPage.getByTestId('lobby-gm-virtual-deck-btn').click();
      await hostPage.getByTestId('lobby-open-gm-panel-btn').click();

      await expect(hostPage.getByTestId('gm-host-standalone-shell')).toBeVisible();
      const gmCode = (await hostPage.getByTestId('gm-host-room-code').innerText()).trim();
      expect(gmCode.length).toBeGreaterThanOrEqual(4);

      // Host starts match to deal virtual cards
      await hostPage.getByTestId('gm-start-match-btn').click();

      // Both mobile guests open direct ?gm=CODE invite URL & claim seats
      const joinGmGuest = async (page: Page, name: string) => {
        await page.goto(`/?gm=${encodeURIComponent(gmCode)}`);
        await expect(page.getByTestId('gm-player-card-view')).toBeVisible();
        await page.getByTestId('gm-player-name-input').fill(name);
        await page.getByTestId('gm-player-join-btn').click();
        await expect(page.getByTestId('gm-player-seat-name')).toBeVisible();
      };

      await joinGmGuest(guest1Page, 'Lan');
      await joinGmGuest(guest2Page, 'Minh');

      // Guests must see their own seat name and MUST NOT see GM host controls
      await expect(guest1Page.getByTestId('gm-host-standalone-shell')).toHaveCount(0);
      await expect(guest2Page.getByTestId('gm-host-standalone-shell')).toHaveCount(0);

      // Host resets match for rematch redeal
      await hostPage.getByTestId('gm-reset-match-btn').click();
      await hostPage.getByTestId('gm-confirm-reset-btn').click();
      await expect(hostPage.getByTestId('gm-setup-panel')).toBeVisible();

      expect(errors).toEqual([]);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
});
