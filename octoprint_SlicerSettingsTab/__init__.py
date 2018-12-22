# coding=utf-8
from __future__ import absolute_import

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
		return dict(
			SlicerSettingsTab=dict(
				displayName="Slicersettingstab Plugin",
				displayVersion=self._plugin_version,

				type="github_release",
				user="tjjfvi",
				repo="OctoPrint-SlicerSettingsTab",
				current=self._plugin_version,

				pip="https://github.com/tjjfvi/OctoPrint-SlicerSettingsTab/archive/{target_version}.zip"
			)
		)

__plugin_name__ = "SlicerSettingsTab"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = SlicerSettingsTabPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
