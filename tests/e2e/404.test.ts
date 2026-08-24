import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('404 page', () => {
    test('returns 404 and renders the error section for an unknown path', async ({ page }) => {
        const response = await page.goto('/this-page-does-not-exist');

        expect(response?.status()).toBe(404);

        await expect(page).toHaveTitle('Page Not Found \u2014 Figure Zero Project');
        await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
        await expect(page.getByText('This page does not exist.')).toBeVisible();
        await expect(page.locator('#error-not-found-title')).toHaveText('404');
    });

    test('returns 404 for a deep unknown path', async ({ page }) => {
        const response = await page.goto('/team/nope/deep');

        expect(response?.status()).toBe(404);

        await expect(page.locator('#error-not-found-title')).toHaveText('404');
    });

    test('serves an unknown path as html on a direct request', async ({ request }) => {
        const response = await request.get('/this-page-does-not-exist');

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(404);
    });

    test('marks the page noindex for robots', async ({ page }) => {
        await page.goto('/this-page-does-not-exist');

        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    });

    test('navigates home from the back to home link', async ({ page }) => {
        await page.goto('/this-page-does-not-exist');
        await page.getByRole('link', { name: 'Back to home' }).click();

        await expect(page).toHaveURL('/');
        await expect(page).toHaveTitle('Figure Zero Project');
    });
});
