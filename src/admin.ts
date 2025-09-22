import { UserStats } from './types.js';
import { getUserStats, getTopUsers } from './database.js';

export function formatStatsMessage(stats: UserStats, topUsers: any[]): string {
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

export function isAdmin(userId: string, adminChatId?: string): boolean {
	return Boolean(adminChatId && userId === adminChatId);
}

export async function generateStatsReport(db: D1Database): Promise<string> {
	const stats = await getUserStats(db);
	const topUsers = await getTopUsers(db, 5);
	return formatStatsMessage(stats, topUsers);
}
