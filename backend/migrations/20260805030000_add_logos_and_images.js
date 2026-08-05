/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Exhibitors tablosuna logo ekle
    .table('exhibitors', (table) => {
      table.string('logo_url'); // Sitedeki orijinal logo URL'i
      table.string('local_logo_path'); // Sunucumuza indirilen görselin lokal yolu
    })
    // Exhibitor Partners tablosuna görsel alanlarını güncelle
    .table('exhibitor_partners', (table) => {
      table.string('local_logo_path');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .table('exhibitors', (table) => {
      table.dropColumn('logo_url');
      table.dropColumn('local_logo_path');
    })
    .table('exhibitor_partners', (table) => {
      table.dropColumn('local_logo_path');
    });
};