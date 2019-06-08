import tde from 'tde';
import * as yup from 'yup';

// Get extension name
export const getExtensionUrl = (...args) => {
	return browser.extension.getURL(...args);
};

// Get extension name
export const getExtensionName = () => {
	return browser.runtime.getManifest().name;
};

// Get extension version
export const getExtensionVersion = () => {
	return browser.runtime.getManifest().version;
};

// Text formatting for simple logging system
const logFormatting = (color) => `
	background: ${color};
	color: #fff;
	padding: 5px;
	margin: 5px;
	border-radius: 2px;
	font-size: 12px;
	font-weight: bold;
`;

// Simple logging function
export const log = {
	info(...text) {
		storage.get((data) => {
			if (data.debugMode) {
				console.log('%cINFO', logFormatting('#03A9F4'), ...text);
			}
		});
	},
	warning(...text) {
		storage.get((data) => {
			if (data.debugMode) {
				console.log('%cWARNING', logFormatting('#FFC107'), ...text);
			}
		});
	},
	error(...text) {
		storage.get((data) => {
			if (data.debugMode) {
				console.log('%cERROR', logFormatting('#f44336'), ...text);
			}
		});
	},
};

// Get localization
export const getLocale = (msg) => {
	const string = browser.i18n.getMessage(msg);

	if (string === '') {
		throw new Error(`No Message found for "${msg}" in locales`);
	}

	return string;
};

// Extension handling
export const extension = {
	schema: yup.object().shape({
		name: yup.string().required(),
		author: yup.string().required(),
		description: yup.string().required(),
		version: yup.string().required(),
		website: yup
			.string()
			.url()
			.required(),
		enabled: yup.boolean().required(),
		init: yup.boolean().required(),
		dependencies: yup.array().of(yup.string()),
		conflicts: yup.array().of(yup.string()),
		create: yup.string().required(),
		destroy: yup.string().required(),
	}),
	template: {
		name: 'myExtension',
		author: 'myExtensionAuthor',
		description: 'This is myExtension!',
		version: '1.1.1',
		website: 'https://gist.github.com/',
		enabled: true,
		init: true,
		dependencies: ['myImportantExtension'],
		conflicts: ['veryBadExtension'],
		create: 'function () { console.log("myExtension created!"); }',
		destroy: 'function () { console.log("myExtension destroyed!"); }',
	},
	validate(obj) {
		return new Promise(async (resolve, reject) => {
			const isValid = await this.schema.validate(obj);

			if (!isValid)
				reject({
					success: false,
					message: isValid,
				});

			resolve({
				success: true,
				message: obj,
			});
		});
	},
	toggle(extensionName) {
		storage.get((currentStorage) => {
			let newStorage = currentStorage;
			newStorage.extensions.filter((ext) => {
				if (ext.name === extensionName) {
					ext.enabled = !ext.enabled;
				}
			});
			storage.set(newStorage);
		});
	},
	remove(extensionName) {
		log.info('Removing: ' + extensionName);
		try {
			storage.get((currentStorage) => {
				let newSettings = currentStorage;
				newSettings.extensions.splice(
					newSettings.extensions.map((e) => e.name).indexOf(extensionName),
					1
				);
				storage.set(newSettings);
			});
		} catch (err) {
			throw new Error('Error removing extension ', err);
		}
	},
	reload(extensionName) {
		log.info('Reloading: ' + extensionName);
		try {
			const temp = tde.getExtension(extensionName);
			tde.remove(extensionName);
			tde.add(temp, true, true);
		} catch (err) {
			throw new Error('Error reloading extension ', err);
		}
	},
	download(url) {
		log.info('Downloading: ' + url);
		return new Promise(async (resolve, reject) => {
			const response = await fetch(url);
			const json = await response.json();
			const isValid = await extension.validate(json);

			if (!isValid.success)
				reject({
					success: false,
					message: isValid,
				});

			resolve({
				success: true,
				message: json,
			});
		});
	},
	install(obj) {
		log.info('Installing: ', obj);
		return new Promise(async (resolve, reject) => {
			await storage.get(async (currentStorage) => {
				const filteredExtensions = currentStorage.extensions.filter(
					(el) => el.name === obj.name
				);

				if (filteredExtensions.length > 0) {
					resolve({
						success: false,
						message: 'Extension Already Installed',
					});
				} else {
					let newStorage = currentStorage;
					newStorage.extensions.push(obj);
					await storage.set(newStorage, (err) => {
						if (err)
							reject({
								success: false,
								message: err,
							});
					});

					resolve({
						success: true,
						message: 'Extension Installed',
					});
				}
			});
		});
	},
	getRegistry() {
		log.info('Fetching from registry');
		return new Promise(async (resolve, reject) => {
			const response = await fetch('https://registry.tdem.app');
			const json = await response.json();

			if (!json.success) reject(json.message);

			for (let i = 0; i < json.message.length; i++) {
				let result = [];
				result.push({
					name: json.message[i].name
						.split('.')
						.slice(0, -1)
						.join('.'),
					url: json.message[i].download_url,
				});

				resolve(result);
			}
		});
	},
};

// Storage global functionss
export const storage = {
	template: {
		debugMode: false,
		doAnimations: true,
		extensions: [],
		isDarkTheme: false,
		isSidebarMini: false,
	},
	get(cb) {
		browser.storage.local.get().then((obj, err) => {
			if (err) throw new Error(err);
			cb(obj);
		});
	},
	set(obj, cb) {
		this.get((currentStorage) => {
			browser.storage.local.set(Object.assign(currentStorage, obj)).then(() => {
				if (cb) return this.get(cb);
				return false;
			});
		});
	},
	subscribe(cb, executeRightAway) {
		// If storage is empty, set it to the default storage
		this.get((currentStorage) => {
			if (Object.keys(currentStorage).length === 0) {
				this.set(this.template);
			}
		});

		const fn = () => this.get(cb);
		if (executeRightAway) fn();
		browser.storage.onChanged.addListener(fn);
	},
	toggleSetting(name) {
		this.get((currentStorage) => {
			let newStorage = currentStorage;
			newStorage[name] = !currentStorage[name];
			this.set(newStorage);
		});
	},
};
