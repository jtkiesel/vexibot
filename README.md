# vexibot

Discord bot that provides services related to the VEX Robotics Competition, primarily providing information and statistics related to the competition.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)

### Environment Variables

|       Variable       | Required |    Default    |                                  Description                                   |
| :------------------: | :------: | :-----------: | :----------------------------------------------------------------------------: |
|   `DISCORD_TOKEN`    |    ✓     |               |                  Token of the Discord account to log in with                   |
| `ROBOT_EVENTS_TOKEN` |    ✓     |               |                             Robot Events API token                             |
|     `LOG_LEVEL`      |          |    `INFO`     |                               Minimum log level                                |
| `MESSAGE_CACHE_SIZE` |          |     `250`     | Maximum number of messages to cache per channel, including all pinned messages |
|      `NODE_ENV`      |          | `development` |                        Node.JS application environment                         |

### Installing

Install dependencies

```sh-session
yarn install
```

Start the bot

```sh-session
yarn dev
```

## Running the tests

```sh-session
yarn test
```

## Deployment

Install dependencies

```sh-session
yarn install
```

Compile source

```sh-session
yarn build
```

Start the bot

```sh-session
yarn start
```

## Versioning

We use [SemVer](https://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/jtkiesel/vexibot/tags).

## Authors

- **Jordan Kiesel** - [LinkedIn](https://www.linkedin.com/in/jtkiesel/)

See also the list of [contributors](https://github.com/jtkiesel/vexibot/contributors) who participated in this project.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
