import { TelegramExecutionContext } from '@codebam/cf-workers-telegram-bot';
import { Environment } from './types.js';
import { upsertUser, logInteraction } from './database.js';
import { isAdmin, generateStatsReport } from './admin.js';
import { t } from './i18n.js';
import {
	parseReminderText,
	createReminder,
	getUserReminders,
	deleteReminder,
	getUserTimezone,
	formatRemindersList,
	formatDateForUser,
	getAdminRemindersView,
	stopRecurringReminder
} from './reminder-utils.js';

export async function handleStartCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
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

				await context.reply(t('greetings.start'), 'MarkdownV2');
				break;

			default:
				break;
		}
	} catch (error) {
		console.error('Error handling start command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage, 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleChatIdCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
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

			// Log interaction for /chatid command
			await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/chatid');

			await context.reply(t('commands.chat_id', { userId: user.id.toString() }), 'MarkdownV2');
		}
	} catch (error) {
		console.error('Error handling chatid command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage, 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleStatsCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
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
			if (isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
				const statsMessage = await generateStatsReport(env.bot_users_db);
				await context.reply(statsMessage, 'MarkdownV2');

				// Log interaction for /stats command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/stats');
			} else {
				await context.reply(t('errors.admin_only'), 'MarkdownV2');
			}
		}
	} catch (error) {
		console.error('Error handling stats command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage, 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleReportCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
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

			// Check if this is the admin requesting report
			if (isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
				const statsMessage = await generateStatsReport(env.bot_users_db);
				await context.reply(statsMessage, 'MarkdownV2');

				// Log interaction for /report command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/report');
			} else {
				await context.reply(t('errors.admin_only'), 'MarkdownV2');
			}
		}
	} catch (error) {
		console.error('Error handling report command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage, 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleMessage(context: TelegramExecutionContext, env: Environment): Promise<Response> {
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

			// Log interaction
			await logInteraction(env.bot_users_db, user.id, 'message', message?.text);

			// Regular bot response (only for non-command messages)
			const text = message?.text?.toLowerCase();
			if (!text?.startsWith('/')) {
				await context.reply(t('greetings.default_message'), 'MarkdownV2');
			}
		}
	} catch (error) {
		console.error('Error handling message:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage, 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleRemindCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/remind');

		// Get user's timezone
		const userTimezone = await getUserTimezone(env.bot_users_db, user.id);

		// Parse the reminder text
		const parsed = parseReminderText(text, userTimezone);

		if (!parsed) {
			await context.reply(t('reminders.parsing_failed'), 'MarkdownV2');
			return new Response('ok');
		}

		// Check if the parsed date is in the past for non-recurring reminders
		const now = new Date();
		if (!parsed.isRecurring && parsed.scheduledAt <= now) {
			await context.reply(t('reminders.past_date'), 'MarkdownV2');
			return new Response('ok');
		}

		// Create the reminder directly
		if (parsed.isRecurring && parsed.recurrencePattern) {
			await createReminder(
				env.bot_users_db,
				user.id,
				parsed.task,
				parsed.scheduledAt,
				userTimezone,
				true,
				parsed.recurrencePattern
			);
		} else {
			await createReminder(
				env.bot_users_db,
				user.id,
				parsed.task,
				parsed.scheduledAt,
				userTimezone
			);
		}

		// Send success message
		let successMessage = '';
		if (parsed.isRecurring && parsed.recurrencePattern) {
			successMessage = t('reminders.recurring_created_successfully', {
				interval: `${parsed.recurrencePattern.value} ${parsed.recurrencePattern.unit}`
			});
		} else {
			successMessage = t('reminders.created_successfully');
		}

		await context.reply(successMessage, 'MarkdownV2');

	} catch (error) {
		console.error('Error handling remind command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.reminder_creation_failed', { error: errorMessage }), 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleRemindersCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/reminders');

		// Parse command arguments
		const args = text.split(' ').slice(1); // Remove '/reminders'

		if (args.length === 0) {
			// List all reminders
			const reminders = await getUserReminders(env.bot_users_db, user.id);
			const formattedList = formatRemindersList(reminders);
			await context.reply(formattedList, 'MarkdownV2');
		} else if (args[0] === 'delete' && args[1]) {
			// Delete specific reminder
			const reminderId = parseInt(args[1]);
			if (isNaN(reminderId)) {
				await context.reply(t('errors.invalid_reminder_id', { example: '123' }), 'MarkdownV2');
				return new Response('ok');
			}

			// Check if this is a recurring reminder
			const reminderCheck = await env.bot_users_db
				.prepare('SELECT is_recurring FROM reminders WHERE id = ? AND telegram_id = ?')
				.bind(reminderId, user.id)
				.first() as { is_recurring: boolean } | null;

			let success = false;
			if (reminderCheck?.is_recurring) {
				// For recurring reminders, stop all future occurrences
				success = await stopRecurringReminder(env.bot_users_db, reminderId, user.id);
				if (success) {
					await context.reply(t('reminders.recurring_stopped_successfully', { reminderId: reminderId.toString() }), 'MarkdownV2');
				} else {
					await context.reply(t('errors.reminder_delete_failed', { reminderId: reminderId.toString() }), 'MarkdownV2');
				}
			} else {
				// For regular reminders, delete normally
				success = await deleteReminder(env.bot_users_db, reminderId, user.id);
				if (success) {
					await context.reply(t('reminders.deleted_successfully', { reminderId: reminderId.toString() }), 'MarkdownV2');
				} else {
					await context.reply(t('errors.reminder_delete_failed', { reminderId: reminderId.toString() }), 'MarkdownV2');
				}
			}
		} else if (args[0] === 'stop' && args[1]) {
			// Stop recurring reminder (alias for delete for recurring reminders)
			const reminderId = parseInt(args[1]);
			if (isNaN(reminderId)) {
				await context.reply(t('errors.invalid_reminder_id', { example: '123' }), 'MarkdownV2');
				return new Response('ok');
			}

			const success = await stopRecurringReminder(env.bot_users_db, reminderId, user.id);
			if (success) {
				await context.reply(t('reminders.recurring_stopped_successfully', { reminderId: reminderId.toString() }), 'MarkdownV2');
			} else {
				await context.reply(t('errors.reminder_delete_failed', { reminderId: reminderId.toString() }), 'MarkdownV2');
			}
		} else {
			await context.reply(t('reminders_commands.title') + t('reminders_commands.commands'), 'MarkdownV2');
		}

	} catch (error) {
		console.error('Error handling reminders command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }), 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleHelpCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/help');

		const helpMessage = t('help.title') +
			t('help.examples_title') +
			t('help.examples') +
			t('help.parsing_info') +
			t('help.other_commands_title') +
			t('help.other_commands') +
			(isAdmin(user.id.toString(), env.ADMIN_CHAT_ID) ?
				t('help.admin_commands_title') + t('help.admin_commands') : '') +
			t('help.tips_title') +
			t('help.tips');

		await context.reply(helpMessage, 'MarkdownV2');

	} catch (error) {
		console.error('Error handling help command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }), 'MarkdownV2');
	}
	return new Response('ok');
}

export async function handleAdminCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Check if user is admin
		if (!isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
			await context.reply(t('errors.admin_only'), 'MarkdownV2');
			return new Response('ok');
		}

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/admin');

		// Parse command arguments
		const args = text.split(' ').slice(1); // Remove '/admin'

		if (args.length === 0) {
			await context.reply(t('admin.commands_title') + t('admin.commands_list'), 'MarkdownV2');
		} else if (args[0] === 'reminders') {
			if (args[1]) {
				// Show reminders for specific user
				const userId = parseInt(args[1]);
				if (isNaN(userId)) {
					await context.reply(t('errors.invalid_user_id', { example: '123456789' }), 'MarkdownV2');
					return new Response('ok');
				}

				const remindersView = await getAdminRemindersView(env.bot_users_db, userId);
				await context.reply(remindersView, 'MarkdownV2');
			} else {
				// Show all reminders
				const remindersView = await getAdminRemindersView(env.bot_users_db);
				await context.reply(remindersView, 'MarkdownV2');
			}
		} else {
			await context.reply(t('errors.unknown_admin_command'), 'MarkdownV2');
		}

	} catch (error) {
		console.error('Error handling admin command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }), 'MarkdownV2');
	}
	return new Response('ok');
}
