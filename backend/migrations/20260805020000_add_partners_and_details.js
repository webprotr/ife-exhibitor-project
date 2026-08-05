/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // 1. Partnerler & Sponsorlar Tablosu
    .createTable('exhibitor_partners', (table) => {
      table.increments('id').primary();
      table.integer('exhibitor_id').unsigned().references('id').inTable('exhibitors').onDelete('CASCADE');
      table.string('type').notNullable(); // Main Sponsor, Key Partner, Media Supporter vb.
      table.string('name').notNullable();
      table.string('logo_url');
      table.string('website');
      table.timestamps(true, true);
    })
    // 2. Exhibitors tablosuna detay alanları ekleme
    .table('exhibitors', (table) => {
      table.text('full_details');
      table.string('facebook_url');
      table.string('linkedin_url');
      table.string('twitter_url');
      table.string('instagram_url');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('exhibitor_partners')
    .table('exhibitors', (table) => {
      table.dropColumn('full_details');
      table.dropColumn('facebook_url');
      table.dropColumn('linkedin_url');
      table.dropColumn('twitter_url');
      table.dropColumn('instagram_url');
    });
};