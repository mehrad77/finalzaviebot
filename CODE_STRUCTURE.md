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
- `Reminder`: Reminder data structure with recurring fields
- `RecurrencePattern`: Structure for recurring reminder patterns
- `ParsedReminderData`: Parsed reminder with recurring information

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
Natural language reminder processing and management (enhanced with recurring support):
- **Parsing Functions:**
  - `parseReminderText()`: Parse natural language into structured reminder data (with recurring support)
  - `parseRecurrencePattern()`: Extract recurring patterns from text ("every 3 hours", "daily", etc.)
- **Database Functions:**
  - `createReminder()`: Store reminder in database (supports recurring reminders)
  - `getUserReminders()`: Get user's active reminders (including recurring info)
  - `deleteReminder()`: Remove a user's reminder
  - `getDueReminders()`: Get reminders ready to be sent
  - `markReminderAsSent()`: Mark reminder as delivered
- **Recurring Management Functions:**
  - `calculateNextOccurrence()`: Calculate next occurrence time for recurring reminders
  - `createNextRecurrence()`: Create the next instance of a recurring reminder
  - `stopRecurringReminder()`: Stop a recurring reminder and all future occurrences
- **Formatting Functions:**
  - `formatRemindersList()`: Format reminders for display (shows recurring indicators)
  - `formatDateForUser()`: Format dates in user's timezone
  - `getAdminRemindersView()`: Generate admin view of all reminders (with recurring info)

### `scheduler.ts`
Background job processing for reminder delivery (enhanced for recurring reminders):
- `processDueReminders()`: Main processing loop that:
  - Finds and sends due reminders
  - Creates next occurrences for recurring reminders
  - Tracks success/failure rates
- `handleScheduledEvent()`: Cloudflare Worker cron event handler
- `sendReminder()`: Send reminder via Telegram API

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
- `/remind <natural language>` - Create reminders using natural language (including recurring)
  - **One-time examples:**
    - `/remind me to call mom tomorrow at 7pm`
    - `/remind me to submit report Friday at 2pm`
    - `/remind me to water plants this evening`
  - **Recurring examples:**
    - `/remind me to drink water every 3 hours`
    - `/remind me to check emails daily at 9am`
    - `/remind me to backup files weekly`
- `/reminders` - List all your active reminders (shows recurring indicators)
- `/reminders delete <id>` - Delete a specific one-time reminder
- `/reminders stop <id>` - Stop a recurring reminder and all future occurrences

### For Administrators Only
- `/stats` - Get bot statistics (admin only)
- `/report` - Get bot report (admin only, same as stats)
- `/admin reminders` - View all reminders from all users
- `/admin reminders <user_id>` - View reminders for specific user

## Natural Language Processing

The bot uses the `chrono-node` library to parse natural language date/time expressions:

- **Supported formats**: "tomorrow", "next Friday", "in 2 hours", "March 15th at 3pm", etc.
- **Timezone handling**: All parsing respects user's timezone (default: Asia/Tehran)
- **Recurring patterns**: Custom parsing for patterns like "every 3 hours", "daily", "weekly"

## Recurring Reminders Architecture

### Pattern Recognition
The bot recognizes several recurring patterns:

1. **Interval patterns**: `every X units` (e.g., "every 3 hours", "every 30 minutes")
2. **Simple patterns**: `every unit` (e.g., "every hour", "every day")
3. **Frequency patterns**: `daily`, `hourly`, `weekly`, `monthly`

### Data Structure
```typescript
interface RecurrencePattern {
  type: 'interval';
  value: number;          // e.g., 3
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}
```

### Database Schema Extensions
The reminders table includes these additional fields for recurring functionality:
- `is_recurring`: Boolean flag
- `recurrence_pattern`: JSON string storing the RecurrencePattern
- `parent_reminder_id`: Links occurrences to the original recurring reminder
- `last_occurrence_at`: Tracks when the last occurrence was sent
- `occurrence_count`: Counts how many times the reminder has been sent
- `max_occurrences`: Optional limit (future enhancement)
- `recurrence_end_date`: Optional end date (future enhancement)

### Processing Flow

1. **Parsing**:
   - `parseRecurrencePattern()` extracts recurring patterns from text
   - `parseReminderText()` handles both time and recurrence parsing
   - Task extraction removes recurring keywords from the final task description

2. **Creation**:
   - Recurring reminders are stored with `is_recurring: true`
   - Pattern is serialized to JSON in `recurrence_pattern` field
   - First occurrence uses the parsed date/time

3. **Execution**:
   - `processDueReminders()` finds and sends due reminders
   - After sending, `createNextRecurrence()` calculates and creates the next occurrence
   - `calculateNextOccurrence()` uses the pattern to determine the next time

4. **Management**:
   - `/reminders` shows recurring indicators (🔄) and occurrence counts
   - `/reminders stop <id>` stops recurring reminders completely
   - Admin views show recurring information across all users

### Benefits of This Architecture

1. **Scalable**: Each occurrence is a separate database row, allowing independent tracking
2. **Flexible**: Easy to add new recurring pattern types
3. **Reliable**: Failed occurrences don't affect future ones
4. **Auditable**: Full history of occurrences is maintained
5. **User-friendly**: Natural language patterns ("every 3 hours") are intuitive

### Future Enhancements
- **Max occurrences**: Limit total number of recurring instances
- **End dates**: Stop recurring reminders after a specific date
- **Smart scheduling**: Skip weekends, holidays, or sleeping hours
- **Frequency adjustment**: Allow users to modify existing recurring patterns
- **Past date detection**: Automatically rejects or warns about past dates
- **Future date bias**: Uses `forwardDate: true` to prefer future interpretations

## Background Processing

The reminder system uses Cloudflare Workers' cron triggers:

- **Frequency**: Runs every minute to check for due reminders
- **Processing**: Identifies reminders scheduled for current time or earlier
- **Delivery**: Sends reminders via Telegram Bot API
- **Cleanup**: Marks sent reminders to prevent duplicate delivery
- **Error handling**: Graceful handling of delivery failures with logging
