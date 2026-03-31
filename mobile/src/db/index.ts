import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {schema} from './schema';
import {Product} from './models/Product';
import {Reaction} from './models/Reaction';
import {ReactionProduct} from './models/ReactionProduct';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'dermatrace',
  jsi: true, // use JSI for better performance when available
  onSetUpError: error => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Product, Reaction, ReactionProduct],
});
