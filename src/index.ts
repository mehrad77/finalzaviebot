import TelegramBot, { TelegramExecutionContext } from '@codebam/cf-workers-telegram-bot';

interface Environment {
	SECRET_TELEGRAM_API_TOKEN: string;
	ADMIN_CHAT_ID: string;
	bot_users_db: D1Database;
}

interface User {
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

interface UserStats {
	total_users: number;
	new_users_today: number;
	new_users_this_week: number;
	active_users_today: number;
	total_interactions: number;
}

// Database helper functions
async function upsertUser(db: D1Database, user: User): Promise<void> {
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
				SET username = ?, first_name = ?, last_name = ?, language_code = ?,
					last_seen_at = ?, interaction_count = interaction_count + 1, updated_at = ?
				WHERE telegram_id = ?
			`)
			.bind(
				user.username || null,
				user.first_name || null,
				user.last_name || null,
				user.language_code || null,
				now,
				now,
				user.telegram_id
			)
			.run();
	} else {
		// Insert new user
		await db
			.prepare(`
				INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_bot, first_seen_at, last_seen_at, interaction_count)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
			`)
			.bind(
				user.telegram_id,
				user.username || null,
				user.first_name || null,
				user.last_name || null,
				user.language_code || null,
				user.is_bot || false,
				now,
				now
			)
			.run();
	}
}

async function logInteraction(db: D1Database, telegramId: number, messageType: string, messageText?: string, command?: string): Promise<void> {
	await db
		.prepare(`
			INSERT INTO interactions (telegram_id, message_type, message_text, command)
			VALUES (?, ?, ?, ?)
		`)
		.bind(telegramId, messageType, messageText || null, command || null)
		.run();
}

async function getUserStats(db: D1Database): Promise<UserStats> {
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

async function getTopUsers(db: D1Database, limit: number = 10): Promise<any[]> {
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

function formatStatsMessage(stats: UserStats, topUsers: any[]): string {
	let message = `📊 *Bot Statistics*\n\n`;
	message += `👥 Total Users: ${stats.total_users}\n`;
	message += `🆕 New Users Today: ${stats.new_users_today}\n`;
	message += `📅 New Users This Week: ${stats.new_users_this_week}\n`;
	message += `🟢 Active Users Today: ${stats.active_users_today}\n`;
	message += `💬 Total Interactions: ${stats.total_interactions}\n\n`;

	if (topUsers.length > 0) {
		message += `🏆 *Top Users by Interactions:*\n`;
		topUsers.forEach((user, index) => {
			const name = user.first_name || user.username || `User ${user.telegram_id}`;
			message += `${index + 1}. ${name}: ${user.interaction_count} interactions\n`;
		});
	}

	return message;
}

export default {
	async fetch(request: Request, env: Environment, ctx: ExecutionContext): Promise<Response> {
		const bot = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN);

		await bot
			.on('start', async function(context: TelegramExecutionContext) {
				try {
					switch (context.update_type) {
						case 'message':
							const update = context.update;
							const message = update?.message;
							const user = message?.from;

							if (user) {
								// Save/update user in database
								await upsertUser(env.bot_users_db, {
									telegram_id: user.id,
									username: user.username,
									first_name: user.first_name,
									language_code: user.language_code,
									is_bot: user.is_bot,
								});

								// Log interaction
								await logInteraction(env.bot_users_db, user.id, 'start', message?.text, '/start');
							}

							await context.reply('yalan dunya!');
							break;

						default:
							break;
					}
				} catch (error) {
					console.error('Error handling start command:', error);
					const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
					await context.reply(errorMessage);
				}
				return new Response('ok');
			})
			.on('message', async function(context: TelegramExecutionContext) {
				try {
					const update = context.update;
					const message = update?.message;
					const user = message?.from;

					if (user) {
						// Save/update user in database
						await upsertUser(env.bot_users_db, {
							telegram_id: user.id,
							username: user.username,
							first_name: user.first_name,
							language_code: user.language_code,
							is_bot: user.is_bot,
						});

						// Check if this is the admin requesting stats
						if (env.ADMIN_CHAT_ID && user.id.toString() === env.ADMIN_CHAT_ID) {
							const text = message?.text?.toLowerCase();
							if (text === '/stats' || text === '/report') {
								const stats = await getUserStats(env.bot_users_db);
								const topUsers = await getTopUsers(env.bot_users_db, 5);
								const statsMessage = formatStatsMessage(stats, topUsers);
								await context.reply(statsMessage);
								return new Response('ok');
							}
						}

						// Log interaction
						await logInteraction(env.bot_users_db, user.id, 'message', message?.text);

						// Regular bot response
						await context.reply('yalan dunya!');
					}
				} catch (error) {
					console.error('Error handling message:', error);
					const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
					await context.reply(errorMessage);
				}
				return new Response('ok');
			})
			.handle(request.clone());

		return new Response('yalan dunya!');
	},
};
