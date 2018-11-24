# Node.js GitHub Bot

The Node.js Foundation members use this bot to help manage [the repositories of the GitHub organization](https://github.com/nodejs).

It executes [scripts](https://github.com/nodejs/github-bot/tree/master/scripts) in response to events that are
pushed to it via GitHub webhooks. All [repositories](https://github.com/nodejs) that use this bot have the same webhook url & secret configured (there is only 1 bot instance). Org-wide webhooks are not allowed.

## Contributing

Please do, contributions are more than welcome!
See [CONTRIBUTING.md](CONTRIBUTING.md).

### Environment Variables

- **`GITHUB_TOKEN`**<br>
  The [GitHub API token](https://github.com/blog/1509-personal-api-tokens) for your account (or bot account) that will be used to make API calls to GitHub. The account must have proper access to perform the actions required by your script.
- **`GITHUB_WEBHOOK_SECRET`**<br>
  The webhook secret that GitHub signs the POSTed payloads with. This is created when the webhook is defined. The default is `hush-hush`.
- **`JENKINS_WORKER_IPS`**<br>
  List of valid Jenkins worker IPs allowed to push PR status updates, split by comma: `192.168.1.100,192.168.1.101`.
- **`JENKINS_API_CREDENTIALS`** (optional)<br>
  For scripts that communicate with Jenkins on http://ci.nodejs.org. The Jenkins API token is visible on
  your own profile page `https://ci.nodejs.org/user/<YOUR_GITHUB_USERNAME>/configure`, by clicking the
  "show API token" button. Also See: https://wiki.jenkins-ci.org/display/JENKINS/Authenticating+scripted+clients
- **`JENKINS_JOB_URL_<REPO_NAME>`** (optional)<br>
  Only required for the trigger Jenkins build script, to know which job to trigger a build for when
  repository collaborator posts a comment to the bot. E.g. `JENKINS_JOB_URL_NODE=https://ci.nodejs.org/job/node-test-pull-request`
- **`JENKINS_BUILD_TOKEN_<REPO_NAME>`** (optional)<br>
  Only required for the trigger Jenkins build script. The authentication token configured for a particular
  Jenkins job, for remote scripts to trigger builds remotely. Found on the job configuration page in
  `Build Triggers -> Trigger builds remotely (e.g., from scripts)`.
- **`LOGIN_CREDENTIALS`**<br>
  Username and password used to protected the log files exposed in /logs. Expected format: `username:password`.
- **`KEEP_LOGS`**<br>
  Number of days to keep rotated log files, defaults to `10` if not set.
- **`LOGS_DIR`**<br>
  Directory where logs should be written and exposed by the `/logs` endpoint.

### Developing Locally

The bot will try to load a `.env` file at the root of the project if it exists to set environment varaibles. You will need to create one similar to this:

```
GITHUB_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SSE_RELAY=https://hook-relay.herokuapp.com
```

**Note the additional `SSE_RELAY` variable:**
When developing locally, it is difficult to setup a GitHub webhook
pointing to the computer you are developing on. An easy workaround is to set the `SSE_RELAY` to the url of
[a SSE relay server](https://github.com/williamkapke/hook-relay) that will send the GitHub events via
[Server Sent Events](http://www.html5rocks.com/en/tutorials/eventsource/basics/) instead.

You can use the [TestOrgPleaseIgnore](https://github.com/TestOrgPleaseIgnore) GitHub Organization, to test
your changes. Actions performed on the repos there will be sent to
[the SSE Relay](https://github.com/williamkapke/hook-relay).

The `GITHUB_WEBHOOK_SECRET` environment variable is not required when using the relay.

**Run the bot:**
```bash
$ npm start
```

When developing a script, it is likely that you will only want to run the script(s) that you are working on. You may
pass an additional [glob](https://www.npmjs.com/package/glob) argument to specify which scripts to run.

```bash
$ SCRIPTS=./scripts/my-new-event-handler.js npm start
```


## License

[MIT](LICENSE.md)
