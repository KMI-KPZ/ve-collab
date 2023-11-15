# VE Collab digital assistance platform

## Prerequisites

- Setup a Keycloak Instance and within that instance a realm and a client. Please refer to the [Keycloak Documentation](https://www.keycloak.org/documentation) for instructions.

- Setup a Wordpress instance, install [this](https://www.wpgraphql.com/) plugin and create some posts.

## Running the platform

It is highly recommended to run the whole application using `docker compose`. Before doing so, there are certain configuration steps to set up the necessary environment variables:

- because of some peculiarities about Etherpads configuration, you need to copy `APIKEY.txt.example` into `APIKEY.txt` and put a secure and random api key that etherpad will use. On top of that, copy `etherpad_config.json.example` into `etherpad_config.json`, scroll to the bottom and fill in the `ep_openid_connect`-plugin settings according to your Keycloak information.
- copy `.env.example` into `.env` and fill out the values according to your needs (this is the environment file that docker compose will consume)
- run
  ```sh
  docker compose build
  docker compose up -d
  ```
