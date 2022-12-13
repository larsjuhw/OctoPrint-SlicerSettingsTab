# coding=utf-8

import octoprint.plugin

class SlicerSettingsTabPlugin(
	octoprint.plugin.AssetPlugin,
	octoprint.plugin.TemplatePlugin,
):

	def get_assets(self):
		return dict(
			js=["js/SlicerSettingsTab.js"],
			css=["css/SlicerSettingsTab.css"],
			less=["less/SlicerSettingsTab.less"]
		)

	def get_update_information(self):
		return {
			"SlicerSettingsTab": {
				"displayName": "SlicerSettingsTab Plugin",
				"displayVersion": self._plugin_version,

				"type": "github_release",
				"user": "larsjuhw",
				"repo": "OctoPrint-SlicerSettingsTab",
				"current": self._plugin_version,
				"stable_branch": {
					"name": "Stable",
					"branch": "master",
					"comittish": ["master"],
				}, "prerelease_branches": [
					{
						"name": "Release Candidate",
						"branch": "rc",
						"comittish": ["rc", "master"],
					}
				],

				"pip": "https://github.com/larsjuhw/OctoPrint-SlicerSettingsTab/archive/{target_version}.zip"
			}
		}

__plugin_name__ = "SlicerSettingsTab"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = SlicerSettingsTabPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
