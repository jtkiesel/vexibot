import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener, type Piece, type Store} from '@sapphire/framework';
import {
  blue,
  gray,
  green,
  magenta,
  magentaBright,
  white,
  yellow,
} from 'colorette';
import {nodeEnv, npmPackageVersion} from '../lib/config.js';

const dev = nodeEnv === 'development';

@ApplyOptions<Listener.Options>({event: Events.ClientReady, once: true})
export class ClientReadyListener extends Listener<typeof Events.ClientReady> {
  private readonly style = dev ? yellow : blue;

  public override run() {
    this.printBanner();
    this.printStoreDebugInformation();
  }

  private printBanner() {
    const {logger} = this.container;
    const llc = dev ? magentaBright : white;
    const blc = dev ? magenta : blue;
    logger.info(blc(npmPackageVersion));
    logger.info(`[${green('+')}] Gateway`);

    if (dev) {
      logger.info(
        `${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}`
      );
    }
  }

  private printStoreDebugInformation() {
    const {client, logger} = this.container;
    const stores = [...client.stores.values()];
    stores.map(this.styleStore, this).forEach(store => logger.info(store));
  }

  private styleStore(store: Store<Piece>, index: number, all: Store<Piece>[]) {
    const last = index === all.length - 1;
    const size = this.style(`${store.size}`.padEnd(3, ' '));
    return gray(`${last ? '└─' : '├─'} Loaded ${size} ${store.name}.`);
  }
}
