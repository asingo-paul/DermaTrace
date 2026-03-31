import {Model} from '@nozbe/watermelondb';
import {text} from '@nozbe/watermelondb/decorators';

export class ReactionProduct extends Model {
  static table = 'reaction_products';

  @text('reaction_id') reactionId!: string;
  @text('product_id') productId!: string;

  // Sync metadata
  @text('_status') syncStatus!: string;
  @text('_changed') syncChanged!: string;
  @text('server_id') serverId!: string;
}
