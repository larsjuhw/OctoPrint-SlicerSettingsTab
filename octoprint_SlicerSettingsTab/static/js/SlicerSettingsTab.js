$(function() {
	OCTOPRINT_VIEWMODELS.push({
		construct: SlicerSettingsTabViewModel,
		dependencies: ["settingsViewModel"],
		elements: ["#tab_plugin_SlicerSettingsTab"]
	});

	function SlicerSettingsTabViewModel(parameters) {
		var self = this;
		
		self.settingsViewModel = parameters[0];
		console.log(self);
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
				console.log('removing');
			} else {
				self.favorites.push(key);
				console.log('adding');
			}
			let payload = JSON.stringify({plugins: {SlicerSettingsTab: {favorites: self.favorites}}});
			$.ajax({
				url: API_BASEURL + "settings",
			    type: "POST",
				data:  payload,
				contentType: "application/json; charset=UTF-8",
			});
			setting.isFavorite(!setting.isFavorite());
			console.log(setting);
		}

		self.refresh = async () => {
			self.updating(true);
			self.fileSelected(true);

			let { job: { file: { path } } } = await new Promise(resolve => $.get("api/job", resolve));

			if(path === null)
				return self.updating(false), self.fileSelected(false);

			let { files } = await new Promise(resolve => $.get("api/files/local?recursive=true", resolve));

			let r = files => files.map(f => f.type === "folder" ? r(f.children) : f);
			files = r(files);

			let file = files.flat(Infinity).filter(f => f.path === path)[0];

			self.updating(false);


			if(!file.slicer_settings)
				return self.settings([]);

			self.settings(
				Object.entries(file.slicer_settings)
					.map(([k, v]) => new Setting(k, v, self.favorites.includes(k)))
					.filter(s => s.key().length)
			)

		}

		
		self.onEventFileSelected = self.refresh;
		self.onEventFileDeselected = () => self.fileSelected(false);
		
		self.onBeforeBinding = () => {
			console.log(self.settingsViewModel.settings.plugins.SlicerSettingsTab);
			self.favorites = self.settingsViewModel.settings.plugins.SlicerSettingsTab.favorites();
			self.refresh();
		};
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
				match: ko.pureComputed(() => filterString().trim() == '' ||
					key.toLowerCase().includes(filterString().toLowerCase()) ||
					value.toLowerCase().includes(filterString().toLowerCase())
				),
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
					return self.isFavorite() ? -1 : 0;
				}),
			});

			return self;
		}
	}

	function CopyButton(text){
		let self = {};

		self.text = text;
		self.done = ko.observable(false);

		self.onClick = () => {
			copyTextToClipboard(text())
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

		navigator.clipboard.writeText(text).then(function() {
			console.log('Async: Copying to clipboard was successful!');
		}, function(err) {
			console.error('Async: Could not copy text: ', err);
		});
	}
});
