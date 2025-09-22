export interface Environment {
	SECRET_TELEGRAM_API_TOKEN: string;
	ADMIN_CHAT_ID: string;
	bot_users_db: D1Database;
}

export interface User {
	id?: number;
	telegram_id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
	language_code?: string;
	is_bot?: boolean;
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
