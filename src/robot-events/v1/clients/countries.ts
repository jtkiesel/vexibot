import {Country, CountryOption} from '.';
import {Client} from '../client';

export class Countries extends Client {
  public async findAll(): Promise<Country[]> {
    return this.get('/countries');
  }

  public async findOptions(): Promise<
    [
      {label: 'Commonly Selected'; options: CountryOption[]},
      {label: 'Alphabetical'; options: CountryOption[]}
    ]
  > {
    return this.get('/countries', {common: true});
  }
}
