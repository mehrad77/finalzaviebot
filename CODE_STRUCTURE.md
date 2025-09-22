# Telegram Bot Project Structure

This project has been enhanced with a natural language reminder system and maintains a clean, modular architecture for better maintainability and organization.

## File Structure

```
src/
├── index.ts              # Main entry point, bot initialization & scheduled events
├── types.ts              # TypeScript interfaces and types
├── database.ts           # Database operations and ORM functions
├── admin.ts              # Admin utilities and helper functions
├── handlers.ts           # Command and message handlers
├── reminder-utils.ts     # Reminder parsing, formatting, and management
└── scheduler.ts          # Background job processing for reminders
```

## Module Descriptions

### `types.ts`
Contains all TypeScript interfaces and type definitions:
- `Environment`: Cloudflare Worker environment variables
- `User`: User data structure with timezone support
- `UserStats`: Statistics data structure
- `Reminder`: Reminder data structure

### `database.ts`
Database operations and ORM-like functions:
- `upsertUser()`: Insert or update user information (with timezone)
- `logInteraction()`: Log user interactions
- `getUserStats()`: Get comprehensive bot statistics
- `getTopUsers()`: Get users with most interactions

### `admin.ts`
Admin utilities and helper functions:
- `formatStatsMessage()`: Format statistics into readable message
- `isAdmin()`: Check if user has admin privileges
- `generateStatsReport()`: Generate complete stats report

### `reminder-utils.ts`
Natural language reminder processing and management:
- `parseReminderText()`: Parse natural language into structured reminder data
- `createReminder()`: Store reminder in database
- `getUserReminders()`: Get user's active reminders
- `deleteReminder()`: Remove a user's reminder
- `formatRemindersList()`: Format reminders for display
- `getDueReminders()`: Get reminders ready to be sent
- `markReminderAsSent()`: Mark reminder as delivered
- `formatDateForUser()`: Format dates in user's timezone
- `getAdminRemindersView()`: Generate admin view of all reminders

### `scheduler.ts`
Background processing for reminder delivery:
- `processDueReminders()`: Check and send due reminders
- `sendReminder()`: Send individual reminder via Telegram API
- `handleScheduledEvent()`: Cloudflare Workers scheduled event handler

### `handlers.ts`
Command and message handlers:
- `handleStartCommand()`: Handle /start command
- `handleChatIdCommand()`: Handle /chatid command
- `handleStatsCommand()`: Handle /stats command (admin only)
- `handleReportCommand()`: Handle /report command (admin only)
- `handleRemindCommand()`: Handle /remind command with natural language parsing
- `handleRemindersCommand()`: Handle /reminders command (list/delete)
- `handleHelpCommand()`: Handle /help command with usage examples
- `handleAdminCommand()`: Handle /admin command with reminder management
- `handleMessage()`: Handle regular text messages

### `index.ts`
Main entry point:
- Clean bot initialization with all command handlers
- Scheduled event handler for background reminder processing
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

### For All Users
- `/start` - Welcome message and user registration
- `/help` - Complete help with examples and usage instructions
- `/chatid` - Get your Telegram chat ID
- `/remind <natural language>` - Create reminders using natural language
  - Examples:
    - `/remind me to call mom tomorrow at 7pm`
    - `/remind me to submit report Friday at 2pm`
    - `/remind me to water plants this evening`
- `/reminders` - List all your active reminders
- `/reminders delete <id>` - Delete a specific reminder

### For Administrators Only
- `/stats` - Get bot statistics (admin only)
- `/report` - Get bot report (admin only, same as stats)
- `/admin reminders` - View all reminders from all users
- `/admin reminders <user_id>` - View reminders for specific user

## Natural Language Processing

The bot uses the `chrono-node` library to parse natural language date/time expressions:

- **Supported formats**: "tomorrow", "next Friday", "in 2 hours", "March 15th at 3pm", etc.
- **Timezone handling**: All parsing respects user's timezone (default: Asia/Tehran)
- **Confidence levels**: Bot asks for confirmation when parsing confidence is low
- **Past date detection**: Automatically rejects or warns about past dates
- **Future date bias**: Uses `forwardDate: true` to prefer future interpretations

## Background Processing

The reminder system uses Cloudflare Workers' cron triggers:

- **Frequency**: Runs every minute to check for due reminders
- **Processing**: Identifies reminders scheduled for current time or earlier
- **Delivery**: Sends reminders via Telegram Bot API
- **Cleanup**: Marks sent reminders to prevent duplicate delivery
- **Error handling**: Graceful handling of delivery failures with logging
