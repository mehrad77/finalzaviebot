# Telegram Bot with User Analytics & Natural Language Reminders

This is a Telegram bot built with Cloudflare Workers and D1 database that tracks user interactions, provides analytics for administrators, and offers a powerful natural language reminder system with support for **recurring reminders**.

## Features

- **User Tracking**: Automatically registers and tracks all users who interact with the bot
- **Admin Reports**: Provides detailed statistics for administrators
- **User Analytics**: Tracks interaction counts, first/last seen dates, and user information
- **Natural Language Reminders**: Set, manage, and receive reminders using natural language
- **Recurring Reminders**: Set reminders that repeat automatically (hourly, daily, weekly, etc.)
- **Database Storage**: Uses Cloudflare D1 for persistent data storage
- **Scheduled Processing**: Automatic reminder delivery and recurring reminder creation via cron jobs

## Setup

### Prerequisites

- Cloudflare account
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Node.js and npm installed

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your D1 database:
   ```bash
   npx wrangler d1 create bot-users-db
   ```

4. Update `wrangler.toml` with your database ID (this should be done automatically)

5. Initialize the database schema:
   ```bash
   # For local development
   npx wrangler d1 execute bot-users-db --local --file=./schema.sql

   # For production
   npx wrangler d1 execute bot-users-db --remote --file=./schema.sql
   ```

6. Set up your environment variables:
   ```bash
   # Set your Telegram bot token
   npx wrangler secret put SECRET_TELEGRAM_API_TOKEN

   # Set the admin chat ID (your Telegram user ID)
   npx wrangler secret put ADMIN_CHAT_ID
   ```

7. Deploy the bot:
   ```bash
   npm run deploy
   ```

## Configuration

### Environment Variables

- `SECRET_TELEGRAM_API_TOKEN`: Your Telegram bot token from BotFather
- `ADMIN_CHAT_ID`: The Telegram user ID of the admin who can access reports

### Finding Your Telegram User ID

To find your Telegram user ID:
1. Start a chat with [@userinfobot](https://t.me/userinfobot)
2. Send any message
3. The bot will reply with your user ID
4. Use this ID as the `ADMIN_CHAT_ID` environment variable

## Usage

### For Regular Users

- Send `/start` to begin interacting with the bot
- Send `/help` to see all available commands and examples
- Send any message to interact with the bot (bot responds with "yalan dunya!")

#### Reminder Commands

- `/remind me to <task> <time>` - Create a new reminder using natural language
  - **One-time reminders:**
    - `/remind me to call mom tomorrow at 7pm`
    - `/remind me to submit the report Friday at 2pm`
    - `/remind me to water plants this evening`
    - `/remind me to renew license on March 15th`
    - `/remind me to check status in 2 weeks`

  - **Recurring reminders:**
    - `/remind me to drink water every 3 hours`
    - `/remind me to check emails every day at 9am`
    - `/remind me to backup files weekly`
    - `/remind me to take medication every 6 hours`
    - `/remind me to stretch every 30 minutes`
    - `/remind me to water plants daily`
    - `/remind me to review goals monthly`

- `/reminders` - View all your active reminders (both one-time and recurring)
- `/reminders delete <id>` - Delete a specific one-time reminder
- `/reminders stop <id>` - Stop a recurring reminder and all future occurrences

The bot understands natural language date/time expressions and recurring patterns:
1. **Recurring patterns:** "every X hours/minutes/days/weeks/months", "daily", "weekly", "hourly", "monthly"
2. Parse your request and extract the task, timing, and recurrence
3. Create the reminder immediately
4. Send you reminders at the specified intervals
5. Automatically create the next occurrence after each reminder is sent
6. Handle timezone conversion (default: Asia/Tehran)

#### Recurring Reminders

The bot supports powerful recurring reminders with these features:

**Supported Patterns:**
- `every X minutes/hours/days/weeks/months` (e.g., "every 30 minutes", "every 2 days")
- `daily`, `hourly`, `weekly`, `monthly` (shorthand for "every 1 day/hour/week/month")

**Examples:**
- Health & Wellness: `/remind me to drink water every 2 hours`
- Work & Productivity: `/remind me to take a break every 90 minutes`
- Daily Routines: `/remind me to check emails daily at 9am`
- Weekly Tasks: `/remind me to backup files every Sunday`
- Medication: `/remind me to take vitamins every day at 8am`

**How Recurring Reminders Work:**
1. After sending each reminder, the bot automatically creates the next occurrence
2. Recurring reminders continue indefinitely until you stop them
3. Use `/reminders stop <id>` to stop a recurring reminder and all future occurrences
4. The bot tracks how many times each recurring reminder has been sent
5. You can view all active recurring reminders with `/reminders`

**Managing Recurring Reminders:**
- View with indicators: Recurring reminders show 🔄 and pattern info (e.g., "every 3 hours [5 times]")
- Stop individual recurring reminders: `/reminders stop 123`
- Admin view: Admins can see all recurring reminders across users

### For Administrators

When you're set as the admin (via `ADMIN_CHAT_ID`), you can use these commands:

#### Standard Admin Commands
- `/stats` - Get comprehensive bot statistics
- `/report` - Same as `/stats`, shows detailed analytics

#### Reminder Admin Commands
- `/admin reminders` - View all active reminders from all users
- `/admin reminders <user_id>` - View all reminders for a specific user

### Admin Report Includes:

- 👥 Total number of users
- 🆕 New users today
- 📅 New users this week
- 🟢 Active users today
- 💬 Total interactions
- 🏆 Top 5 users by interaction count

### Admin Reminder Reports Include:

- 📋 All active reminders across users
- 👤 User information (name, ID) for each reminder
- ⏰ Scheduled times with timezone information
- ⚠️ Overdue reminder indicators
- 🆔 Reminder IDs for management

## Database Schema

The bot uses three main tables:

### Users Table
- `telegram_id`: Unique Telegram user ID
- `username`: Telegram username
- `first_name`: User's first name
- `language_code`: User's language preference
- `timezone`: User's timezone for reminder parsing (default: Asia/Tehran)
- `is_bot`: Whether the user is a bot
- `first_seen_at`: When user first interacted
- `last_seen_at`: Last interaction timestamp
- `interaction_count`: Total number of interactions

### Interactions Table
- `telegram_id`: Reference to user
- `message_type`: Type of message (start, message, etc.)
- `message_text`: Content of the message
- `command`: Command used (if any)
- `created_at`: Timestamp of interaction

### Reminders Table
- `telegram_id`: Reference to user
- `task_description`: What to be reminded about
- `scheduled_at`: When to send the reminder (UTC)
- `timezone`: User's timezone for display
- `is_active`: Whether reminder is still active
- `is_sent`: Whether reminder has been delivered
- `is_recurring`: Whether this is a recurring reminder
- `recurrence_pattern`: JSON pattern for recurring reminders (e.g., `{"type": "interval", "value": 3, "unit": "hours"}`)
- `parent_reminder_id`: Links recurring instances to their parent reminder
- `last_occurrence_at`: When the last occurrence was sent (for recurring reminders)
- `max_occurrences`: Optional limit on total occurrences
- `occurrence_count`: How many times this recurring reminder has been sent
- `recurrence_end_date`: Optional end date for recurring reminders
- `created_at`: When reminder was created

## Development

### Local Development

```bash
# Start local development server
npm run dev

# Run tests
npm run test
```

### Database Management

```bash
# Query local database
npx wrangler d1 execute bot-users-db --local --command "SELECT * FROM users LIMIT 5"

# Query remote database
npx wrangler d1 execute bot-users-db --remote --command "SELECT * FROM users LIMIT 5"

# View all users
npx wrangler d1 execute bot-users-db --local --command "SELECT telegram_id, username, first_name, interaction_count, first_seen_at FROM users ORDER BY interaction_count DESC"
```

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Security Notes

- The bot automatically tracks all users who interact with it
- Only the designated admin can access statistics
- Sensitive data like bot tokens are stored as Cloudflare secrets
- Database queries use prepared statements to prevent SQL injection

## Troubleshooting

### Common Issues

1. **Database not found**: Make sure you've created the D1 database and updated the `wrangler.toml`
2. **Admin commands not working**: Verify your `ADMIN_CHAT_ID` is set correctly
3. **Bot not responding**: Check that `SECRET_TELEGRAM_API_TOKEN` is set and valid

### Checking Logs

```bash
# View worker logs
npx wrangler tail
```

## License

This project is licensed under the MIT License.
