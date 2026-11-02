import { expect, test } from 'bun:test';
import { SUPPORT_PAYMENT_URL } from '../../appMetadata.ts';
import { isCheckoutReferrer } from './supportActivity.ts';

test('accepts only the exact Stripe checkout origins', () => {
  expect(isCheckoutReferrer(new URL('/checkout', SUPPORT_PAYMENT_URL).href)).toBe(true);
  expect(isCheckoutReferrer('https://checkout.stripe.com/')).toBe(true);
});

test.each(['', 'http://buy.stripe.com/', 'https://buy.stripe.com.evil.test/', 'not a URL'])(
  'rejects the referrer %p',
  (referrer) => {
    expect(isCheckoutReferrer(referrer)).toBe(false);
  },
);
