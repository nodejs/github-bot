main
# http://editorconfig.org
SSE_RELAY=https://hook-relay.example.com
Note the additional SSE_RELAY variable: When developing locally, it is difficult to setup a GitHub webhook pointing to the computer you are developing on. An easy workaround is to set the SSE_RELAY to the url of a SSE relay server that will send the GitHub events via Server Sent Events instead. Another option is to use ngrok.

You can use the TestOrgPleaseIgnore GitHub Organization, to test your changes. Actions performed on the repos there will be sent to the SSE Relay. If you use your own Organization/Repository, remember to set the webhook Secret to the same value as GITHUB_WEBHOOK_SECRET (default hush-hush), and to change the content type to application/json (default on the GitHub interface is application/x-www-form-urlencoded, which will not work with the bot).

The GITHUB_WEBHOOK_SECRET environment variable is not required when using the relay.

Run the bot:

$ npm start

root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*build.js_run.build.js]
indent_size = 2

[*main.md]
trim_trailing_whitespace = false

[package.json]
indent_size = 2
