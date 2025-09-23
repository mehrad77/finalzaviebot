-- Create users table to store user information
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    is_bot BOOLEAN DEFAULT FALSE,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    interaction_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create interactions table to log each interaction
CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    message_type TEXT,
    message_text TEXT,
    command TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Create reminders table to store user reminders
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    task_description TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    timezone TEXT DEFAULT 'Asia/Tehran',
    is_active BOOLEAN DEFAULT TRUE,
    is_sent BOOLEAN DEFAULT FALSE,
    -- Recurring reminder fields
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT, -- JSON: {"type": "interval", "value": 3, "unit": "hours"}
    parent_reminder_id INTEGER, -- For tracking recurring instances
    last_occurrence_at DATETIME, -- Track when last occurrence was sent
    max_occurrences INTEGER, -- Optional limit on total occurrences
    occurrence_count INTEGER DEFAULT 0, -- Track how many times it has occurred
    recurrence_end_date DATETIME, -- Optional end date for recurring reminders
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
    FOREIGN KEY (parent_reminder_id) REFERENCES reminders (id)
);

-- Add timezone column to users table for personalized parsing
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Asia/Tehran';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_interactions_telegram_id ON interactions (telegram_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions (created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_reminders_telegram_id ON reminders (telegram_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_active_sent ON reminders (is_active, is_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (scheduled_at, is_active, is_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_recurring ON reminders (is_recurring, is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_parent ON reminders (parent_reminder_id);
