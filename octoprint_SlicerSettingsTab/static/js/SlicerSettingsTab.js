$(function() {
	function Setting(key, value){
		var self = this;

		self.key = ko.observable(key.split("\\n").join("\n"));
		self.value = ko.observable(value.split("\\n").join("\n"));

		self.escape = text => ko.pureComputed(() =>
			$("<span>").text(text()).html()
		);

		console.log([value, self.value()]);

		self.filterHelpers = filterString => {
			let splitFilterString = ko.pureComputed(() =>
				filterString().split(/\s+/).filter(s => s)
			);

			let self = Object.assign(Object.create(this), {
				match: ko.pureComputed(() =>
					splitFilterString().every(s =>
						key.includes(s) ||
						value.includes(s)
					)
				),
				highlight: text => ko.pureComputed(() =>
					splitFilterString().reduce((text, s) =>
						text.replace(s, `<b>${s}</b>`)
					, text())
				),
				order: ko.pureComputed(() =>
					splitFilterString().map(s => [
						  key.includes(s) ? s.length /   key.length : 0,
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

    function SlicerSettingsTabViewModel(parameters) {
        var self = this;

		console.log(this);

		self.filterString = ko.observable("");

		self.settings = ko.observableArray([]);
		self.sortedSettings = ko.observableArray([]);

		// self.settings.subscribe(v =>
		// 	self.sortedSettings(self.settings().map(s => s.filterHelpers(self.filterString)))
		// );
		//
		// self.filterString.subscribe(() => setTimeout(() => console.log("hi") || self.sortedSettings.sort((a, b) =>
		// 	!a.match() ?
		// 	 	1 :
		// 	!b.match() ?
		// 		-1 :
		// 		[b, a]
		// 			.map(c => c.order())
		// 			.reduce((b, a) => b.map((n, i) => n - a[i]))
		// 			.reduce((a, b) => a || b, 0)
		// 		|| (b.key() < a.key() ? 1 : -1)
		// ), 0));

		self.updating = ko.observable(false);
		self.fileSelected = ko.observable(true);

		self.displaySettings = ko.pureComputed(() =>
			self.fileSelected() && !self.updating() && self.settings().length
		)

		self.refresh = async () => {
			self.updating(true);
			self.fileSelected(true);

			let { job: { file: { path } } } = await new Promise(resolve => $.get("/api/job", resolve));

			if(path === null)
				return self.updating(false), self.fileSelected(false);

			let { files } = await new Promise(resolve => $.get("/api/files/local?recursive=true", resolve));

			let r = files => files.map(f => f.type === "folder" ? r(f.children) : f);
			files = r(files);

			let file = files.flat(Infinity).filter(f => f.path === path)[0];

			self.updating(false);

			console.log(file.slicer_settings);

			if(!file.slicer_settings)
				return self.settings([]);

			self.settings(
				Object.entries(file.slicer_settings)
					.map(([k, v]) => new Setting(k, v))
					.filter(s => s.key().length)
			)

			console.log(self.settings());
		}

		self.refresh();

		self.onEventFileSelected = self.refresh;
		self.onEventFileDeselected = () => self.fileSelected(false);
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: SlicerSettingsTabViewModel,
        elements: ["#tab_plugin_SlicerSettingsTab"]
    });
});
