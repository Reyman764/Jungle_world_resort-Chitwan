'use strict';

const { paymentRevenueFromValues } = require('./adminController');

describe('paymentRevenueFromValues', () => {
  const base = {
    total_price: '1000.00',
    paid_amount: '0.00',
    refund_amount: '0.00',
  };

  test('counts pending and failed payments as zero', () => {
    expect(paymentRevenueFromValues({ ...base, payment_status: 'pending' })).toBe(0);
    expect(paymentRevenueFromValues({ ...base, payment_status: 'failed' })).toBe(0);
  });

  test('counts partial payments by paid amount only', () => {
    expect(paymentRevenueFromValues({
      ...base,
      payment_status: 'partial',
      paid_amount: '350.00',
    })).toBe(350);
  });

  test('counts completed payments by full booking total', () => {
    expect(paymentRevenueFromValues({
      ...base,
      payment_status: 'completed',
      paid_amount: '0.00',
    })).toBe(1000);
  });

  test('subtracts refunded amount from the paid revenue base', () => {
    expect(paymentRevenueFromValues({
      ...base,
      payment_status: 'refunded',
      paid_amount: '1000.00',
      refund_amount: '400.00',
    })).toBe(600);
  });

  test('uses total price as refund base when older completed bookings have no paid amount', () => {
    expect(paymentRevenueFromValues({
      ...base,
      payment_status: 'refunded',
      paid_amount: '0.00',
      refund_amount: '250.00',
    })).toBe(750);
  });
});
