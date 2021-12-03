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

const required = (name: string): string => {
  const value = process.env[name];
  assertIsString(name, value);
  return value;
};

export const discordToken = process.env.DISCORD_TOKEN;
export const robotEventsToken = required('ROBOT_EVENTS_TOKEN');
