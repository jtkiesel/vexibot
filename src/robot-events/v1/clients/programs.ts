import {Program} from '.';
import {Client} from '../client';

export class Programs extends Client {
  public async findAll(): Promise<Program[]> {
    return this.get('/programs');
  }
}
