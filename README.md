# Vigilant

Process monitoring system for interview integrity.

## Architecture
```
Electron Client → Go Server (Port 3333) → PostgreSQL
```

## Quick Start

### Using Docker (Recommended)
```bash
docker-compose up -d
```

### Local Development
```bash
# Start server
cd server
go run main.go

# Start client (in another terminal)
cd apps/client
npm install
npm start
```

## Documentation

- [Server Setup](./server/README.md)
- [Client Documentation](./apps/client/README.md)
- [Configuration Guide](./docs/configuration.md)

## License

See [LICENSE](./LICENSE)
