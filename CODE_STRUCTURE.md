# Telegram Bot Project Structure

This project has been refactored into a clean, modular architecture for better maintainability and organization.

## File Structure

```
src/
├── index.ts          # Main entry point, bot initialization
├── types.ts          # TypeScript interfaces and types
├── database.ts       # Database operations and ORM functions
├── admin.ts          # Admin utilities and helper functions
└── handlers.ts       # Command and message handlers
```

## Module Descriptions

### `types.ts`
Contains all TypeScript interfaces and type definitions:
- `Environment`: Cloudflare Worker environment variables
- `User`: User data structure
- `UserStats`: Statistics data structure

### `database.ts`
Database operations and ORM-like functions:
- `upsertUser()`: Insert or update user information
- `logInteraction()`: Log user interactions
- `getUserStats()`: Get comprehensive bot statistics
- `getTopUsers()`: Get users with most interactions

### `admin.ts`
Admin utilities and helper functions:
- `formatStatsMessage()`: Format statistics into readable message
- `isAdmin()`: Check if user has admin privileges
- `generateStatsReport()`: Generate complete stats report

### `handlers.ts`
Command and message handlers:
- `handleStartCommand()`: Handle /start command
- `handleChatIdCommand()`: Handle /chatid command
- `handleStatsCommand()`: Handle /stats command (admin only)
- `handleReportCommand()`: Handle /report command (admin only)
- `handleMessage()`: Handle regular text messages

### `index.ts`
Main entry point:
- Clean, minimal bot initialization
- Routes commands to appropriate handlers
- No business logic (delegated to handlers)

## Benefits of This Structure

1. **Separation of Concerns**: Each file has a single responsibility
2. **Maintainability**: Easy to find and modify specific functionality
3. **Testability**: Individual functions can be tested in isolation
4. **Scalability**: Easy to add new commands, database operations, or admin features
5. **Code Reusability**: Functions can be imported and reused across different parts

## Adding New Features

- **New Commands**: Add handler in `handlers.ts` and register in `index.ts`
- **Database Operations**: Add functions to `database.ts`
- **Admin Features**: Add utilities to `admin.ts`
- **Types**: Add interfaces to `types.ts`

## Available Commands

- `/start` - Welcome message and user registration
- `/chatid` - Get your Telegram chat ID (available to all users)
- `/stats` - Get bot statistics (admin only)
- `/report` - Get bot report (admin only, same as stats)
