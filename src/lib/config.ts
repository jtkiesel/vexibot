import {LogLevel} from '@sapphire/framework';
import {config} from 'dotenv';

config();

class Config<T> {
  private constructor(
    private readonly name: string,
    private readonly value?: T
  ) {}

  public static string(name: string) {
    return new Config(name, process.env[name]);
  }

  public static number(name: string) {
    const value = process.env[name];
    return new Config(name, value ? parseFloat(value) : undefined);
  }

  public static logLevel(name: string) {
    return new Config(name, Config.parseLogLevel(process.env[name]));
  }

  public orElse(value: T) {
    return this.value ?? value;
  }

  public orElseThrow() {
    if (this.value === undefined) {
      throw new Error(`Required environment variable not set: ${this.name}`);
    }
    return this.value;
  }

  private static parseLogLevel(value?: string) {
    switch (value?.toLowerCase()) {
      case 'trace':
        return LogLevel.Trace;
      case 'debug':
        return LogLevel.Debug;
      case 'info':
        return LogLevel.Info;
      case 'warn':
        return LogLevel.Warn;
      case 'error':
        return LogLevel.Error;
      case 'fatal':
        return LogLevel.Fatal;
      case 'none':
        return LogLevel.None;
      case undefined:
        return undefined;
      default:
        throw new Error(`Invalid log level: ${value}`);
    }
  }
}

export const discordToken = Config.string('DISCORD_TOKEN').orElseThrow();
export const logLevel = Config.logLevel('LOG_LEVEL').orElse(LogLevel.Info);
export const nodeEnv = Config.string('NODE_ENV').orElse('development');
export const npmPackageVersion = Config.string(
  'npm_package_version'
).orElseThrow();
export const robotEventsToken =
  Config.string('ROBOT_EVENTS_TOKEN').orElseThrow();
