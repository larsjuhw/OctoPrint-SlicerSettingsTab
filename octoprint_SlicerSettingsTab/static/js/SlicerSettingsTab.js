$(function() {
	OCTOPRINT_VIEWMODELS.push({
		construct: SlicerSettingsTabViewModel,
		dependencies: ["settingsViewModel", "filesViewModel"],
		elements: ["#tab_plugin_SlicerSettingsTab"]
	});

	function SlicerSettingsTabViewModel(parameters) {
		var self = this;
		
		self.settingsViewModel = parameters[0];
		self.filesViewModel = parameters[1];

		self.filterString = ko.observable("");
		
		self.settings = ko.observableArray([]);
		self.sortedSettings = ko.observableArray([]);

		self.updating = ko.observable(false);
		self.fileSelected = ko.observable(true);

		self.displaySettings = ko.pureComputed(() =>
			self.fileSelected() && !self.updating() && self.settings().length
		)

		self.clickFavorite = async (setting, evt) => {
			let key = setting.key();
			if (setting.isFavorite()) {
				self.favorites.splice(self.favorites.indexOf(key), 1);
			} else {
				self.favorites.push(key);
			}
			let payload = JSON.stringify({plugins: {SlicerSettingsTab: {favorites: self.favorites}}});
			$.ajax({
				url: API_BASEURL + "settings",
			    type: "POST",
				data:  payload,
				contentType: "application/json; charset=UTF-8",
			});
			setting.isFavorite(!setting.isFavorite());
		}

		self.refresh = async (payload) => {
			self.updating(true);
			self.fileSelected(true);

			if (payload.path === undefined) return self.updating(false), self.fileSelected(false);
			if (self.filesViewModel.filesOnlyList().length == 0) return self.updating(false), self.fileSelected(false);

			var list = self.filesViewModel.filesOnlyList();

			let file;
			if (list.length > 0) {
				file = list.find(elem => elem.path === payload.path);
			}

			self.updating(false);

			if (file === undefined) {
				return self.fileSelected(false);
			}

			if (!file.slicer_settings) {
				return self.settings([]);
			}

			self.settings(
				Object.entries(file.slicer_settings)
					.map(([k, v]) => new Setting(k, v, self.favorites.includes(k)))
					.filter(s => s.key().length)
			)

		}

		// Use the first six data receive events to refresh
		self.fetch_attempts = 0;
		self.fromCurrentData = (data) => {
			console.log(data);
			self.refresh({path: data.job.file.path});
			if (self.fileSelected() || ++self.fetch_attempts > 5) {
				self.fromCurrentData = undefined;
			}
		};
		self.onEventFileSelected = self.refresh;
		self.onEventFileDeselected = () => self.fileSelected(false);
		
		self.onBeforeBinding = () => {
			let st = self.settingsViewModel.settings.plugins.SlicerSettingsTab;
			console.log(st);
			self.displayFavAlert = ko.observable(!st.favorites_alert_dismissed());
			self.favorites = st.favorites();
		};

		self.dismissAlert = () => {
			$("#SST-fav-alert").remove();
			let payload = JSON.stringify({plugins: {SlicerSettingsTab: {favorites_alert_dismissed: true}}});
			$.ajax({
				url: API_BASEURL + "settings",
				type: "POST",
				data:  payload,
				contentType: "application/json; charset=UTF-8",
			});
		}

	}

	function Setting(key, value, fav){
		var self = this;

		self.key = ko.observable(key.split("\\n").join("\n"));
		self.value = ko.observable(value.split("\\n").join("\n"));
		
		self.escape = text => ko.pureComputed(() =>
			$("<span>").text(text()).html()
		);
		
		self.copyButton = text => new CopyButton(text);
		self.isFavorite = ko.observable(fav);

		self.filterHelpers = filterString => {
			let splitFilterString = ko.pureComputed(() =>
				filterString().split(/\s+/).filter(s => s)
			);

			let self = Object.assign(Object.create(this), {
				match: ko.pureComputed(() => {
					let filter = filterString().toLowerCase();
					return filter.trim() == '' ||
					key.toLowerCase().includes(filter) ||
					value.toLowerCase().includes(filter)
				}),
				highlight: text => ko.pureComputed(() => {
					let filter = filterString()
					let txt = text();
					if (filter.trim() == '') {
						return txt;
					}
					let startIndex = txt.toLowerCase().indexOf(filter.toLowerCase());
					if (startIndex == -1) {
						return txt;
					}
					let endIndex = startIndex + filter.length;
					return `${txt.substring(0, startIndex)}<b>${txt.substring(startIndex, endIndex)}</b>${txt.substring(endIndex)}`;
				}),
				orderInt: ko.pureComputed(() => {
					// Order has four ranks
					// -1: if marked as favorite, 0: if key or value starts with filter, -2 if both, 1: otherwise
					let filter = filterString().toLowerCase();
					if (self.isFavorite()) {
						if ((key.toLowerCase().startsWith(filter) || value.toLowerCase().startsWith(filter))) {
							return "favRow startMatch";
						}
						return "favRow";
					}
					if ((key.toLowerCase().startsWith(filter) || value.toLowerCase().startsWith(filter))) {
						return "startMatch";
					}
					return "noMatch";
				}),
			});

			return self;
		}
	}

	function CopyButton(text) {
		let self = {};

		self.text = text;
		self.done = ko.observable(false);

		self.onClick = () => {
			copyTextToClipboard(text());
			self.done(true);
			setTimeout(() => self.done(false), 1000);
		}


		return {
			name: "SST-copyButton-template",
			data: self,
		}
	}

	function fallbackCopyTextToClipboard(text) {
		const el = document.createElement('textarea');
		el.value = text;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		const selected =
			document.getSelection().rangeCount > 0
				? document.getSelection().getRangeAt(0)
				: false;
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		if (selected) {
			document.getSelection().removeAllRanges();
			document.getSelection().addRange(selected);
		}
	}

	function copyTextToClipboard(text) {
		if (!navigator.clipboard)
			return fallbackCopyTextToClipboard(text);

		navigator.clipboard.writeText(text).then(function () {
			console.log('Async: Copying to clipboard was successful!');
		}, function (err) {
			console.error('Async: Could not copy text: ', err);
		});
	}
});
