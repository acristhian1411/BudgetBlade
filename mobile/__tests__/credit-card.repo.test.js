import { initDB } from '../db/migrations';
import * as creditCardRepo from '../db/repositories/credit-card.repo';
import * as tillRepo from '../db/repositories/till.repo';
import * as txRepo from '../db/repositories/transaction.repo';
import { getDb } from '../db/index';

beforeEach(async () => {
  await initDB();
});

describe('credit-card.repo', () => {
  it('creates, lists and updates a credit card', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const id = await creditCardRepo.createCreditCard({ tillId, name: 'Visa', creditLimit: 1000 });

    expect(id).toBe(1);

    let cards = await creditCardRepo.getAllCreditCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].till_name).toBe('Banco');

    await creditCardRepo.updateCreditCard(id, { tillId, name: 'Master', creditLimit: 2000 });
    cards = await creditCardRepo.getAllCreditCards();
    expect(cards[0].name).toBe('Master');
    expect(cards[0].credit_limit).toBe(2000);
  });

  it('computes pending debt (purchases - payments)', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const cardId = await creditCardRepo.createCreditCard({ tillId, name: 'Visa', creditLimit: 5000 });

    const purchaseId = await txRepo.createTransaction({
      tillId,
      amount: 500,
      type: 'egreso',
      date: '2026-01-01',
      creditCardId: cardId,
      paymentMethod: 'credit_card',
    });

    await txRepo.createCreditCardPayment({
      tillId,
      creditCardId: cardId,
      capitalAmount: 200,
      date: '2026-02-01',
      paymentItems: [{ purchaseTransactionId: purchaseId, amountPaid: 200 }],
    });

    const cards = await creditCardRepo.getAllCreditCards();
    expect(cards[0].pending_debt).toBe(300);
  });

  it('lists pending purchases for a card', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const cardId = await creditCardRepo.createCreditCard({ tillId, name: 'Visa', creditLimit: 5000 });

    await txRepo.createTransaction({
      tillId,
      amount: 500,
      type: 'egreso',
      date: '2026-01-01',
      creditCardId: cardId,
      paymentMethod: 'credit_card',
      description: 'supermercado',
    });

    const purchases = await creditCardRepo.getCreditCardPendingPurchases(cardId);
    expect(purchases).toHaveLength(1);
    expect(purchases[0].description).toBe('supermercado');
    expect(purchases[0].pending_amount).toBe(500);
  });

  it('deletes a credit card and clears references from transactions', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const cardId = await creditCardRepo.createCreditCard({ tillId, name: 'Visa', creditLimit: 5000 });

    await txRepo.createTransaction({
      tillId,
      amount: 100,
      type: 'egreso',
      date: '2026-01-01',
      creditCardId: cardId,
      paymentMethod: 'credit_card',
    });

    await creditCardRepo.deleteCreditCard(cardId);

    expect(await creditCardRepo.getAllCreditCards()).toHaveLength(0);

    const db = await getDb();
    const tx = await db.getFirstAsync('SELECT credit_card_id FROM transactions LIMIT 1');
    expect(tx.credit_card_id).toBeNull();
  });

  it('computes debt summary across cards', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const cardA = await creditCardRepo.createCreditCard({ tillId, name: 'A', creditLimit: 1000 });
    const cardB = await creditCardRepo.createCreditCard({ tillId, name: 'B', creditLimit: 1000 });

    await txRepo.createTransaction({
      tillId, amount: 100, type: 'egreso', date: '2026-01-01',
      creditCardId: cardA, paymentMethod: 'credit_card',
    });
    await txRepo.createTransaction({
      tillId, amount: 300, type: 'egreso', date: '2026-01-02',
      creditCardId: cardB, paymentMethod: 'credit_card',
    });

    const summary = await creditCardRepo.getCreditCardsDebtSummary();
    const byName = Object.fromEntries(summary.map((s) => [s.name, s.pending_debt]));
    expect(byName.A).toBe(100);
    expect(byName.B).toBe(300);
  });
});
