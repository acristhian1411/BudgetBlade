import { initDB } from '../db/migrations';
import * as categoryRepo from '../db/repositories/category.repo';

beforeEach(async () => {
  await initDB();
});

describe('category.repo', () => {
  it('returns all seeded categories ordered by type then name', async () => {
    const categories = await categoryRepo.getAllCategories();
    expect(categories).toHaveLength(22);

    const names = categories.map((c) => c.name);
    // expense sorts before income; within expense, 'Ajustes' < 'Alimentación'.
    expect(names[0]).toBe('Ajustes');
    expect(names).toContain('Alimentación');
  });

  it('filters categories by type', async () => {
    const income = await categoryRepo.getAllCategories('income');
    expect(income).toHaveLength(5);
    for (const cat of income) {
      expect(cat.type).toBe('income');
    }

    const expense = await categoryRepo.getAllCategories('expense');
    expect(expense).toHaveLength(17);
  });

  it('gets a single category by id', async () => {
    const categories = await categoryRepo.getAllCategories();
    const first = categories[0];

    const found = await categoryRepo.getCategoryById(first.id);
    expect(found).toBeTruthy();
    expect(found.name).toBe(first.name);
  });

  it('returns null for a missing category id', async () => {
    const found = await categoryRepo.getCategoryById(99999);
    expect(found).toBeNull();
  });
});
