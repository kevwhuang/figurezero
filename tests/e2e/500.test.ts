import { expect, test } from '@playwright/test';

const DOCUMENT_STATUS_ERROR = 'the server responded with a status of 500';
const POLL = { timeout: 10_000 } as const;

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('500 page', () => {
    test('returns 500 and renders the server error section on direct visit', async ({ page }) => {
        const response = await page.goto('/500');

        expect(response?.status()).toBe(500);

        await expect(page).toHaveTitle('Server Error \u2014 Figure Zero Project');
        await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
        await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
        await expect(page.locator('#error-server-title')).toHaveText('500');
    });

    test('marks the page noindex for robots', async ({ page }) => {
        await page.goto('/500');

        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    });

    test('loads without console errors beyond the expected 500 status report', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto('/500');

        await expect.poll(() => page.locator('[data-scroll]').evaluate(element => element.style.opacity), POLL).toBe('1');

        const expectedErrors = errors.filter(text => text.includes(DOCUMENT_STATUS_ERROR));
        const unexpectedErrors = errors.filter(text => !text.includes(DOCUMENT_STATUS_ERROR));

        expect(expectedErrors).toHaveLength(1);
        expect(unexpectedErrors).toEqual([]);
    });

    test('navigates home from the back to home link', async ({ page }) => {
        await page.goto('/500');
        await page.getByRole('link', { name: 'Back to home' }).click();

        await expect(page).toHaveURL('/');
        await expect(page).toHaveTitle('Figure Zero Project');
    });
});
