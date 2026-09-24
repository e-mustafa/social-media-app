import { ENV } from '../../config/env.config';

export const formatFilePath = (filePath: string): string | null => {
	if (filePath) {
		if (filePath.startsWith('http')) return filePath;

		return `${ENV.appUrl}/${filePath.replace(/\\/g, '/')}`;
	}
	return null;
};
