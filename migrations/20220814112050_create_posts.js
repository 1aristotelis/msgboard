/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("posts", (table) => {
    table.increments("id");

    table.string("tx_id", 255).notNullable();

    table.integer("tx_index").notNullable();

    table.time("created_at").notNullable();

    table.string("content", 255).notNullable();

    table.string("reply_tx_id", 255).nullable();

    table.integer("reply_count").notNullable();

    table.decimal("difficulty").notNullable();

    table.string("author", 255).nullable();

    table.unique(["tx_id", "tx_index"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("posts");
};
