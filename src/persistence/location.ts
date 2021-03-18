export class LocationBuilder {
  #venue?: string;
  #address1?: string;
  #address2?: string;
  #city?: string;
  #region?: string;
  #postcode?: string;
  #country?: string;
  #coordinates: Coordinates;

  public venue(venue: string): LocationBuilder {
    this.#venue = venue;
    return this;
  }

  public address1(address1: string): LocationBuilder {
    this.#address1 = address1;
    return this;
  }

  public address2(address2: string): LocationBuilder {
    this.#address2 = address2;
    return this;
  }

  public city(city: string): LocationBuilder {
    this.#city = city;
    return this;
  }

  public region(region: string): LocationBuilder {
    this.#region = region;
    return this;
  }

  public postcode(postcode: string): LocationBuilder {
    this.#postcode = postcode;
    return this;
  }

  public country(country: string): LocationBuilder {
    this.#country = country;
    return this;
  }

  public coordinates(coordinates: Coordinates): LocationBuilder {
    this.#coordinates = coordinates;
    return this;
  }

  public build(): Location {
    return new LocationBuilder.Location(this);
  }

  static Location = class Location {
    public readonly venue?: string;
    public readonly address1?: string;
    public readonly address2?: string;
    public readonly city?: string;
    public readonly region?: string;
    public readonly postcode?: string;
    public readonly country?: string;
    public readonly coordinates: Coordinates;

    constructor(builder: LocationBuilder) {
      if (builder.#venue !== undefined) {
        this.venue = builder.#venue;
      }
      if (builder.#address1 !== undefined) {
        this.address1 = builder.#address1;
      }
      if (builder.#address2 !== undefined) {
        this.address2 = builder.#address2;
      }
      if (builder.#city !== undefined) {
        this.city = builder.#city;
      }
      if (builder.#region !== undefined) {
        this.region = builder.#region;
      }
      if (builder.#postcode !== undefined) {
        this.postcode = builder.#postcode;
      }
      if (builder.#country !== undefined) {
        this.country = builder.#country;
      }
      this.coordinates = builder.#coordinates;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export class CoordinatesBuilder {
  #lat: number;
  #lon: number;

  public lat(lat: number): CoordinatesBuilder {
    this.#lat = lat;
    return this;
  }

  public lon(lon: number): CoordinatesBuilder {
    this.#lon = lon;
    return this;
  }

  public build(): Coordinates {
    return new CoordinatesBuilder.Coordinates(this);
  }

  static Coordinates = class Coordinates {
    public readonly lat?: number;
    public readonly lon?: number;

    constructor(builder: CoordinatesBuilder) {
      this.lat = builder.#lat;
      this.lon = builder.#lon;
    }

    public toString(): string {
      return JSON.stringify(this, null, '  ');
    }
  }
}

export type Location = typeof LocationBuilder.Location.prototype;

export type Coordinates = typeof CoordinatesBuilder.Coordinates.prototype;
