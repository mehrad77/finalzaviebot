export interface Environment {
	SECRET_TELEGRAM_API_TOKEN: string;
	ADMIN_CHAT_ID: string;
	bot_users_db: D1Database;
	ai?: Ai;
}

export interface User {
	id?: number;
	telegram_id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
	language_code?: string;
	is_bot?: boolean;
	timezone?: string;
	first_seen_at?: string;
	last_seen_at?: string;
	interaction_count?: number;
}

export interface UserStats {
	total_users: number;
	new_users_today: number;
	new_users_this_week: number;
	active_users_today: number;
	total_interactions: number;
}

export interface Reminder {
	id?: number;
	telegram_id: number;
	task_description: string;
	scheduled_at: string; // ISO string
	timezone: string;
	is_active: boolean;
	is_sent: boolean;
	// Recurring reminder fields
	is_recurring: boolean;
	recurrence_pattern?: string; // JSON string
	parent_reminder_id?: number;
	last_occurrence_at?: string;
	max_occurrences?: number;
	occurrence_count?: number;
	recurrence_end_date?: string;
	created_at?: string;
	updated_at?: string;
}

export interface RecurrencePattern {
	type: 'interval';
	value: number;
	unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

export interface ParsedReminderData {
	task: string;
	parsedDate: Date | null;
	confidence: 'high' | 'medium' | 'low';
	originalText: string;
	isPastDate?: boolean;
	// Recurring reminder data
	isRecurring?: boolean;
	recurrencePattern?: RecurrencePattern;
}
