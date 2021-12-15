import type {Region} from '.';
import {Client} from '../client';

export class Regions extends Client {
  public async findAll(): Promise<Region[]> {
    return this.get('/regions');
  }

  public async findAllByCountry(countryId: number): Promise<Region[]> {
    return this.get(`/regions/${countryId}`);
  }
}
