/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasAddress = await knex.schema.hasColumn('exhibitors', 'address');
  const hasYoutube = await knex.schema.hasColumn('exhibitors', 'youtube_url');
  const hasEventDates = await knex.schema.hasColumn('exhibitors', 'event_dates');
  const hasEventLocation = await knex.schema.hasColumn('exhibitors', 'event_location');
  const hasOpeningTimes = await knex.schema.hasColumn('exhibitors', 'opening_times');
  const hasOrganiser = await knex.schema.hasColumn('exhibitors', 'organiser');
  const hasContactPhone = await knex.schema.hasColumn('exhibitors', 'contact_phone');
  const hasContactEmail = await knex.schema.hasColumn('exhibitors', 'contact_email');

  return knex.schema.table('exhibitors', (table) => {
    if (!hasAddress) table.text('address');
    if (!hasYoutube) table.string('youtube_url');
    if (!hasEventDates) table.string('event_dates');
    if (!hasEventLocation) table.string('event_location');
    if (!hasOpeningTimes) table.text('opening_times');
    if (!hasOrganiser) table.string('organiser');
    if (!hasContactPhone) table.string('contact_phone');
    if (!hasContactEmail) table.string('contact_email');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('exhibitors', (table) => {
    table.dropColumn('address');
    table.dropColumn('youtube_url');
    table.dropColumn('event_dates');
    table.dropColumn('event_location');
    table.dropColumn('opening_times');
    table.dropColumn('organiser');
    table.dropColumn('contact_phone');
    table.dropColumn('contact_email');
  });
};