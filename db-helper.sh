#!/bin/bash

# Database management helper script for the Telegram bot

DB_NAME="bot-users-db"

case "$1" in
    "init-local")
        echo "Initializing local database..."
        npx wrangler d1 execute $DB_NAME --local --file=./schema.sql
        ;;
    "init-remote")
        echo "Initializing remote database..."
        npx wrangler d1 execute $DB_NAME --remote --file=./schema.sql
        ;;
    "users")
        echo "Fetching users..."
        npx wrangler d1 execute $DB_NAME --local --command "SELECT telegram_id, username, first_name, interaction_count, first_seen_at, last_seen_at FROM users ORDER BY interaction_count DESC LIMIT 10;"
        ;;
    "stats")
        echo "Getting database stats..."
        npx wrangler d1 execute $DB_NAME --local --command "SELECT COUNT(*) as total_users FROM users;"
        npx wrangler d1 execute $DB_NAME --local --command "SELECT COUNT(*) as total_interactions FROM interactions;"
        ;;
    "clear")
        echo "WARNING: This will delete all data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx wrangler d1 execute $DB_NAME --local --command "DELETE FROM interactions;"
            npx wrangler d1 execute $DB_NAME --local --command "DELETE FROM users;"
            echo "All data cleared."
        fi
        ;;
    *)
        echo "Usage: $0 {init-local|init-remote|users|stats|clear}"
        echo "  init-local  - Initialize local database with schema"
        echo "  init-remote - Initialize remote database with schema"
        echo "  users       - Show top 10 users by interaction count"
        echo "  stats       - Show database statistics"
        echo "  clear       - Clear all data (local only)"
        exit 1
        ;;
esac
