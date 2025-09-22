# Telegram Bot with User Analytics

This is a Telegram bot built with Cloudflare Workers and D1 database that tracks user interactions and provides analytics for administrators.

## Features

- **User Tracking**: Automatically registers and tracks all users who interact with the bot
- **Admin Reports**: Provides detailed statistics for administrators
- **User Analytics**: Tracks interaction counts, first/last seen dates, and user information
- **Database Storage**: Uses Cloudflare D1 for persistent data storage

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
- Send any message to interact with the bot
- The bot will respond with "yalan dunya!" to all messages

### For Administrators

When you're set as the admin (via `ADMIN_CHAT_ID`), you can use these commands:

- `/stats` - Get comprehensive bot statistics
- `/report` - Same as `/stats`, shows detailed analytics

### Admin Report Includes:

- 👥 Total number of users
- 🆕 New users today
- 📅 New users this week
- 🟢 Active users today
- 💬 Total interactions
- 🏆 Top 5 users by interaction count

## Database Schema

The bot uses two main tables:

### Users Table
- `telegram_id`: Unique Telegram user ID
- `username`: Telegram username
- `first_name`: User's first name
- `language_code`: User's language preference
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
