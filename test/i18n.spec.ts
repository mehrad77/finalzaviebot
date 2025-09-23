import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { t } from '../src/i18n.js';

// Mock console methods to test logging behavior
const mockWarn = vi.fn();
const mockError = vi.fn();
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
	console.warn = mockWarn;
	console.error = mockError;
});

afterEach(() => {
	console.warn = originalWarn;
	console.error = originalError;
	mockWarn.mockClear();
	mockError.mockClear();
});

describe('i18n Translation Function', () => {
	describe('Basic Functionality', () => {
		it('should return simple string values without parameters', () => {
			expect(t('greetings.start')).toBe('yalan dunya\\!');
			expect(t('greetings.default_message')).toBe('yalan dunya\\!');
		});

		it('should return string values for nested keys', () => {
			expect(t('errors.admin_only')).toBe('Sorry, this command is only available to administrators\\.');
		});

	});

	describe('Parameter Substitution', () => {
		it('should substitute single parameter', () => {
			const result = t('commands.chat_id', { userId: '123456789' });
			expect(result).toBe('Your chat ID is: `123456789`');
		});


		it('should handle multiple occurrences of same parameter', () => {
			const result = t('admin.admin_reminder_item', {
				index: 1,
				task: 'Test Task',
				userName: 'John',
				userId: 123456789,
				date: 'Tomorrow',
				overdue: '',
				id: '999'
			});
			expect(result).toBe('1\\. **Test Task**\n   👤 User: John \\(123456789\\)\n   📅 Tomorrow\n   🆔 ID: `999`\n\n');
		});

		it('should handle empty parameters object', () => {
			const result = t('greetings.start', {});
			expect(result).toBe('yalan dunya\\!');
		});

		it('should leave unused placeholders if parameter not provided', () => {
			const result = t('commands.chat_id', {}); // No userId parameter
			expect(result).toBe('Your chat ID is: `{userId}`');
		});
	});

	describe('Error Handling', () => {
		it('should return key itself for non-existent keys', () => {
			const result = t('non.existent.key');
			expect(result).toBe('non.existent.key');
			expect(mockWarn).toHaveBeenCalledWith('Translation key not found: non.existent.key');
		});

		it('should return key for partially non-existent nested keys', () => {
			const result = t('greetings.nonexistent');
			expect(result).toBe('greetings.nonexistent');
			expect(mockWarn).toHaveBeenCalledWith('Translation key not found: greetings.nonexistent');
		});

		it('should handle empty key', () => {
			const result = t('');
			expect(result).toBe('');
		});

		it('should handle keys with only dots', () => {
			const result = t('...');
			expect(result).toBe('...');
		});

		it('should handle single character keys', () => {
			const result = t('x');
			expect(result).toBe('x');
		});
	});

	describe('Edge Cases', () => {
		it('should handle special characters in parameters', () => {
			const result = t('errors.generic', { error: 'Connection failed: "timeout"' });
			expect(result).toBe('Sorry, something went wrong: Connection failed: "timeout"');
		});

		it('should handle very long strings', () => {
			const longString = 'a'.repeat(1000);
			const result = t('commands.chat_id', { userId: longString });
			expect(result).toBe(`Your chat ID is: \`${longString}\``);
		});

		it('should handle unicode characters', () => {
			const result = t('commands.chat_id', { userId: '🤖👍💯' });
			expect(result).toBe('Your chat ID is: `🤖👍💯`');
		});
	});

	describe('Real-world Scenarios', () => {
		it('should handle reminder deletion confirmation', () => {
			const result = t('reminders.deleted_successfully', { reminderId: '123' });
			expect(result).toBe('✅ Reminder \\#123 has been deleted\\.');
		});

		it('should handle admin view with user count', () => {
			const result = t('admin.reminders_view_all', { count: 15 });
			expect(result).toBe('🔧 **Admin View: All Active Reminders \\(15\\)**\n\n');
		});

		it('should handle reminder list formatting', () => {
			const result = t('reminders.reminder_item', {
				index: 2,
				task: 'Call dentist',
				date: 'Friday at 2:00 PM',
				overdue: ' ⚠️ (Overdue)',
				id: '456'
			});
			console.log(result)
			expect(result).toBe('2\\. **Call dentist**\n   📅 Friday at 2:00 PM ⚠️ (Overdue)\n   🆔 ID: `456`\n\n');
		});

		it('should handle error messages with context', () => {
			const result = t('errors.reminder_creation_failed', {
				error: 'Database connection timeout'
			});
			expect(result).toBe('Sorry, something went wrong while creating your reminder: Database connection timeout');
		});

	});

	describe('Performance and Consistency', () => {
		it('should return consistent results for same key', () => {
			const result1 = t('greetings.start');
			const result2 = t('greetings.start');
			expect(result1).toBe(result2);
		});

		it('should return consistent results for same key with same parameters', () => {
			const params = { userId: '12345' };
			const result1 = t('commands.chat_id', params);
			const result2 = t('commands.chat_id', params);
			expect(result1).toBe(result2);
		});

	});

});
