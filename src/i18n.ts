import * as localeData from './locale/en.json';
const locale = localeData as any;

/**
 * Translation function that retrieves localized strings with parameter substitution
 * @param key - Dot-separated key path (e.g., 'errors.generic', 'reminders.created_successfully')
 * @param params - Object with parameters to substitute in the string
 * @returns Localized string with parameters substituted
 */
export function t(key: string, params: Record<string, string | number> = {}): string {
	try {
		// Navigate through the nested locale object using the key path
		const keys = key.split('.');
		let value: any = locale;

		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = value[k];
			} else {
				// Fallback to the key itself if not found
				console.warn(`Translation key not found: ${key}`);
				return key;
			}
		}

		if (typeof value !== 'string') {
			console.warn(`Translation value is not a string: ${key}`);
			return key;
		}

		// Replace parameters in the string
		let result = value;
		Object.entries(params).forEach(([param, val]) => {
			const placeholder = `{${param}}`;
			result = result.replace(new RegExp(placeholder, 'g'), String(val));
		});

		return result;
	} catch (error) {
		console.error(`Error in translation function for key ${key}:`, error);
		return key;
	}
}

/**
 * Helper function to get nested object value by dot notation
 */
function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

export default t;
