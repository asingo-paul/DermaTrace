import {Model} from '@nozbe/watermelondb';
import {field, date, text} from '@nozbe/watermelondb/decorators';

export class Product extends Model {
  static table = 'products';

  @text('name') name!: string;
  @text('brand') brand!: string;
  @text('ingredients') ingredients!: string; // JSON string
  @text('image_url') imageUrl!: string;
  @field('is_catalog') isCatalog!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Sync metadata
  @text('_status') syncStatus!: string;
  @text('_changed') syncChanged!: string;
  @text('server_id') serverId!: string;

  get ingredientList(): string[] {
    try {
      return JSON.parse(this.ingredients) as string[];
    } catch {
      return [];
    }
  }
}
