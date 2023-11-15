/********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 11/15/23
 * 
 * This is an example Webex Device macro which lets you control a 
 * WebView Web App on your Webex Device from an in room touch controller.
 * 
 * Demo WebApps:
 * - Tetris:
 *   The classic tetris controlled using a UI Extension Navigation Widget
 * - YouTube:
 *   Embedded YouTube player with UI Extension playback controls
 * - Vimoe:
 *   Embedded Vimeo player with UI Extension playback controls
 * - Whiteboard:
 *   Simply whiteboard Web App which mirrors drawings on the Room Navigator 
 *   and the Webex Devices main display
 *
 * Full Readme, source code and license agreement available on Github:
 * https://github.com/wxsd-sales/webview-websocket-control-macro
 * 
 ********************************************************/

import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/

const config = {
  button: {
    name: 'WebSocket Demos', // The main button name on the UI and its Panel Page Tile
    color: '#6F739E',   // Color of the button
    icon: 'Tv',       // Specify which prebuilt icon you want. eg. Concierge | Tv
    title: 'Tap To Open',
    showInCall: true,
    closeContentWithPanel: false // Automatically close any open content when the panel closes
  },
  content: [
    {
      title: 'Tetris 🏗️',
      url: 'https://jsxapi.glitch.me/game2.html',
      mode: 'Fullscreen',
      controls: 'navigation'
    },
    {
      title: 'YouTube + UI Extension 📺',
      url: 'https://jsxapi.glitch.me/youtube.html?videoId=26Kd0VH_9e0',
      mode: 'Fullscreen',
      controls: 'playcontrols'
    },
    {
      title: 'YouTube + WebView 📺',
      url: 'https://wxsd-sales.github.io/kiosk-demos/youtubePlayer/?videoId=OTpoNebgeAk',
      navUrl: 'https://wxsd-sales.github.io/kiosk-demos/youtubeControls/',
      mode: 'Fullscreen',
      controls: 'webview'
    },
    {
      title: 'Vimeo + UI Extension 📺',
      url: 'https://socketeer.glitch.me/vimeoTest.html',
      mode: 'Fullscreen',
      controls: 'playcontrols'
    },
    {
      title: 'Whiteboard 🎨',
      url: 'https://wxsd-sales.github.io/kiosk-demos/whiteboard/',
      mode: 'Fullscreen',
      controls: 'duplicate'
    }
  ],
  username: 'webviewIntegration', // Name of the local integration account which used for the websocket connect
  panelId: 'websocket' // Modify if you have multiple copies of this marcro on a single device
}


/*********************************************************
 * Main functions and event subscriptions
**********************************************************/

let openingWebview = false;
let integrationViews = [];


xapi.Config.WebEngine.Mode.get()
  .then(mode => init(mode))
  .catch(error => console.warn('WebEngine not available:', JSON.stringify(error)))


async function init(webengineMode) {

  const username = config.username;

  if (webengineMode === 'Off') {
    console.log('WebEngine Currently [Off] setting to [On]')
    xapi.Config.WebEngine.Mode.set('On');
  }

  const touchController = await checkForControllers();
  if (!touchController) {
    return;
  }

  xapi.Config.WebEngine.Features.AllowDeviceCertificate.set('True')

  const integrationAccount = await xapi.Command.UserManagement.User.Get({ Username: username })
    .catch(error => console.log('Error finding user:', error.message))

  if (integrationAccount) {
    // Delete account if its already exists (clear any previous config)
    deleteAccount();
  }

  createPanel();
  xapi.Event.UserInterface.Extensions.Widget.Action.on(processWidget);
  xapi.Event.UserInterface.Extensions.Event.PageClosed.on(event => {
    if (!event.PageId.startsWith(config.panelId)) return;
    if (openingWebview) return;

    xapi.Status.SystemUnit.State.NumberOfActiveCalls.get()
      .then(value => {
        if (value == 1) return;
        console.log('Panel Closed - cleaning up')
        closeWebview();
        createPanel();
        deleteAccount();
      })
  })

  xapi.Event.UserInterface.Extensions.Event.PageOpened.on(event => {
    if (!event.PageId.startsWith(config.panelId)) return;
    console.log('Panel Opened')
    //createPanel();
  })

  xapi.Status.UserInterface.WebView.on(processWebViews);

  xapi.Status.Audio.Volume.on(value => {

    console.log('Volume', value)
    if (integrationViews.length == 0) return;

    xapi.Status.UserInterface.Extensions.Widget.get()
      .then(widgets => {

        widgets.forEach(widget => {
          if (widget.WidgetId != config.panelId + '-volumeSlider') return;
          xapi.Command.UserInterface.Extensions.Widget.SetValue(
            { Value: value, WidgetId: value });
        })
        console.log(widgets)
      })

    console.log('Volume', value)

  });
}

function createAccount(password) {
  console.log(`Creating new user [${config.username}] with password [${password}]`)
  return xapi.Command.UserManagement.User.Add({
    Active: 'True',
    Passphrase: password,
    PassphraseChangeRequired: 'False',
    Role: ['Integrator', 'User'],
    ShellLogin: 'True',
    Username: config.username
  })
    .then(result => console.log('Create user result:', result.status))
    .catch(error => console.warn('Error creating user:', JSON.stringify(error)))
}

function deleteAccount() {
  console.log(`Deleting user [${config.username}]`)
  return xapi.Command.UserManagement.User.Delete({ Username: config.username })
    .then(result => {
      console.log(`[${config.username}] delete status:`, result.status);
    })
    .catch(error => {
      console.log('Error caught')
      if (!error.message.endsWith('does not exist')) {
        console.warning(`Error deleting user [${config.username}]:`, JSON.stringify(error));
      } else {
        console.log(error.message);
      }

    })
}

function createPassword(length) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let password = '';
  for (let i = 0; i < length; i++) {
    let randomNumber = Math.floor(Math.random() * chars.length);
    password += chars.substring(randomNumber, randomNumber + 1);
  }
  return password;
}

async function generateHash() {
  const username = config.username;
  const ipAddress = await xapi.Status.Network[1].IPv4.Address.get();
  const password = createPassword(255);
  await createAccount(password)
  return btoa(JSON.stringify({ username: username, password: password, ipAddress: ipAddress }))
}

async function openWebview(content) {
  closeWebview();
  console.log(`Opening [${content.title}] on [OSD]`);
  openingWebview = true
  const hash = await generateHash();
  xapi.Command.UserInterface.WebView.Display({
    Mode: content.mode,
    Title: content.title,
    Target: 'OSD',
    Url: content.url + "#" + hash
  })
    .then(result => { console.log('Webview opened on [OSD] ', JSON.stringify(result)) })
    .catch(e => console.log('Error: ' + e.message))

  if (content.controls != 'duplicate' && content.controls != 'webview') {
    console.log("not duplicate or webview, setting timer", content.controls)
    setTimeout(() => {
      openingWebview = false
    }, 500)
    return;
  }
  console.log(`Opening [${content.title}] on [Controller]`);

  let url = (content.controls === 'duplicate') ? content.url : content.navUrl;


  xapi.Command.UserInterface.WebView.Display({
    Mode: content.mode,
    Title: content.title,
    Target: 'Controller',
    Url: url + "#" + hash
  })
    .then(result => {
      console.log('Webview opened on [Controller] ', JSON.stringify(result))
      setTimeout(() => {
        openingWebview = false
      }, 500)
    })
    .catch(e => console.log('Error: ' + e.message))

}

// Close the Webview
async function closeWebview() {
  xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' });
}

// Process Widget Clicks
async function processWidget(e) {
  console.log(e)
  if (!e.WidgetId.startsWith(config.panelId)) return
  const [panelId, command, option] = e.WidgetId.split('-');
  switch (command) {
    case 'selection':
      if (e.Type != 'clicked') return
      openWebview(config.content[option]);
      const controls = config.content[option].controls;
      if (controls === 'duplicate' || controls === 'webview') return;
      createPanel(config.content[option].controls);
      break;
    case 'close':
      closeWebview();
      createPanel();
      break;
    case 'playcontrols':
      if(option=='toggleMute'){
        if (e.Type != 'clicked') return
        const muteStatus = await xapi.Status.Audio.VolumeMute.get()
      if (muteStatus == 'On') {
        xapi.Command.Audio.Microphones.Unmute();
      } else {
        xapi.Command.Audio.Microphones.Mute();
      }



      }else if(option=='volumeSlider'){
        if (e.Type != 'released') return

      }
      
      break;
  }
}

async function processWebViews(event) {
  console.log('WebView Status Change: ', JSON.stringify(event))
  if (event.hasOwnProperty('Status') && event.hasOwnProperty('Type')) {
    if (event.Status !== 'Visible' || event.Type !== 'Integration') return;
    if (!openWebview) return;
    console.log(`Recording Integration WebView id [${event.id}]`)
    integrationViews.push(event)
  } else if (event.hasOwnProperty('Status')) {
    if (event.Status === 'NotVisible' || event.Status === 'Error') {
      const result = integrationViews.findIndex(webview => webview.id === event.id)
      if (result === -1) return;

      xapi.Status.SystemUnit.State.NumberOfActiveCalls.get()
        .then(value => {
          if (value == 1) return;
          console.log(`Integration WebView id [${event.id}] changed to [${event.Status}] - closing all Integration WebViews`)
          closeWebview();
          integrationViews = [];
          deleteAccount();

        })

    }
  } else if (event.hasOwnProperty('ghost')) {
    const result = integrationViews.findIndex(webview => webview.id === event.id)
    if (result === -1) return;
    console.log(`Integration WebView id [${event.id}] ghosted - closing all Integration WebViews`)
    closeWebview();
    integrationViews = [];
  }

}

function checkForControllers() {
  return xapi.Status.Peripherals.ConnectedDevice.get()
    .then(devices => {
      const controller = devices.filter(d => {
        return d.Status == 'Connected' &&
          d.Type == 'TouchPanel' &&
          d.Location == 'InsideRoom'
      })

      if (controller.length == 0) {
        console.log(`No in controllers connected, this macro is designed to work with an in room touch controller`);
        return false
      } else {
        return true
      }
    })
    .catch(e => {
      console.log('No connected devices, this macro is designed to work with an in room touch controller')
      return false
    })
}

function deletePanel() {

}

async function createPanel(state) {
  const button = config.button;
  const content = config.content;
  const panelId = config.panelId

  let pageName = config.button.title;

  console.log(`Creating Panel [${panelId}]`);
  let rows = '';

  function widget(id, type, name, options) {
    return `<Widget><WidgetId>${panelId}-${id}</WidgetId>
            <Name>${name}</Name><Type>${type}</Type>
            <Options>${options}</Options></Widget>`
  }

  function row(widgets = '') {
    return Array.isArray(widgets) ? `<Row>${widgets.join('')}</Row>` : `<Row>${widgets}</Row>`
  }


  if (state) {
    pageName = 'Controls'
    rows = rows.concat(row(widget('close', 'Button', 'Close Content', 'size=2')))

    switch (state) {
      case 'blank':
        break;
      case 'accelerate':
        rows = rows.concat(row(widget('instructions', 'Text', 'Hold the button to accelarate up', 'size=4;align=center')))
        rows = rows.concat(row(widget('accelerate', 'Button', 'Hold the button to accelarate up', 'size=3')))
        break;
      case 'navigation':
        rows = rows.concat(row(widget('instructions', 'Text', 'Use the arrows to move and rotate the pieces', 'size=4;align=center')))
        rows = rows.concat(row(widget('navigation', 'DirectionalPad', '', 'size=3')))
        break;
      case 'playcontrols':
        rows = rows.concat(row(widget('title', 'Text', 'Playback Controls', 'size=4;fontSize=normal;align=center')))
        rows = rows.concat(row(widget('playTime', 'Text', 'Loading...', 'size=2;fontSize=normal;align=center')))
        rows = rows.concat(row(widget('playcontrols-slider', 'Slider', '', 'size=4')))
        rows = rows.concat(row([
          widget('playcontrols-playpause', 'Button', '', 'size=1;icon=play_pause'),
          widget('playcontrols-stop', 'Button', '', 'size=1;icon=stop'),
          widget('playcontrols-fastback', 'Button', '', 'size=1;icon=fast_bw'),
          widget('playcontrols-fastforward', 'Button', '', 'size=1;icon=fast_fw')]))
        rows = rows.concat(row([
          widget('playcontrols-toggleMute', 'Button', '', 'size=1;icon=volume_muted'),
          widget('playcontrols-volumeSlider', 'Slider', '', 'size=3')]))
        break;
    }
  } else {
    if (content == undefined || content.length < 0) {
      console.log(`No content available to show for [${panelId}]`);
      rows = row(widget('no-content', 'Text', 'No Content Available', 'size=4;fontSize=normal;align=center'))
    } else {
      for (let i = 0; i < content.length; i++) {
        rows = rows.concat(row(widget(`selection-${i}`, 'Button', content[i].title, 'size=4')));
      }
    }
  }

  let order = '';
  const orderNum = await panelOrder(config.panelId);
  if (orderNum != -1) order = `<Order>${orderNum}</Order>`


  const panel = `
    <Extensions><Panel>
      <Location>${button.showInCall ? 'HomeScreenAndCallControls' : 'HomeScreen'}</Location>
      <Type>${button.showInCall ? 'Statusbar' : 'Home'}</Type>
      <Icon>${button.icon}</Icon>
      <Color>${button.color}</Color>
      <Name>${button.name}</Name>
      ${order}
      <ActivityType>Custom</ActivityType>
      <Page>
        <Name>${pageName}</Name>
        ${rows}
        <PageId>${panelId}-page</PageId>
        <Options>hideRowNames=1</Options>
      </Page>
    </Panel></Extensions>`;

  return xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: panelId }, panel);
}

async function panelOrder(panelId) {
  const list = await xapi.Command.UserInterface.Extensions.List({ ActivityType: 'Custom' });
  if(!list.hasOwnProperty('Extensions')) return -1
  if (!list.Extensions.hasOwnProperty('Panel')) return -1
  if (list.Extensions.Panel.length == 0) return -1
  for (let i = 0; i < list.Extensions.Panel.length; i++) {
    if (list.Extensions.Panel[i].PanelId == panelId) return list.Extensions.Panel[i].Order;
  }
  return -1
}
