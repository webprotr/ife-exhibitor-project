exports.up = function(knex) {
  return knex.schema.createTable('exhibitor_products', (table) => {
    table.increments('id').primary();
    table.integer('exhibitor_id').unsigned().notNullable()
         .references('id').inTable('exhibitors').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('image_url');
    table.string('local_image_path');
    table.string('product_link');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('exhibitor_products');
};