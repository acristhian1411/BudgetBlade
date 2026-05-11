import { getDb } from '../index';

/**
 * Get all categories, optionally filtered by type.
 * @param {('income' | 'expense') | null} type - Optional filter
 * @returns {Promise<Array>} Array of categories
 */
export const getAllCategories = async (type = null) => {
  const db = await getDb();
  if (type) {
    return db.getAllAsync(
      'SELECT * FROM categories WHERE type = ? ORDER BY name',
      [type]
    );
  }
  return db.getAllAsync('SELECT * FROM categories ORDER BY type, name');
};

/**
 * Get a single category by ID.
 * @param {number} id - Category ID
 * @returns {Promise<Object | null>}
 */
export const getCategoryById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM categories WHERE id = ?', [id]);
};
