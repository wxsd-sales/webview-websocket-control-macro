# WebView WebSocket Control Macro

This is an example Webex Device macro which lets you control a WebView Web App on your Webex Device from an in room touch controller.

![download](https://github.com/wxsd-sales/webview-websocket-control-macro/assets/21026209/c6822c1a-4800-4a1c-9c41-b6bab9511a23)


## Overview

The macro demos how you connect your Web App to a Webex Device and control it from either the Webex Devices native UI Extensions or from another Web App running on the the paired Webex Room Navigator.

Demo WebApps:

* Tetris: The classic tetris controlled using a UI Extension Navigation Widget
* YouTube: Embedded YouTube player with UI Extension playback controls and another example using a second WebView on the Navigator as the playback controls
* Vimeo: Embedded YouTube player with UI Extension playback controls
* Whiteboard: Simply whiteboard Web App which mirrors drawings on the Room Navigator and the Webex Devices main display

> :warning: **Note:**
> The example approach shown by this macro doesn't enable you to control every website which you don't own. The example YouTube player for instance works as YouTube provides APIs to control its embedded player.


## Setup

### Prerequisites & Dependencies: 

- RoomOS/CE 11.8 or above Webex Device with a paired Navigator
- Web admin access to the device to upload the macro.
- Network connectivity so your Webex Device open WebViews from the GitHub pages domain (*.github.io)

### Installation Steps:

1. Download the ``webview-websocket.js`` file and upload it to your Webex Room devices Macro editor via the web interface.
2. Configure the macro by changing the initial values, there are comments explaining each one.
    - There are a list of WebView demos apps already configured
3. Save the macro changes and enable it using the toggle in the Macro on the editor.


## Validation

Validated Hardware:

* Codec EQ + Room Navigator
* Desk Pro + Room Navigator

This macro should work on other Webex Devices but has not been validated at this time.

## Demo

*For more demos & PoCs like this, check out our [Webex Labs site](https://collabtoolbox.cisco.com/webex-labs).

## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex use cases, but are not Official Cisco Webex Branded demos.
