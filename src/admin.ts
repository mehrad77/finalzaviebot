import { UserStats } from './types.js';
import { getUserStats, getTopUsers } from './database.js';
import { t } from './i18n.js';

export function formatStatsMessage(stats: UserStats, topUsers: any[]): string {
	let message = t('admin.stats_title');
	message += t('admin.total_users', { count: stats.total_users });
	message += t('admin.new_users_today', { count: stats.new_users_today });
	message += t('admin.new_users_week', { count: stats.new_users_this_week });
	message += t('admin.active_users_today', { count: stats.active_users_today });
	message += t('admin.total_interactions', { count: stats.total_interactions });

	if (topUsers.length > 0) {
		message += t('admin.top_users_title');
		topUsers.forEach((user, index) => {
			const name = user.first_name || user.username || `User ${user.telegram_id}`;
			message += t('admin.top_user_item', {
				index: index + 1,
				name: name,
				count: user.interaction_count
			});
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
