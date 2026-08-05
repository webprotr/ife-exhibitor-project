exports.up = function(knex) {
  return knex.schema.table('exhibitors', (table) => {
    table.text('opening_times');   // Gün gün açılış saatleri
    table.string('organiser');     // Organizatör firma (Montgomery Group)
    table.string('contact_phone'); // Tel: +44 (0)20 7886 3000
    table.string('contact_email'); // Email: info@montgomerygroup.com
  });
};

exports.down = function(knex) {
  return knex.schema.table('exhibitors', (table) => {
    table.dropColumn('opening_times');
    table.dropColumn('organiser');
    table.dropColumn('contact_phone');
    table.dropColumn('contact_email');
  });
};