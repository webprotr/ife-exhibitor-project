/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('exhibitors', (table) => {
    table.string('event_dates');    // Örn: "5 - 7 April 2027"
    table.string('event_location'); // Örn: "ExCeL London"
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('exhibitors', (table) => {
    table.dropColumn('event_dates');
    table.dropColumn('event_location');
  });
};