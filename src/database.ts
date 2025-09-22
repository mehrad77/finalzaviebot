import { User, UserStats } from './types.js';

// Database helper functions
export async function upsertUser(db: D1Database, user: User): Promise<void> {
	const now = new Date().toISOString();

	// Try to get existing user
	const existingUser = await db
		.prepare('SELECT * FROM users WHERE telegram_id = ?')
		.bind(user.telegram_id)
		.first();

	if (existingUser) {
		// Update existing user
		await db
			.prepare(`
				UPDATE users
				SET username = ?, first_name = ?, last_name = ?, language_code = ?, timezone = ?,
					last_seen_at = ?, interaction_count = interaction_count + 1, updated_at = ?
				WHERE telegram_id = ?
			`)
			.bind(
				user.username || null,
				user.first_name || null,
				user.last_name || null,
				user.language_code || null,
				user.timezone || 'Asia/Tehran',
				now,
				now,
				user.telegram_id
			)
			.run();
	} else {
		// Insert new user
		await db
			.prepare(`
				INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_bot, timezone, first_seen_at, last_seen_at, interaction_count)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
			`)
			.bind(
				user.telegram_id,
				user.username || null,
				user.first_name || null,
				user.last_name || null,
				user.language_code || null,
				user.is_bot || false,
				user.timezone || 'Asia/Tehran',
				now,
				now
			)
			.run();
	}
}

export async function logInteraction(db: D1Database, telegramId: number, messageType: string, messageText?: string, command?: string): Promise<void> {
	await db
		.prepare(`
			INSERT INTO interactions (telegram_id, message_type, message_text, command)
			VALUES (?, ?, ?, ?)
		`)
		.bind(telegramId, messageType, messageText || null, command || null)
		.run();
}

export async function getUserStats(db: D1Database): Promise<UserStats> {
	const now = new Date();
	const today = now.toISOString().split('T')[0];
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

	// Get total users
	const totalUsersResult = await db.prepare('SELECT COUNT(*) as count FROM users').first();
	const total_users = totalUsersResult?.count as number || 0;

	// Get new users today
	const newUsersTodayResult = await db
		.prepare('SELECT COUNT(*) as count FROM users WHERE DATE(first_seen_at) = ?')
		.bind(today)
		.first();
	const new_users_today = newUsersTodayResult?.count as number || 0;

	// Get new users this week
	const newUsersWeekResult = await db
		.prepare('SELECT COUNT(*) as count FROM users WHERE first_seen_at >= ?')
		.bind(oneWeekAgo)
		.first();
	const new_users_this_week = newUsersWeekResult?.count as number || 0;

	// Get active users today (users who interacted today)
	const activeUsersTodayResult = await db
		.prepare('SELECT COUNT(*) as count FROM users WHERE DATE(last_seen_at) = ?')
		.bind(today)
		.first();
	const active_users_today = activeUsersTodayResult?.count as number || 0;

	// Get total interactions
	const totalInteractionsResult = await db.prepare('SELECT COUNT(*) as count FROM interactions').first();
	const total_interactions = totalInteractionsResult?.count as number || 0;

	return {
		total_users,
		new_users_today,
		new_users_this_week,
		active_users_today,
		total_interactions,
	};
}

export async function getTopUsers(db: D1Database, limit: number = 10): Promise<any[]> {
	const results = await db
		.prepare(`
			SELECT telegram_id, username, first_name, last_name, interaction_count, first_seen_at, last_seen_at
			FROM users
			ORDER BY interaction_count DESC
			LIMIT ?
		`)
		.bind(limit)
		.all();

	return results.results || [];
}
