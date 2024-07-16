# Apply for a nodejs-github-bot token

Automation in the `nodejs` GitHub Organization may require access tokens to
access permission scoped endpoints. In the case of such requirement, the access
token can be requested to be created under the name of [`@nodejs-github-bot`][].

Creating classic tokens for [`@nodejs-github-bot`][] is not permitted, only
fine-grained tokens are allowed.

To create a fine-grained access token for [`@nodejs-github-bot`][], follow the
steps as:

1. Submit a PR to add the requested repo in the registry below, and describe
   expected permission scopes.
1. A TSC member or a build WG member (who has access to the [`@nodejs-github-bot`][]
   account) needs to take following action:
    1. Create the fine-grained token at https://github.com/settings/personal-access-tokens/new
       in the account [`@nodejs-github-bot`][], with "Resource owner" to be
       `nodejs`, "Only select repositories" to be the requested repository,
       and requested permission scopes only.
    1. Save the token as a repository secret at `https://github.com/<org>/<repo>/settings/secrets/actions`,
       do not reveal the token to the anyone in plaintext.
    1. Land the PR.

Fine-grained tokens created with access to https://github.com/nodejs resources will
be audited at https://github.com/organizations/nodejs/settings/personal-access-tokens/active.

## Registry

The "repo" is a string of the GitHub `<owner>/<repo>`. Generally, the token should
only be created for repo in the https://github.com/nodejs organization.

The "secret name" is a string that the secret can be referenced in the GitHub Action
scripts. Like a secret name of `RELEASE_PLEASE_TOKEN` can be accessed from the script
as `${{ secrets.RELEASE_PLEASE_TOKEN }}`.

Repo                        | Secret name
---                         | ---
nodejs/import-in-the-middle | RELEASE_PLEASE_GITHUB_TOKEN


[`@nodejs-github-bot`]: https://github.com/nodejs-github-bot
