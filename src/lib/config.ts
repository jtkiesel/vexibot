import {LogLevel} from '@sapphire/framework';
import {AssertionError} from 'assert';
import {config} from 'dotenv';

config();

function assertIsString(
  name: string,
  value: string | undefined
): asserts value is string {
  if (value === undefined) {
    throw new AssertionError({
      message: `Required environment variable not set: ${name}`,
    });
  }
}

const parseLogLevel = (value: string | undefined): LogLevel | undefined => {
  switch (value?.toUpperCase()) {
    case 'TRACE':
      return LogLevel.Trace;
    case 'DEBUG':
      return LogLevel.Debug;
    case 'INFO':
      return LogLevel.Info;
    case 'WARN':
      return LogLevel.Warn;
    case 'ERROR':
      return LogLevel.Error;
    case 'FATAL':
      return LogLevel.Fatal;
    case 'NONE':
      return LogLevel.None;
    default:
      return undefined;
  }
};

const required = (name: string): string => {
  const value = process.env[name];
  assertIsString(name, value);
  return value;
};

export const discordToken = process.env.DISCORD_TOKEN;
export const logLevel = parseLogLevel(process.env.LOG_LEVEL);
export const nodeEnv = process.env.NODE_ENV;
export const robotEventsToken = required('ROBOT_EVENTS_TOKEN');
export const version = required('npm_package_version');
