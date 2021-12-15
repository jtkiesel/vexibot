export abstract class Cursor<T> {
  public abstract hasNext(): Promise<boolean>;

  public abstract next(): Promise<T>;

  public abstract nextPage(): Promise<T[]>;

  public async forEach(iterator: (value: T) => void): Promise<void> {
    while (await this.hasNext()) {
      (await this.nextPage()).forEach(value => iterator(value));
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
    return data.map(value => this.transform(value));
  }

  public map<U>(transform: (value: T) => U): Cursor<U> {
    const oldTransform = this.transform;
    return new TransformedCursor(this.cursor, (value: V) =>
      transform(oldTransform(value))
    );
  }

  public async close(): Promise<void> {
    await this.cursor.close();
  }
}

export class NestedCursor<T> extends Cursor<T> {
  private readonly cursor: Cursor<Cursor<T>>;
  private innerCursor: Cursor<T> | undefined;

  constructor(cursor: Cursor<Cursor<T>>) {
    super();
    this.cursor = cursor;
  }

  public async hasNext(): Promise<boolean> {
    while (
      (await this.cursor.hasNext()) &&
      !(await this.innerCursor?.hasNext())
    ) {
      this.innerCursor = await this.cursor.next();
    }
    return this.innerCursor?.hasNext() ?? false;
  }

  public async next(): Promise<T> {
    if (!this.innerCursor) {
      throw new Error('No elements remaining in cursor');
    }
    return this.innerCursor.next();
  }

  public async nextPage(): Promise<T[]> {
    if (!this.innerCursor) {
      throw new Error('No elements remaining in cursor');
    }
    return this.innerCursor.nextPage();
  }

  public async close(): Promise<void> {
    const closed = await this.cursor.map(cursor => cursor.close()).toArray();
    await Promise.all(closed);
    return this.cursor.close();
  }
}

export class ArrayCursor<T> extends Cursor<T> {
  private readonly data: T[];

  constructor(array: T[]) {
    super();
    this.data = array;
  }

  public async hasNext(): Promise<boolean> {
    return this.data.length > 0;
  }

  public async next(): Promise<T> {
    const next = this.data.shift();
    if (!next) {
      throw new Error('No elements remaining in cursor');
    }
    return next;
  }

  public async nextPage(): Promise<T[]> {
    return this.data.splice(0);
  }

  public async toArray(): Promise<T[]> {
    return this.data.splice(0);
  }
}
