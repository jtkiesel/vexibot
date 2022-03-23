import type {Events, Piece} from '@sapphire/framework';
import {Listener, Store} from '@sapphire/framework';
import {
  blue,
  gray,
  green,
  magenta,
  magentaBright,
  white,
  yellow,
} from 'colorette';
import {nodeEnv, version} from '../lib/config';

const dev = nodeEnv !== 'production';

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  private readonly style = dev ? yellow : blue;

  public run() {
    this.printBanner();
    this.printStoreDebugInformation();
  }

  private printBanner() {
    const llc = dev ? magentaBright : white;
    const blc = dev ? magenta : blue;
    const lines = [`${blc(version)}`, `[${green('+')}] Gateway`];

    if (dev) {
      lines.push(
        `${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}`
      );
    }

    this.container.logger.info(lines.join('\n'));
  }

  private printStoreDebugInformation() {
    const {client, logger} = this.container;
    const stores = [...client.stores.values()];
    stores.map(this.styleStore, this).forEach(store => logger.info(store));
  }

  private styleStore(store: Store<Piece>, index: number, all: Store<Piece>[]) {
    const last = index === all.length - 1;
    const size = this.style(store.size.toString().padEnd(3, ' '));
    return gray(`${last ? '└─' : '├─'} Loaded ${size} ${store.name}.`);
  }
}
