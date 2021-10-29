const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const path = require("path"); 
const srcDir = path.join(__dirname,"src");

module.exports = {
    entry:path.join(srcDir,"index.ts"),
    mode:"production",
    target: "node",
    entry: {
        app: './src/app.ts',
        tests: './src/tests.ts'
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    'ts-loader',
                ]
            }
        ]
    },
    externals: [ nodeExternals() ]
}
