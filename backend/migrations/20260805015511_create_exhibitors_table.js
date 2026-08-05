/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('exhibitors', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('stand_number');
    table.text('description');
    table.string('category');
    table.string('country');
    table.string('website');
    table.integer('year').notNullable().defaultTo(2026); // Yıla göre filtreleme için
    table.timestamps(true, true); // created_at ve updated_at otomatik eklenir
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('exhibitors');
};