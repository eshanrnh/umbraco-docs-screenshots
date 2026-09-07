import { test, ConstantHelper } from '@umbraco-cms/acceptance-test-helpers-v18';
import { expect } from '@playwright/test';

const BASE = process.env.URL ?? 'https://localhost:44327';

test.use({ viewport: { width: 1280, height: 820 } });

async function dumpTree(page: import('@playwright/test').Page) {
  const items = await page.locator('umb-tree-item').allTextContents();
  console.log('TREE ITEMS:', JSON.stringify(items));
}

async function dumpActionable(page: import('@playwright/test').Page, root?: any) {
  const results: string[] = [];
  async function walk(node: any) {
    const handles = await node.evaluateHandle((el: Element) => {
      const out: { tag: string; role: string | null; label: string | null; hasShadow: boolean }[] = [];
      function visit(e: Element) {
        const role = e.getAttribute('role');
        const aria = e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent?.trim().slice(0, 40) || null;
        if (role || ['button', 'a', 'input'].includes(e.tagName.toLowerCase())) {
          out.push({ tag: e.tagName.toLowerCase(), role, label: aria, hasShadow: !!e.shadowRoot });
        }
        if (e.shadowRoot) {
          Array.from(e.shadowRoot.children).forEach(visit);
        }
        Array.from(e.children).forEach(visit);
      }
      visit(el);
      return out;
    });
    const arr = await handles.jsonValue();
    return arr as { tag: string; role: string | null; label: string | null }[];
  }
  const body = root ?? page.locator('body').first();
  const arr = await walk(body);
  for (const a of arr) {
    if (a.label) results.push(`${a.tag}[${a.role ?? ''}] "${a.label}"`);
  }
  console.log('ACTIONABLE (' + results.length + '):');
  console.log(results.join('\n'));
}

test('explore rte media picker', async ({ umbracoApi, umbracoUi, page }) => {
  await umbracoUi.goToBackOffice();
  await expect(page.locator('umb-app')).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await umbracoUi.content.goToSection(ConstantHelper.sections.content);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3_000);
  await umbracoUi.content.goToContentWithName('Link From Image Content Example');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2_000);

  await page.getByRole('textbox', { name: 'Content' }).click();
  await page.getByRole('button', { name: 'Media Picker' }).click();
  await page.waitForTimeout(2_000);

  await page.locator('uui-card-media[title="Cropping Example"]').click();
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: 'Choose' }).click();
  await page.waitForTimeout(2_000);

  const dialog = page.locator('umb-body-layout').last();
  const box = await dialog.boundingBox();
  console.log('DIALOG BOX:', JSON.stringify(box));
  await page.screenshot({ path: 'screenshots/explore-media-picker-choose-tall.png', fullPage: false });
});
