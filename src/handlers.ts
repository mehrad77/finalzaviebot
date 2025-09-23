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
	getAdminRemindersView
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

				await context.reply(t('greetings.start'));
				break;

			default:
				break;
		}
	} catch (error) {
		console.error('Error handling start command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage);
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

			await context.reply(t('commands.chat_id', { userId: user.id.toString() }));
		}
	} catch (error) {
		console.error('Error handling chatid command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage);
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
				await context.reply(statsMessage);

				// Log interaction for /stats command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/stats');
			} else {
				await context.reply(t('errors.admin_only'));
			}
		}
	} catch (error) {
		console.error('Error handling stats command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage);
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
				await context.reply(statsMessage);

				// Log interaction for /report command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/report');
			} else {
				await context.reply(t('errors.admin_only'));
			}
		}
	} catch (error) {
		console.error('Error handling report command:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage);
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
				await context.reply(t('greetings.default_message'));
			}
		}
	} catch (error) {
		console.error('Error handling message:', error);
		const errorMessage = t('errors.generic', { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
		await context.reply(errorMessage);
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
			await context.reply(t('reminders.parsing_failed'));
			return new Response('ok');
		}

		// Check if the parsed date is in the past
		const now = new Date();
		if (parsed.scheduledAt <= now) {
			await context.reply(t('reminders.past_date'));
			return new Response('ok');
		}

		// Format the date for confirmation
		const formattedDate = formatDateForUser(parsed.scheduledAt, userTimezone);

		// Generate confirmation message based on confidence level
		let confirmationMessage = t('reminders.confirmation', { task: parsed.task, date: formattedDate });

		if (parsed.confidence === 'low') {
			confirmationMessage += t('reminders.low_confidence_warning');
		}

		confirmationMessage += t('reminders.confirmation_prompt');

		await context.reply(confirmationMessage);

		// Store the parsed reminder temporarily in context for confirmation
		// Since we can't easily store state, we'll store it in the database with a special flag
		// and clean it up later
		const tempReminderId = await createReminder(
			env.bot_users_db,
			user.id,
			`TEMP:${parsed.task}`,
			parsed.scheduledAt,
			userTimezone
		);

		// We'll need to implement a confirmation handler separately
		// For now, let's auto-confirm if confidence is high
		if (parsed.confidence === 'high') {
			// Update the temp reminder to be active
			await env.bot_users_db
				.prepare('UPDATE reminders SET task_description = ?, is_active = TRUE WHERE id = ?')
				.bind(parsed.task, tempReminderId)
				.run();

			await context.reply(t('reminders.created_successfully'));
		}

	} catch (error) {
		console.error('Error handling remind command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.reminder_creation_failed', { error: errorMessage }));
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
			await context.reply(formattedList);
		} else if (args[0] === 'delete' && args[1]) {
			// Delete specific reminder
			const reminderId = parseInt(args[1]);
			if (isNaN(reminderId)) {
				await context.reply(t('errors.invalid_reminder_id', { example: '123' }));
				return new Response('ok');
			}

			const success = await deleteReminder(env.bot_users_db, reminderId, user.id);
			if (success) {
				await context.reply(t('reminders.deleted_successfully', { reminderId: reminderId.toString() }));
			} else {
				await context.reply(t('errors.reminder_delete_failed', { reminderId: reminderId.toString() }));
			}
		} else {
			await context.reply(t('reminders_commands.title') + t('reminders_commands.commands'));
		}

	} catch (error) {
		console.error('Error handling reminders command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }));
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

		await context.reply(helpMessage);

	} catch (error) {
		console.error('Error handling help command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }));
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
			await context.reply(t('errors.admin_only'));
			return new Response('ok');
		}

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/admin');

		// Parse command arguments
		const args = text.split(' ').slice(1); // Remove '/admin'

		if (args.length === 0) {
			await context.reply(t('admin.commands_title') + t('admin.commands_list'));
		} else if (args[0] === 'reminders') {
			if (args[1]) {
				// Show reminders for specific user
				const userId = parseInt(args[1]);
				if (isNaN(userId)) {
					await context.reply(t('errors.invalid_user_id', { example: '123456789' }));
					return new Response('ok');
				}

				const remindersView = await getAdminRemindersView(env.bot_users_db, userId);
				await context.reply(remindersView);
			} else {
				// Show all reminders
				const remindersView = await getAdminRemindersView(env.bot_users_db);
				await context.reply(remindersView);
			}
		} else {
			await context.reply(t('errors.unknown_admin_command'));
		}

	} catch (error) {
		console.error('Error handling admin command:', error);
		const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
		await context.reply(t('errors.generic', { error: errorMessage }));
	}
	return new Response('ok');
}
