import {Model} from '@nozbe/watermelondb';
import {field, date, text} from '@nozbe/watermelondb/decorators';

export class Reaction extends Model {
  static table = 'reactions';

  @text('reaction_date') reactionDate!: string;
  @text('severity') severity!: string;
  @text('symptoms') symptoms!: string; // JSON string
  @text('notes') notes!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Sync metadata
  @text('_status') syncStatus!: string;
  @text('_changed') syncChanged!: string;
  @text('server_id') serverId!: string;

  get symptomList(): string[] {
    try {
      return JSON.parse(this.symptoms) as string[];
    } catch {
      return [];
    }
  }
}
