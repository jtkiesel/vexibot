import log from 'loglevel';
import mongodb, { BulkWriteResult, Collection, FilterQuery, ObjectId, WriteError } from 'mongodb';

import Cache from './cache';
log.enableAll();

export abstract class Persistence<K extends Key, V extends Value<K>> {
  protected readonly cache: Cache<V>;
  protected readonly collection: Collection<V>;
  protected readonly BuilderClass: { new(): Builder<V> };

  constructor(cache: Cache<V>, collection: Collection<V>, BuilderClass: { new(): Builder<V> }) {
    this.cache = cache;
    this.collection = collection;
    this.BuilderClass = BuilderClass;
  }

  public async get(keys: K[]): Promise<V[]> {
    if (!keys?.length) {
      return [];
    }
    // Cached
    const cachedEntries = keys.map<[K, V]>(key => [key, this.cache.get(JSON.stringify(key))]);
    const values = cachedEntries.flatMap(([, value]) => value !== undefined ? [value] : []);
    if (values.length) {
      log.debug(`Found in cache: ${values}`);
      if (values.length === keys.length) {
        return values;
      }
    }
    // Stored
    let remainingKeys = cachedEntries.flatMap(([key, value]) => value === undefined ? [key] : []);
    const storedValues = (await this.collection.find({ $or: remainingKeys } as FilterQuery<V>).toArray())
      .map(value => this.objectify(value));
    if (storedValues.length) {
      log.debug(`Found in DB: ${storedValues}`);
      values.push(...storedValues);
      this.cacheMany(storedValues);
      if (values.length === keys.length) {
        return values;
      }
      const storedKeys = storedValues.map(value => value.getKey());
      remainingKeys = remainingKeys.filter(key => !storedKeys.includes(key));
    }
    // Fetched
    const fetchedValues = await this.fetch(remainingKeys);
    if (fetchedValues.length) {
      log.debug(`Fetched: ${fetchedValues}`);
      values.push(...fetchedValues);
      await this.upsertMany(fetchedValues);
    }
    return values;
  }

  public async getOne(key: K): Promise<V> {
    // Cached
    const cachedValue = this.cache.get(JSON.stringify(key));
    if (cachedValue) {
      log.debug(`Found in cache: ${cachedValue}`);
      return cachedValue;
    }
    // Stored
    const storedValue = await this.collection.findOne({ _id: key });
    if (storedValue) {
      log.debug(`Found in DB: ${storedValue}`);
      this.cacheOne(storedValue);
      return storedValue;
    }
    // Fetched
    const fetchedValue = await this.fetchOne(key);
    if (fetchedValue) {
      log.debug(`Fetched: ${storedValue}`);
      await this.upsertOne(fetchedValue);
    }
    return fetchedValue;
  }

  public getAll(): Cursor<V> {
    return new MongoDbCursor(this.collection.find());
  }

  public async upsertAll(): Promise<void> {
    const startDate = new Date();
    const cursor = this.fetchAll();
    try {
      while (await cursor.hasNext()) {
        const values = await cursor.nextPage();
        await this.upsertMany(values);
      }
    } finally {
      await cursor.close();
    }
    await this.collection.deleteMany({
      fetchedAt: {
        $lt: startDate
      }
    } as FilterQuery<V>);
  }

  protected abstract fetchAll(): Cursor<V>;

  protected abstract fetch(keys: K[]): Promise<V[]>;

  protected abstract fetchOne(key: K): Promise<V>;

  protected async upsertMany(values: V[]): Promise<ObjectId[]> {
    if (!values?.length) {
      return;
    }
    log.debug(`Upserting to DB: ${values.toString()}`);
    const result = await this.collection.bulkWrite(values.map(value => {
      return {
        updateOne: {
          filter: value.getKey(),
          update: {
            $set: value
          },
          upsert: true
        }
      };
    }), {
      ordered: false
    }) as BulkWriteResult;  // MongoDB uses the wrong type here...

    const errors = result.getWriteErrors() as WriteError[];
    const errorIndices = errors.map(({ index }) => index);
    if (result.hasWriteErrors()) {
      const failed = values.filter((_, index) => errorIndices.includes(index));
      log.error(`Failed to upsert ${failed.length} values: ${failed.toString()}`);
    }
    const upserted = values.filter((_, index) => !errorIndices.includes(index));
    this.cacheMany(upserted);

    return result.getUpsertedIds()
      .map(({ _id }) => _id);
  }

  protected async upsertOne(value: V): Promise<void> {
    log.debug(`Upserting to DB: ${value.toString()}`);
    await this.collection.updateOne(value.getKey(), value, { upsert: true });
    this.cacheOne(value);
  }

  protected objectify(value: V): V {
    return Object.assign(new this.BuilderClass().build(), value);
  }

  private cacheMany(values: V[]): number {
    log.debug(`Caching: ${values.toString()}`);
    return values.filter(value => this.cache.set(JSON.stringify(value.getKey()), value)).length;
  }

  private cacheOne(value: V): boolean {
    log.debug(`Caching: ${value.toString()}`);
    return this.cache.set(JSON.stringify(value.getKey()), value);
  }
}

export abstract class Cursor<T> {
  public abstract hasNext(): Promise<boolean>;

  public abstract next(): Promise<T>;

  public abstract nextPage(): Promise<T[]>;

  public async forEach(iterator: (value: T) => void): Promise<void> {
    while (await this.hasNext()) {
      const values = await this.nextPage();
      values.forEach(iterator);
    }
  }

  public map<U>(transform: (value: T) => U): Cursor<U> {
    return new TransformedCursor<U, T>(this, transform);
  }

  public flatMap<U>(transform: (value: T) => Cursor<U>): Cursor<U> {
    return new NestedCursor(this.map(transform));
  }

  public async toArray(): Promise<T[]> {
    const array: T[] = [];
    await this.forEach(value => array.push(value));
    return array;
  }

  public async close(): Promise<void> {
    return;
  }
}

export class TransformedCursor<T, V> extends Cursor<T> {
  private readonly cursor: Cursor<V>;
  private readonly transform: (value: V) => T;

  constructor(cursor: Cursor<V>, transform: (value: V) => T) {
    super();
    this.cursor = cursor;
    this.transform = transform;
  }

  public async hasNext(): Promise<boolean> {
    return this.cursor.hasNext();
  }

  public async next(): Promise<T> {
    return this.transform(await this.cursor.next());
  }

  public async nextPage(): Promise<T[]> {
    const data = await this.cursor.nextPage();
    return data.map(this.transform);
  }

  public map<U>(transform: (value: T) => U): Cursor<U> {
    const oldTransform = this.transform;
    return new TransformedCursor(this.cursor, (value: V) => transform(oldTransform(value)));
  }

  public async close(): Promise<void> {
    await this.cursor.close();
  }
}

export class ArrayCursor<T> extends Cursor<T> {
  private readonly data: T[];

  constructor(array: T[]) {
    super();
    this.data = array;
  }

  public async hasNext(): Promise<boolean> {
    return (this.data.length > 0);
  }

  public async next(): Promise<T> {
    return this.data.shift();
  }

  public async nextPage(): Promise<T[]> {
    return this.data.splice(0);
  }

  public async toArray(): Promise<T[]> {
    return this.data.splice(0);
  }
}

export class NestedCursor<T> extends Cursor<T> {
  private readonly cursor: Cursor<Cursor<T>>;
  private innerCursor: Cursor<T>;

  constructor(cursor: Cursor<Cursor<T>>) {
    super();
    this.cursor = cursor;
  }

  public async hasNext(): Promise<boolean> {
    while (await this.cursor.hasNext() && (!this.innerCursor || !await this.innerCursor.hasNext())) {
      this.innerCursor = await this.cursor.next();
    }
    return this.innerCursor ? this.innerCursor.hasNext() : false;
  }

  public next(): Promise<T> {
    return this.innerCursor.next();
  }

  public nextPage(): Promise<T[]> {
    return this.innerCursor.nextPage();
  }

  public async close(): Promise<void> {
    const closed = await this.cursor.map(cursor => cursor.close()).toArray();
    await Promise.all(closed);
    return this.cursor.close();
  }
}

export type Key = Record<string, unknown>;

export interface Value<K extends Key> {
  fetchedAt: Date;

  getKey(): K;

  hasKey(key: K): boolean;
}

export interface Builder<V extends Value<Key>> {
  fetchedAt(date: Date): Builder<V>;

  build(): V;
}

class MongoDbCursor<T> extends Cursor<T> {
  private readonly cursor: mongodb.Cursor<T>;

  constructor(cursor: mongodb.Cursor<T>) {
    super();
    this.cursor = cursor;
  }

  public async hasNext(): Promise<boolean> {
    return await this.cursor.hasNext();
  }

  public async next(): Promise<T> {
    return await this.cursor.next();
  }

  public async nextPage(): Promise<T[]> {
    return [await this.cursor.next()];
  }

  public map<U>(transform: (value: T) => U): Cursor<U> {
    return new MongoDbCursor(this.cursor.map(transform));
  }

  public toArray(): Promise<T[]> {
    return this.cursor.toArray();
  }

  public async close(): Promise<void> {
    await this.cursor.close();
  }
}
