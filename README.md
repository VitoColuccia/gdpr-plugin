# Camunda Modeler GDPR-plugin

This plugin allows you to customize the UI of the Camunda Modeler to achieve GDPR


## Installation

To use this plugin in your installation, follow these simple steps:

1. Click on releases
2. Download the latest release artifact
3. Extract it and put it inside the "resources/plugins" directory relative to your `{APP_DATA_DIRECTORY}` or `{USER_DATA_DIRECTORY}`.
4. Restart the modeler

## Development

If you want to extend the plugin or provide custom translations or languages, you'll need a working installation of Node.js and a package manager like NPM or yarn. We use NPM in all our examples. Follow these steps:

### Setup

Check the repository out and install all dependencies by using the command `npm install`. You can use any IDE of your choice such as WebStorm or Visual Studio Code. Every file contains comments that should help you get started.

### Testing

To test it, build the plugin by using the command `npm build`. Then, copy the following files into the "resources/plugins" directory (for more see section Installation above):

- `index.js`
- `dist/`

Then restart the modeler to see all changes in effect. Opening the devtools via `F12` and pressing `Ctrl-R` or `Cmd+R` is usually enough to reload the plugin, otherwise you have to restart the modeler.

### Automate the local deployment

If you don't want to copy the files manually into the "resources/plugins" directory all the time, you can automate that using an NPM task. For that, install the package `copyfiles`:

`npm install --dev copyfiles`

Then, add another task in your `package.json` file:

```
"scripts": {
    "local": "npm run bundle && copyfiles dist/**/*.* index.js menu/**/*.* 'path/to/modeler/resources/plugins/gdpr-plugin'"
}
```

Now, if you run `npm run local`, the plugin will be built and automatically copied into the destination directory. No more `Ctrl+C` and `Ctrl+V` required!
