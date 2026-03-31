import {appSchema, tableSchema} from '@nozbe/watermelondb';

// Sync metadata columns shared by all tables
const syncColumns = [
  {name: '_status', type: 'string' as const},
  {name: '_changed', type: 'string' as const},
  {name: 'server_id', type: 'string' as const},
];

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'products',
      columns: [
        ...syncColumns,
        {name: 'name', type: 'string'},
        {name: 'brand', type: 'string'},
        {name: 'ingredients', type: 'string'}, // JSON-serialised string[]
        {name: 'image_url', type: 'string'},
        {name: 'is_catalog', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'reactions',
      columns: [
        ...syncColumns,
        {name: 'reaction_date', type: 'string'},
        {name: 'severity', type: 'string'},
        {name: 'symptoms', type: 'string'}, // JSON-serialised string[]
        {name: 'notes', type: 'string'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'reaction_products',
      columns: [
        ...syncColumns,
        {name: 'reaction_id', type: 'string'},
        {name: 'product_id', type: 'string'},
      ],
    }),
  ],
});
