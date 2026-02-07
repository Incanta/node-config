# @incanta/config

A hierarchical, folder-based configuration library for Node.js with environment inheritance, variable cross-referencing, kebab-to-camelCase conversion, secrets provider integration, and support for YAML, JSON, JSONC, and JSON5 file formats.

## Installation

```bash
npm install @incanta/config
# or
yarn add @incanta/config
```

## Quick Start

```typescript
import config from "@incanta/config";

const port = config.get<number>("server.port");
const debug = config.get<boolean>("environment.development");
```

By default, `@incanta/config` looks for a `config` directory in the current working directory and loads the `default` environment. You can override this with the `NODE_CONFIG_DIR` and `NODE_CONFIG_ENV` environment variables, or by creating a new `Config` instance directly.

## Core Concepts

### Directory-Based Configuration

Configuration values are defined by the folder structure, file names, and object keys within those files. Each subfolder and each file (minus its extension) adds a segment to the config key path.

Given this structure:

```
config/
  default/
    _index.yaml
    server.yaml
    persistence/
      database.yaml
      redis.yaml
```

- `_index.yaml` contents are scoped to the parent folder (no path segment added)
- `server.yaml` values are accessed under `server.*`
- `persistence/database.yaml` values are accessed under `persistence.database.*`
- `persistence/redis.yaml` values are accessed under `persistence.redis.*`

For example, if `server.yaml` contains:

```yaml
port: 3000
host: "localhost"
```

You access these values with:

```typescript
config.get<number>("server.port");    // 3000
config.get<string>("server.host");    // "localhost"
```

### The `_index.yaml` / `index.yaml` File

Index files are special — they do **not** add a path segment. Their contents are scoped to the parent directory. For example, `config/default/_index.yaml`:

```yaml
environment:
  development: true
```

This is accessed as `environment.development`, not `_index.environment.development`. The underscore prefix is optional but recommended to keep the file at the top of file explorers.

### Supported File Formats

- **YAML** (`.yaml`, `.yml`)
- **JSON** (`.json`)
- **JSONC** (`.jsonc`) — JSON with comments
- **JSON5** (`.json5`)

You can mix file formats within the same config directory.

## Environments

Environments let you override default values for different deployment targets (e.g. `staging`, `production`). Only values that differ from the default need to be specified in the environment folder.

```
config/
  default/          # base values (always loaded first)
    server.yaml
  staging/          # overrides for staging
    server.yaml
  production/       # overrides for production
    server.yaml
```

Set the environment via:

- **Environment variable**: `NODE_CONFIG_ENV=production`
- **Constructor option**: `new Config({ configEnv: "production" })`
- **`config.init()` call**: `config.init({ configEnv: "production" })`
- **Using [config-env](#environment-variable-injection-config-env)**: `config-env --env=production <command>`

When an environment is active, its values are deep merged on top of `default`. Arrays are **replaced** entirely (not merged).

### Environment Inheritance

Environments inherit from `default` automatically. For more complex setups, you can inherit from additional environments using a `_config.json` file inside the environment folder:

```
config/
  default/
  staging/
    _config.json    # { "parentNames": ["kubernetes"] }
  kubernetes/
  production/
    _config.json    # { "parentNames": ["staging"] }
```

**`production/_config.json`:**
```json
{
  "parentNames": ["staging"]
}
```

This creates an inheritance chain: `default` → `kubernetes` → `staging` → `production`. Values are loaded and merged in that order, with later environments taking precedence.

You can specify multiple parents for complex inheritance:

```json
{
  "parentNames": ["production", "cloud-aws"]
}
```

Inheritance is resolved in order: `default` → `production` (and its parents) → `cloud-aws` → current environment.

### Override File

An `override.json` file placed directly in the config directory root (not inside any environment folder) is loaded last and merges on top of everything:

```
config/
  default/
  production/
  override.json     # applied last, on top of the active environment
```

## Variable Cross-Referencing

Config values can reference other config values using `${path.to.variable}` syntax:

```yaml
# docker.yaml
image-prefix: "myregistry/myapp"

# server.yaml
image: "${docker.imagePrefix}-server"
```

`config.get<string>("server.image")` resolves to `"myregistry/myapp-server"`.

### Relative References

You can use relative paths with a leading dot (`.`):

```yaml
# realm/instances/default.yaml
key: "default"
namespace: "realm-${./key}"    # resolves to "realm-default"
```

Relative paths are resolved from the current object's location in the config tree.

### Recursive Resolution

References are resolved recursively, so a reference can point to another value that itself contains a reference.

## Kebab-Case to camelCase Conversion

By default, kebab-case keys are automatically converted to camelCase. Both forms can be used to access the value:

```yaml
# server.yaml
max-connections: 100
debug-port: 9229
```

```typescript
config.get<number>("server.maxConnections");  // 100
config.get<number>("server.max-connections"); // 100
```

### Variable Casing Options

You can control this behavior with a `variableCasing` setting in `_config.json` (or as a key in any config object):

| Value | Behavior |
|-------|----------|
| `"camel"` | Only camelCase keys are available (default) |
| `"original"` | Only original keys are preserved |
| `"both"` | Both the original and camelCase keys are available |

```json
{
  "variableCasing": "original"
}
```

## Config Base (Template Objects)

You can define a base/template object that other sibling objects inherit from using `incantaConfigBase`:

```yaml
# instances/_index.yaml
incantaConfigBase: "base"
```

```yaml
# instances/base.yaml
foo: "bar"
hello: "world"
num: 42
```

```yaml
# instances/custom.yaml
hello: "city"
```

The `custom` object will inherit values from `base` and override only the specified keys:

```typescript
config.get<string>("instances.custom.foo");   // "bar" (inherited)
config.get<string>("instances.custom.hello"); // "city" (overridden)
config.get<number>("instances.custom.num");   // 42 (inherited)
```

## Secrets

`@incanta/config` has built-in support for fetching secrets from external providers. Any config value prefixed with `secret|` is treated as a secret reference:

```yaml
password: "secret|my-secret-key"
```

### Supported Providers

| Provider | Config Value |
|----------|-------------|
| HashiCorp Vault | `"vault"` |
| AWS Secrets Manager | `"aws-secrets-manager"` |
| Azure Key Vault | `"azure-key-vault"` |
| GCP Secret Manager | `"gcp-secret-manager"` |
| Local (file-based) | `"local"` |
| None (disabled) | `"none"` |

Configure the provider in your config files:

```yaml
# secrets.yaml
provider: "none"
cache-duration-seconds: 300
```

### Fetching Secrets

Use `getWithSecrets()` to resolve secret references:

```typescript
const dbConfig = await config.getWithSecrets<IDatabaseConfig>(
  "persistence.database"
);
```

This recursively walks the returned object and replaces any `"secret|..."` strings with values fetched from the configured secrets provider. Results are cached according to `secrets.cache-duration-seconds`.

## Environment Variable Injection (`config-env`)

The package includes a `config-env` CLI tool that injects config values as environment variables into a child process. This tool will also inject the `NODE_CONFIG_ENV` variable to the child process.

Define an `environment.yaml` (or `environment.json`, etc.) file in the config directory root mapping environment variable names to config paths:

```yaml
# environment.yaml
DATABASE_HOST: "persistence.database.host"
DATABASE_PORT: "persistence.database.port"
```

### CLI Usage

```bash
npx config-env <command>

# With a specific config environment:
npx config-env --env=production <command>
npx config-env -e=production <command>
```

### Programmatic Usage

```typescript
import config from "@incanta/config";

const envVars = config.getConfiguredEnv();
// { DATABASE_HOST: "localhost", DATABASE_PORT: "5432" }
```

## `config-settings.json`

Place a `config-settings.json` file in the working directory root to customize the config system's behavior:

```jsonc
{
  "defaults": {
    "dir": "config/node",       // default config directory (default: "config")
    "env": "my-default-env"     // default environment name (default: "default")
  },
  "extraDirs": [
    "/path/to/additional/config"  // extra directories to search for environments
  ]
}
```

### Extra Directories

`extraDirs` allows environment folders to live outside the main config directory. This is useful when you want to keep project-specific configuration separate from shared configuration:

```jsonc
{
  "extraDirs": [
    "C:\\path\\to\\MyProject\\Config\\Backend"
  ]
}
```

When resolving an environment name, the library first checks the main config directory, then checks each extra directory in order.

## API Reference

### Default Export (Singleton)

```typescript
import config from "@incanta/config";
```

Returns a singleton `Config` instance, initialized with defaults on first access.

### `Config` Class

```typescript
import Config from "@incanta/config/config";
```

#### Constructor

```typescript
const config = new Config(options?: IConfigOptions);
```

| Option | Type | Description |
|--------|------|-------------|
| `configDir` | `string` | Path to the config directory |
| `configEnv` | `string` | Environment name to load |
| `cwd` | `string` | Working directory for resolving relative paths |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `init(options?)` | `void` | Re-initialize with new options |
| `get<T>(key)` | `T` | Get a value by dot-separated path; throws if not found |
| `tryGet<T>(key)` | `T \| null` | Get a value, returning `null` if the key doesn't exist |
| `getWithSecrets<T>(key)` | `Promise<T>` | Get a value and resolve any `secret\|...` references |
| `processSecrets<T>(value)` | `Promise<T>` | Recursively resolve secrets in an arbitrary value |
| `getConfiguredEnv()` | `object` | Get env vars mapped from the `environment.*` config file |
| `getJson()` | `object` | Get the entire resolved config as a plain object |
| `set<T>(key, value)` | `void` | Set a runtime config value |
| `dir()` | `string` | Get the active config directory path |
| `env()` | `string` | Get the active environment name |
| `cwd()` | `string` | Get the working directory |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_CONFIG_DIR` | Override the config directory path |
| `NODE_CONFIG_ENV` | Override the config environment name |
| `NODE_CONFIG_SKIP_ENV_WARNING` | Set to `"true"` to suppress missing environment warnings |

## Example Project Structure

A typical project using `@incanta/config`:

```
my-project/
  config-settings.json           # optional: customize defaults and extra dirs
  config/
    environment.yaml             # env var mappings for config-env CLI
    override.json                # optional: final overrides
    default/                     # base configuration
      _index.yaml
      server.yaml
      persistence/
        database.yaml
        redis.yaml
    staging/                     # staging overrides
      _config.json               # { "parentNames": ["kubernetes"] }
      _index.yaml
    kubernetes/                  # kubernetes-specific values
      server.yaml
    production/                  # production overrides
      _config.json               # { "parentNames": ["staging"] }
      persistence/
        database.yaml
  src/
    index.ts
```

## License

MIT
