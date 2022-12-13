$(function() {
	OCTOPRINT_VIEWMODELS.push({
				construct: SlicerSettingsTabViewModel,
				elements: ["#tab_plugin_SlicerSettingsTab"]
		});

	function SlicerSettingsTabViewModel(parameters) {
				var self = this;


		self.filterString = ko.observable("");

		self.settings = ko.observableArray([]);
		self.sortedSettings = ko.observableArray([]);

		self.updating = ko.observable(false);
		self.fileSelected = ko.observable(true);

		self.displaySettings = ko.pureComputed(() =>
			self.fileSelected() && !self.updating() && self.settings().length
		)

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
					.map(([k, v]) => new Setting(k, v))
					.filter(s => s.key().length)
			)

		}

		self.refresh();

		self.onEventFileSelected = self.refresh;
		self.onEventFileDeselected = () => self.fileSelected(false);
		}

	function Setting(key, value){
		var self = this;

		self.key = ko.observable(key.split("\\n").join("\n"));
		self.value = ko.observable(value.split("\\n").join("\n"));

		self.escape = text => ko.pureComputed(() =>
			$("<span>").text(text()).html()
		);

		self.copyButton = text => new CopyButton(text);


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
					if (filterString().trim() == '') {
						return text();
					}
					let startIndex = text().toLowerCase().indexOf(filterString().toLowerCase());
					if (startIndex == -1) {
						return text();
					}
					let endIndex = startIndex + filterString().length;
					return text().substring(0, startIndex) + "<b>" + text().substring(startIndex, endIndex) + "</b>" + text().substring(endIndex);
				}),
				order: ko.pureComputed(() =>
					splitFilterString().map(s => [
							key.includes(s) ? s.length /	 key.length : 0,
						value.includes(s) ? s.length / value.length : 0,
					]).reduce((a, b) => a.map((n, i) => n + b[i]), [0, 0])
				),
				orderInt: ko.pureComputed(() =>
					-Math.round(1e5 * self.order().reduce((a, b) => a * 10000 + b, 0))
				),
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
